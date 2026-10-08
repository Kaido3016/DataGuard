export type IconName =
  | 'overview' | 'discovery' | 'findings' | 'pia' | 'remediation' | 'audit' | 'settings'
  | 'menu' | 'close' | 'search' | 'alert' | 'check' | 'info' | 'upload' | 'lock' | 'chevronRight'
  | 'chevronLeft' | 'chevronDown' | 'arrowUp' | 'arrowDown' | 'refresh' | 'logout' | 'user'
  | 'globe' | 'plus' | 'file' | 'clock' | 'xCircle' | 'shield' | 'filter' | 'link';

const PATHS: Record<IconName, string> = {
  overview: 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  discovery: 'M4 8V5a1 1 0 0 1 1-1h3 M16 4h3a1 1 0 0 1 1 1v3 M20 16v3a1 1 0 0 1-1 1h-3 M8 20H5a1 1 0 0 1-1-1v-3 M4 12h16',
  findings: 'M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h6',
  pia: 'M9 4h6v3H9z M7 5H6a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1 M9 14l2 2 4-4',
  remediation: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L4 17v3h3l5.3-5.3a4 4 0 0 0 5.4-5.4l-2.4 2.4-2.6-.6-.6-2.6z',
  audit: 'M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z M9 12l2 2 4-4',
  settings: 'M4 7h10 M18 7h2 M4 17h2 M10 17h10 M14 4v6 M6 14v6',
  menu: 'M4 6h16 M4 12h16 M4 18h16',
  close: 'M6 6l12 12 M18 6L6 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  alert: 'M12 3l10 18H2z M12 10v4 M12 17.5v.5',
  check: 'M5 12.5l4.5 4.5L19 7',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 11v5 M12 8v.5',
  upload: 'M12 16V4 M7 9l5-5 5 5 M4 16v4h16v-4',
  lock: 'M6 11h12v9H6z M8 11V8a4 4 0 0 1 8 0v3',
  chevronRight: 'M9 6l6 6-6 6',
  chevronLeft: 'M15 6l-6 6 6 6',
  chevronDown: 'M6 9l6 6 6-6',
  arrowUp: 'M12 19V5 M6 11l6-6 6 6',
  arrowDown: 'M12 5v14 M6 13l6 6 6-6',
  refresh: 'M20 11a8 8 0 1 0-2.3 5.7 M20 4v7h-7',
  logout: 'M10 4H5v16h5 M15 8l4 4-4 4 M19 12H9',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21a8 8 0 0 1 16 0',
  globe: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3 12h18 M12 3c3 3 3 15 0 18 M12 3c-3 3-3 15 0 18',
  plus: 'M12 5v14 M5 12h14',
  file: 'M7 3h7l5 5v13H7z M14 3v5h5',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7v5l3 2',
  xCircle: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M9 9l6 6 M15 9l-6 6',
  shield: 'M12 3l8 3v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z',
  filter: 'M4 5h16l-6 8v6l-4-2v-4z',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
};

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
