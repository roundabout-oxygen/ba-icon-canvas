import React, { useState, useRef, useEffect } from 'react';
import { CanvasTextItem, TextStylePreset } from '../types';
import { PRESET_BOX_THEMES } from '../utils/constants';
import {
  Trash2,
  Copy,
  Type,
  Bold,
  Palette,
  Square,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Check,
} from 'lucide-react';

interface CanvasTextViewProps {
  item: CanvasTextItem;
  isSelected: boolean;
  onSelect: (id: string, e: React.MouseEvent) => void;
  onUpdate: (id: string, updates: Partial<CanvasTextItem>) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onStartDrag: (id: string, startX: number, startY: number, e: React.MouseEvent) => void;
  zoom: number;
}

const TEXT_COLORS = [
  '#ffffff', // 白
  '#38bdf8', // シアン (ブルアカブルー)
  '#f87171', // 爆発レッド
  '#fbbf24', // 貫通ゴールド/イエロー
  '#60a5fa', // 神秘ブルー
  '#c084fc', // 振動パープル
  '#34d399', // 分解/複合グリーン
  '#94a3b8', // スレートグレー
  '#0f172a', // ダーク
];

// ブルアカの戦闘属性・装甲スタイルに合わせた枠・背景プリセット
const ATTRIBUTE_PRESETS = [
  { name: '爆発/軽装', border: '#ef4444', bg: '#1e293b', text: '#ffffff' },
  { name: '貫通/重装', border: '#eab308', bg: '#1e293b', text: '#ffffff' },
  { name: '神秘/特殊', border: '#3b82f6', bg: '#1e293b', text: '#ffffff' },
  { name: '振動/弾力', border: '#a855f7', bg: '#1e293b', text: '#ffffff' },
  { name: '分解/複合', border: '#10b981', bg: '#1e293b', text: '#ffffff' },
  { name: 'シアン/連邦', border: '#38bdf8', bg: '#0f172a', text: '#38bdf8' },
];

export const CanvasTextView: React.FC<CanvasTextViewProps> = ({
  item,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  onStartDrag,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(item.text);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const [showBoxStylePicker, setShowBoxStylePicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ポップアップ外クリック検知で閉じる
  useEffect(() => {
    if (!showTextColorPicker && !showBoxStylePicker) return;
    const handleOutside = () => {
      setShowTextColorPicker(false);
      setShowBoxStylePicker(false);
    };
    window.addEventListener('mousedown', handleOutside);
    return () => window.removeEventListener('mousedown', handleOutside);
  }, [showTextColorPicker, showBoxStylePicker]);

  // 編集開始時にテキストを選択
  useEffect(() => {
    if (isEditing) {
      setEditText(item.text);
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 20);
    }
  }, [isEditing, item.text]);

  const handleFinishEditing = () => {
    setIsEditing(false);
    const trimmed = editText.trim();
    if (trimmed && trimmed !== item.text) {
      onUpdate(item.id, { text: trimmed });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(item.text);
    }
  };

  // スタイル決定（プリセットのデフォルト値と個別指定値のマージ）
  const isTag = item.stylePreset === 'tag';
  const isTitle = item.stylePreset === 'title';

  const currentBgColor =
    item.bgColor !== undefined
      ? item.bgColor
      : isTag
      ? 'rgba(30, 41, 59, 0.9)'
      : isTitle
      ? 'rgba(15, 23, 42, 0.85)'
      : 'transparent';

  const currentBorderColor =
    item.borderColor !== undefined
      ? item.borderColor
      : isTag
      ? '#38bdf8'
      : isTitle
      ? '#38bdf8'
      : 'transparent';

  const currentBorderWidth =
    item.borderWidth !== undefined ? item.borderWidth : isTag ? 1 : 0;

  const currentBorderRadius =
    item.borderRadius !== undefined ? item.borderRadius : isTag ? 6 : isTitle ? 4 : 0;

  // タイトルで枠線幅0の場合は伝統の左アクセントバー
  const isLeftAccentTitle = isTitle && currentBorderWidth === 0;

  const containerStyle: React.CSSProperties = {
    backgroundColor: currentBgColor,
    borderColor: currentBorderColor,
    borderWidth: isLeftAccentTitle ? undefined : `${currentBorderWidth}px`,
    borderLeftWidth: isLeftAccentTitle ? '4px' : `${currentBorderWidth}px`,
    borderLeftColor: currentBorderColor,
    borderStyle: 'solid',
    borderRadius: `${currentBorderRadius}px`,
    padding: isTag ? '3px 10px' : isTitle ? '6px 14px' : '2px 6px',
    boxShadow:
      currentBorderWidth > 0 || (currentBgColor && currentBgColor !== 'transparent')
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.25)'
        : 'none',
  };

  return (
    <div
      data-item-id={item.id}
      data-text-id={item.id}
      style={{
        position: 'absolute',
        left: `${item.x}px`,
        top: `${item.y}px`,
        zIndex: isSelected ? 80 : item.zIndex ?? 25,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(item.id, e);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      onMouseDown={(e) => {
        if (e.button === 0 && !isEditing) {
          e.stopPropagation();
          onStartDrag(item.id, item.x, item.y, e);
        }
      }}
      className={`group select-none cursor-grab active:cursor-grabbing transition-shadow duration-75 inline-block ${
        isSelected
          ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 rounded-lg'
          : 'hover:brightness-110'
      }`}
    >
      {/* 選択時のフローティングツールバー (文字に被らないよう十分な間隔を空け、上端付近なら下側に自動反転) */}
      {isSelected && !isEditing && (
        <div
          className={`absolute left-0 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl px-2 py-1 flex items-center gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap ${
            item.y < 80 ? 'top-full mt-2.5' : '-top-12'
          }`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* スタイルプリセット切り替え */}
          <div className="flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded border border-slate-800 text-[10px]">
            {(
              [
                { id: 'tag', label: 'タグ枠' },
                { id: 'title', label: 'タイトル' },
                { id: 'plain', label: '文字' },
              ] as { id: TextStylePreset; label: string }[]
            ).map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  let updates: Partial<CanvasTextItem> = { stylePreset: p.id };
                  if (p.id === 'title') {
                    updates.fontSize = 24;
                    updates.fontWeight = 'bold';
                    updates.bgColor = 'rgba(15, 23, 42, 0.85)';
                    updates.borderColor = '#38bdf8';
                    updates.borderWidth = 0;
                    updates.borderRadius = 4;
                  } else if (p.id === 'tag') {
                    updates.fontSize = 14;
                    updates.fontWeight = 'bold';
                    updates.bgColor = '#1e293b';
                    updates.borderColor = '#38bdf8';
                    updates.borderWidth = 1;
                    updates.borderRadius = 6;
                  } else {
                    updates.fontSize = 16;
                    updates.bgColor = 'transparent';
                    updates.borderColor = 'transparent';
                    updates.borderWidth = 0;
                    updates.borderRadius = 0;
                  }
                  onUpdate(item.id, updates);
                }}
                className={`px-1.5 py-0.5 rounded transition ${
                  item.stylePreset === p.id
                    ? 'bg-cyan-600 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="h-3.5 w-[1px] bg-slate-700" />

          {/* 枠線・枠内色（背景色）設定ボタン */}
          <div className="relative">
            <button
              onClick={() => {
                setShowBoxStylePicker(!showBoxStylePicker);
                setShowTextColorPicker(false);
              }}
              className={`flex items-center gap-1 px-1.5 py-1 rounded text-xs transition border ${
                showBoxStylePicker
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                  : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700 border-slate-700'
              }`}
              title="線や枠内の色、太さ、角丸を編集"
            >
              <Square
                className="w-3.5 h-3.5"
                style={{
                  color: currentBorderColor !== 'transparent' ? currentBorderColor : '#94a3b8',
                  fill: currentBgColor !== 'transparent' ? currentBgColor : 'none',
                }}
              />
              <span className="text-[11px] font-medium">枠・背景色</span>
            </button>

            {/* 枠・背景設定ポップアップ */}
            {showBoxStylePicker && (
              <div
                className="absolute top-full left-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl p-3 shadow-2xl flex flex-col gap-2.5 z-[999] w-64 animate-in fade-in zoom-in-95 duration-100"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* 1. 属性スタイルプリセット (タイトルバッジ用) */}
                <div>
                  <div className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    <span>属性・装甲スタイル（ワンクリック）</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    {ATTRIBUTE_PRESETS.map((ap) => (
                      <button
                        key={ap.name}
                        onClick={() => {
                          onUpdate(item.id, {
                            borderColor: ap.border,
                            bgColor: ap.bg,
                            color: ap.text,
                            borderWidth: Math.max(1, currentBorderWidth),
                            borderRadius: currentBorderRadius || 6,
                          });
                        }}
                        className="flex items-center gap-1.5 px-1.5 py-1 rounded border hover:scale-102 transition text-left text-[10px]"
                        style={{
                          borderColor: ap.border,
                          backgroundColor: ap.bg,
                          color: ap.text,
                        }}
                        title={ap.name}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: ap.border }}
                        />
                        <span className="truncate font-semibold">{ap.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[1px] bg-slate-800" />

                {/* 2. 枠テーマプリセット (枠と同じ色セット) */}
                <div>
                  <div className="text-[10px] text-slate-400 font-bold mb-1">枠と同じテーマカラー</div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_BOX_THEMES.map((theme) => (
                      <button
                        key={theme.name}
                        onClick={() => {
                          onUpdate(item.id, {
                            borderColor: theme.borderColor,
                            bgColor: theme.bgColor === 'transparent' ? 'transparent' : theme.bgColor,
                            borderWidth: Math.max(1, currentBorderWidth),
                          });
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
                </div>

                <div className="h-[1px] bg-slate-800" />

                {/* 3. 線の色 & 枠内の色 (カスタムカラーピッカー) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">線の色 (枠線):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={currentBorderColor === 'transparent' ? '#38bdf8' : currentBorderColor}
                        onChange={(e) => onUpdate(item.id, { borderColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                        title="線の色を選択"
                      />
                      <button
                        onClick={() => onUpdate(item.id, { borderColor: 'transparent', borderWidth: 0 })}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700"
                      >
                        線なし
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-medium">枠内の色 (背景):</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={currentBgColor === 'transparent' ? '#1e293b' : currentBgColor.startsWith('#') ? currentBgColor : '#1e293b'}
                        onChange={(e) => onUpdate(item.id, { bgColor: e.target.value })}
                        className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                        title="枠内の色を選択"
                      />
                      <button
                        onClick={() => onUpdate(item.id, { bgColor: 'transparent' })}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700"
                      >
                        透明
                      </button>
                      <button
                        onClick={() => onUpdate(item.id, { bgColor: '#1e293b' })}
                        className="text-[9px] px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700"
                        title="ダークネイビー背景"
                      >
                        濃紺
                      </button>
                    </div>
                  </div>
                </div>

                <div className="h-[1px] bg-slate-800" />

                {/* 4. 線の太さ */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">線の太さ:</span>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4].map((w) => (
                      <button
                        key={w}
                        onClick={() => onUpdate(item.id, { borderWidth: w })}
                        className={`w-6 h-5 rounded text-[10px] font-mono transition ${
                          currentBorderWidth === w
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {w === 0 ? '無' : `${w}p`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5. 角の丸み */}
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-300 font-medium">角の丸み:</span>
                  <div className="flex items-center gap-1">
                    {[0, 4, 6, 8, 12, 20].map((r) => (
                      <button
                        key={r}
                        onClick={() => onUpdate(item.id, { borderRadius: r })}
                        className={`px-1.5 h-5 rounded text-[10px] font-mono transition ${
                          currentBorderRadius === r
                            ? 'bg-cyan-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {r === 20 ? '丸' : `${r}`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="h-3.5 w-[1px] bg-slate-700" />

          {/* 文字色パレット */}
          <div className="relative">
            <button
              onClick={() => {
                setShowTextColorPicker(!showTextColorPicker);
                setShowBoxStylePicker(false);
              }}
              className={`p-1 rounded transition flex items-center gap-0.5 ${
                showTextColorPicker ? 'bg-slate-700 text-cyan-300' : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="文字色を変更"
            >
              <Palette className="w-3.5 h-3.5" style={{ color: item.color }} />
            </button>
            {showTextColorPicker && (
              <div
                className="absolute top-full left-0 mt-1 p-2 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex flex-col gap-2 z-50 w-44"
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="text-[10px] text-slate-400 font-bold">文字色プリセット</div>
                <div className="grid grid-cols-5 gap-1.5">
                  {TEXT_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        onUpdate(item.id, { color: c });
                        setShowTextColorPicker(false);
                      }}
                      className={`w-5 h-5 rounded-full border transition hover:scale-110 ${
                        item.color === c ? 'border-white scale-110 shadow-sm' : 'border-slate-700'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-800 text-[10px]">
                  <span>カスタム文字色:</span>
                  <input
                    type="color"
                    value={item.color}
                    onChange={(e) => onUpdate(item.id, { color: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer bg-transparent border-0 p-0"
                  />
                </div>
              </div>
            )}
          </div>

          {/* フォントサイズ */}
          <div className="flex items-center gap-0.5 text-[10px]">
            {[14, 18, 24, 32].map((sz) => (
              <button
                key={sz}
                onClick={() => onUpdate(item.id, { fontSize: sz })}
                className={`px-1.5 py-0.5 rounded font-mono transition ${
                  item.fontSize === sz
                    ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-800'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          {/* 太字トグル */}
          <button
            onClick={() =>
              onUpdate(item.id, {
                fontWeight: item.fontWeight === 'bold' ? 'normal' : 'bold',
              })
            }
            className={`p-1 rounded transition ${
              item.fontWeight === 'bold'
                ? 'bg-slate-700 text-cyan-300'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="太字"
          >
            <Bold className="w-3 h-3" />
          </button>

          <div className="h-3.5 w-[1px] bg-slate-700" />

          {/* 重なり順 (前面へ / 背面へ) */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onUpdate(item.id, { zIndex: (item.zIndex ?? 25) + 5 })}
              className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
              title="枠やアイコンの前面へ出す"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              onClick={() => onUpdate(item.id, { zIndex: Math.max(5, (item.zIndex ?? 25) - 5) })}
              className="p-1 rounded text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition"
              title="背面へ送る"
            >
              <ArrowDown className="w-3 h-3" />
            </button>
          </div>

          <div className="h-3.5 w-[1px] bg-slate-700" />

          {/* 編集 */}
          <button
            onClick={() => setIsEditing(true)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="テキスト編集 (ダブルクリックでも可)"
          >
            <Type className="w-3 h-3" />
          </button>

          {/* 複製 */}
          <button
            onClick={() => onDuplicate(item.id)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="複製"
          >
            <Copy className="w-3 h-3" />
          </button>

          {/* 削除 */}
          <button
            onClick={() => onDelete(item.id)}
            className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-red-950/40 transition"
            title="削除"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* テキスト表示部 or インライン入力部 */}
      <div style={containerStyle} className="transition-all flex items-center">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleFinishEditing}
            onKeyDown={handleKeyDown}
            style={{
              fontSize: `${item.fontSize}px`,
              fontWeight: item.fontWeight === 'bold' ? 'bold' : 'normal',
              color: item.color,
            }}
            className="bg-transparent border-b border-cyan-400 rounded-none px-1 text-inherit outline-none min-w-[120px]"
          />
        ) : (
          <span
            style={{
              fontSize: `${item.fontSize}px`,
              fontWeight: item.fontWeight === 'bold' ? 'bold' : 'normal',
              color: item.color,
              fontFamily: "'Inter', 'Noto Sans JP', sans-serif",
            }}
            className="tracking-wide"
          >
            {item.text}
          </span>
        )}
      </div>
    </div>
  );
};
