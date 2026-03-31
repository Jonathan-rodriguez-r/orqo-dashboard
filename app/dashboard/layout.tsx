import DashboardNav from '@/components/DashboardNav';
import Topbar from '@/components/Topbar';
import HelpFab from '@/components/HelpFab';
import InactivityGuard from '@/components/InactivityGuard';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  return (
    <>
      <InactivityGuard />
      <div className="dash-shell">
        <DashboardNav userEmail={session.sub} userName={session.name} />
        <div className="dash-main">
          <Topbar />
          {children}
        </div>
      </div>
      <HelpFab />
    </>
  );
}
