import React, { useState, useRef } from 'react';
import { ContainerBox } from '../types';
import { Trash2, Move, LayoutGrid, Palette, Copy, Minimize2 } from 'lucide-react';
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
  const [showRadiusPicker, setShowRadiusPicker] = useState(false);
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

  // 要望対応: 「枠の移動は枠がアクティブな時にドラッグした時に行い、枠が非アクティブ時に枠の上でドラッグするとアイコンが選択されるようにする」
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSelected) {
      // アクティブ時は枠のドラッグ移動を開始
      e.stopPropagation();
      onStartDrag(box.id, box.x, box.y, e);
    } else {
      // 非アクティブ時はドラッグ範囲選択を優先するため stopPropagation せずにキャンバスへスルー
      // ただしマウス移動がない単純クリックの場合は onClick で選択される
    }
  };

  return (
    <div
      data-box-id={box.id}
      style={{
        position: 'absolute',
        left: `${box.x}px`,
        top: `${box.y}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
        border: `${box.borderWidth}px solid ${box.borderColor}`,
        borderRadius: `${box.borderRadius}px`,
        backgroundColor: box.bgColor,
        // 要望対応: パレットがアイコンの下に隠れないよう、選択時またはポップアップ表示時は zIndex を最前面に引き上げる
        zIndex: isSelected || showColorPicker || showRadiusPicker ? 45 : box.zIndex,
      }}
      onClick={(e) => {
        // 単純クリック時の選択はCanvasのhandleMouseUpで処理
        e.stopPropagation();
      }}
      onMouseDown={handleMouseDown}
      className={`group transition-shadow ${
        isSelected
          ? 'ring-2 ring-cyan-400 shadow-xl shadow-cyan-500/10 cursor-move'
          : 'hover:ring-1 hover:ring-slate-400/50 cursor-default'
      }`}
    >
      {/* 枠ヘッダー / コントロールバー (選択時またはホバー時表示) */}
      <div
        className={`absolute -top-9 left-0 flex items-center gap-1 bg-slate-900/95 backdrop-blur border border-slate-700 px-2 py-1 rounded-md shadow-2xl text-xs z-50 transition-opacity ${
          isSelected || showColorPicker || showRadiusPicker
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span
          onMouseDown={(e) => onStartDrag(box.id, box.x, box.y, e)}
          className="box-drag-handle cursor-move text-slate-400 hover:text-white p-0.5"
          title="ドラッグして枠を移動"
        >
          <Move className="w-3.5 h-3.5" />
        </span>

        {/* 色パレット切り替え */}
        <div className="relative">
          <button
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowRadiusPicker(false);
            }}
            className={`p-1 rounded text-slate-300 hover:text-white transition ${
              showColorPicker ? 'bg-slate-700 text-cyan-300' : 'hover:bg-slate-800'
            }`}
            title="テーマカラー変更"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          {showColorPicker && (
            <div className="absolute top-full left-0 mt-1 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-2.5 shadow-2xl flex flex-col gap-2 z-[999] w-52">
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

        {/* 要望対応: 枠の角の丸みを変えるボタン ＆ シークバー */}
        <div className="relative">
          <button
            onClick={() => {
              setShowRadiusPicker(!showRadiusPicker);
              setShowColorPicker(false);
            }}
            className={`p-1 rounded text-slate-300 hover:text-white transition ${
              showRadiusPicker ? 'bg-slate-700 text-cyan-300' : 'hover:bg-slate-800'
            }`}
            title="角の丸みを変更"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>
          {showRadiusPicker && (
            <div className="absolute top-full left-0 mt-1 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-lg p-2.5 shadow-2xl flex flex-col gap-1.5 z-[999] w-48">
              <div className="flex items-center justify-between text-[10px] text-slate-300 font-bold">
                <span>角の丸み:</span>
                <span className="font-mono text-cyan-400">{box.borderRadius}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="48"
                step="2"
                value={box.borderRadius}
                onChange={(e) => onUpdate(box.id, { borderRadius: Number(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
              <div className="grid grid-cols-4 gap-1 text-[9px] text-slate-400 pt-1">
                {[0, 6, 16, 28].map((r) => (
                  <button
                    key={r}
                    onClick={() => onUpdate(box.id, { borderRadius: r })}
                    className={`py-0.5 rounded border ${
                      box.borderRadius === r
                        ? 'border-cyan-400 text-cyan-300 bg-cyan-950/50'
                        : 'border-slate-700 hover:border-slate-500 text-slate-300'
                    }`}
                  >
                    {r === 0 ? '直角' : `${r}px`}
                  </button>
                ))}
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
            data-resize-handle="true"
            className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize z-30"
            onMouseDown={(e) => handleResizeStart('tl', e)}
          />
          <div
            data-resize-handle="true"
            className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize z-30"
            onMouseDown={(e) => handleResizeStart('tr', e)}
          />
          <div
            data-resize-handle="true"
            className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize z-30"
            onMouseDown={(e) => handleResizeStart('bl', e)}
          />
          <div
            data-resize-handle="true"
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize z-30"
            onMouseDown={(e) => handleResizeStart('br', e)}
          />
          <div
            data-resize-handle="true"
            className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-5 bg-white border-2 border-cyan-500 rounded-sm cursor-ew-resize z-30"
            onMouseDown={(e) => handleResizeStart('r', e)}
          />
          <div
            data-resize-handle="true"
            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2.5 bg-white border-2 border-cyan-500 rounded-sm cursor-ns-resize z-30"
            onMouseDown={(e) => handleResizeStart('b', e)}
          />
        </>
      )}
    </div>
  );
};
