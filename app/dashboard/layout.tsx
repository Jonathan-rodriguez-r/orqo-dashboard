import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dash-shell">
      <Sidebar />
      <div className="dash-main">
        {children}
      </div>
    </div>
  );
}
