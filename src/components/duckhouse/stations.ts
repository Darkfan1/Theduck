export type StationKey = 'overview' | 'experience' | 'skills' | 'projects' | 'contact';

export interface StationDef {
  key: StationKey;
  number: string;
  emoji: string;
  /** Short label shown in 3D & dock */
  label: string;
  /** Place inside the duck house */
  place: string;
  color: string;
  /** Spot on the floor [x, z] where the duck stands to interact */
  interact: [number, number];
  /** Circular collider [x, z, radius] around the furniture */
  collider: [number, number, number];
  /** Floating label position */
  labelAt: [number, number, number];
}

export const STATIONS: StationDef[] = [
  {
    key: 'overview',
    number: '01',
    emoji: '🛋️',
    label: 'Về Tôi',
    place: 'Phòng khách',
    color: '#ffb703',
    interact: [-5, -2.1],
    collider: [-5, -4.3, 1.6],
    labelAt: [-5, 2.2, -4.4],
  },
  {
    key: 'experience',
    number: '02',
    emoji: '🏭',
    label: 'Kinh Nghiệm',
    place: 'Xưởng in mini',
    color: '#38bdf8',
    interact: [-5, 1.8],
    collider: [-7, 2, 1.5],
    labelAt: [-7, 2.4, 1.8],
  },
  {
    key: 'skills',
    number: '03',
    emoji: '💻',
    label: 'Kỹ Năng',
    place: 'Bàn lab công nghệ',
    color: '#a78bfa',
    interact: [4.8, -2.6],
    collider: [5, -4.7, 1.5],
    labelAt: [4.8, 2.6, -4.9],
  },
  {
    key: 'projects',
    number: '04',
    emoji: '📦',
    label: 'Dự Án',
    place: 'Kệ kho Mini ERP',
    color: '#34d399',
    interact: [5.1, 1.8],
    collider: [7.1, 1.8, 1.4],
    labelAt: [7.2, 3.2, 1.7],
  },
  {
    key: 'contact',
    number: '05',
    emoji: '📮',
    label: 'Liên Hệ',
    place: 'Cửa & hòm thư',
    color: '#f472b6',
    interact: [0.6, -4.2],
    collider: [1.5, -5.2, 0.5],
    labelAt: [0.7, 3.1, -5.4],
  },
];

/** Plants, server rack, kiosk… */
export const EXTRA_COLLIDERS: [number, number, number][] = [
  [-7.1, 4.8, 0.5],
  [7.1, 4.8, 0.5],
  [7, -5.2, 0.6],
  [6.3, 3.7, 0.45],
  [-7.2, 3.8, 0.6],
];

export const ROOM_BOUNDS = { minX: -7.5, maxX: 7.5, minZ: -5.5, maxZ: 5.5 };

export const STATION_ORDER: StationKey[] = STATIONS.map((s) => s.key);

export const getStation = (key: StationKey): StationDef =>
  STATIONS.find((s) => s.key === key) as StationDef;

export const isStationKey = (v: string): v is StationKey =>
  (STATION_ORDER as string[]).includes(v);
