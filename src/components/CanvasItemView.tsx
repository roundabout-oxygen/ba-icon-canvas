import React from 'react';
import { CanvasIconItem, Character } from '../types';
import { Trash2 } from 'lucide-react';

interface CanvasItemViewProps {
  item: CanvasIconItem;
  character: Character;
  isSelected: boolean;
  borderRadius?: number;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onDelete: (id: string) => void;
  onStartDrag: (id: string, startX: number, startY: number, e: React.MouseEvent) => void;
}

export const CanvasItemView: React.FC<CanvasItemViewProps> = ({
  item,
  character,
  isSelected,
  borderRadius = 8,
  onSelect,
  onDelete,
  onStartDrag,
}) => {
  return (
    <div
      data-item-id={item.id}
      style={{
        position: 'absolute',
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.size}px`,
        height: `${item.size}px`,
        zIndex: isSelected ? 50 : item.zIndex,
        borderRadius: `${borderRadius}px`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id, e);
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onStartDrag(item.id, item.x, item.y, e);
      }}
      className={`group cursor-grab active:cursor-grabbing transition-transform duration-75 select-none overflow-hidden shadow-sm ${
        isSelected
          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900 shadow-xl shadow-cyan-500/30 scale-[1.02]'
          : 'hover:scale-105'
      }`}
      title={`${character.name} (ドラッグで移動 / Delで削除)`}
    >
      {/* アイコン画像 (端の1px線をクリップするため微小スケールアップ＆角丸クリッピング) */}
      <img
        src={character.icon}
        alt={character.name}
        className="w-full h-full object-cover pointer-events-none scale-[1.03] transition-transform"
        draggable={false}
      />

      {/* 端の馴染ませ用ソフトインナーシャドウ */}
      <div
        className="absolute inset-0 pointer-events-none rounded-[inherit] ring-1 ring-inset ring-black/10"
      />

      {/* 選択時・ホバー時の削除ボタン */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete(item.id);
        }}
        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
        title="削除"
      >
        <Trash2 className="w-3 h-3" />
      </button>
    </div>
  );
};
