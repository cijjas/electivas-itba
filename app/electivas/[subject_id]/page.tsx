// app/electivas/[subject_id]/page.tsx
import { getSubjectById } from '@/lib/data';
import { getSubjectLikes, getSubjectComments } from '@/lib/kv';
import SubjectDetailsClient from '@/components/subject-details-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cookies } from 'next/headers';

interface SubjectPageProps {
  params: { subject_id: string };
}

export default async function SubjectPage(props: SubjectPageProps) {
  const { subject_id } = await props.params;
  const subjectId = subject_id;

  const subject = await getSubjectById(subjectId);

  if (!subject) {
    return (
      <div className='container mx-auto p-4 text-center'>
        <h1 className='text-2xl font-bold mb-4'>Materia no encontrada</h1>
        <Link href='/' legacyBehavior>
          <Button
            variant='outline'
            className='bg-primary text-primary-foreground'
          >
            <ArrowLeft className='mr-2 h-4 w-4' /> Volver a Electivas
          </Button>
        </Link>
      </div>
    );
  }

  const { likes, dislikes } = await getSubjectLikes(subjectId);
  const comments = await getSubjectComments(subjectId);

  // Read user's vote from cookies on the server
  const cookieStore = await cookies();
  const userVote = cookieStore.get(`voted_subject_${subjectId}`)?.value as
    | 'like'
    | 'dislike'
    | undefined;
  const likedComments = comments.map(c => ({
    id: c.id,
    liked: !!cookieStore.get(`voted_comment_${c.id}`)?.value,
  }));

  return (
    <div className='container mx-auto p-4'>
      <Link href='/' legacyBehavior>
        <Button
          variant='ghost'
          className='mb-6  text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        >
          <ArrowLeft className='mr-2 h-4 w-4' /> Volver a Electivas
        </Button>
      </Link>
      <SubjectDetailsClient
        subject={subject}
        initialLikes={likes}
        initialDislikes={dislikes}
        initialComments={comments}
        userVoteStatus={userVote}
        likedCommentsStatus={likedComments}
      />
    </div>
  );
}
