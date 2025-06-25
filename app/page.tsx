import Link from 'next/link';
import { getElectivas } from '@/lib/data';
import { getSubjectLikes, getSubjectComments } from '@/lib/kv';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { List, ThumbsUp, ThumbsDown, MessageCircle } from 'lucide-react';

export default async function HomePage() {
  const electivas = await getElectivas();

  // Fetch likes, dislikes, and comment counts for all electives in parallel
  const electivasWithStats = await Promise.all(
    electivas.map(async subject => {
      const { likes, dislikes } = await getSubjectLikes(subject.subject_id);
      const comments = await getSubjectComments(subject.subject_id);
      return {
        ...subject,
        likes,
        dislikes,
        commentCount: comments.length,
      };
    }),
  );

  return (
    <div className='container mx-auto p-4'>
      <header className='mb-8'>
        <h1 className='text-4xl font-bold flex items-center'>
          <List className='mr-3 h-10 w-10' /> Rating de Electivas ITBA
        </h1>
        <p className='text-muted-foreground'>
          Navega y califica las materias electivas.
        </p>
      </header>

      {electivasWithStats.length === 0 ? (
        <p>No se encontraron materias electivas o falló la carga.</p>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {electivasWithStats.map(subject => (
            <Link
              href={`/electivas/${subject.subject_id}`}
              key={subject.subject_id}
              legacyBehavior
            >
              <a className='block hover:shadow-lg transition-shadow duration-200 rounded-lg'>
                <Card className='h-full flex flex-col justify-between'>
                  <div>
                    <CardHeader>
                      <CardTitle>{subject.name}</CardTitle>
                      <CardDescription>
                        ID: {subject.subject_id} - Créditos: {subject.credits}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className='text-sm text-muted-foreground'>
                        Sección: {subject.section}
                      </p>
                    </CardContent>
                  </div>
                  <CardFooter className='flex justify-start items-center gap-4 text-sm text-muted-foreground pt-4 border-t mt-4'>
                    <div className='flex items-center gap-1' title='Me gusta'>
                      <ThumbsUp className='h-4 w-4 text-green-500' />
                      <span>{subject.likes}</span>
                    </div>
                    <div
                      className='flex items-center gap-1'
                      title='No me gusta'
                    >
                      <ThumbsDown className='h-4 w-4 text-red-500' />
                      <span>{subject.dislikes}</span>
                    </div>
                    <div
                      className='flex items-center gap-1'
                      title='Comentarios'
                    >
                      <MessageCircle className='h-4 w-4 text-sky-500' />
                      <span>{subject.commentCount}</span>
                    </div>
                  </CardFooter>
                </Card>
              </a>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
