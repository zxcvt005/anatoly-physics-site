import type { StudentActivityStatus } from '@/types/tutor';

export interface StudentFormInput {
  firstName: string;
  lastName: string;
  gradeClass: string;
  rate4Weeks: number;
  lessonsPerWeek: number;
  parentContacts?: string;
  activityStatus?: StudentActivityStatus;
  pauseComment?: string;
}
