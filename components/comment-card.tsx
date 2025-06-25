'use client';

import type { Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ThumbsUp } from 'lucide-react';
import { useTransition } from 'react';

interface CommentCardProps {
  comment: Comment & { userLiked?: boolean };
  onLikeComment: (commentId: string) => Promise<void>;
}

export default function CommentCard({
  comment,
  onLikeComment,
}: CommentCardProps) {
  const [isPending, startTransition] = useTransition();

  const handleLike = () => {
    startTransition(() => {
      onLikeComment(comment.id);
    });
  };

  return (
    <Card className='mb-4'>
      <CardContent className='pt-6'>
        <p className='text-sm'>{comment.text}</p>
      </CardContent>
      <CardFooter className='flex justify-between items-center text-xs text-muted-foreground'>
        <span>{new Date(comment.timestamp).toLocaleString('es-AR')}</span>
        <div className='flex items-center gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleLike}
            disabled={isPending}
            aria-label='Me gusta este comentario'
            className={`flex items-center ${
              comment.userLiked ? 'text-primary' : ''
            }`}
          >
            <ThumbsUp className='mr-1 h-4 w-4' />
            {comment.likes}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
