// app/electivas/[subject_id]/page.tsx
import { getSubjectById } from '@/lib/data';
import { getSubjectLikes, getSubjectComments, hasIpVoted, hasFpVoted, hasIpReported, hasFpReported } from '@/lib/kv';
import SubjectDetailsClient from '@/components/subject-details-client';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cookies, headers } from 'next/headers';
import { isIpBlocked, isFingerprintBlocked } from '@/lib/admin-utils';
import { redirect } from 'next/navigation';
import BlockCheckWrapper from '@/components/block-check-wrapper';

interface SubjectPageProps {
  params: { subject_id: string };
}

export default async function SubjectPage(props: SubjectPageProps) {
  const { subject_id } = await props.params;
  const subjectId = subject_id;

  // Check if user is blocked
  const cookieStore = await cookies();
  const headersList = await headers();
  
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 
           headersList.get('x-real-ip') ?? 
           null;
  
  const fingerprint = cookieStore.get('fp')?.value ?? null;
  
  if (ip && (await isIpBlocked(ip))) {
    redirect('/blocked');
  }
  if (fingerprint && (await isFingerprintBlocked(fingerprint))) {
    redirect('/blocked');
  }

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
  const allComments = await getSubjectComments(subjectId);
  
  const cookieVote = cookieStore.get(`voted_subject_${subjectId}`)?.value as 'like' | 'dislike' | undefined;
  const ipVote = ip ? await hasIpVoted(ip, subjectId) : null;
  const fpVote = fingerprint ? await hasFpVoted(fingerprint, subjectId) : null;
  
  const userVote = (fpVote || cookieVote || undefined) as 'like' | 'dislike' | undefined;

  const likedComments = allComments.map(c => ({
    id: c.id,
    liked: !!cookieStore.get(`voted_comment_${c.id}`)?.value,
  }));

  // Check report status for each comment
  const reportedComments = await Promise.all(
    allComments.map(async (c) => {
      // Primary check: fingerprint (device-level)
      const fpReported = fingerprint ? await hasFpReported(fingerprint, c.id) : false;
      // Fallback check: IP (for users without fingerprint)
      const ipReported = !fingerprint && ip ? await hasIpReported(ip, c.id) : false;
      
      return {
        id: c.id,
        reported: fpReported || ipReported,
      };
    })
  );

  return (
    <BlockCheckWrapper>
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
          reportedCommentsStatus={reportedComments}
        />
      </div>
    </BlockCheckWrapper>
  );
}
