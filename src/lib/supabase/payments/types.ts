import type { PaymentStatus } from '@/types/tutor';

export interface PaymentRow {
  id: string;
  app_id: string;
  student_id: string;
  amount: number;
  status: PaymentStatus;
  note: string | null;
  tax_accounted: boolean;
  created_at: string;
  updated_at: string;
}

type PaymentStudentRelation =
  | { app_id: string }
  | { app_id: string }[]
  | null;

export interface PaymentWithStudentRow extends PaymentRow {
  students: PaymentStudentRelation;
}

export type PaymentUpdateRow = Partial<{
  amount: number;
  status: PaymentStatus;
  note: string | null;
  tax_accounted: boolean;
  created_at: string;
}>;

export type PaymentsRepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
