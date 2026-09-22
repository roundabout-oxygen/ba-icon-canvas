export const APP_VERSION = "v1.0.3";

export const ATTACK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '爆発': { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' },
  '貫通': { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' },
  '神秘': { bg: '#dbeafe', text: '#2563eb', border: '#3b82f6' },
  '振動': { bg: '#f3e8ff', text: '#9333ea', border: '#a855f7' },
};

export const DEFENSE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  '軽装備': { bg: '#fee2e2', text: '#dc2626', border: '#ef4444' },
  '重装甲': { bg: '#fef3c7', text: '#d97706', border: '#f59e0b' },
  '特殊装甲': { bg: '#dbeafe', text: '#2563eb', border: '#3b82f6' },
  '弾力装甲': { bg: '#f3e8ff', text: '#9333ea', border: '#a855f7' },
  '複合装甲': { bg: '#f1f5f9', text: '#475569', border: '#94a3b8' },
};

export const PRESET_BOX_THEMES = [
  { name: 'レッド', borderColor: '#ef4444', bgColor: '#fee2e2', opacity: 0.15 },
  { name: 'イエロー', borderColor: '#eab308', bgColor: '#fef9c3', opacity: 0.2 },
  { name: 'ブルー', borderColor: '#3b82f6', bgColor: '#dbeafe', opacity: 0.15 },
  { name: 'グリーン', borderColor: '#22c55e', bgColor: '#dcfce7', opacity: 0.15 },
  { name: 'パープル', borderColor: '#a855f7', bgColor: '#f3e8ff', opacity: 0.15 },
  { name: 'ダーク', borderColor: '#475569', bgColor: '#0f172a', opacity: 0.3 },
  { name: 'ホワイト', borderColor: '#cbd5e1', bgColor: '#ffffff', opacity: 0.9 },
  { name: '透明枠', borderColor: '#94a3b8', bgColor: 'transparent', opacity: 0 },
];

export const CANVAS_PRESETS = [
  { name: '標準 (1200 x 800)', width: 1200, height: 800 },
  { name: '縦長 (900 x 1200)', width: 900, height: 1200 },
  { name: 'ワイド (1600 x 900)', width: 1600, height: 900 },
  { name: '正方形 (1000 x 1000)', width: 1000, height: 1000 },
  { name: 'Full HD (1920 x 1080)', width: 1920, height: 1080 },
];
