import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ThumbsUp, MessageCircle, BarChart2 } from 'lucide-react';

// Define a type for the component's props for better type safety
type ElectiveCardProps = {
  subject: {
    subject_id: string;
    name: string;
    credits: number;
    section: string;
    likes: number;
    dislikes: number;
    commentCount: number;
  };
  // We can pass the animation delay as a prop for a staggered effect
  animationDelay: string;
};

// A simple utility to calculate the rating percentage
const calculateRating = (likes: number, dislikes: number) => {
  const total = likes + dislikes;
  if (total === 0) return 0;
  return Math.round((likes / total) * 100);
};

export function ElectiveCard({ subject, animationDelay }: ElectiveCardProps) {
  const rating = calculateRating(subject.likes, subject.dislikes);

  return (
    <Link href={`/electivas/${subject.subject_id}`} legacyBehavior>
      <a className='block h-full group'>
        <Card
          className='h-full flex flex-col justify-between transition-all duration-300 ease-in-out
                     border-gray-200 hover:border-blue-500/50 hover:shadow-2xl hover:-translate-y-2
                     dark:border-gray-800 dark:hover:border-blue-500/50
                     opacity-0 animate-card-enter'
          style={{ animationDelay }}
        >
          <div>
            <CardHeader>
              {/* Added a subtle accent color bar */}
              <div className='w-full h-1.5 bg-blue-500 rounded-full mb-4' />
              <CardTitle className='text-xl font-semibold tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400'>
                {subject.name}
              </CardTitle>
              <CardDescription>Sección: {subject.section}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className='text-sm text-muted-foreground'>
                ID: {subject.subject_id} &middot; {subject.credits} Créditos
              </p>
            </CardContent>
          </div>
          <CardFooter className='flex-col items-start gap-4 pt-4 mt-4 border-t'>
            {/* New, more visual stats section */}
            <div className='w-full'>
              <div className='flex justify-between items-center mb-1'>
                <span className='text-xs font-medium text-green-600 dark:text-green-400'>
                  {rating}% de Aprobación
                </span>
                <div className='flex items-center gap-3 text-sm text-muted-foreground'>
                  <div className='flex items-center gap-1' title='Comentarios'>
                    <MessageCircle className='h-4 w-4 text-sky-500' />
                    <span>{subject.commentCount}</span>
                  </div>
                  <div
                    className='flex items-center gap-1'
                    title='Total de Votos'
                  >
                    <BarChart2 className='h-4 w-4 text-orange-500' />
                    <span>{subject.likes + subject.dislikes}</span>
                  </div>
                </div>
              </div>
              {/* Visual rating bar */}
              <div className='w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2'>
                <div
                  className='bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full'
                  style={{ width: `${rating}%` }}
                />
              </div>
            </div>
          </CardFooter>
        </Card>
      </a>
    </Link>
  );
}
