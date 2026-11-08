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
