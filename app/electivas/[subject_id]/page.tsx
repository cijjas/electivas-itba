// app/electivas/[subject_id]/page.tsx
import { getSubjectById } from '@/lib/data';
import { getSubjectLikes, getSubjectComments, hasIpVoted, hasFpVoted } from '@/lib/kv';
import SubjectDetailsClient from '@/components/subject-details-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cookies, headers } from 'next/headers';

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
  // Fetch all comments, including hidden/reported ones.
  // The client will handle filtering.
  const allComments = await getSubjectComments(subjectId);

  const cookieStore = await cookies();
  const headersList = await headers();
  
  // Get IP from headers
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 
           headersList.get('x-real-ip') ?? 
           null;
  
  // Get fingerprint from cookie
  const fingerprint = cookieStore.get('fp')?.value ?? null;
  
  // Check vote status from all sources
  const cookieVote = cookieStore.get(`voted_subject_${subjectId}`)?.value as 'like' | 'dislike' | undefined;
  const ipVote = ip ? await hasIpVoted(ip, subjectId) : null;
  const fpVote = fingerprint ? await hasFpVoted(fingerprint, subjectId) : null;
  
  // Determine final vote status: prioritize fingerprint, then cookie
  // IP is tracked but doesn't determine UI state (shared network friendly)
  const userVote = (fpVote || cookieVote || undefined) as 'like' | 'dislike' | undefined;

  const likedComments = allComments.map(c => ({
    id: c.id,
    liked: !!cookieStore.get(`voted_comment_${c.id}`)?.value,
  }));

  return (
    <div className='container mx-auto p-4'>
      <Link href='/' legacyBehavior>
        <Button
          variant='ghost'
          className='mb-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        >
          <ArrowLeft className='mr-2 h-4 w-4' /> Volver a Electivas
        </Button>
      </Link>
      <SubjectDetailsClient
        subject={subject}
        initialLikes={likes}
        initialDislikes={dislikes}
        initialComments={allComments}
        userVoteStatus={userVote}
        likedCommentsStatus={likedComments}
      />
    </div>
  );
}
