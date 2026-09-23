import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { SpacingAdjustOptions } from '../utils/spacingCluster';
import { Sliders, X, Check } from 'lucide-react';

interface SpacingAdjustModalProps {
  isOpen: boolean;
  selectedCount: number;
  onConfirm: (options: SpacingAdjustOptions) => void;
  onClose: () => void;
}

export const SpacingAdjustModal: React.FC<SpacingAdjustModalProps> = ({
  isOpen,
  selectedCount,
  onConfirm,
  onClose,
}) => {
  const [targetGap, setTargetGap] = useState<number>(8);
  const [minGap, setMinGap] = useState<number>(0);
  const [maxGap, setMaxGap] = useState<number>(36);

  if (!isOpen) return null;

  const handleApply = () => {
    onConfirm({ targetGap, minGap, maxGap });
    onClose();
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 select-none"
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <Sliders className="w-4 h-4" />
            <span>アイコン間隔の調整</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 設定内容 */}
        <div className="p-4 flex flex-col gap-4 text-xs text-slate-200">
          <p className="text-slate-400 leading-relaxed">
            選択中の <span className="text-cyan-400 font-bold">{selectedCount}</span> 体のアイコンのうち、
            最小〜最大の範囲内にある近接アイコンを左上基準で目標間隔に揃えます。
          </p>

          {/* 目標間隔シークバー */}
          <div className="flex flex-col gap-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-300">目標間隔 (調整後):</span>
              <span className="font-mono text-cyan-400 font-bold text-sm">{targetGap}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="48"
              step="1"
              value={targetGap}
              onChange={(e) => setTargetGap(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0px (密着)</span>
              <span>8px (標準)</span>
              <span>48px (広め)</span>
            </div>
          </div>

          {/* 最小間隔シークバー */}
          <div className="flex flex-col gap-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-300">最小間隔 (対象下限):</span>
              <span className="font-mono text-slate-300 font-bold text-sm">{minGap}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="64"
              step="1"
              value={minGap}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMinGap(val);
                if (val > maxGap) setMaxGap(val);
              }}
              className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="text-[10px] text-slate-500">これより狭い間隔は調整対象外</span>
          </div>

          {/* 最大間隔シークバー */}
          <div className="flex flex-col gap-1.5 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-300">最大間隔 (対象上限):</span>
              <span className="font-mono text-slate-300 font-bold text-sm">{maxGap}px</span>
            </div>
            <input
              type="range"
              min="0"
              max="128"
              step="2"
              value={maxGap}
              onChange={(e) => {
                const val = Number(e.target.value);
                setMaxGap(val);
                if (val < minGap) setMinGap(val);
              }}
              className="w-full accent-blue-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            <span className="text-[10px] text-slate-500">これ以上離れているアイコンは位置を維持</span>
          </div>
        </div>

        {/* フッター操作ボタン */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-slate-950/80 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition text-xs font-semibold"
          >
            キャンセル
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/30 transition hover:scale-105 active:scale-95"
          >
            <Check className="w-3.5 h-3.5" />
            <span>OK (間隔を適用)</span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
