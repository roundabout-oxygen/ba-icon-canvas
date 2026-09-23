export type AttackType = '爆発' | '貫通' | '神秘' | '振動' | '分解';
export type DefenseType = '軽装備' | '重装甲' | '特殊装甲' | '弾力装甲' | '複合装甲';
export type Role = 'STRIKER' | 'SPECIAL';

export type IconBorderColorMode = 'custom' | 'attack' | 'defense';

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
  borderWidth?: number; // アイコン枠線の太さ (0〜8px)
  borderColorMode?: IconBorderColorMode; // 'custom' | 'attack' | 'defense'
  borderColor?: string; // カスタム枠線色
  borderRadius?: number; // 個別角丸
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

export type TextStylePreset = 'title' | 'tag' | 'plain';

export interface CanvasTextItem {
  id: string;
  type: 'text';
  text: string;
  x: number;
  y: number;
  width?: number;
  fontSize: number; // 14, 18, 24, 32 等
  fontWeight: 'normal' | 'bold' | 'black';
  color: string; // 文字色
  bgColor?: string; // 背景色
  bgOpacity?: number; // 背景不透明度
  borderColor?: string; // 枠線色
  borderWidth?: number; // 枠線太さ
  borderRadius?: number; // 角丸
  stylePreset: TextStylePreset;
  zIndex: number;
}

export type CanvasElement = CanvasIconItem | ContainerBox | CanvasTextItem;

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
  snapGap: number; // アイコン間の吸着間隔(px)
  iconBorderRadius: number; // アイコンの角丸(px)
  showGrid: boolean;
  iconBorderWidth?: number; // デフォルトアイコン枠線の太さ
  iconBorderColorMode?: IconBorderColorMode; // デフォルト色モード
  iconBorderColor?: string; // デフォルト枠線色
}

export interface HistoryState {
  items: CanvasIconItem[];
  boxes: ContainerBox[];
  texts: CanvasTextItem[];
  config: CanvasConfig;
}
