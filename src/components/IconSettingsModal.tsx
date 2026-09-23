import React, { useState, useEffect } from 'react';
import { Character, IconBorderColorMode } from '../types';
import { ATTACK_COLORS, DEFENSE_COLORS } from '../utils/constants';
import { X, Sliders, Shield, Swords, Palette, Check, RotateCcw } from 'lucide-react';

interface IconSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSize: number;
  currentRadius: number;
  currentBorderWidth: number;
  currentColorMode: IconBorderColorMode;
  currentColor: string;
  selectedCount: number;
  previewCharacters: Character[];
  onApply: (settings: {
    size: number;
    radius: number;
    borderWidth: number;
    colorMode: IconBorderColorMode;
    color: string;
    applyTo: 'all' | 'selected';
  }) => void;
}

const PRESET_CUSTOM_COLORS = [
  '#ffffff', // 白
  '#0f172a', // 黒/ダーク
  '#94a3b8', // スレートグレー
  '#38bdf8', // シアン
  '#fbbf24', // ゴールド/アンバー
  '#f87171', // ローズ/レッド
  '#4ade80', // グリーン
  '#c084fc', // パープル
];

export const IconSettingsModal: React.FC<IconSettingsModalProps> = ({
  isOpen,
  onClose,
  currentSize,
  currentRadius,
  currentBorderWidth,
  currentColorMode,
  currentColor,
  selectedCount,
  previewCharacters,
  onApply,
}) => {
  const [size, setSize] = useState(currentSize);
  const [radius, setRadius] = useState(currentRadius);
  const [borderWidth, setBorderWidth] = useState(currentBorderWidth);
  const [colorMode, setColorMode] = useState<IconBorderColorMode>(currentColorMode);
  const [color, setColor] = useState(currentColor);

  // モーダルオープン時に現在の値で初期化
  useEffect(() => {
    if (isOpen) {
      setSize(currentSize);
      setRadius(currentRadius);
      setBorderWidth(currentBorderWidth);
      setColorMode(currentColorMode);
      setColor(currentColor);
    }
  }, [isOpen, currentSize, currentRadius, currentBorderWidth, currentColorMode, currentColor]);

  if (!isOpen) return null;

  // プレビュー用生徒（各属性を網羅するようにピックアップ）
  const displayPreviewChars = previewCharacters.slice(0, 5);

  const getBorderColorForChar = (char: Character) => {
    if (colorMode === 'attack') {
      return ATTACK_COLORS[char.attack_type]?.border || color;
    }
    if (colorMode === 'defense') {
      return DEFENSE_COLORS[char.defense_type]?.border || color;
    }
    return color;
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800/80">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <span>アイコン詳細設定</span>
                {selectedCount > 0 && (
                  <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                    選択中: {selectedCount} 体
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* スクロール可能コンテンツ */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* リアルタイムプレビュー */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>プレビュー表示</span>
              <span className="text-[10px] text-cyan-400 font-mono">
                {size}px / 丸み{radius}px / 枠線{borderWidth}px (
                {colorMode === 'attack' ? '攻撃属性連動' : colorMode === 'defense' ? '防御属性連動' : 'カスタム色'}
                )
              </span>
            </div>
            <div className="flex items-center justify-center gap-3 py-2 overflow-x-auto min-h-[76px]">
              {displayPreviewChars.map((char) => {
                const bCol = getBorderColorForChar(char);
                const isRound = radius >= size / 2;
                return (
                  <div key={char.id} className="flex flex-col items-center gap-1 shrink-0">
                    <div
                      style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: isRound ? '50%' : `${Math.min(28, radius)}px`,
                        borderWidth: `${borderWidth}px`,
                        borderStyle: borderWidth > 0 ? 'solid' : 'none',
                        borderColor: bCol,
                        boxSizing: 'border-box',
                      }}
                      className="overflow-hidden shadow-md bg-slate-800 relative transition-all"
                    >
                      <img
                        src={char.icon}
                        alt={char.name}
                        className="w-full h-full object-cover pointer-events-none"
                      />
                    </div>
                    <div className="flex items-center gap-0.5 text-[9px] font-mono">
                      <span
                        className="px-1 rounded text-[8px]"
                        style={{
                          backgroundColor:
                            colorMode === 'defense'
                              ? DEFENSE_COLORS[char.defense_type]?.border + '22'
                              : ATTACK_COLORS[char.attack_type]?.border + '22',
                          color:
                            colorMode === 'defense'
                              ? DEFENSE_COLORS[char.defense_type]?.border
                              : ATTACK_COLORS[char.attack_type]?.border,
                        }}
                      >
                        {colorMode === 'defense' ? char.defense_type : char.attack_type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 1. サイズ設定 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium text-slate-200">アイコンサイズ:</span>
              <span className="font-mono text-cyan-400 font-bold">{size} px</span>
            </div>
            <input
              type="range"
              min="36"
              max="128"
              step="2"
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="grid grid-cols-6 gap-1 pt-0.5">
              {[
                { label: '48px', val: 48 },
                { label: '64px (標準)', val: 64 },
                { label: '72px', val: 72 },
                { label: '80px', val: 80 },
                { label: '96px', val: 96 },
                { label: '120px', val: 120 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setSize(val)}
                  className={`py-1 rounded text-[10px] font-mono transition border ${
                    size === val
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 2. 丸み設定 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium text-slate-200">角の丸み (Border Radius):</span>
              <span className="font-mono text-cyan-400 font-bold">
                {radius >= size / 2 ? '円形' : `${radius} px`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="40"
              step="1"
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="grid grid-cols-5 gap-1 pt-0.5">
              {[
                { label: '0px (四角)', val: 0 },
                { label: '4px', val: 4 },
                { label: '8px (標準)', val: 8 },
                { label: '16px', val: 16 },
                { label: '円形', val: Math.round(size / 2) },
              ].map(({ label, val }) => (
                <button
                  key={label}
                  onClick={() => setRadius(val)}
                  className={`py-1 rounded text-[10px] font-mono transition border ${
                    radius === val
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 3. 枠線の太さ設定 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium text-slate-200">枠線の太さ (Border Width):</span>
              <span className="font-mono text-cyan-400 font-bold">{borderWidth} px</span>
            </div>
            <input
              type="range"
              min="0"
              max="8"
              step="1"
              value={borderWidth}
              onChange={(e) => setBorderWidth(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
            />
            <div className="grid grid-cols-6 gap-1 pt-0.5">
              {[
                { label: 'なし', val: 0 },
                { label: '1px', val: 1 },
                { label: '2px (標準)', val: 2 },
                { label: '3px', val: 3 },
                { label: '4px', val: 4 },
                { label: '6px', val: 6 },
              ].map(({ label, val }) => (
                <button
                  key={val}
                  onClick={() => setBorderWidth(val)}
                  className={`py-1 rounded text-[10px] font-mono transition border ${
                    borderWidth === val
                      ? 'border-cyan-400 bg-cyan-950/60 text-cyan-300 font-bold'
                      : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 4. 枠線の色 (モード切り替え) */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            <div className="flex justify-between items-center text-slate-300">
              <span className="font-medium text-slate-200">枠線の色 (Color Mode):</span>
            </div>

            {/* モード切り替えタブ */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setColorMode('attack')}
                className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition border text-center ${
                  colorMode === 'attack'
                    ? 'border-red-500 bg-red-950/40 text-red-200 font-bold shadow-md shadow-red-950/30'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px]">
                  <Swords className="w-3.5 h-3.5 text-red-400" />
                  <span>攻撃属性連動</span>
                </div>
                <span className="text-[9px] text-slate-400">爆発/貫通/神秘/振動/分解</span>
              </button>

              <button
                onClick={() => setColorMode('defense')}
                className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition border text-center ${
                  colorMode === 'defense'
                    ? 'border-blue-500 bg-blue-950/40 text-blue-200 font-bold shadow-md shadow-blue-950/30'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px]">
                  <Shield className="w-3.5 h-3.5 text-blue-400" />
                  <span>防御属性連動</span>
                  <span className="text-[9px] px-1 py-0.2 bg-blue-500/30 text-blue-200 rounded font-normal">
                    標準
                  </span>
                </div>
                <span className="text-[9px] text-slate-400">軽装/重装/特殊/弾力/複合</span>
              </button>

              <button
                onClick={() => setColorMode('custom')}
                className={`py-2 px-2 rounded-xl flex flex-col items-center gap-1 transition border text-center ${
                  colorMode === 'custom'
                    ? 'border-cyan-500 bg-cyan-950/40 text-cyan-200 font-bold shadow-md shadow-cyan-950/30'
                    : 'border-slate-800 bg-slate-950/50 text-slate-400 hover:text-white hover:border-slate-700'
                }`}
              >
                <div className="flex items-center gap-1 text-[11px]">
                  <Palette className="w-3.5 h-3.5 text-cyan-400" />
                  <span>単一カラー</span>
                </div>
                <span className="text-[9px] text-slate-400">指定色を一律適用</span>
              </button>
            </div>

            {/* 属性連動モード時の属性色一覧表示 */}
            {colorMode === 'attack' && (
              <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800 flex items-center justify-around text-[10px]">
                {Object.entries(ATTACK_COLORS).map(([atk, col]) => (
                  <div key={atk} className="flex items-center gap-1 font-medium" style={{ color: col.border }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.border }} />
                    <span>{atk}</span>
                  </div>
                ))}
              </div>
            )}

            {colorMode === 'defense' && (
              <div className="bg-slate-950/40 p-2 rounded-xl border border-slate-800 flex items-center justify-around text-[10px]">
                {Object.entries(DEFENSE_COLORS).map(([def, col]) => (
                  <div key={def} className="flex items-center gap-1 font-medium" style={{ color: col.border }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.border }} />
                    <span>{def.replace('装備', '').replace('装甲', '')}</span>
                  </div>
                ))}
              </div>
            )}

            {/* 単一カラーモード時のパレット */}
            {colorMode === 'custom' && (
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-1.5 flex-1">
                  {PRESET_CUSTOM_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-6 h-6 rounded-lg transition border flex items-center justify-center ${
                        color === c ? 'border-white scale-110 shadow-md ring-2 ring-cyan-400' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    >
                      {color === c && (
                        <Check className={`w-3.5 h-3.5 ${c === '#ffffff' ? 'text-black' : 'text-white'}`} />
                      )}
                    </button>
                  ))}
                </div>
                {/* 自由カラーピッカー */}
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-7 h-7 rounded border border-slate-700 bg-transparent cursor-pointer"
                    title="自由な色を選択"
                  />
                  <span className="font-mono text-[10px] text-slate-400">{color}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition font-medium text-xs"
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                setSize(64);
                setRadius(8);
                setBorderWidth(2);
                setColorMode('defense');
                setColor('#ffffff');
              }}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/50 transition font-medium text-xs flex items-center gap-1.5"
              title="アイコンサイズ64px、角の丸み8px、枠線2px、防御属性連動に戻す"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>標準に戻す</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <button
                onClick={() => {
                  onApply({
                    size,
                    radius,
                    borderWidth,
                    colorMode,
                    color,
                    applyTo: 'selected',
                  });
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition shadow-md shadow-cyan-600/30 text-xs flex items-center gap-1.5"
              >
                <span>選択中の生徒に適用 ({selectedCount}体)</span>
              </button>
            )}

            <button
              onClick={() => {
                onApply({
                  size,
                  radius,
                  borderWidth,
                  colorMode,
                  color,
                  applyTo: 'all',
                });
                onClose();
              }}
              className={`px-4 py-2 rounded-xl font-bold transition text-xs flex items-center gap-1.5 ${
                selectedCount > 0
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/30'
              }`}
            >
              <span>キャンバス全体に適用</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
