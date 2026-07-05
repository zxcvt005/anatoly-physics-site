export type PaymentStatus = 'confirmed' | 'pending' | 'rejected';

export type LessonStatus = 'completed' | 'scheduled';

export type LessonPaymentStatus = 'paid' | 'unpaid' | 'pending';

export type AttendanceStatus =
  | 'planned'
  | 'present'
  | 'absent'
  | 'late'
  | 'transferred';

export type StudentActivityStatus = 'active' | 'paused';

export type HomeworkStatus = 'done' | 'partial' | 'not_done';

export type LessonType = 'regular' | 'makeup' | 'extra' | 'transfer';

export type MakeupStatus = 'none' | 'scheduled' | 'completed';

export type LessonDisplayStatus =
  | 'completed'
  | 'scheduled'
  | 'paid'
  | 'pending'
  | 'unpaid';

export interface Student {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  gradeClass: string;
  token: string;
  rate4Weeks: number;
  lessonsPerWeek: number;
  ratePerLesson: number;
  parentContacts?: string;
  activityStatus?: StudentActivityStatus;
  pauseComment?: string;
  /** Дата начала обучения (YYYY-MM-DD), если задана в CRM */
  startedAt?: string;
  /** Дата создания записи ученика в БД */
  createdAt?: string;
}

export type TrialCallStatus = 'not_called' | 'agreed' | 'not_agreed';

export interface TrialLesson {
  id: string;
  firstName: string;
  lastName: string;
  trialDate: string;
  gradeClass: string;
  goal: string;
  currentResult: string;
  proposedRate4Weeks: number;
  proposedLessonsPerWeek: number;
  parentContacts: string;
  callStatus: TrialCallStatus;
  comment?: string;
  linkedStudentId?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  note?: string;
  /** Учтено в налоговой отчётности */
  taxAccounted?: boolean;
}

/** Зафиксированные показатели закрытого месяца (не пересчитываются) */
export interface RevenueMonthSnapshot {
  monthKey: string;
  potentialIncome: number;
  receivedIncome: number;
  frozenAt: string;
}

export interface Lesson {
  id: string;
  studentId: string;
  date: string;
  status: LessonStatus;
  paymentStatus: LessonPaymentStatus;
  lessonType: LessonType;
  isOutsideSchedule: boolean;
  makeupForLessonId?: string;
  makeupStatus?: MakeupStatus;
  isChargeable?: boolean;
  topic?: string;
  attendance?: AttendanceStatus;
  homeworkStatus?: HomeworkStatus;
  homeworkScore?: number;
  comment?: string;
  endTime?: string;
  transferredToLessonId?: string;
  transferredFromLessonId?: string;
  transferComment?: string;
}

/** Слот недельного расписания для страницы ученика (производный формат) */
export interface ScheduleSlot {
  id: string;
  studentId: string;
  dayOfWeek: number;
  time: string;
}

/** Слот расписания ассистента: один временной интервал, несколько учеников */
export interface WeeklyScheduleSlot {
  id: string;
  weekday: number;
  startTime: string;
  endTime: string;
  studentIds: string[];
  comment?: string;
  /** Дата создания слота в БД */
  createdAt?: string;
  /** Дата привязки ученика к слоту (studentId → ISO timestamp) */
  studentJoinedAt?: Partial<Record<string, string>>;
}

export interface AssistantTodayItem {
  id: string;
  lessonId: string;
  studentId: string;
  timeLabel: string;
  lessonType?: LessonType;
  isOutsideSchedule?: boolean;
  /** Moscow calendar day for retro slot marking (defaults to today). */
  dateKey?: string;
}

export type AssistantUnmarkedSource = 'regular-slot' | 'one-off';

export interface AssistantUnmarkedItem extends AssistantTodayItem {
  dateKey: string;
  dateLabel: string;
  weekdayLabel: string;
  source: AssistantUnmarkedSource;
}

export interface TransferLessonInput {
  date: string;
  time: string;
  endTime?: string;
  comment?: string;
}

export interface AssistantMarkingData {
  wasPresent: boolean;
  isTransferred?: boolean;
  transfer?: TransferLessonInput;
  topic?: string;
  homeworkDone?: boolean;
  homeworkScore?: number;
}

export interface AssistantMarkedEntry {
  id: string;
  studentId: string;
  timeLabel: string;
  dateLabel: string;
  source: 'today' | 'history';
  lessonId?: string;
  marking: AssistantMarkingData;
  markedAt: string;
}

export interface OneOffLessonInput {
  type: 'makeup' | 'extra';
  studentId: string;
  date: string;
  time: string;
  endTime?: string;
  topic?: string;
  comment?: string;
  makeupForLessonId?: string;
}

export type IntensiveStatus = 'not_started' | 'in_progress' | 'completed';

export interface Intensive {
  id: string;
  title: string;
}

export interface StudentIntensiveProgress {
  studentId: string;
  intensiveId: string;
  status: IntensiveStatus;
}
