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
} from '@/lib/kv';
import type { Comment } from '@/lib/types';
import { COMMENT_MAX_LENGTH } from '@/lib/constants';
import { reportSubjectComment } from '@/lib/kv';

const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

/**
 * Handles voting (like or dislike) for a subject.
 * Stores the user's vote in a cookie to prevent duplicate voting.
 * Also supports undoing or switching votes.
 */
export async function handleVote(
  subjectId: string,
  voteType: 'like' | 'dislike',
) {
  const cookieStore = await cookies();
  const voteCookieName = `voted_subject_${subjectId}`;
  const existingVote = cookieStore.get(voteCookieName)?.value;

  let message = '';

  if (existingVote === voteType) {
    // User is undoing their vote
    if (voteType === 'like') await decrementSubjectLikes(subjectId);
    else await decrementSubjectDislikes(subjectId);

    cookieStore.delete(voteCookieName);
    message = 'Voto eliminado.';
  } else if (existingVote) {
    // User is switching their vote from like to dislike or vice versa
    if (voteType === 'like') {
      await incrementSubjectLikes(subjectId);
      await decrementSubjectDislikes(subjectId);
    } else {
      await decrementSubjectLikes(subjectId);
      await incrementSubjectDislikes(subjectId);
    }
    cookieStore.set(voteCookieName, voteType, {
      maxAge: ONE_YEAR_IN_SECONDS,
      path: '/',
    });
    message = `Voto cambiado a '${
      voteType === 'like' ? 'Me gusta' : 'No me gusta'
    }'.`;
  } else {
    // First time voting
    if (voteType === 'like') await incrementSubjectLikes(subjectId);
    else await incrementSubjectDislikes(subjectId);

    cookieStore.set(voteCookieName, voteType, {
      maxAge: ONE_YEAR_IN_SECONDS,
      path: '/',
    });
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
 */
export async function handleAddComment(subjectId: string, formData: FormData) {
  const commentText = (formData.get('commentText') as string)?.trim() ?? '';

  if (commentText.length === 0) {
    return { error: 'Comment cannot be empty.' };
  }

  if (commentText.length > COMMENT_MAX_LENGTH) {
    return {
      error: `Comment cannot exceed ${COMMENT_MAX_LENGTH} characters.`,
    };
  }

  const newComment: Comment = {
    id: uuidv4(),
    subjectId,
    text: commentText.trim(),
    timestamp: Date.now(),
    likes: 0,
  };

  await addSubjectComment(subjectId, newComment);
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
    return { success: true, message: 'Voto eliminado.' };
  } else {
    // Add like
    await likeSubjectComment(subjectId, commentId);
    cookieStore.set(voteCookieName, 'true', {
      maxAge: ONE_YEAR_IN_SECONDS,
      path: '/',
    });
    revalidatePath(`/electivas/${subjectId}`);
    return { success: true, message: '¡Gracias por tu voto!' };
  }
}

export async function resetVotes(subjectId: string) {
  await resetSubjectVotes(subjectId);
  return { success: true, message: 'Votos reiniciados.' };
}

/** User reports a comment as spam/abuse. Cookie prevents duplicates. */
export async function reportComment(subjectId: string, commentId: string) {
  const cookieStore = await cookies();
  const reportCookie = `reported_comment_${commentId}`;

  // Disallow multiple reports from the same browser
  if (cookieStore.get(reportCookie)) {
    return {
      success: false,
      message: 'Ya reportaste este comentario una vez.',
    };
  }

  const hidden = await reportSubjectComment(subjectId, commentId);

  cookieStore.set(reportCookie, 'true', {
    maxAge: ONE_YEAR_IN_SECONDS,
    path: '/',
  });

  // refresh caches so UI picks up hidden flag or report counts
  revalidatePath(`/electivas/${subjectId}`);

  return {
    success: true,
    hidden,
    message: hidden
      ? 'El comentario fue eliminado despues de varios reports.'
      : 'Reportado, gracias.',
  };
}
