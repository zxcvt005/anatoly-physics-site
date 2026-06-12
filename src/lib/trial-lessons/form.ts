import type { TrialCallStatus } from '@/types/tutor';

export interface TrialLessonFormInput {
  firstName: string;
  lastName: string;
  trialDate: string;
  gradeClass: string;
  goal: string;
  currentResult: string;
  proposedRate4Weeks: number;
  proposedLessonsPerWeek: number;
  parentContacts: string;
  comment?: string;
  callStatus?: TrialCallStatus;
  linkedStudentId?: string;
}
