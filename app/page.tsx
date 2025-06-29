export const dynamic = 'force-dynamic';
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
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Github, // Import the GitHub icon
} from 'lucide-react';
import { cookies, headers } from 'next/headers';
import { isIpBlocked, isFingerprintBlocked } from '@/lib/admin-utils';
import { redirect } from 'next/navigation';
import BlockCheckWrapper from '@/components/block-check-wrapper';


export default async function HomePage() {
  // FIRST: Check if user is blocked before doing ANY database operations
  const cookieStore = await cookies();
  const headersList = await headers();
  
  // Get IP from headers
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 
           headersList.get('x-real-ip') ?? 
           null;
  
  // Get fingerprint from cookie
  const fingerprint = cookieStore.get('fp')?.value ?? null;
  
  // Check if user is blocked (early exit to avoid unnecessary DB calls)
  if (ip && (await isIpBlocked(ip))) {
    redirect('/blocked');
  }
  if (fingerprint && (await isFingerprintBlocked(fingerprint))) {
    redirect('/blocked');
  }

  // ONLY AFTER confirming user is not blocked, fetch data
  const electivas = await getElectivas();

  // Fetch likes, dislikes, and comment counts for all electives in parallel
  const electivasWithStats = await Promise.all(
    electivas.map(async subject => {
      const { likes, dislikes } = await getSubjectLikes(subject.subject_id);
      const comments = await getSubjectComments(subject.subject_id);

      const totalVotes = likes + dislikes;
      const aprobacion =
        totalVotes > 0 ? Math.round((likes / totalVotes) * 100) : 0;

      return {
        ...subject,
        likes,
        dislikes,
        commentCount: comments.filter(comment => !comment.hidden).length,
        aprobacion,
        totalVotes,
      };
    }),
  );

  return (
    <BlockCheckWrapper>
      <div className='bg-slate-50 min-h-screen'>
        <div className='container mx-auto px-4 py-12'>
        <header className='text-center mb-12 border-b pb-8'>
          <h1 className='text-5xl font-extrabold tracking-tight text-gray-800 flex items-center justify-center'>
            Rating Electivas ITBA
          </h1>
          <p className='text-lg text-muted-foreground mt-2 max-w-2xl mx-auto'>
            Opiná sobre las electivas para que todos elijamos mejor.
          </p>
          <div className='mt-6 max-w-2xl mx-auto bg-yellow-100 border border-yellow-300 text-yellow-900 text-sm rounded-md p-4 flex gap-4'>
            <div className='flex-shrink-0'>
              <svg
                xmlns='http://www.w3.org/2000/svg'
                className='h-7 w-7 text-yellow-600'
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01M12 5a7 7 0 100 14 7 7 0 000-14z'
                />
              </svg>
            </div>
            <div className='text-left leading-relaxed'>
              Esta página tiene la intención de mejorar la experiencia de
              cursada de todos los que la usamos. Evitá publicar cosas que no
              aporten o que no sean opiniones constructivas sobre la materia y
              sus profesores.
            </div>
          </div>
          <p className='mt-4 text-sm text-gray-500 italic'>
            Las electivas que se ven son las que están disponibles actualmente
          </p>
        </header>

        {electivasWithStats.length === 0 ? (
          <div className='text-center py-16'>
            <p className='text-xl text-muted-foreground'>
              No se encontraron materias electivas.
            </p>
          </div>
        ) : (
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8'>
            {electivasWithStats.map(subject => (
              <Link
                href={`/electivas/${subject.subject_id}`}
                key={subject.subject_id}
                passHref
                legacyBehavior
              >
                <a className='block rounded-lg'>
                  <Card className='h-full flex flex-col justify-between rounded-lg overflow-hidden border shadow-md transition-colors hover:border-black'>
                    <div>
                      <CardHeader className='bg-gray-100/80'>
                        <CardTitle className='text-xl font-semibold tracking-tight text-gray-900'>
                          {subject.name}
                        </CardTitle>
                        <CardDescription>
                          Créditos: {subject.credits}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className='pt-6'>
                        <p className='text-sm text-muted-foreground'>
                          Sección: {subject.section}
                        </p>
                        <p className='text-sm text-muted-foreground'>
                          Código: {subject.subject_id}
                        </p>
                      </CardContent>
                    </div>
                    <CardFooter className='flex justify-between items-center gap-6 text-sm text-muted-foreground bg-gray-50 p-4 border-t'>
                      <div className='flex gap-6'>
                        <div
                          className='flex items-center gap-1.5'
                          title='Me gusta'
                        >
                          <ThumbsUp className='h-4 w-4 text-green-500' />
                          <span className='font-medium'>{subject.likes}</span>
                        </div>
                        <div
                          className='flex items-center gap-1.5'
                          title='No me gusta'
                        >
                          <ThumbsDown className='h-4 w-4 text-red-500' />
                          <span className='font-medium'>
                            {subject.dislikes}
                          </span>
                        </div>
                        <div
                          className='flex items-center gap-1.5'
                          title='Comentarios'
                        >
                          <MessageCircle className='h-4 w-4 text-sky-500' />
                          <span className='font-medium'>
                            {subject.commentCount}
                          </span>
                        </div>
                      </div>
                      <div className='text-sm text-right text-gray-500'>
                        {subject.totalVotes > 0
                          ? `${subject.aprobacion}% recomendada`
                          : 'N/A'}
                      </div>
                    </CardFooter>
                  </Card>
                </a>
              </Link>
            ))}
          </div>
        )}

        <footer className='text-center mt-20 pt-8 border-t'>
          <a
            href='https://github.com/cijjas/electivas-itba'
            target='_blank'
            rel='noopener noreferrer'
            className='inline-flex items-center text-muted-foreground hover:text-blue-600 transition-colors'
          >
            <Github className='h-5 w-5 mr-2' />
            Aca podés ver el código fuente y contribuir
          </a>
        </footer>
      </div>
    </div>
    </BlockCheckWrapper>
  );
}
