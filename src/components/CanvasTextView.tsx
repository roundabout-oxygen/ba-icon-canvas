import React, { useState, useRef, useEffect } from 'react';
import { CanvasTextItem, TextStylePreset } from '../types';
import { Trash2, Copy, Type, Bold, Palette } from 'lucide-react';

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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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

  // スタイルプリセットごとのクラスとインラインスタイル
  const getStyleClasses = () => {
    if (item.stylePreset === 'title') {
      return 'border-l-4 border-cyan-400 bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-transparent pl-3 pr-5 py-1.5 rounded-r-xl shadow-lg';
    }
    if (item.stylePreset === 'tag') {
      return 'border border-cyan-500/50 bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-lg shadow-md';
    }
    // plain
    return 'px-2 py-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]';
  };

  return (
    <div
      data-item-id={item.id}
      data-text-id={item.id}
      style={{
        position: 'absolute',
        left: `${item.x}px`,
        top: `${item.y}px`,
        zIndex: isSelected ? 60 : item.zIndex,
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
          className={`absolute left-0 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-xl px-1.5 py-1 flex items-center gap-1 z-50 animate-in fade-in zoom-in-95 duration-100 whitespace-nowrap ${
            item.y < 80 ? 'top-full mt-2.5' : '-top-12'
          }`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* スタイルプリセット切り替え */}
          <div className="flex items-center gap-0.5 bg-slate-950/60 p-0.5 rounded border border-slate-800 text-[10px]">
            {(
              [
                { id: 'title', label: 'タイトル' },
                { id: 'tag', label: 'タグ枠' },
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
                  } else if (p.id === 'tag') {
                    updates.fontSize = 14;
                    updates.fontWeight = 'bold';
                  } else {
                    updates.fontSize = 16;
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

          <div className="h-3 w-[1px] bg-slate-700" />

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

          <div className="h-3 w-[1px] bg-slate-700" />

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

          {/* カラーパレット */}
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition flex items-center gap-0.5"
              title="文字色を変更"
            >
              <Palette className="w-3 h-3" style={{ color: item.color }} />
            </button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-1.5 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl flex items-center gap-1 z-50">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => {
                      onUpdate(item.id, { color: c });
                      setShowColorPicker(false);
                    }}
                    className={`w-4 h-4 rounded-full border transition ${
                      item.color === c ? 'border-white scale-110 shadow-sm' : 'border-slate-700'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="h-3 w-[1px] bg-slate-700" />

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
      <div className={`transition-all ${getStyleClasses()}`}>
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
            className="bg-slate-950/80 border border-cyan-400 rounded px-1 text-inherit outline-none min-w-[120px]"
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
