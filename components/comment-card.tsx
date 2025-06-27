'use client';

import type { Comment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ThumbsUp, ShieldAlert } from 'lucide-react';
import { useTransition, useState } from 'react';

interface CommentCardProps {
  comment: Comment & { userLiked?: boolean };
  onLikeComment: (commentId: string) => Promise<void>;
  onReportComment: (id: string) => Promise<void>;
  isReported?: boolean; // New prop to indicate reported status
}

export default function CommentCard({
  comment,
  onLikeComment,
  onReportComment,
  isReported = false,
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
    startTransition(() => onReportComment(comment.id));
  };

  return (
    <>
      <Card
        className={`mb-4 transition-colors ${
          isReported
            ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900/20'
            : ''
        }`}
      >
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
              disabled={isPending || isReported} // Can't like reported comments
              aria-label='Me gusta este comentario'
              className={`flex items-center transition-colors ${
                comment.userLiked ? 'text-primary' : ''
              } ${
                isReported ? 'text-muted-foreground cursor-not-allowed' : ''
              }`}
            >
              <ThumbsUp className='mr-1 h-4 w-4' />
              {comment.likes}
            </Button>

            {/* Only show the report button for non-reported comments */}
            {!isReported ? (
              <Button
                variant='ghost'
                size='sm'
                onClick={() => setShowConfirm(true)}
                disabled={isPending}
                aria-label='Reportar comentario'
                className='text-muted-foreground hover:text-red-600 transition-colors'
              >
                Reportar
              </Button>
            ) : (
              <div className='flex items-center gap-1 text-red-500'>
                <ShieldAlert className='h-4 w-4' />
                <span>Reportado</span>
              </div>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Confirmation Modal - remains unchanged */}
      {showConfirm && (
        <div className='fixed inset-0 z-50 bg-black/40 flex items-center justify-center'>
          <div className='bg-background p-6 rounded-lg shadow-lg w-[90%] max-w-sm text-center space-y-4 border'>
            <p className='text-sm'>
              ¿Estás seguro de que querés reportar este comentario? Un
              comentario reportado será ocultado y revisado.
            </p>
            <div className='flex justify-center gap-4'>
              <Button variant='ghost' onClick={() => setShowConfirm(false)}>
                Cancelar
              </Button>
              <Button variant='destructive' onClick={confirmReport}>
                Confirmar Reporte
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
