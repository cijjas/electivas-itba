'use client';

import { useTransition, useOptimistic, useRef } from 'react';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ThumbsUp, ThumbsDown, Send } from 'lucide-react';
import {
  handleVote,
  handleAddComment,
  handleLikeComment,
  reportComment,
} from '@/app/actions';
import CommentCard from './comment-card';
import { toast } from 'sonner';
import { COMMENT_MAX_LENGTH, COMMENT_MIN_LENGTH } from '@/lib/constants';

/** Discriminated‐union for the optimistic reducer */
type OptimisticAction =
  | { action: 'add'; payload: Comment & { userLiked: boolean } }
  | {
      action: 'like';
      payload: {
        commentId: string;
        newLikeCount: number;
        newUserLiked: boolean;
      };
    }
  | { action: 'hide'; payload: { commentId: string } };

// ---------------------------------------------
// Types
// ---------------------------------------------
type VoteStatus = 'like' | 'dislike' | undefined;
interface LikedCommentStatus {
  id: string;
  liked: boolean;
}

interface SubjectDetailsClientProps {
  subject: Subject;
  initialLikes: number;
  initialDislikes: number;
  initialComments: Comment[]; // now includes hidden ones
  userVoteStatus: VoteStatus;
  likedCommentsStatus: LikedCommentStatus[];
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
}: SubjectDetailsClientProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

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
        default:
          return state;
      }
    },
  );

  // -------------------------------------------
  // Helper slices
  // -------------------------------------------
  const visibleComments = optimisticComments.filter(c => !c.hidden);
  const reportedComments = optimisticComments.filter(c => c.hidden);

  // -------------------------------------------
  // Handlers
  // -------------------------------------------
  const onReportComment = async (commentId: string) => {
    startTransition(async () => {
      const result = await reportComment(subject.subject_id, commentId);
      toast.success(result.message);
      if (result.hidden) {
        setOptimisticComments({ action: 'hide', payload: { commentId } });
      }
    });
  };

  const onVote = (voteType: 'like' | 'dislike') => {
    startTransition(async () => {
      const previousVote = optimisticVote;
      // Undo vote
      if (previousVote === voteType) {
        setOptimisticVote(undefined);
        if (previousVote === 'like') {
          setOptimisticLikes(Math.max(0, optimisticLikes - 1));
        } else {
          setOptimisticDislikes(Math.max(0, optimisticDislikes - 1));
        }
      } else {
        // Apply new vote & revert previous if needed
        setOptimisticVote(voteType);

        if (previousVote === 'like') {
          setOptimisticLikes(Math.max(0, optimisticLikes - 1));
          setOptimisticDislikes(optimisticDislikes + 1);
        } else if (previousVote === 'dislike') {
          setOptimisticDislikes(Math.max(0, optimisticDislikes - 1));
          setOptimisticLikes(optimisticLikes + 1);
        } else {
          if (voteType === 'like') setOptimisticLikes(optimisticLikes + 1);
          else setOptimisticDislikes(optimisticDislikes + 1);
        }
      }

      const result = await handleVote(subject.subject_id, voteType);
      toast.success(result.message);
    });
  };

  const onAddComment = async (formData: FormData) => {
    const commentText = (formData.get('commentText') as string)?.trim();
    if (!commentText) return toast.error('El comentario no puede estar vacío.');

    startTransition(async () => {
      const newCommentOptimistic: Comment & { userLiked: boolean } = {
        id: `optimistic_${Date.now()}`,
        subjectId: subject.subject_id,
        text: commentText,
        timestamp: Date.now(),
        likes: 0,
        userLiked: false,
      };

      formRef.current?.reset();
      setOptimisticComments({ action: 'add', payload: newCommentOptimistic });

      const result = await handleAddComment(subject.subject_id, formData);
      if (result.success) toast.success(result.message);
      else toast.error(result.error);
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

      const result = await handleLikeComment(subject.subject_id, commentId);
      toast.success(result.message);
    });
  };

  // -------------------------------------------
  // Render
  // -------------------------------------------
  return (
    <Card className='w-full max-w-3xl mx-auto rounded-lg overflow-hidden border border-black shadow-md'>
      {/* Header */}
      <CardHeader className='bg-gray-100/80'>
        <CardTitle className='text-2xl font-semibold tracking-tight'>
          {subject.name}
        </CardTitle>
        <CardDescription>
          Código: {subject.subject_id} • Créditos: {subject.credits}
        </CardDescription>
      </CardHeader>

      {/* Content */}
      <CardContent className='space-y-8'>
        {/* Like / Dislike */}
        <div className='flex items-center pt-4 space-x-4 mb-6'>
          <Button
            onClick={() => onVote('like')}
            disabled={isPending}
            variant='outline'
            className={
              'border hover:bg-green-50 hover:text-green-700 ' +
              (optimisticVote === 'like'
                ? 'border-green-600 text-green-600'
                : 'border-gray-300 text-gray-500')
            }
          >
            <ThumbsUp className='mr-2 h-5 w-5' /> Me gusta ({optimisticLikes})
          </Button>
          <Button
            onClick={() => onVote('dislike')}
            disabled={isPending}
            variant='outline'
            className={
              'border hover:bg-red-50 hover:text-red-700 ' +
              (optimisticVote === 'dislike'
                ? 'border-red-600 text-red-600'
                : 'border-gray-300 text-gray-500')
            }
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
          />
          <div className='flex justify-end'>
            <Button type='submit' disabled={isPending} className='gap-1'>
              <Send className='h-4 w-4' /> Enviar
            </Button>
          </div>
        </form>

        {/* Comment Tabs */}
        <Tabs defaultValue='visible' className='w-full'>
          <TabsList className='grid grid-cols-2 w-full'>
            <TabsTrigger value='visible'>
              Comentarios ({visibleComments.length})
            </TabsTrigger>
            <TabsTrigger value='reported'>
              Reportados ({reportedComments.length})
            </TabsTrigger>
          </TabsList>

          {/* Visible comments */}
          <TabsContent value='visible' className='space-y-4'>
            {visibleComments.length ? (
              visibleComments
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onLikeComment={onLikeComment}
                    onReportComment={onReportComment}
                  />
                ))
            ) : (
              <p className='text-center text-sm text-muted-foreground'>
                Aún no hay comentarios. ¡Sé el primero en comentar!
              </p>
            )}
          </TabsContent>

          {/* Reported comments */}
          <TabsContent value='reported' className='space-y-4'>
            {reportedComments.length ? (
              reportedComments
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onLikeComment={onLikeComment}
                    onReportComment={onReportComment}
                  />
                ))
            ) : (
              <p className='text-center text-sm text-muted-foreground'>
                No hay comentarios reportados.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
