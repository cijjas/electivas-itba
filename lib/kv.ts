import { kv } from '@vercel/kv';
import type { Comment } from './types';

// Subject likes/dislikes
export async function getSubjectLikes(
  subjectId: string,
): Promise<{ likes: number; dislikes: number }> {
  const likes = (await kv.get<number>(`subject:${subjectId}:likes`)) || 0;
  const dislikes = (await kv.get<number>(`subject:${subjectId}:dislikes`)) || 0;
  return { likes, dislikes };
}

export async function incrementSubjectLikes(
  subjectId: string,
): Promise<number> {
  return kv.incr(`subject:${subjectId}:likes`);
}

export async function decrementSubjectLikes(
  subjectId: string,
): Promise<number> {
  return kv.decr(`subject:${subjectId}:likes`);
}

export async function incrementSubjectDislikes(
  subjectId: string,
): Promise<number> {
  return kv.incr(`subject:${subjectId}:dislikes`);
}

export async function decrementSubjectDislikes(
  subjectId: string,
): Promise<number> {
  return kv.decr(`subject:${subjectId}:dislikes`);
}

// Subject comments
export async function getSubjectComments(
  subjectId: string,
): Promise<Comment[]> {
  const comments = await kv.get<Comment[]>(`subject:${subjectId}:comments`);
  return comments || [];
}

export async function addSubjectComment(
  subjectId: string,
  comment: Comment,
): Promise<Comment[]> {
  const comments = await getSubjectComments(subjectId);
  const updatedComments = [...comments, comment];
  await kv.set(`subject:${subjectId}:comments`, updatedComments);
  return updatedComments;
}

export async function likeSubjectComment(
  subjectId: string,
  commentId: string,
): Promise<Comment[] | null> {
  const comments = await getSubjectComments(subjectId);
  const commentIndex = comments.findIndex(c => c.id === commentId);

  if (commentIndex === -1) {
    return null; // Comment not found
  }

  comments[commentIndex].likes += 1;
  await kv.set(`subject:${subjectId}:comments`, comments);
  return comments;
}

export async function unlikeSubjectComment(
  subjectId: string,
  commentId: string,
): Promise<Comment[] | null> {
  const comments = await getSubjectComments(subjectId);
  const commentIndex = comments.findIndex(c => c.id === commentId);

  if (commentIndex === -1) {
    return null; // Comment not found
  }

  if (comments[commentIndex].likes > 0) {
    comments[commentIndex].likes -= 1;
  }

  await kv.set(`subject:${subjectId}:comments`, comments);
  return comments;
}

// Reset subject votes
export async function resetSubjectVotes(subjectId: string): Promise<void> {
  await kv.set(`subject:${subjectId}:likes`, 0);
  await kv.set(`subject:${subjectId}:dislikes`, 0);
}
