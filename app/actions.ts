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
} from '@/lib/kv';
import type { Comment } from '@/lib/types';

const ONE_YEAR_IN_SECONDS = 365 * 24 * 60 * 60;

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
    // User is changing their vote
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
    // New vote
    if (voteType === 'like') await incrementSubjectLikes(subjectId);
    else await incrementSubjectDislikes(subjectId);

    cookieStore.set(voteCookieName, voteType, {
      maxAge: ONE_YEAR_IN_SECONDS,
      path: '/',
    });
    message = '¡Gracias por tu voto!';
  }

  revalidatePath(`/electivas/${subjectId}`);
  revalidatePath('/');
  return { success: true, message };
}

export async function handleAddComment(subjectId: string, formData: FormData) {
  const commentText = formData.get('commentText') as string;
  if (!commentText || commentText.trim() === '') {
    return { error: 'El comentario no puede estar vacío.' };
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

import { resetSubjectVotes } from '@/lib/kv';

export async function resetVotes(subjectId: string) {
  await resetSubjectVotes(subjectId);
  return { success: true, message: 'Votos reiniciados.' };
}
