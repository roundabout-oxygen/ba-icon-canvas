import React, { useRef, useState } from 'react';
import { CanvasConfig, ContainerBox } from '../types';
import { APP_VERSION, PRESET_BOX_THEMES, CANVAS_PRESETS } from '../utils/constants';
import {
  Download,
  Copy,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Magnet,
  Grid,
  PlusSquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignHorizontalSpaceAround,
  FolderOpen,
  Save,
  Check,
  Maximize2,
  Sliders,
  Type,
  Tag,
  FileText,
} from 'lucide-react';

interface ToolbarProps {
  config: CanvasConfig;
  onUpdateConfig: (updates: Partial<CanvasConfig>) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  selectedCount: number;
  onAlignElements: (
    type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distributeH' | 'distributeV'
  ) => void;
  onAddBox: (themeIndex: number) => void;
  onAddText: (preset: 'title' | 'tag' | 'plain') => void;
  onExportPng: () => void;
  onCopyToClipboard: () => void;
  onSaveJson: () => void;
  onLoadJson: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearAll: () => void;
  iconSize: number;
  onChangeIconSize: (size: number) => void;
  onOpenIconSettings: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  config,
  onUpdateConfig,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  selectedCount,
  onAlignElements,
  onAddBox,
  onAddText,
  onExportPng,
  onCopyToClipboard,
  onSaveJson,
  onLoadJson,
  onClearAll,
  iconSize,
  onChangeIconSize,
  onOpenIconSettings,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showBoxDropdown, setShowBoxDropdown] = useState(false);
  const [showTextDropdown, setShowTextDropdown] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopyClick = () => {
    onCopyToClipboard();
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <header className="h-14 bg-slate-900 border-b border-slate-700/80 px-4 flex items-center justify-between select-none z-30 shadow-md">
      {/* 左エリア: アプリ名・バージョン表記・履歴操作 */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-sm">
            BA
          </div>
          <div>
            <h1 className="text-sm font-extrabold tracking-wide text-white flex items-center gap-1.5">
              <span>BlueArchive Icon Canvas</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80">
                {APP_VERSION}
              </span>
            </h1>
          </div>
        </div>

        <div className="h-5 w-[1px] bg-slate-700 mx-1" />

        {/* アンドゥ / リドゥ */}
        <div className="flex items-center gap-1">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition"
            title="元に戻す (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition"
            title="やり直す (Ctrl+Y)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-700 mx-1" />

        {/* 囲み枠（ボックス）追加 */}
        <div className="relative">
          <button
            onClick={() => {
              setShowBoxDropdown(!showBoxDropdown);
              setShowTextDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-medium border border-slate-700 transition shadow-sm"
            title="囲み枠を追加"
          >
            <PlusSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>枠を追加</span>
          </button>

          {showBoxDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg p-2 shadow-2xl flex flex-col gap-1 z-50 w-44">
              <div className="text-[10px] text-slate-400 font-bold px-1 py-0.5">プリセット枠色</div>
              {PRESET_BOX_THEMES.map((theme, idx) => (
                <button
                  key={theme.name}
                  onClick={() => {
                    onAddBox(idx);
                    setShowBoxDropdown(false);
                  }}
                  className="flex items-center gap-2 px-2 py-1 hover:bg-slate-700 rounded text-left text-xs text-slate-200 transition"
                >
                  <span
                    className="w-3.5 h-3.5 rounded border"
                    style={{ borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
                  />
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 文字・タイトル追加 */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTextDropdown(!showTextDropdown);
              setShowBoxDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-medium border border-slate-700 transition shadow-sm"
            title="タイトル文やタグ枠・メモ文字を追加"
          >
            <Type className="w-3.5 h-3.5 text-cyan-400" />
            <span>文字を追加</span>
          </button>

          {showTextDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-slate-900 border border-slate-700 rounded-xl p-2 shadow-2xl flex flex-col gap-1.5 z-50 w-52 animate-in fade-in zoom-in-95 duration-100">
              <div className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 border-b border-slate-800 pb-1">
                テキストスタイルを選択
              </div>

              <button
                onClick={() => {
                  onAddText('title');
                  setShowTextDropdown(false);
                }}
                className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-left transition group"
              >
                <div className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Type className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">タイトル文</div>
                  <div className="text-[10px] text-slate-400">青ライン付きの大見出し</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onAddText('tag');
                  setShowTextDropdown(false);
                }}
                className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-left transition group"
              >
                <div className="p-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
                  <Tag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">タグ・小見出し枠</div>
                  <div className="text-[10px] text-slate-400">枠付きの分類ラベル</div>
                </div>
              </button>

              <button
                onClick={() => {
                  onAddText('plain');
                  setShowTextDropdown(false);
                }}
                className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-left transition group"
              >
                <div className="p-1 rounded bg-slate-800 text-slate-400 border border-slate-700">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white group-hover:text-cyan-300">シンプル文字</div>
                  <div className="text-[10px] text-slate-400">背景なしの注釈・メモ</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 整列ボタン群 (複数選択時または選択時に活性化) */}
        {selectedCount > 1 && (
          <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-0.5 rounded-md border border-slate-700 animate-fadeIn">
            <button
              onClick={() => onAlignElements('left')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
              title="左揃え"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlignElements('center')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
              title="左右中央揃え"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlignElements('right')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
              title="右揃え"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-[1px] bg-slate-700 mx-0.5" />
            <button
              onClick={() => onAlignElements('top')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
              title="上揃え"
            >
              <AlignStartVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlignElements('middle')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
              title="上下中央揃え"
            >
              <AlignCenterVertical className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onAlignElements('bottom')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
              title="下揃え"
            >
              <AlignEndVertical className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-[1px] bg-slate-700 mx-0.5" />
            <button
              onClick={() => onAlignElements('distributeH')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition"
              title="水平等間隔に整列"
            >
              <AlignHorizontalSpaceAround className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 中央エリア: アイコン設定・サイズ・丸み・スナップ切り替え */}
      <div className="flex items-center gap-2.5">
        {/* アイコン詳細設定ボタン */}
        <button
          onClick={onOpenIconSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-800/60 shadow-sm transition text-xs font-semibold"
          title="アイコンのサイズ・丸み・枠線の太さ・属性連動カラーの詳細設定"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>アイコン設定</span>
          {config.iconBorderWidth && config.iconBorderWidth > 0 ? (
            <span
              className="text-[9px] px-1 py-0.5 rounded font-mono border"
              style={{
                borderColor:
                  config.iconBorderColorMode === 'attack'
                    ? '#ef4444'
                    : config.iconBorderColorMode === 'defense'
                    ? '#3b82f6'
                    : (config.iconBorderColor || '#ffffff'),
                color:
                  config.iconBorderColorMode === 'attack'
                    ? '#f87171'
                    : config.iconBorderColorMode === 'defense'
                    ? '#60a5fa'
                    : (config.iconBorderColor || '#ffffff'),
              }}
            >
              枠線{config.iconBorderWidth}px
            </span>
          ) : null}
        </button>

        {/* 簡易アイコンサイズスライダー */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="text-[11px]">サイズ:</span>
          <input
            type="range"
            min="40"
            max="120"
            step="4"
            value={iconSize}
            onChange={(e) => onChangeIconSize(Number(e.target.value))}
            className="w-14 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            title={`アイコンサイズ: ${iconSize}px`}
          />
          <span className="font-mono text-[10px] w-5 text-slate-300">{iconSize}</span>
        </div>

        {/* 簡易アイコン角丸スライダー */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="text-[11px]">丸み:</span>
          <input
            type="range"
            min="0"
            max="32"
            step="2"
            value={config.iconBorderRadius ?? 8}
            onChange={(e) => onUpdateConfig({ iconBorderRadius: Number(e.target.value) })}
            className="w-12 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            title={`アイコン角の丸み: ${config.iconBorderRadius ?? 8}px`}
          />
          <span className="font-mono text-[10px] w-4 text-slate-300">{config.iconBorderRadius ?? 8}</span>
        </div>

        <div className="h-5 w-[1px] bg-slate-700 mx-1" />

        {/* スナップ吸着トグル */}
        <button
          onClick={() => onUpdateConfig({ snapEnabled: !config.snapEnabled })}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition border ${
            config.snapEnabled
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700 shadow-sm'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="近くの要素や端への位置スナップ（吸着）ON/OFF"
        >
          <Magnet className="w-3.5 h-3.5" />
          <span>吸着</span>
        </button>

        {/* 吸着間隔シークバー */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400" title="吸着時に開ける間隔(px)">
          <span className="text-[11px]">間隔:</span>
          <input
            type="range"
            min="0"
            max="32"
            step="2"
            disabled={!config.snapEnabled}
            value={config.snapGap ?? 8}
            onChange={(e) => onUpdateConfig({ snapGap: Number(e.target.value) })}
            className="w-16 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg disabled:opacity-30"
          />
          <span className="font-mono text-[10px] w-4">{config.snapGap ?? 8}</span>
        </div>

        {/* グリッド表示トグル */}
        <button
          onClick={() => onUpdateConfig({ showGrid: !config.showGrid })}
          className={`p-1.5 rounded transition border ${
            config.showGrid
              ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
          title="グリッド背景表示 ON/OFF"
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        {/* キャンバス背景色 */}
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="text-[11px]">背景:</span>
          <input
            type="color"
            value={config.bgColor}
            onChange={(e) => onUpdateConfig({ bgColor: e.target.value })}
            className="w-6 h-6 rounded cursor-pointer bg-transparent border-0"
            title="キャンバス背景色"
          />
        </div>

        {/* キャンバスサイズプリセット */}
        <select
          value={`${config.width}x${config.height}`}
          onChange={(e) => {
            const [w, h] = e.target.value.split('x').map(Number);
            onUpdateConfig({ width: w, height: h });
          }}
          className="bg-slate-800 border border-slate-700 text-slate-300 rounded px-2 py-1 text-[11px] focus:outline-none focus:border-cyan-500"
        >
          {CANVAS_PRESETS.map((p) => (
            <option key={p.name} value={`${p.width}x${p.height}`}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* 右エリア: ズーム操作・保存・PNG画像エクスポート */}
      <div className="flex items-center gap-2">
        {/* ズーム */}
        <div className="flex items-center gap-1 bg-slate-800 px-1 py-0.5 rounded-md border border-slate-700 text-slate-300">
          <button
            onClick={() => onUpdateConfig({ zoom: Math.max(0.4, Number((config.zoom - 0.1).toFixed(1))) })}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition"
            title="縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono w-9 text-center">
            {Math.round(config.zoom * 100)}%
          </span>
          <button
            onClick={() => onUpdateConfig({ zoom: Math.min(2.0, Number((config.zoom + 0.1).toFixed(1))) })}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition"
            title="拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateConfig({ zoom: 1.0 })}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition text-slate-400"
            title="100%にリセット"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <div className="h-5 w-[1px] bg-slate-700 mx-1" />

        {/* プロジェクト保存 (JSON) */}
        <button
          onClick={onSaveJson}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="レイアウトを保存 (.json)"
        >
          <Save className="w-4 h-4" />
        </button>

        {/* プロジェクト読込 (JSON) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition"
          title="レイアウトを読み込み (.json)"
        >
          <FolderOpen className="w-4 h-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={onLoadJson}
          className="hidden"
        />

        {/* クリップボードに画像をコピー */}
        <button
          onClick={handleCopyClick}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition relative"
          title="画像をクリップボードにコピー"
        >
          {copySuccess ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
        </button>

        {/* PNG画像エクスポート */}
        <button
          onClick={onExportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-md text-xs shadow-md transition transform active:scale-95"
          title="キャンバスをPNG画像として保存"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>PNG保存</span>
        </button>
      </div>
    </header>
  );
};
