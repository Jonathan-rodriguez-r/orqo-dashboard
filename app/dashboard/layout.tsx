import DashboardNav from '@/components/DashboardNav';
import Topbar from '@/components/Topbar';
import InactivityGuard from '@/components/InactivityGuard';
import { getSession } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { getWorkspaceConfig } from '@/lib/workspace-config';
import { getWorkspaceClient } from '@/lib/clients';
import { redirect } from 'next/navigation';
import type { CSSProperties } from 'react';

function normalizeHexColor(value: string, fallback: string) {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toUpperCase() : fallback;
}

function toRgba(hex: string, alpha: number) {
  const safe = normalizeHexColor(hex, '#000000').slice(1);
  const r = parseInt(safe.slice(0, 2), 16);
  const g = parseInt(safe.slice(2, 4), 16);
  const b = parseInt(safe.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${a})`;
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/login');

  let primary = '#2CB978';
  let secondary = '#0B100D';
  try {
    const db = await getDb();
    const client = await getWorkspaceClient(db, session.workspaceId);
    const account = await getWorkspaceConfig(db, session.workspaceId, 'account', {
      defaults: { brand_primary_color: '#2CB978', brand_secondary_color: '#0B100D' } as any,
    });
    const workspacePrimary = normalizeHexColor(String(account?.brand_primary_color ?? ''), '#2CB978');
    const workspaceSecondary = normalizeHexColor(String(account?.brand_secondary_color ?? ''), '#0B100D');

    const pref = await db.collection('user_preferences').findOne(
      { userId: session.sub, workspaceId: session.workspaceId, clientId: client.clientId },
      { projection: { _id: 0, dashboardTheme: 1 } }
    );
    const prefEnabled = Boolean(pref?.dashboardTheme?.enabled);
    const prefPrimary = normalizeHexColor(String(pref?.dashboardTheme?.primaryColor ?? ''), workspacePrimary);
    const prefSecondary = normalizeHexColor(String(pref?.dashboardTheme?.secondaryColor ?? ''), workspaceSecondary);

    primary = prefEnabled ? prefPrimary : workspacePrimary;
    secondary = prefEnabled ? prefSecondary : workspaceSecondary;
  } catch {
    // Keep defaults if DB is unavailable during render.
  }

  const brandVars: CSSProperties = {
    ['--acc' as any]: primary,
    ['--acc-g' as any]: toRgba(primary, 0.12),
    ['--acc-g2' as any]: toRgba(primary, 0.06),
    ['--portal-brand-glow-1' as any]: toRgba(primary, 0.2),
    ['--portal-brand-glow-2' as any]: toRgba(primary, 0.08),
    ['--portal-brand-shadow' as any]: toRgba(primary, 0.18),
    ['--portal-brand-gradient' as any]: `linear-gradient(135deg, ${toRgba(primary, 0.22)}, ${toRgba(secondary, 0.2)})`,
  };

  return (
    <>
      <InactivityGuard />
      <div className="dash-shell" style={brandVars}>
        <DashboardNav userEmail={session.sub} userName={session.name} />
        <div className="dash-main">
          <Topbar />
          {children}
        </div>
      </div>
    </>
  );
}
