import type { CSSProperties, ReactNode } from 'react';

export const AGENT_AVATAR_ICON_IDS = [
  'ai-core',
  'sales',
  'support',
  'host',
  'marketing',
  'academy',
  'commerce',
  'global',
  'lab',
  'spark',
] as const;

export type AgentAvatarIconId = (typeof AGENT_AVATAR_ICON_IDS)[number];

const LEGACY_AVATAR_MAP: Record<string, AgentAvatarIconId> = {
  '🤖': 'ai-core',
  '💼': 'sales',
  '🎧': 'support',
  '🏠': 'host',
  '📣': 'marketing',
  '📚': 'academy',
  '🛒': 'commerce',
  '🌎': 'global',
  '🔬': 'lab',
  '✨': 'spark',
};

function isAgentAvatarIconId(value: string): value is AgentAvatarIconId {
  return (AGENT_AVATAR_ICON_IDS as readonly string[]).includes(value);
}

export function normalizeAgentAvatarIcon(value?: string | null): AgentAvatarIconId {
  if (!value) return 'ai-core';
  if (isAgentAvatarIconId(value)) return value;
  return LEGACY_AVATAR_MAP[value] ?? 'ai-core';
}

type AgentAvatarIconProps = {
  id?: string | null;
  size?: number;
  className?: string;
  title?: string;
  style?: CSSProperties;
};

function renderSymbol(iconId: AgentAvatarIconId): ReactNode {
  switch (iconId) {
    case 'ai-core':
      return (
        <g strokeWidth="2.2">
          <path d="M32 19v4" />
          <circle cx="32" cy="17" r="2" fill="currentColor" stroke="none" />
          <rect x="21" y="24" width="22" height="17" rx="6" />
          <circle cx="28" cy="32" r="2.3" fill="currentColor" stroke="none" />
          <circle cx="36" cy="32" r="2.3" fill="currentColor" stroke="none" />
          <path d="M29 37h6" />
          <path d="M18 30h3M43 30h3" />
        </g>
      );
    case 'sales':
      return (
        <g strokeWidth="2.2">
          <rect x="20" y="26" width="24" height="17" rx="4" />
          <path d="M27 26v-3.5c0-1.9 1.6-3.5 3.5-3.5h3c1.9 0 3.5 1.6 3.5 3.5V26" />
          <path d="M20 34h24" />
          <rect x="30" y="33" width="4" height="3" rx="1" fill="currentColor" stroke="none" />
        </g>
      );
    case 'support':
      return (
        <g strokeWidth="2.2">
          <path d="M22 33v-2a10 10 0 0 1 20 0v2" />
          <rect x="20" y="32" width="4" height="9" rx="2" />
          <rect x="40" y="32" width="4" height="9" rx="2" />
          <path d="M24 42c1.7 2.7 4.6 4 8.2 4H36" />
          <circle cx="37.8" cy="46" r="1.8" fill="currentColor" stroke="none" />
        </g>
      );
    case 'host':
      return (
        <g strokeWidth="2.2">
          <path d="M20 33 32 23l12 10" />
          <path d="M23 32v10h18V32" />
          <rect x="29" y="35" width="6" height="7" rx="1.5" />
          <path d="M18 34h4M42 34h4" />
        </g>
      );
    case 'marketing':
      return (
        <g strokeWidth="2.2">
          <path d="M21 34l16-7v14l-16-7Z" />
          <path d="M37 29h4a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3h-4" />
          <path d="M22 37v6a3 3 0 0 0 4 2.8l2-.7" />
          <path d="M44 30l3-3M45 35h4M44 40l3 3" />
        </g>
      );
    case 'academy':
      return (
        <g strokeWidth="2.2">
          <path d="M20 24h11a4 4 0 0 1 4 4v14H24a4 4 0 0 0-4 4V24Z" />
          <path d="M44 24H33a4 4 0 0 0-4 4v14h11a4 4 0 0 1 4 4V24Z" />
          <path d="M32 27v15" />
        </g>
      );
    case 'commerce':
      return (
        <g strokeWidth="2.2">
          <path d="M19 23h4l3 13h14l3-10H25" />
          <path d="M29 30h11M27 35h13" />
          <circle cx="27" cy="42" r="2.3" fill="currentColor" stroke="none" />
          <circle cx="38" cy="42" r="2.3" fill="currentColor" stroke="none" />
        </g>
      );
    case 'global':
      return (
        <g strokeWidth="2.2">
          <circle cx="32" cy="32" r="10" />
          <path d="M22 32h20" />
          <path d="M32 22c3.5 3 3.5 17 0 20" />
          <path d="M32 22c-3.5 3-3.5 17 0 20" />
          <path d="M24 27c2.2 1.5 13.8 1.5 16 0" />
          <path d="M24 37c2.2-1.5 13.8-1.5 16 0" />
        </g>
      );
    case 'lab':
      return (
        <g strokeWidth="2.2">
          <path d="M28 21h8" />
          <path d="M31 21v8l-7 12a4 4 0 0 0 3.5 6h9a4 4 0 0 0 3.5-6l-7-12v-8" />
          <path d="M26 35h12" />
          <circle cx="30" cy="39" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="34" cy="42" r="1.8" fill="currentColor" stroke="none" />
          <circle cx="37" cy="38" r="1.4" fill="currentColor" stroke="none" />
        </g>
      );
    case 'spark':
      return (
        <g strokeWidth="2.2">
          <rect x="24" y="24" width="16" height="16" rx="4" />
          <path d="M28 20v4M32 20v4M36 20v4M28 40v4M32 40v4M36 40v4" />
          <path d="M20 28h4M20 32h4M20 36h4M40 28h4M40 32h4M40 36h4" />
          <path d="M28 32h8M32 28v8" />
        </g>
      );
    default:
      return null;
  }
}

export function AgentAvatarIcon({ id, size = 36, className, title, style }: AgentAvatarIconProps) {
  const iconId = normalizeAgentAvatarIcon(id);
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <circle cx="32" cy="32" r="27" strokeWidth="2" strokeOpacity="0.26" />
      <circle cx="32" cy="32" r="23" fill="currentColor" fillOpacity="0.08" stroke="none" />
      <circle cx="16" cy="23" r="1.6" fill="currentColor" fillOpacity="0.5" stroke="none" />
      <circle cx="49" cy="41" r="1.8" fill="currentColor" fillOpacity="0.5" stroke="none" />
      <circle cx="45" cy="19" r="1.2" fill="currentColor" fillOpacity="0.7" stroke="none" />
      {renderSymbol(iconId)}
    </svg>
  );
}
