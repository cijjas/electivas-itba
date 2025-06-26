'use client';

import type { Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ThumbsUp } from 'lucide-react';
import { useTransition, useState } from 'react';

interface CommentCardProps {
  comment: Comment & { userLiked?: boolean };
  onLikeComment: (commentId: string) => Promise<void>;
  onReportComment: (id: string) => Promise<void>;
}

export default function CommentCard({
  comment,
  onLikeComment,
  onReportComment,
}: CommentCardProps) {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const formattedDate = new Date(comment.timestamp).toLocaleDateString(
    'es-AR',
    {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    },
  );

  const handleLike = () => {
    startTransition(() => onLikeComment(comment.id));
  };

  const confirmReport = () => {
    setShowConfirm(false);
    onReportComment(comment.id);
  };

  return (
    <>
      <Card className='mb-4'>
        <CardContent className='pt-6'>
          <p className='text-sm'>{comment.text}</p>
        </CardContent>
        <CardFooter className='flex justify-between items-center text-xs text-muted-foreground pt-2'>
          <span>{formattedDate}</span>
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
            <Button
              variant='ghost'
              size='sm'
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
              aria-label='Reportar comentario'
              className='text-red-500'
            >
              Reportar
            </Button>
          </div>
        </CardFooter>
      </Card>

      {showConfirm && (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center'>
          <div className='bg-white dark:bg-gray-900 p-6 rounded-lg shadow-lg w-[90%] max-w-sm text-center space-y-4'>
            <p className='text-sm'>
              ¿Estás seguro de que querés reportar este comentario?
            </p>
            <div className='flex justify-center gap-4'>
              <Button variant='ghost' onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button variant='destructive' onClick={confirmReport}>
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
