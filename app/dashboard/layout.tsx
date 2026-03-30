import DashboardNav from '@/components/DashboardNav';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <div className="dash-shell">
      <DashboardNav userEmail={session.sub} userName={session.name} />
      <div className="dash-main">
        {children}
      </div>
    </div>
  );
}
