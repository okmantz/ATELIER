import type { SVGProps } from 'react';

const P: Record<string, string> = {
  wardrobe: 'M12 3a2 2 0 0 1 2 2c0 1.2-1 1.7-2 2.4V9 M12 9 3 15.2a1.2 1.2 0 0 0 .7 2.2h16.6a1.2 1.2 0 0 0 .7-2.2L12 9Z',
  discover: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z M18.5 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z',
  studio: 'M12 3 3 8l9 5 9-5-9-5Z M3 12.5l9 5 9-5 M3 16.5l9 5 9-5',
  calendar: 'M4 6.5h16V20H4V6.5Z M4 10.5h16 M8 4v4 M16 4v4',
  settings: 'M4 7h9 M17 7h3 M4 17h3 M11 17h9 M15 4.5v5 M9 14.5v5',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M18 6 6 18',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  heart: 'M12 20s-7.5-4.6-7.5-10A4.4 4.4 0 0 1 12 7.2 4.4 4.4 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z',
  camera: 'M4 8h3l1.5-2.5h7L17 8h3v11H4V8Z M12 16.5a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z',
  image: 'M4 5h16v14H4V5Z M4 16l5-5 4 4 3-3 4 4 M9 9.5h.01',
  rotateL: 'M4 12a8 8 0 1 0 2.5-5.8 M4 4v4.5h4.5',
  rotateR: 'M20 12a8 8 0 1 1-2.5-5.8 M20 4v4.5h-4.5',
  trash: 'M5 7h14 M9 7V4.5h6V7 M7 7l1 13h8l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Z M13.5 6.5l4 4',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z M16.5 16.5 21 21',
  filter: 'M4 6h16 M7 12h10 M10 18h4',
  up: 'M6 14l6-6 6 6',
  down: 'M6 10l6 6 6-6',
  left: 'M14 6l-6 6 6 6',
  right: 'M10 6l6 6-6 6',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z M12 14.7a2.7 2.7 0 1 0 0-5.4 2.7 2.7 0 0 0 0 5.4Z',
  eyeoff: 'M3 3l18 18 M10 6a9 9 0 0 1 2-.5C18 5.5 21.5 12 21.5 12a16 16 0 0 1-3 3.8 M6.5 7.7A15.5 15.5 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.8',
  download: 'M12 4v11 M7 11l5 5 5-5 M5 20h14',
  upload: 'M12 16V5 M7 9l5-5 5 5 M5 20h14',
  share: 'M12 15V4 M8 8l4-4 4 4 M6 12v8h12v-8',
  swap: 'M5 8h13 M14 4l4 4-4 4 M19 16H6 M10 12l-4 4 4 4',
  layers: 'M12 3 3 8l9 5 9-5-9-5Z M3 13l9 5 9-5',
  shirt: 'M9 4 3.5 7l2 4 2-1v10h9V10l2 1 2-4L15 4a3 3 0 0 1-6 0Z',
  wash: 'M5 4h14v16H5V4Z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z M8 7h.01',
  archive: 'M4 5h16v4H4V5Z M5.5 9v10h13V9 M10 13h4',
  grid: 'M4 4h6.5v6.5H4V4Z M13.5 4H20v6.5h-6.5V4Z M4 13.5h6.5V20H4v-6.5Z M13.5 13.5H20V20h-6.5v-6.5Z',
  dice: 'M5 5h14v14H5V5Z M9 9h.01 M15 9h.01 M12 12h.01 M9 15h.01 M15 15h.01',
  front: 'M12 4v16 M4 9h16 M7 4h10l2 5v11H5V9l2-5Z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z M12 11v5 M12 8h.01',
  lock: 'M6 11h12v9H6v-9Z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
};

export type IconName = keyof typeof P;

export function Icon({ name, size = 22, filled, ...rest }: { name: IconName; size?: number; filled?: boolean } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={P[name]} />
    </svg>
  );
}
