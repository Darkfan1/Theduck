export type TimePhase = 'morning' | 'day' | 'sunset' | 'night';

export interface TimeConfig {
  phase: TimePhase;
  label: string;
  emoji: string;
  skyColor: string;
  skyEmissive: string;
  skyEmissiveIntensity: number;
  isNight: boolean;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  dirColor: string;
  dirIntensity: number;
  dirPos: [number, number, number];
  windowRimColor: string;
  windowRimIntensity: number;
  pendantIntensity: number;
  pendantEmissiveIntensity: number;
  floorLampIntensity: number;
  floorLampEmissiveIntensity: number;
  beamColor: string;
  beamFloorColor: string;
  beamOpacity: number;
  floorPatchOpacity: number;
  dustColor: string;
}

export const TIME_CONFIGS: Record<TimePhase, TimeConfig> = {
  morning: {
    phase: 'morning',
    label: 'Bình minh',
    emoji: '🌅',
    skyColor: '#fdba74',
    skyEmissive: '#fde047',
    skyEmissiveIntensity: 0.65,
    isNight: false,
    hemiSky: '#ffeedd',
    hemiGround: '#4a2c17',
    hemiIntensity: 0.95,
    dirColor: '#fde68a',
    dirIntensity: 1.45,
    dirPos: [5, 10, 6],
    windowRimColor: '#f59e0b',
    windowRimIntensity: 1.1,
    pendantIntensity: 6,
    pendantEmissiveIntensity: 2.2,
    floorLampIntensity: 3,
    floorLampEmissiveIntensity: 1.0,
    beamColor: '#fde68a',
    beamFloorColor: '#fef08a',
    beamOpacity: 0.05,
    floorPatchOpacity: 0.14,
    dustColor: '#fffbeb',
  },
  day: {
    phase: 'day',
    label: 'Ban ngày',
    emoji: '☀️',
    skyColor: '#9ed8ff',
    skyEmissive: '#8fd0ff',
    skyEmissiveIntensity: 0.7,
    isNight: false,
    hemiSky: '#fff8ed',
    hemiGround: '#593822',
    hemiIntensity: 1.05,
    dirColor: '#fff3dc',
    dirIntensity: 1.75,
    dirPos: [6, 12, 7],
    windowRimColor: '#fcd34d',
    windowRimIntensity: 0.8,
    pendantIntensity: 4,
    pendantEmissiveIntensity: 1.8,
    floorLampIntensity: 1.5,
    floorLampEmissiveIntensity: 0.6,
    beamColor: '#fef08a',
    beamFloorColor: '#fffbeb',
    beamOpacity: 0.05,
    floorPatchOpacity: 0.16,
    dustColor: '#fffbeb',
  },
  sunset: {
    phase: 'sunset',
    label: 'Hoàng hôn',
    emoji: '🌇',
    skyColor: '#ea580c',
    skyEmissive: '#f43f5e',
    skyEmissiveIntensity: 0.85,
    isNight: false,
    hemiSky: '#fed7aa',
    hemiGround: '#3e1f13',
    hemiIntensity: 0.85,
    dirColor: '#fb923c',
    dirIntensity: 1.55,
    dirPos: [4, 7, 5],
    windowRimColor: '#f97316',
    windowRimIntensity: 1.5,
    pendantIntensity: 14,
    pendantEmissiveIntensity: 3.2,
    floorLampIntensity: 7,
    floorLampEmissiveIntensity: 2.2,
    beamColor: '#fb923c',
    beamFloorColor: '#fdba74',
    beamOpacity: 0.07,
    floorPatchOpacity: 0.2,
    dustColor: '#fed7aa',
  },
  night: {
    phase: 'night',
    label: 'Buổi tối',
    emoji: '🌙',
    skyColor: '#0c1322',
    skyEmissive: '#1e1b4b',
    skyEmissiveIntensity: 0.5,
    isNight: true,
    hemiSky: '#423024',
    hemiGround: '#1f140c',
    hemiIntensity: 0.45,
    dirColor: '#fed7aa',
    dirIntensity: 0.38,
    dirPos: [-4, 9, -5],
    windowRimColor: '#f59e0b',
    windowRimIntensity: 0.4,
    pendantIntensity: 22,
    pendantEmissiveIntensity: 3.0,
    floorLampIntensity: 12,
    floorLampEmissiveIntensity: 2.2,
    beamColor: '#fbbf24',
    beamFloorColor: '#fde68a',
    beamOpacity: 0.03,
    floorPatchOpacity: 0.08,
    dustColor: '#fef08a',
  },
};

export function getRealtimePhase(date = new Date()): TimePhase {
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= 5 && h < 8) return 'morning';
  if (h >= 8 && h < 16.5) return 'day';
  if (h >= 16.5 && h < 18.75) return 'sunset';
  return 'night';
}
