import type { Metadata } from 'next';
import { AdminDashboard } from '@/components/tutor/AdminDashboard';

export const metadata: Metadata = {
  title: 'Админка — Учёт занятий',
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminDashboard />;
}
