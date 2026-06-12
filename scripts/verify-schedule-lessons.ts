import { verifyScheduleLessonsGeneration } from '../src/lib/schedule-lessons';

const errors = verifyScheduleLessonsGeneration();

if (errors.length > 0) {
  console.error('verify-schedule-lessons failed:');
  for (const error of errors) {
    console.error(`  - ${error}`);
  }
  process.exit(1);
}

console.log('verify-schedule-lessons passed');
