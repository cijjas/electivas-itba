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
import { ThumbsUp, ThumbsDown, MessageCircle, Send } from 'lucide-react';
import { handleVote, handleAddComment, handleLikeComment } from '@/app/actions';
import CommentCard from './comment-card';
import { toast } from 'sonner';

type VoteStatus = 'like' | 'dislike' | undefined;
type LikedCommentStatus = { id: string; liked: boolean };

interface SubjectDetailsClientProps {
  subject: Subject;
  initialLikes: number;
  initialDislikes: number;
  initialComments: Comment[];
  userVoteStatus: VoteStatus;
  likedCommentsStatus: LikedCommentStatus[];
}

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

  const [optimisticLikes, setOptimisticLikes] = useOptimistic(initialLikes);
  const [optimisticDislikes, setOptimisticDislikes] =
    useOptimistic(initialDislikes);
  const [optimisticVote, setOptimisticVote] = useOptimistic(userVoteStatus);
  const [optimisticComments, setOptimisticComments] = useOptimistic(
    initialComments.map(c => ({
      ...c,
      userLiked: likedCommentsStatus.find(lc => lc.id === c.id)?.liked || false,
    })),
    (state, { action, payload }: { action: 'add' | 'like'; payload: any }) => {
      if (action === 'add') {
        return [...state, payload];
      }
      if (action === 'like') {
        return state.map(c =>
          c.id === payload.commentId
            ? {
                ...c,
                likes: payload.newLikeCount,
                userLiked: payload.newUserLiked,
              }
            : c,
        );
      }
      return state;
    },
  );

  const onVote = (voteType: 'like' | 'dislike') => {
    startTransition(async () => {
      const previousVote = optimisticVote;

      if (previousVote === voteType) {
        // Undo vote
        setOptimisticVote(undefined);
        if (voteType === 'like') {
          setOptimisticLikes(Math.max(0, optimisticLikes - 1));
        } else {
          setOptimisticDislikes(Math.max(0, optimisticDislikes - 1));
        }
      } else {
        // Set new vote
        setOptimisticVote(voteType);

        if (previousVote === 'like') {
          setOptimisticLikes(Math.max(0, optimisticLikes - 1));
          setOptimisticDislikes(optimisticDislikes + 1);
        } else if (previousVote === 'dislike') {
          setOptimisticDislikes(Math.max(0, optimisticDislikes - 1));
          setOptimisticLikes(optimisticLikes + 1);
        } else {
          if (voteType === 'like') {
            setOptimisticLikes(optimisticLikes + 1);
          } else {
            setOptimisticDislikes(optimisticDislikes + 1);
          }
        }
      }

      const result = await handleVote(subject.subject_id, voteType);
      toast.success(result.message);
    });
  };

  const onAddComment = async (formData: FormData) => {
    const commentText = formData.get('commentText') as string;
    if (!commentText || commentText.trim() === '') {
      toast.error('El comentario no puede estar vacío.');
      return;
    }

    startTransition(async () => {
      const newCommentOptimistic = {
        id: `optimistic_${Date.now()}`,
        subjectId: subject.subject_id,
        text: commentText.trim(),
        timestamp: Date.now(),
        likes: 0,
        userLiked: false,
      };
      formRef.current?.reset();
      setOptimisticComments({ action: 'add', payload: newCommentOptimistic });
      const result = await handleAddComment(subject.subject_id, formData);
      if (result.success) toast.success(result.message);
      else if (result.error) toast.error(result.error);
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

  return (
    <Card className='w-full max-w-2xl mx-auto'>
      <CardHeader>
        <CardTitle className='text-3xl'>{subject.name}</CardTitle>
        <CardDescription>
          ID: {subject.subject_id} | Créditos: {subject.credits}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className='flex items-center space-x-4 mb-6'>
          <Button
            onClick={() => onVote('like')}
            disabled={isPending}
            variant={optimisticVote === 'like' ? 'outline' : 'outline'}
            className={
              'border hover:bg-green-50 hover:text-green-700 data-[variant=default]:bg-green-600 data-[variant=default]:text-white ' +
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
            variant={optimisticVote === 'dislike' ? 'outline' : 'outline'}
            className={
              'border hover:bg-red-50 hover:text-red-700 data-[variant=default]:bg-red-600 data-[variant=default]:text-white ' +
              (optimisticVote === 'dislike'
                ? 'border-red-600 text-red-600'
                : 'border-gray-300 text-gray-500')
            }
          >
            <ThumbsDown className='mr-2 h-5 w-5' /> No me gusta (
            {optimisticDislikes})
          </Button>
        </div>

        <div className='mt-8'>
          <h3 className='text-xl font-semibold mb-4 flex items-center'>
            <MessageCircle className='mr-2 h-6 w-6' /> Comentarios (
            {optimisticComments.length})
          </h3>
          <form
            onSubmit={e => {
              e.preventDefault();
              onAddComment(new FormData(e.currentTarget));
            }}
            ref={formRef}
            className='mb-6'
          >
            <Textarea
              name='commentText'
              placeholder='Escribe tu comentario...'
              className='mb-2'
              rows={3}
              disabled={isPending}
            />
            <Button
              type='submit'
              disabled={isPending}
              className='w-full sm:w-auto'
            >
              <Send className='mr-2 h-4 w-4' /> Enviar Comentario
            </Button>
          </form>

          <div className='space-y-4'>
            {optimisticComments.length > 0 ? (
              optimisticComments
                .slice()
                .sort((a, b) => b.timestamp - a.timestamp)
                .map(comment => (
                  <CommentCard
                    key={comment.id}
                    comment={comment}
                    onLikeComment={onLikeComment}
                  />
                ))
            ) : (
              <p className='text-sm text-muted-foreground'>
                Aún no hay comentarios. ¡Sé el primero en comentar!
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
