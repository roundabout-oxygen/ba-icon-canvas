import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check, X, Palette, Maximize2, Crop, RotateCcw } from 'lucide-react';
import { CanvasConfig, CanvasIconItem, ContainerBox, CanvasTextItem } from '../types';

export type AspectRatioType = 'free' | '16:9' | '4:3' | '1:1' | '9:16' | '3:4';

interface CanvasSizeEditOverlayProps {
  config: CanvasConfig;
  items: CanvasIconItem[];
  boxes: ContainerBox[];
  texts: CanvasTextItem[];
  zoom: number;
  onUpdateTempConfig: (updates: Partial<CanvasConfig>) => void;
  onUpdateTempElements: (
    items: CanvasIconItem[],
    boxes: ContainerBox[],
    texts: CanvasTextItem[]
  ) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

const ASPECT_RATIO_PRESETS: { id: AspectRatioType; label: string; ratio?: number }[] = [
  { id: 'free', label: 'フリー' },
  { id: '16:9', label: '16 : 9', ratio: 16 / 9 },
  { id: '4:3', label: '4 : 3', ratio: 4 / 3 },
  { id: '1:1', label: '1 : 1', ratio: 1 },
  { id: '3:4', label: '3 : 4', ratio: 3 / 4 },
  { id: '9:16', label: '9 : 16', ratio: 9 / 16 },
];

const PRESET_BG_COLORS = [
  { label: 'ダークネイビー', color: '#0f172a' },
  { label: 'ディープブラック', color: '#020617' },
  { label: 'スレートグレー', color: '#1e293b' },
  { label: 'ミッドナイトブルー', color: '#0c192c' },
  { label: 'オフホワイト', color: '#f8fafc' },
  { label: 'ピュアホワイト', color: '#ffffff' },
  { label: 'ライトシアン', color: '#ecfeff' },
];

export const CanvasSizeEditOverlay: React.FC<CanvasSizeEditOverlayProps> = ({
  config,
  items,
  boxes,
  texts,
  zoom,
  onUpdateTempConfig,
  onUpdateTempElements,
  onConfirm,
  onCancel,
}) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>('free');
  const [showBgPalette, setShowBgPalette] = useState(false);

  // ドラッグ操作参照
  const dragRef = useRef<{
    handle: string;
    startX: number;
    startY: number;
    initW: number;
    initH: number;
    initItems: CanvasIconItem[];
    initBoxes: ContainerBox[];
    initTexts: CanvasTextItem[];
  } | null>(null);

  // キーボード (Enter: 確定, Escape: キャンセル)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onConfirm, onCancel]);

  // アスペクト比切り替え時に、現在の幅をベースにして高さを合わせる
  const handleSelectAspectRatio = (presetId: AspectRatioType) => {
    setAspectRatio(presetId);
    const preset = ASPECT_RATIO_PRESETS.find((p) => p.id === presetId);
    if (preset && preset.ratio) {
      const nextH = Math.round(config.width / preset.ratio);
      onUpdateTempConfig({ height: nextH });
    }
  };

  // リサイズドラッグ開始
  const handleResizeStart = (handle: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    dragRef.current = {
      handle,
      startX: e.clientX,
      startY: e.clientY,
      initW: config.width,
      initH: config.height,
      initItems: [...items],
      initBoxes: [...boxes],
      initTexts: [...texts],
    };

    const targetRatio = ASPECT_RATIO_PRESETS.find((p) => p.id === aspectRatio)?.ratio;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current) return;
      const { handle, startX, startY, initW, initH, initItems, initBoxes, initTexts } =
        dragRef.current;

      const rawDx = (moveEvent.clientX - startX) / zoom;
      const rawDy = (moveEvent.clientY - startY) / zoom;

      let nextW = initW;
      let nextH = initH;
      let shiftX = 0;
      let shiftY = 0;

      // 右端
      if (handle.includes('r')) {
        nextW = Math.max(300, Math.min(4000, initW + rawDx));
      }
      // 左端 (左にドラッグすると幅が増え、要素は右にシフト)
      if (handle.includes('l')) {
        const potentialW = Math.max(300, Math.min(4000, initW - rawDx));
        const actualDeltaW = potentialW - initW;
        nextW = potentialW;
        shiftX = actualDeltaW;
      }

      // 下端
      if (handle.includes('b')) {
        nextH = Math.max(200, Math.min(3000, initH + rawDy));
      }
      // 上端 (上にドラッグすると高さが増え、要素は下にシフト)
      if (handle.includes('t')) {
        const potentialH = Math.max(200, Math.min(3000, initH - rawDy));
        const actualDeltaH = potentialH - initH;
        nextH = potentialH;
        shiftY = actualDeltaH;
      }

      // アスペクト比固定時の連動計算
      if (targetRatio) {
        if (handle === 'l' || handle === 'r') {
          // 左右のみドラッグ時は高さを追従
          nextH = Math.round(nextW / targetRatio);
        } else if (handle === 't' || handle === 'b') {
          // 上下のみドラッグ時は幅を追従
          nextW = Math.round(nextH * targetRatio);
        } else {
          // 四隅のドラッグ時は、幅の変化を優先して高さを計算
          nextH = Math.round(nextW / targetRatio);
        }
      }

      nextW = Math.round(nextW);
      nextH = Math.round(nextH);

      onUpdateTempConfig({ width: nextW, height: nextH });

      // 左端・上端ドラッグ時の要素シフト（余白の直感的な追加・削減）
      if (shiftX !== 0 || shiftY !== 0) {
        const sX = Math.round(shiftX);
        const sY = Math.round(shiftY);
        const nextItems = initItems.map((it) => ({ ...it, x: it.x + sX, y: it.y + sY }));
        const nextBoxes = initBoxes.map((b) => ({ ...b, x: b.x + sX, y: b.y + sY }));
        const nextTexts = initTexts.map((t) => ({ ...t, x: t.x + sX, y: t.y + sY }));
        onUpdateTempElements(nextItems, nextBoxes, nextTexts);
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* ─── 画面上部中央ドッキング型 設定ツールバー (createPortalでdocument.body直下に描画し、キャンバスのtransform影響を完全排除) ─── */}
      {createPortal(
        <div
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[9999] bg-slate-900/95 backdrop-blur-xl border border-cyan-500/80 rounded-2xl shadow-2xl px-3.5 py-2 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-200 select-none max-w-[calc(100vw-32px)] overflow-x-auto scrollbar-none"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* モードバッジ */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 text-xs font-bold shadow-sm whitespace-nowrap shrink-0">
            <Crop className="w-3.5 h-3.5 text-cyan-400" />
            <span>キャンバスサイズ編集</span>
          </div>

          <div className="h-5 w-[1px] bg-slate-700 shrink-0" />

          {/* アスペクト比プリセット */}
          <div className="flex items-center gap-0.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs shrink-0">
            {ASPECT_RATIO_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => handleSelectAspectRatio(preset.id)}
                className={`px-2 py-1 rounded-lg transition font-medium text-xs whitespace-nowrap ${
                  aspectRatio === preset.id
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="h-5 w-[1px] bg-slate-700 shrink-0" />

          {/* 幅・高さの直接入力 */}
          <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono shrink-0">
            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">W:</span>
              <input
                type="number"
                min="300"
                max="4000"
                step="10"
                value={config.width}
                onChange={(e) => {
                  const w = Math.max(300, Math.min(4000, Number(e.target.value)));
                  const preset = ASPECT_RATIO_PRESETS.find((p) => p.id === aspectRatio);
                  if (preset && preset.ratio) {
                    onUpdateTempConfig({ width: w, height: Math.round(w / preset.ratio) });
                  } else {
                    onUpdateTempConfig({ width: w });
                  }
                }}
                className="w-12 bg-transparent text-right text-cyan-300 font-bold focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">px</span>
            </div>

            <span className="text-slate-600 font-bold">×</span>

            <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
              <span className="text-slate-500 text-[10px]">H:</span>
              <input
                type="number"
                min="200"
                max="3000"
                step="10"
                value={config.height}
                onChange={(e) => {
                  const h = Math.max(200, Math.min(3000, Number(e.target.value)));
                  const preset = ASPECT_RATIO_PRESETS.find((p) => p.id === aspectRatio);
                  if (preset && preset.ratio) {
                    onUpdateTempConfig({ height: h, width: Math.round(h * preset.ratio) });
                  } else {
                    onUpdateTempConfig({ height: h });
                  }
                }}
                className="w-12 bg-transparent text-right text-cyan-300 font-bold focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">px</span>
            </div>
          </div>

          <div className="h-5 w-[1px] bg-slate-700 shrink-0" />

          {/* 背景色変更 (統合) */}
          <div className="relative shrink-0">
            <button
              onClick={() => setShowBgPalette(!showBgPalette)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition text-xs font-medium"
              title="キャンバス背景色を変更"
            >
              <span
                className="w-3.5 h-3.5 rounded border border-slate-600 shadow-sm"
                style={{ backgroundColor: config.bgColor }}
              />
              <span>背景色</span>
            </button>

            {showBgPalette && (
              <div className="absolute top-full left-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl z-[10000] w-60 flex flex-col gap-2.5 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-[10px] text-slate-400 font-bold">背景色プリセット</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {PRESET_BG_COLORS.map((bg) => (
                    <button
                      key={bg.color}
                      onClick={() => {
                        onUpdateTempConfig({ bgColor: bg.color });
                        setShowBgPalette(false);
                      }}
                      className="h-7 rounded-lg border border-slate-700 hover:scale-105 transition shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: bg.color }}
                      title={bg.label}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between pt-1.5 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 text-[11px]">カスタム色:</span>
                  <input
                    type="color"
                    value={config.bgColor}
                    onChange={(e) => onUpdateTempConfig({ bgColor: e.target.value })}
                    className="w-7 h-7 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-[1px] bg-slate-700 shrink-0" />

          {/* 確定 & キャンセルボタン (最優先・常に確実に見える位置) */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
              title="変更を破棄して戻る (Escape)"
            >
              <X className="w-3.5 h-3.5" />
              <span>キャンセル</span>
            </button>

            <button
              onClick={onConfirm}
              className="flex items-center gap-1 px-4 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-cyan-500/20 transition transform active:scale-95 whitespace-nowrap"
              title="キャンバスサイズを確定 (Enter)"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>OK (確定)</span>
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ─── キャンバス外枠ハイライト ＆ 8箇所のリサイズハンドル ─── */}
      <div
        className="absolute inset-0 pointer-events-none z-[120]"
        style={{
          boxShadow: '0 0 0 2px #38bdf8, 0 0 24px rgba(56, 189, 248, 0.45)',
        }}
      >
        {/* キャンバス中央にサイズガイダンス表示 */}
        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur border border-cyan-500/60 text-cyan-300 px-2 py-0.5 rounded-md text-[11px] font-mono shadow pointer-events-none">
          {config.width} × {config.height} px ({aspectRatio === 'free' ? '自由比率' : aspectRatio})
        </div>

        {/* ─── 4隅の大型ハンドル ─── */}
        <div
          data-canvas-resize-handle="true"
          onMouseDown={(e) => handleResizeStart('tl', e)}
          className="absolute -top-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow-lg hover:scale-125 transition-transform"
          title="左上をドラッグしてリサイズ"
        />
        <div
          data-canvas-resize-handle="true"
          onMouseDown={(e) => handleResizeStart('tr', e)}
          className="absolute -top-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize pointer-events-auto shadow-lg hover:scale-125 transition-transform"
          title="右上をドラッグしてリサイズ"
        />
        <div
          data-canvas-resize-handle="true"
          onMouseDown={(e) => handleResizeStart('bl', e)}
          className="absolute -bottom-2.5 -left-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded-sm cursor-nesw-resize pointer-events-auto shadow-lg hover:scale-125 transition-transform"
          title="左下をドラッグしてリサイズ"
        />
        <div
          data-canvas-resize-handle="true"
          onMouseDown={(e) => handleResizeStart('br', e)}
          className="absolute -bottom-2.5 -right-2.5 w-5 h-5 bg-white border-2 border-cyan-500 rounded-sm cursor-nwse-resize pointer-events-auto shadow-lg hover:scale-125 transition-transform"
          title="右下をドラッグしてリサイズ"
        />

        {/* ─── 4辺の大型ピル型ハンドル ─── */}
        {/* 上辺 */}
        <div
          data-canvas-resize-handle="true"
          onMouseDown={(e) => handleResizeStart('t', e)}
          className="absolute -top-2.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-white border-2 border-cyan-500 rounded-md cursor-ns-resize pointer-events-auto shadow-xl hover:bg-cyan-100 flex items-center justify-center transition-all group"
          title="上端をドラッグしてリサイズ"
        >
          <div className="w-4 h-1 bg-cyan-600 rounded-full group-hover:bg-cyan-700" />
        </div>

        {/* 下辺 */}
        <div
          data-canvas-resize-handle="true"
          onMouseDown={(e) => handleResizeStart('b', e)}
          className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-12 h-4 bg-white border-2 border-cyan-500 rounded-md cursor-ns-resize pointer-events-auto shadow-xl hover:bg-cyan-100 flex items-center justify-center transition-all group"
          title="下端をドラッグしてリサイズ"
        >
          <div className="w-4 h-1 bg-cyan-600 rounded-full group-hover:bg-cyan-700" />
        </div>

        {/* 左辺 */}
        <div
          data-canvas-resize-handle="true"
          onMouseDown={(e) => handleResizeStart('l', e)}
          className="absolute top-1/2 -left-2.5 -translate-y-1/2 w-4 h-12 bg-white border-2 border-cyan-500 rounded-md cursor-ew-resize pointer-events-auto shadow-xl hover:bg-cyan-100 flex items-center justify-center transition-all group"
          title="左端をドラッグしてリサイズ"
        >
          <div className="w-1 h-4 bg-cyan-600 rounded-full group-hover:bg-cyan-700" />
        </div>

        {/* 右辺 */}
        <div
          data-canvas-resize-handle="true"
          onMouseDown={(e) => handleResizeStart('r', e)}
          className="absolute top-1/2 -right-2.5 -translate-y-1/2 w-4 h-12 bg-white border-2 border-cyan-500 rounded-md cursor-ew-resize pointer-events-auto shadow-xl hover:bg-cyan-100 flex items-center justify-center transition-all group"
          title="右端をドラッグしてリサイズ"
        >
          <div className="w-1 h-4 bg-cyan-600 rounded-full group-hover:bg-cyan-700" />
        </div>
      </div>
    </>
  );
};
