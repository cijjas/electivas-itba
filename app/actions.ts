'use server';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import {
  incrementSubjectLikes,
  decrementSubjectLikes,
  incrementSubjectDislikes,
  decrementSubjectDislikes,
  addSubjectComment,
  likeSubjectComment,
  unlikeSubjectComment,
  resetSubjectVotes,
  hasIpVoted,
  rememberIpVote,
  clearIpVote,
  ipCommentCountForSubject,
  bumpIpCommentCountForSubject,
  hasFpVoted,
  rememberFpVote,
  clearFpVote,
  fpCommentCountForSubject,
  bumpFpCommentCountForSubject,
  hasIpReported,
  rememberIpReport,
  hasFpReported,
  rememberFpReport,
} from '@/lib/kv';
import type { Comment } from '@/lib/types';
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH, COMMENTS_PER_SUBJECT_LIMIT, COMMENTS_PER_SUBJECT_IP_LIMIT, ENABLE_COMMENT_TRACKING } from '@/lib/constants';
import { isIpBlocked, isFingerprintBlocked } from '@/lib/admin-utils';
import { reportSubjectComment } from '@/lib/kv';
import { redirect } from 'next/navigation';

const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

/**
 * Handles voting (like or dislike) for a subject.
 * Stores the user's vote in a cookie to prevent duplicate voting.
 * Also supports undoing or switching votes.
 */
export async function handleVote(
  subjectId: string,
  voteType: 'like' | 'dislike',
  meta: { ip?: string | null; fp?: string | null } = {},
) {
  const { ip, fp } = meta;
  
  // Check if user is blocked
  if (ip && (await isIpBlocked(ip))) {
    redirect('/blocked');
  }
  if (fp && (await isFingerprintBlocked(fp))) {
    redirect('/blocked');
  }
  
  const cookieStore = await cookies();
  const voteCookieName = `voted_subject_${subjectId}`;

  // Get current vote status from all sources
  const cookieVote = cookieStore.get(voteCookieName)?.value as 'like' | 'dislike' | undefined;
  const ipVote = ip ? await hasIpVoted(ip, subjectId) : null;
  const fpVote = fp ? await hasFpVoted(fp, subjectId) : null;
  
  // Primary protection: fingerprint (device-level)
  // Secondary protection: cookie (session-level)
  // IP is only used for tracking, not blocking (shared network friendly)
  const currentVote = fpVote || cookieVote || undefined;

  let message = '';

  if (currentVote === voteType) {
    // User is undoing their vote
    if (voteType === 'like') await decrementSubjectLikes(subjectId);
    else await decrementSubjectDislikes(subjectId);

    // Clear vote from all sources
    cookieStore.delete(voteCookieName);
    if (ip) await clearIpVote(ip, subjectId);
    if (fp) await clearFpVote(fp, subjectId);
    
    message = 'Voto eliminado.';
  } else if (currentVote) {
    // User is switching their vote from like to dislike or vice versa
    if (voteType === 'like') {
      await incrementSubjectLikes(subjectId);
      await decrementSubjectDislikes(subjectId);
    } else {
      await decrementSubjectLikes(subjectId);
      await incrementSubjectDislikes(subjectId);
    }
    
    // Update vote in all sources
    cookieStore.set(voteCookieName, voteType, {
      maxAge: ONE_YEAR_IN_SECONDS,
      path: '/',
    });
    if (ip) await rememberIpVote(ip, subjectId, voteType);
    if (fp) await rememberFpVote(fp, subjectId, voteType);
    
    message = `Voto cambiado a '${
      voteType === 'like' ? 'Me gusta' : 'No me gusta'
    }'.`;
  } else {
    // First time voting
    if (voteType === 'like') await incrementSubjectLikes(subjectId);
    else await incrementSubjectDislikes(subjectId);

    // Set vote in all sources
    cookieStore.set(voteCookieName, voteType, {
      maxAge: ONE_YEAR_IN_SECONDS,
      path: '/',
    });
    if (ip) await rememberIpVote(ip, subjectId, voteType);
    if (fp) await rememberFpVote(fp, subjectId, voteType);
    
    message = '¡Gracias por tu voto!';
  }

  // Trigger cache revalidation for the subject page and homepage
  revalidatePath(`/electivas/${subjectId}`);
  revalidatePath('/');
  return { success: true, message };
}

/**
 * Handles adding a comment to a subject.
 * Validates that the comment is not empty and adds it to storage.
 * Now includes IP and fingerprint rate limiting.
 */
export async function handleAddComment(
  subjectId: string, 
  formData: FormData,
  meta: { ip?: string | null; fp?: string | null } = {},
) {
  const { ip, fp } = meta;

  // Check if user is blocked
  if (ip && (await isIpBlocked(ip))) {
    redirect('/blocked');
  }
  if (fp && (await isFingerprintBlocked(fp))) {
    redirect('/blocked');
  }

  // Rate limiting: Primary check is fingerprint (device-level protection)
  // This allows multiple students on same university WiFi to comment
  if (fp && (await fpCommentCountForSubject(fp, subjectId)) >= COMMENTS_PER_SUBJECT_LIMIT) {
    return { error: 'Máximo alcanzado.' };
  }
  
  // Fallback: If no fingerprint available, check IP with higher limit (shared networks)
  if (!fp && ip && (await ipCommentCountForSubject(ip, subjectId)) >= COMMENTS_PER_SUBJECT_IP_LIMIT) {
    return { error: 'Máximo alcanzado.' };
  }

  const commentText = (formData.get('commentText') as string)?.trim() ?? '';

  if (commentText.length === 0) {
    return { error: 'Comment cannot be empty.' };
  }

  if (commentText.length > COMMENT_MAX_LENGTH) {
    return {
      error: `El comentario no puede exceder los ${COMMENT_MAX_LENGTH} caracteres.`,
    };
  }
  if (commentText.length < COMMENT_MIN_LENGTH) {
    return {
      error: `El comentario debe tener al menos ${COMMENT_MIN_LENGTH} caracteres.`,
    };
  }

  const newComment: Comment = {
    id: uuidv4(),
    subjectId,
    text: commentText.trim(),
    timestamp: Date.now(),
    likes: 0,
    // Conditionally add tracking data for abuse investigation
    ...(ENABLE_COMMENT_TRACKING && {
      ip: ip || undefined,
      fingerprint: fp || undefined,
    }),
  };

  await addSubjectComment(subjectId, newComment);
  
  // Update comment counts for rate limiting
  // Always track fingerprint if available (primary protection)
  if (fp) await bumpFpCommentCountForSubject(fp, subjectId);
  
  // Track IP for analytics/fallback, but don't use for primary blocking
  if (ip) await bumpIpCommentCountForSubject(ip, subjectId);
  
  revalidatePath(`/electivas/${subjectId}`);
  return { success: true, message: 'Comentario añadido.' };
}

export async function handleLikeComment(subjectId: string, commentId: string) {
  const cookieStore = await cookies();
  const voteCookieName = `voted_comment_${commentId}`;

  if (cookieStore.get(voteCookieName)) {
    // Undo like
    await unlikeSubjectComment(subjectId, commentId);
    cookieStore.delete(voteCookieName);
    revalidatePath(`/electivas/${subjectId}`);
    return { success: true };
  } else {
    // Add like
    await likeSubjectComment(subjectId, commentId);
    cookieStore.set(voteCookieName, 'true', {
      maxAge: ONE_YEAR_IN_SECONDS,
      path: '/',
    });
    revalidatePath(`/electivas/${subjectId}`);
    return { success: true };
  }
}

export async function resetVotes(subjectId: string) {
  await resetSubjectVotes(subjectId);
  return { success: true, message: 'Votos reiniciados.' };
}

/** User reports a comment as spam/abuse. IP/Fingerprint prevents duplicates. */
export async function reportComment(
  subjectId: string, 
  commentId: string,
  meta: { ip?: string | null; fp?: string | null } = {}
) {
  const { ip, fp } = meta;

  // Check if user is blocked
  if (ip && (await isIpBlocked(ip))) {
    redirect('/blocked');
  }
  if (fp && (await isFingerprintBlocked(fp))) {
    redirect('/blocked');
  }

  // Check if user has already reported this comment
  // Primary check: fingerprint (device-level)
  if (fp && (await hasFpReported(fp, commentId))) {
    return {
      success: false,
      message: 'Ya reportaste este comentario.',
    };
  }

  // Fallback check: IP (for users without fingerprint)
  if (!fp && ip && (await hasIpReported(ip, commentId))) {
    return {
      success: false,
      message: 'Ya reportaste este comentario.',
    };
  }

  const hidden = await reportSubjectComment(subjectId, commentId);

  // Remember the report in tracking systems
  if (fp) await rememberFpReport(fp, commentId);
  if (ip) await rememberIpReport(ip, commentId);

  // refresh caches so UI picks up hidden flag or report counts
  revalidatePath(`/electivas/${subjectId}`);

  return {
    success: true,
    hidden,
    message: hidden
      ? 'El comentario fue eliminado después de varios reportes.'
      : 'Reportado, gracias.',
  };
}

