import { kv } from '@/lib/kv-wrapper';
import type { Comment } from './types';
import { REPORT_THRESHOLD } from '@/lib/constants';

// -------------------------------
// Logic
// -------------------------------

// Returns the current number of likes and dislikes for a given subject.
export async function getSubjectLikes(
  subjectId: string,
): Promise<{ likes: number; dislikes: number }> {
  const likes = (await kv.get<number>(`subject:${subjectId}:likes`)) || 0;
  const dislikes = (await kv.get<number>(`subject:${subjectId}:dislikes`)) || 0;
  return { likes, dislikes };
}

// Increments the like count for a subject by 1.
export async function incrementSubjectLikes(
  subjectId: string,
): Promise<number> {
  return kv.incr(`subject:${subjectId}:likes`);
}

// Decrements the like count for a subject by 1.
export async function decrementSubjectLikes(
  subjectId: string,
): Promise<number> {
  return kv.decr(`subject:${subjectId}:likes`);
}

// Increments the dislike count for a subject by 1.
export async function incrementSubjectDislikes(
  subjectId: string,
): Promise<number> {
  return kv.incr(`subject:${subjectId}:dislikes`);
}

// Decrements the dislike count for a subject by 1.
export async function decrementSubjectDislikes(
  subjectId: string,
): Promise<number> {
  return kv.decr(`subject:${subjectId}:dislikes`);
}

// Retrieves the list of comments for a given subject. Returns an empty array if none exist.
export async function getSubjectComments(
  subjectId: string,
): Promise<Comment[]> {
  const comments = await kv.get<Comment[]>(`subject:${subjectId}:comments`);
  return comments || [];
}

// Adds a new comment to the list for a subject and stores the updated list.
export async function addSubjectComment(
  subjectId: string,
  comment: Comment,
): Promise<Comment[]> {
  const comments = await getSubjectComments(subjectId);
  const updatedComments = [...comments, comment];
  await kv.set(`subject:${subjectId}:comments`, updatedComments);
  if (!comment.hidden) {
    await kv.incr(`subject:${subjectId}:visibleCommentCount`);
  }
  return updatedComments;
}

// Increases the like count of a specific comment for a subject. Returns the updated comment list.
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

// Decreases the like count of a specific comment for a subject (if greater than 0). Returns the updated list.
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

// Resets both the like and dislike counters for a subject to 0.
export async function resetSubjectVotes(subjectId: string): Promise<void> {
  await kv.set(`subject:${subjectId}:likes`, 0);
  await kv.set(`subject:${subjectId}:dislikes`, 0);
}

/**
 * Increments report counter for a comment.
 * When threshold is hit, sets `hidden = true` inside the comment list.
 * Returns `true` if the comment became hidden by this call.
 */
export async function reportSubjectComment(
  subjectId: string,
  commentId: string,
): Promise<boolean> {
  // 1) Count reports in a standalone key
  const reportKey = `comment:${commentId}:reports`;
  const reports = await kv.incr(reportKey);

  // 2) If threshold reached, mark comment.hidden = true
  if (reports >= REPORT_THRESHOLD) {
    const comments = await getSubjectComments(subjectId);
    const idx = comments.findIndex(c => c.id === commentId);
    if (idx !== -1 && !comments[idx].hidden) {
      await kv.decr(`subject:${subjectId}:visibleCommentCount`);
      comments[idx].hidden = true;
      await kv.set(`subject:${subjectId}:comments`, comments);
    }
    return true; // hidden
  }

  return false; // not yet hidden
}

// Retrieves the count of visible (non-hidden) comments for a given subject.
export async function getVisibleCommentCount(
  subjectId: string,
): Promise<number> {
  return (
    (await kv.get<number>(`subject:${subjectId}:visibleCommentCount`)) || 0
  );
}

// -------------------------------
// IP and Fingerprint Tracking
// -------------------------------

// IP vote tracking
export async function hasIpVoted(ip: string, subjectId: string): Promise<string | null> {
  return kv.get<string>(`ip-vote:${ip}:${subjectId}`);
}

export async function rememberIpVote(
  ip: string,
  subjectId: string,
  kind: 'like' | 'dislike',
): Promise<void> {
  await kv.set(`ip-vote:${ip}:${subjectId}`, kind);
  await kv.incr(`ip-stats:${ip}:count`);
  await kv.set(`ip-last-seen:${ip}`, Date.now());
}

export async function clearIpVote(ip: string, subjectId: string): Promise<void> {
  await kv.set(`ip-vote:${ip}:${subjectId}`, null);
}

export async function ipCommentCount(ip: string): Promise<number> {
  return (await kv.get<number>(`ip-comment-count:${ip}`)) ?? 0;
}

export async function bumpIpCommentCount(ip: string): Promise<number> {
  return kv.incr(`ip-comment-count:${ip}`);
}

export async function ipCommentCountForSubject(ip: string, subjectId: string): Promise<number> {
  return (await kv.get<number>(`ip-comment-count:${ip}:${subjectId}`)) ?? 0;
}

export async function bumpIpCommentCountForSubject(ip: string, subjectId: string): Promise<number> {
  return kv.incr(`ip-comment-count:${ip}:${subjectId}`);
}

// Fingerprint vote tracking
export async function hasFpVoted(fp: string, subjectId: string): Promise<string | null> {
  return kv.get<string>(`fp-vote:${fp}:${subjectId}`);
}

export async function rememberFpVote(
  fp: string,
  subjectId: string,
  kind: 'like' | 'dislike',
): Promise<void> {
  await kv.set(`fp-vote:${fp}:${subjectId}`, kind);
  await kv.incr(`fp-stats:${fp}:count`);
  await kv.set(`fp-last-seen:${fp}`, Date.now());
}

export async function clearFpVote(fp: string, subjectId: string): Promise<void> {
  await kv.set(`fp-vote:${fp}:${subjectId}`, null);
}

export async function fpCommentCount(fp: string): Promise<number> {
  return (await kv.get<number>(`fp-comment-count:${fp}`)) ?? 0;
}

export async function bumpFpCommentCount(fp: string): Promise<number> {
  return kv.incr(`fp-comment-count:${fp}`);
}

export async function fpCommentCountForSubject(fp: string, subjectId: string): Promise<number> {
  return (await kv.get<number>(`fp-comment-count:${fp}:${subjectId}`)) ?? 0;
}

export async function bumpFpCommentCountForSubject(fp: string, subjectId: string): Promise<number> {
  return kv.incr(`fp-comment-count:${fp}:${subjectId}`);
}
