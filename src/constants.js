// ============================================================
// CONSTANTS
// ============================================================

export const COLORS = {
  bg: '#0B0B1E',
  card: '#161632',
  cardHighlight: '#1E1E42',
  primary: '#FF375F',
  secondary: '#5E5CE6',
  accent: '#30D158',
  warning: '#FF9F0A',
  info: '#64D2FF',
  text: '#FFFFFF',
  textSecondary: '#98989F',
  textMuted: '#636366',
  border: 'rgba(255,255,255,0.08)',
  danger: '#FF453A',
  teamA: '#5E5CE6',
  teamB: '#FF375F',
  deuce: '#FF9F0A',
  scoreGlow: 'rgba(255,255,255,0.15)',
};

export const SPORTS_CONFIG = {
  badminton: {
    name: 'Badminton',
    nameLocal: 'แบดมินตัน',
    emoji: '🏸',
    color: '#FF375F',
    scoreButtons: [1],
    type: 'setBased',
    proRules: {
      bestOf: 3,
      pointsToWin: 21,
      deuceAt: 20,
      maxPoints: 30,
      timerType: 'stopwatch',
    },
    customDefaults: { pointsToWin: 21, totalSets: 3, deuceEnabled: true },
  },
  basketball: {
    name: 'Basketball',
    nameLocal: 'บาสเกตบอล',
    emoji: '🏀',
    color: '#FF9F0A',
    scoreButtons: [1, 2, 3],
    scoreLabels: ['Free', '2PT', '3PT'],
    type: 'periodBased',
    proRules: {
      periods: 4,
      periodName: 'Quarter',
      periodNameLocal: 'ควอเตอร์',
      periodTime: 600,
      overtimeTime: 300,
      timerType: 'countdown',
    },
    customDefaults: { pointsToWin: 50, totalSets: 1, deuceEnabled: false },
  },
  volleyball: {
    name: 'Volleyball',
    nameLocal: 'วอลเลย์บอล',
    emoji: '🏐',
    color: '#4ECDC4',
    scoreButtons: [1],
    type: 'setBased',
    proRules: {
      bestOf: 5,
      pointsToWin: 25,
      finalSetPoints: 15,
      deuceAt: 24,
      finalSetDeuceAt: 14,
      maxPoints: null,
      timerType: 'stopwatch',
    },
    customDefaults: { pointsToWin: 25, totalSets: 5, deuceEnabled: true },
  },
  football: {
    name: 'Football',
    nameLocal: 'ฟุตบอล',
    emoji: '⚽',
    color: '#30D158',
    scoreButtons: [1],
    type: 'periodBased',
    proRules: {
      periods: 2,
      periodName: 'Half',
      periodNameLocal: 'ครึ่ง',
      periodTime: 2700,
      timerType: 'stopwatch',
    },
    customDefaults: { pointsToWin: 5, totalSets: 1, deuceEnabled: false },
  },
  tableTennis: {
    name: 'Table Tennis',
    nameLocal: 'ปิงปอง',
    emoji: '🏓',
    color: '#5E5CE6',
    scoreButtons: [1],
    type: 'setBased',
    proRules: {
      bestOf: 5,
      pointsToWin: 11,
      deuceAt: 10,
      maxPoints: null,
      timerType: 'stopwatch',
    },
    customDefaults: { pointsToWin: 11, totalSets: 5, deuceEnabled: true },
  },
  chess: {
    name: 'Chess',
    nameLocal: 'หมากรุก',
    emoji: '♟️',
    color: '#8B6914',
    scoreButtons: [1],
    type: 'chessClock',
    proRules: {
      timePerPlayer: 600, // 10 minutes
      increment: 0,
      timerType: 'chessClock',
    },
    customDefaults: { pointsToWin: 1, totalSets: 1, deuceEnabled: false, timePerPlayer: 10, increment: 0 },
  },
  golf: {
    name: 'Golf',
    nameLocal: 'กอล์ฟ',
    emoji: '⛳',
    color: '#2E7D32',
    scoreButtons: [1],
    type: 'golf',
    proRules: { timerType: 'stopwatch' },
    customDefaults: { pointsToWin: 1, totalSets: 1, deuceEnabled: false, totalHoles: 9, startingHole: 1 },
  },
};

export const SPORT_KEYS = ['badminton', 'basketball', 'volleyball', 'football', 'tableTennis', 'chess', 'golf'];

export const MODE_INFO = {
  pro: { label: 'Pro', emoji: '🏆', desc: 'กฎจริง / Deuce / เซ็ต', color: COLORS.primary },
  casual: { label: 'Casual', emoji: '😎', desc: 'นับไปเรื่อยๆ', color: COLORS.accent },
  custom: { label: 'Custom', emoji: '⚙️', desc: 'กำหนดเอง', color: COLORS.warning },
};

export const SET_OPTIONS = [1, 3, 5, 7];
export const COLOR_OPTIONS = ['#FF375F', '#FF9F0A', '#4ECDC4', '#30D158', '#5E5CE6', '#AF52DE', '#FF6B6B', '#64D2FF'];
export const SCORE_PRESETS = [
  { label: '+1', value: [1] },
  { label: '+1, +2', value: [1, 2] },
  { label: '+1, +2, +3', value: [1, 2, 3] },
];
export const EMOJI_OPTIONS = ['🏅', '⚽', '🏀', '🏐', '🎾', '🏈', '🥊', '🏒', '🎱', '🥋', '🏊', '🚴', '🤸', '⛷️', '🏇', '🎯', '🎳', '🥏', '🤾', '🏑'];
