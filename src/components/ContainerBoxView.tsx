import React, { useState, useRef } from 'react';
import { ContainerBox } from '../types';
import { Trash2, Move, LayoutGrid, Palette, Copy } from 'lucide-react';
import { PRESET_BOX_THEMES } from '../utils/constants';

interface ContainerBoxViewProps {
  box: ContainerBox;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onUpdate: (id: string, updates: Partial<ContainerBox>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAlignChildren: (boxId: string, type: 'grid' | 'row') => void;
  onStartDrag: (id: string, startX: number, startY: number, e: React.MouseEvent) => void;
  zoom: number;
}

export const ContainerBoxView: React.FC<ContainerBoxViewProps> = ({
  box,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onAlignChildren,
  onStartDrag,
  zoom,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const resizeRef = useRef<{ handle: string; startX: number; startY: number; startBox: ContainerBox } | null>(null);

  // リサイズドラッグの開始
  const handleResizeStart = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    resizeRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startBox: { ...box },
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizeRef.current) return;
      const { handle, startX, startY, startBox } = resizeRef.current;
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;

      let newX = startBox.x;
      let newY = startBox.y;
      let newW = startBox.width;
      let newH = startBox.height;

      if (handle.includes('r')) newW = Math.max(80, startBox.width + dx);
      if (handle.includes('b')) newH = Math.max(60, startBox.height + dy);
      if (handle.includes('l')) {
        const potentialW = startBox.width - dx;
        if (potentialW >= 80) {
          newW = potentialW;
          newX = startBox.x + dx;
        }
      }
      if (handle.includes('t')) {
        const potentialH = startBox.height - dy;
        if (potentialH >= 60) {
          newH = potentialH;
          newY = startBox.y + dy;
        }
      }

      onUpdate(box.id, {
        x: Math.round(newX),
        y: Math.round(newY),
        width: Math.round(newW),
        height: Math.round(newH),
      });
    };

    const handleMouseUp = () => {
      resizeRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        border: `${box.borderWidth}px solid ${box.borderColor}`,
        borderRadius: `${box.borderRadius}px`,
        backgroundColor: box.bgColor,
        opacity: 1,
        zIndex: box.zIndex,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(box.id, e);
      }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('box-drag-handle')) {
          onStartDrag(box.id, box.x, box.y, e);
        }
      }}
      className={`group transition-shadow cursor-move ${
        isSelected
          ? 'ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/10'
          : 'hover:ring-1 hover:ring-slate-400/50'
      }`}
    >
      {/* 枠ヘッダー / コントロールバー (選択時またはホバー時表示) */}
      <div
        className={`absolute -top-9 left-0 flex items-center gap-1 bg-slate-900/90 backdrop-blur border border-slate-700 px-2 py-1 rounded-md shadow-lg text-xs z-30 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="box-drag-handle cursor-move text-slate-400 hover:text-white p-0.5">
          <Move className="w-3.5 h-3.5" />
        </span>

        {/* 色パレット切り替え */}
        <div className="relative">
          <button
            onClick={() => setShowColorPicker(!showColorPicker)}
            className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
            title="テーマカラー変更"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-2xl flex flex-col gap-2 z-50 w-48">
              <div className="text-[10px] text-slate-400 font-bold">枠線プリセット</div>
              <div className="grid grid-cols-4 gap-1.5">
                {PRESET_BOX_THEMES.map((theme) => (
                  <button
                    key={theme.name}
                    onClick={() => {
                      onUpdate(box.id, {
                        borderColor: theme.borderColor,
                        bgColor: theme.bgColor,
                        bgOpacity: theme.opacity,
                      });
                      setShowColorPicker(false);
                    }}
                    className="h-6 rounded border flex items-center justify-center transition hover:scale-105"
                    style={{
                      borderColor: theme.borderColor,
                      backgroundColor: theme.bgColor,
                    }}
                    title={theme.name}
                  />
                ))}
              </div>
              <div className="flex items-center gap-2 pt-1 border-t border-slate-700 text-[10px]">
                <span>枠線色:</span>
                <input
                  type="color"
                  value={box.borderColor}
                  onChange={(e) => onUpdate(box.id, { borderColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                />
                <span>背景色:</span>
                <input
                  type="color"
                  value={box.bgColor === 'transparent' ? '#ffffff' : box.bgColor}
                  onChange={(e) => onUpdate(box.id, { bgColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
          )}
        </div>

        {/* 枠内整列ボタン */}
        <button
          onClick={() => onAlignChildren(box.id, 'row')}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
          title="枠内のアイコンを横一列に整列"
        >
          <span className="text-[10px] font-bold">横列</span>
        </button>
        <button
          onClick={() => onAlignChildren(box.id, 'grid')}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
          title="枠内のアイコンをグリッド整列"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>

        {/* 複製 */}
        <button
          onClick={() => onDuplicate(box.id)}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
          title="枠を複製"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* 削除 */}
        <button
          onClick={() => onDelete(box.id)}
          className="p-1 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition"
          title="枠を削除"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 選択時のリサイズハンドル (四隅・四辺) */}
      {isSelected && (
        <>
          <div
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize z-30"
            onMouseDown={(e) => handleResizeStart('tl', e)}
          />
          <div
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize z-30"
            onMouseDown={(e) => handleResizeStart('tr', e)}
          />
          <div
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize z-30"
            onMouseDown={(e) => handleResizeStart('bl', e)}
          />
          <div
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize z-30"
            onMouseDown={(e) => handleResizeStart('br', e)}
          />
          <div
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-5 bg-white border-2 border-cyan-500 rounded-sm cursor-ew-resize z-30"
            onMouseDown={(e) => handleResizeStart('r', e)}
          />
          <div
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-white border-2 border-cyan-500 rounded-sm cursor-ns-resize z-30"
            onMouseDown={(e) => handleResizeStart('b', e)}
          />
        </>
      )}
    </div>
  );
};
