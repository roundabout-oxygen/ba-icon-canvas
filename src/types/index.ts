export type AttackType = '爆発' | '貫通' | '神秘' | '振動';
export type DefenseType = '軽装備' | '重装甲' | '特殊装甲' | '弾力装甲' | '複合装甲';
export type Role = 'STRIKER' | 'SPECIAL';

export interface Character {
  id: string;
  name: string;
  rarity: string;
  icon: string;
  weapon: string;
  cover: string;
  role: string;
  pos: string;
  class: string;
  school: string;
  attack_type: string;
  defense_type: string;
}

export interface CanvasIconItem {
  id: string;
  type: 'icon';
  charId: string;
  x: number;
  y: number;
  size: number; // width and height (square icon)
  zIndex: number;
}

export interface ContainerBox {
  id: string;
  type: 'box';
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  bgColor: string;
  bgOpacity: number;
  zIndex: number;
}

export type CanvasElement = CanvasIconItem | ContainerBox;

export interface SnapLine {
  orientation: 'horizontal' | 'vertical';
  pos: number;
  start: number;
  end: number;
}

export interface CanvasConfig {
  width: number;
  height: number;
  bgColor: string;
  zoom: number;
  snapEnabled: boolean;
  showGrid: boolean;
}

export interface HistoryState {
  items: CanvasIconItem[];
  boxes: ContainerBox[];
  config: CanvasConfig;
}
