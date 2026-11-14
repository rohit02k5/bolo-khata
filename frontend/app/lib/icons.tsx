// One icon language: 24px grid, 2px stroke, round caps/joins.
// Emoji stays only for product items (meaningful there), never for chrome.
import { CSSProperties } from "react";

type P = { size?: number; stroke?: number; style?: CSSProperties;
  className?: string };

function I({ children, size = 24, stroke = 2, style, className }:
  P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
      strokeLinejoin="round" style={style} className={className}
      aria-hidden="true">{children}</svg>
  );
}

export const MicIcon = (p: P) => (
  <I {...p}>
    <rect x="9" y="2.5" width="6" height="12" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0" />
    <path d="M12 18v3.5" />
  </I>);
export const StopIcon = (p: P) => (
  <I {...p}><rect x="7" y="7" width="10" height="10" rx="2.5" /></I>);
export const BookIcon = (p: P) => (
  <I {...p}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" />
    <path d="M4 20.5V5.5" /><path d="M8 7.5h8M8 11h5" />
  </I>);
export const BoxIcon = (p: P) => (
  <I {...p}>
    <path d="M3.5 8 12 3.5 20.5 8v8L12 20.5 3.5 16Z" />
    <path d="M3.5 8 12 12.5 20.5 8M12 12.5v8" />
  </I>);
export const ListIcon = (p: P) => (
  <I {...p}>
    <path d="M8.5 6.5h12M8.5 12h12M8.5 17.5h12" />
    <path d="M3.5 6.5h.01M3.5 12h.01M3.5 17.5h.01" strokeWidth={2.6} />
  </I>);
export const StoreIcon = (p: P) => (
  <I {...p}>
    <path d="M4 9.5 5.5 4h13L20 9.5" />
    <path d="M4 9.5h16v2a2.6 2.6 0 0 1-5.2 0 2.6 2.6 0 0 1-5.6 0 2.6 2.6 0 0 1-5.2 0Z" />
    <path d="M5.5 14.5V20h13v-5.5" /><path d="M9.5 20v-4h5v4" />
  </I>);
export const UndoIcon = (p: P) => (
  <I {...p}>
    <path d="M8 5 4 9l4 4" /><path d="M4 9h10a6 6 0 0 1 0 12h-4" />
  </I>);
export const RefreshIcon = (p: P) => (
  <I {...p}>
    <path d="M20 5v5h-5" /><path d="M4 19v-5h5" />
    <path d="M19.5 10a8 8 0 0 0-14-3M4.5 14a8 8 0 0 0 14 3" />
  </I>);
export const SunIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </I>);
export const MoonIcon = (p: P) => (
  <I {...p}><path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a7 7 0 0 0 9.5 9.5Z" /></I>);
export const SearchIcon = (p: P) => (
  <I {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20.5 20.5-5-5" /></I>);
export const SpeakerIcon = (p: P) => (
  <I {...p}>
    <path d="M4 9.5v5h3.5L13 19V5L7.5 9.5Z" />
    <path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19 6a8.5 8.5 0 0 1 0 12" />
  </I>);
export const CheckIcon = (p: P) => (
  <I {...p}><path d="m4.5 12.5 5 5L19.5 7" /></I>);
export const XIcon = (p: P) => (
  <I {...p}><path d="M6 6l12 12M18 6 6 18" /></I>);
export const PlayIcon = (p: P) => (
  <I {...p}><path d="M7 4.5 19 12 7 19.5Z" /></I>);
export const PauseIcon = (p: P) => (
  <I {...p}><path d="M8 5v14M16 5v14" strokeWidth={2.6} /></I>);
export const CashIcon = (p: P) => (
  <I {...p}>
    <rect x="2.5" y="6.5" width="19" height="11" rx="2.5" />
    <circle cx="12" cy="12" r="3" /><path d="M6 10v4M18 10v4" />
  </I>);
export const UpiIcon = (p: P) => (
  <I {...p}>
    <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
    <path d="M10.5 18.5h3" />
  </I>);
export const DotsIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="5.5" r="1.1" fill="currentColor" />
    <circle cx="12" cy="12" r="1.1" fill="currentColor" />
    <circle cx="12" cy="18.5" r="1.1" fill="currentColor" />
  </I>);
export const UserIcon = (p: P) => (
  <I {...p}>
    <circle cx="12" cy="8" r="4" /><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
  </I>);
export const CalIcon = (p: P) => (
  <I {...p}>
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </I>);
export const ChartIcon = (p: P) => (
  <I {...p}>
    <path d="M3.5 20.5h17" /><path d="M7 16v-5M12 16V6M17 16v-8" strokeWidth={2.6} />
  </I>);
export const BellIcon = (p: P) => (
  <I {...p}>
    <path d="M6 9.5a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
    <path d="M10 19.5a2.2 2.2 0 0 0 4 0" />
  </I>);
export const WalletIcon = (p: P) => (
  <I {...p}>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v4" />
    <path d="M4 7.5V17a2.5 2.5 0 0 0 2.5 2.5H20V9H6.5A2.5 2.5 0 0 1 4 7.5Z" />
    <circle cx="16" cy="14" r="1.1" fill="currentColor" />
  </I>);
export const OutIcon = (p: P) => (
  <I {...p}>
    <path d="M14 4h5.5v16H14" /><path d="M9.5 8.5 13 12l-3.5 3.5M13 12H3.5" />
  </I>);

// Brand marks — filled, not stroked (provider logos).
export const GoogleIcon = ({ size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
    <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
  </svg>);
export const DiscordIcon = ({ size = 24 }: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#5865F2" aria-hidden="true">
    <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>);
