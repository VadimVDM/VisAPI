'use client';

import { DashboardLayout } from '@/components/ui/DashboardLayout';

interface DashboardLayoutPageProps {
  children: React.ReactNode;
}

export default function DashboardLayoutPage({
  children,
}: DashboardLayoutPageProps) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
