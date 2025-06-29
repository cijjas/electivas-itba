'use client';

import { useTransition, useOptimistic, useRef, useState, useEffect } from 'react';
import type { Subject, Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThumbsUp, ThumbsDown, Send, ShieldAlert } from 'lucide-react';
import {
  handleVote,
  handleAddComment,
  handleLikeComment,
  reportComment,
} from '@/app/actions';
import CommentCard from './comment-card';
import { toast } from 'sonner';
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH, COMMENTS_PER_SUBJECT_LIMIT } from '@/lib/constants';
import { useFingerprint } from '@/hooks/useFingerprint';
import { ensureClientIp, getClientIp, getFingerprint } from '@/lib/client-utils';

/** Discriminated‐union for the optimistic reducer */
type OptimisticAction =
  | {
      action: 'add';
      payload: Comment & { userLiked: boolean; userReported: boolean };
    }
  | {
      action: 'like';
      payload: {
        commentId: string;
        newLikeCount: number;
        newUserLiked: boolean;
      };
    }
  | {
      action: 'hide';
      payload: { commentId: string };
    }
  | {
      action: 'report';
      payload: { commentId: string };
    };

// ---------------------------------------------
// Types
// ---------------------------------------------
type VoteStatus = 'like' | 'dislike' | undefined;
interface LikedCommentStatus {
  id: string;
  liked: boolean;
}

interface ReportedCommentStatus {
  id: string;
  reported: boolean;
}

interface SubjectDetailsClientProps {
  subject: Subject;
  initialLikes: number;
  initialDislikes: number;
  initialComments: Comment[];
  userVoteStatus: VoteStatus;
  likedCommentsStatus: LikedCommentStatus[];
  reportedCommentsStatus: ReportedCommentStatus[];
}

// ---------------------------------------------
// Component
// ---------------------------------------------
export default function SubjectDetailsClient({
  subject,
  initialLikes,
  initialDislikes,
  initialComments,
  userVoteStatus,
  likedCommentsStatus,
  reportedCommentsStatus,
}: SubjectDetailsClientProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [activeTab, setActiveTab] = useState<'visible' | 'reported'>('visible');
  
  // IP and Fingerprint tracking
  const fp = useFingerprint();
  
  useEffect(() => {
    ensureClientIp();
  }, []);

  // -------------------------------------------
  // Optimistic State
  // -------------------------------------------
  const [optimisticLikes, setOptimisticLikes] = useOptimistic(initialLikes);
  const [optimisticDislikes, setOptimisticDislikes] =
    useOptimistic(initialDislikes);
  const [optimisticVote, setOptimisticVote] = useOptimistic(userVoteStatus);
  const [optimisticComments, setOptimisticComments] = useOptimistic(
    initialComments.map(c => ({
      ...c,
      userLiked: likedCommentsStatus.find(lc => lc.id === c.id)?.liked || false,
      userReported: reportedCommentsStatus.find(rc => rc.id === c.id)?.reported || false,
    })),
    (state, { action, payload }: OptimisticAction) => {
      switch (action) {
        case 'add':
          return [...state, payload];
        case 'like':
          return state.map(c =>
            c.id === payload.commentId
              ? {
                  ...c,
                  likes: payload.newLikeCount,
                  userLiked: payload.newUserLiked,
                }
              : c,
          );
        case 'hide':
          return state.map(c =>
            c.id === payload.commentId ? { ...c, hidden: true } : c,
          );
        case 'report':
          return state.map(c =>
            c.id === payload.commentId ? { ...c, userReported: true } : c,
          );
        default:
          return state;
      }
    },
  );

  // Filter comments based on the active tab
  const visibleComments = optimisticComments
    .filter(c => !c.hidden)
    .sort((a, b) => b.timestamp - a.timestamp);

  const reportedComments = optimisticComments
    .filter(c => c.hidden)
    .sort((a, b) => b.timestamp - a.timestamp);

  // -------------------------------------------
  // Handlers
  // -------------------------------------------

  const onReportComment = async (commentId: string) => {
    startTransition(async () => {
      // Optimistically mark as reported
      setOptimisticComments({ action: 'report', payload: { commentId } });
      
      const ip = getClientIp();
      const result = await reportComment(subject.subject_id, commentId, { ip, fp });
      
      if (result.success) {
        toast.success(result.message);
        // If the comment was hidden, update it optimistically
        if (result.hidden) {
          setOptimisticComments({ action: 'hide', payload: { commentId } });
        }
      } else {
        toast.error(result.message);
        // Revert the optimistic report status on failure
        setOptimisticComments({ action: 'report', payload: { commentId } }); // This will toggle it back
      }
    });
  };

  const onVote = (voteType: 'like' | 'dislike') => {
    startTransition(async () => {
      const previousVote = optimisticVote;

      if (previousVote === voteType) {
        setOptimisticVote(undefined);
        if (previousVote === 'like')
          setOptimisticLikes(p => Math.max(0, p - 1));
        else setOptimisticDislikes(p => Math.max(0, p - 1));
      } else {
        setOptimisticVote(voteType);
        if (voteType === 'like') {
          setOptimisticLikes(p => p + 1);
          if (previousVote === 'dislike')
            setOptimisticDislikes(p => Math.max(0, p - 1));
        } else {
          setOptimisticDislikes(p => p + 1);
          if (previousVote === 'like')
            setOptimisticLikes(p => Math.max(0, p - 1));
        }
      }
      
      const ip = getClientIp();
      const result = await handleVote(subject.subject_id, voteType, { ip, fp });
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
        // Revert optimistic update on failure
        setOptimisticVote(previousVote);
        if (previousVote === voteType) {
          // User was undoing, so we need to restore the count
          if (voteType === 'like') setOptimisticLikes(p => p + 1);
          else setOptimisticDislikes(p => p + 1);
        } else if (previousVote) {
          // User was switching, revert both changes
          if (voteType === 'like') {
            setOptimisticLikes(p => p - 1);
            setOptimisticDislikes(p => p + 1);
          } else {
            setOptimisticDislikes(p => p - 1);
            setOptimisticLikes(p => p + 1);
          }
        } else {
          // User was voting for first time, revert the increment
          if (voteType === 'like') setOptimisticLikes(p => p - 1);
          else setOptimisticDislikes(p => p - 1);
        }
      }
    });
  };

  const onAddComment = async (formData: FormData) => {
    const commentText = (formData.get('commentText') as string)?.trim();
    if (!commentText) return toast.error('El comentario no puede estar vacío.');

    startTransition(async () => {
      const newCommentOptimistic: Comment & { userLiked: boolean; userReported: boolean } = {
        id: `optimistic_${Date.now()}`,
        subjectId: subject.subject_id,
        text: commentText,
        timestamp: Date.now(),
        likes: 0,
        userLiked: false,
        userReported: false,
        hidden: false,
      };

      formRef.current?.reset();
      setOptimisticComments({ action: 'add', payload: newCommentOptimistic });

      const ip = getClientIp();
      const result = await handleAddComment(subject.subject_id, formData, { ip, fp });
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.error);
        // Revert optimistic update on failure - we'll need to reload the page or implement a proper revert action
        // For now, we'll let the user know and they can refresh if needed
        // Restore the form content
        if (formRef.current) {
          const textarea = formRef.current.querySelector('textarea[name="commentText"]') as HTMLTextAreaElement;
          if (textarea) textarea.value = commentText;
        }
      }
    });
  };

  const onLikeComment = async (commentId: string) => {
    startTransition(async () => {
      const comment = optimisticComments.find(c => c.id === commentId);
      if (!comment) return;

      const newUserLiked = !comment.userLiked;
      const newLikeCount = newUserLiked ? comment.likes + 1 : comment.likes - 1;

      setOptimisticComments({
        action: 'like',
        payload: { commentId, newLikeCount, newUserLiked },
      });

      await handleLikeComment(subject.subject_id, commentId);
    });
  };

  // -------------------------------------------
  // Render
  // -------------------------------------------
  return (
    <Card className='w-full max-w-3xl mx-auto rounded-lg overflow-hidden border shadow-md'>
      {/* Header */}
      <CardHeader className='bg-gray-50 dark:bg-gray-800/20'>
        <CardTitle className='text-2xl font-semibold tracking-tight'>
          {subject.name}
        </CardTitle>
        <CardDescription>
          Código: {subject.subject_id} • Créditos: {subject.credits}
        </CardDescription>
      </CardHeader>

      {/* Content */}
      <CardContent className='p-6 space-y-8'>
        {/* Like / Dislike */}
        <div className='flex items-center pt-4 space-x-4 mb-6'>
          <Button
            onClick={() => onVote('like')}
            disabled={isPending}
            variant='outline'
            className={`transition-colors duration-200 flex-1 justify-center border hover:bg-green-50 hover:text-green-700 ${
              optimisticVote === 'like'
                ? 'border-green-600 bg-green-50 text-green-700'
                : 'border-gray-300 text-gray-500'
            }`}
          >
            <ThumbsUp className='mr-2 h-5 w-5' /> Me gusta ({optimisticLikes})
          </Button>
          <Button
            onClick={() => onVote('dislike')}
            disabled={isPending}
            variant='outline'
            className={`transition-colors duration-200 flex-1 justify-center border hover:bg-red-50 hover:text-red-700 ${
              optimisticVote === 'dislike'
                ? 'border-red-600 bg-red-50 text-red-700'
                : 'border-gray-300 text-gray-500'
            }`}
          >
            <ThumbsDown className='mr-2 h-5 w-5' /> No me gusta (
            {optimisticDislikes})
          </Button>
        </div>

        {/* Comment Form */}
        <form
          onSubmit={e => {
            e.preventDefault();
            onAddComment(new FormData(e.currentTarget));
          }}
          ref={formRef}
          className='space-y-2'
        >
          <Textarea
            name='commentText'
            placeholder='Dejá tu opinión sobre la materia...'
            maxLength={COMMENT_MAX_LENGTH}
            minLength={COMMENT_MIN_LENGTH}
            rows={3}
            disabled={isPending}
            className='focus-visible:ring-1 focus-visible:ring-ring'
          />
          <div className='flex justify-between items-center'>
            <p className='text-xs text-muted-foreground'>
              Solo podés comentar {COMMENTS_PER_SUBJECT_LIMIT} veces por materia
            </p>
            <Button type='submit' disabled={isPending} className='gap-1'>
              <Send className='h-4 w-4' /> Enviar
            </Button>
          </div>
        </form>

        {/* Comment Section with Tabs */}
        <div>
          <div className='flex border-b mb-4'>
            <Button
              variant='ghost'
              onClick={() => setActiveTab('visible')}
              className={`rounded-b-none pb-2 ${
                activeTab === 'visible'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              Comentarios ({visibleComments.length})
            </Button>
            <Button
              variant='ghost'
              onClick={() => setActiveTab('reported')}
              className={`rounded-b-none pb-2 flex items-center gap-2 ${
                activeTab === 'reported'
                  ? 'border-b-2 border-destructive text-destructive'
                  : 'text-muted-foreground'
              }`}
            >
              <ShieldAlert className='h-4 w-4' />
              Reportados ({reportedComments.length})
            </Button>
          </div>

          {/* Conditional Rendering based on Tab */}
          <div className='space-y-4'>
            {activeTab === 'visible' &&
              (visibleComments.length > 0 ? (
                visibleComments.map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onLikeComment={onLikeComment}
                    onReportComment={onReportComment}
                    isReported={comment.userReported}
                  />
                ))
              ) : (
                <p className='text-center text-sm text-muted-foreground py-8'>
                  Aún no hay comentarios. ¡Sé el primero en comentar!
                </p>
              ))}

            {activeTab === 'reported' &&
              (reportedComments.length > 0 ? (
                reportedComments.map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onLikeComment={onLikeComment}
                    onReportComment={onReportComment} // This won't be called due to button logic
                    isReported={true}
                  />
                ))
              ) : (
                <p className='text-center text-sm text-muted-foreground py-8'>
                  No hay comentarios reportados.
                </p>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
