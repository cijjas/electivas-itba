import { resetSubjectVotes } from '../lib/kv';

(async () => {
  await resetSubjectVotes('82.18');
  console.log('Votes reset');
})();
