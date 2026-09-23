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
    <header className="h-14 bg-slate-900 border-b border-slate-700/80 px-3 flex items-center justify-between select-none z-30 shadow-md min-w-0 overflow-x-auto overflow-y-hidden gap-2 scrollbar-none">
      {/* ─── 左グループ: アプリ名・バージョン & 作成・整列操作 ─── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* ロゴ & バージョン */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-black text-slate-950 text-xs shadow-sm flex-shrink-0">
            BA
          </div>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <h1 className="text-xs font-extrabold tracking-wide text-white hidden xl:inline">
              BlueArchive Icon Canvas
            </h1>
            <h1 className="text-xs font-extrabold tracking-wide text-white xl:hidden">
              BA Canvas
            </h1>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/80 flex-shrink-0">
              {APP_VERSION}
            </span>
          </div>
        </div>

        <div className="h-4 w-[1px] bg-slate-700 mx-0.5 flex-shrink-0" />

        {/* アンドゥ / リドゥ */}
        <div className="flex items-center gap-0.5 flex-shrink-0">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition flex-shrink-0"
            title="元に戻す (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent rounded transition flex-shrink-0"
            title="やり直す (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-slate-700 mx-0.5 flex-shrink-0" />

        {/* 囲み枠（ボックス）追加 */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => {
              setShowBoxDropdown(!showBoxDropdown);
              setShowTextDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-medium border border-slate-700 transition shadow-sm whitespace-nowrap flex-shrink-0"
            title="囲み枠を追加"
          >
            <PlusSquare className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="whitespace-nowrap">枠を追加</span>
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
                  className="flex items-center gap-2 px-2 py-1 hover:bg-slate-700 rounded text-left text-xs text-slate-200 transition whitespace-nowrap"
                >
                  <span
                    className="w-3.5 h-3.5 rounded border flex-shrink-0"
                    style={{ borderColor: theme.borderColor, backgroundColor: theme.bgColor }}
                  />
                  <span>{theme.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 文字・タイトル追加 */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => {
              setShowTextDropdown(!showTextDropdown);
              setShowBoxDropdown(false);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-medium border border-slate-700 transition shadow-sm whitespace-nowrap flex-shrink-0"
            title="タイトル文やタグ枠・メモ文字を追加"
          >
            <Type className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span className="whitespace-nowrap">文字を追加</span>
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
                className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-left transition group whitespace-nowrap"
              >
                <div className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 flex-shrink-0">
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
                className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-left transition group whitespace-nowrap"
              >
                <div className="p-1 rounded bg-slate-800 text-slate-200 border border-slate-700 flex-shrink-0">
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
                className="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-800 rounded-lg text-left transition group whitespace-nowrap"
              >
                <div className="p-1 rounded bg-slate-800 text-slate-400 border border-slate-700 flex-shrink-0">
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

        {/* 整列ボタン群 (複数選択時のみスマートに表示) */}
        {selectedCount > 1 && (
          <div className="flex items-center gap-0.5 bg-slate-800/90 px-1 py-0.5 rounded-md border border-slate-700 flex-shrink-0 animate-fadeIn">
            <button
              onClick={() => onAlignElements('left')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition flex-shrink-0"
              title="左揃え"
            >
              <AlignLeft className="w-3 h-3" />
            </button>
            <button
              onClick={() => onAlignElements('center')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition flex-shrink-0"
              title="左右中央揃え"
            >
              <AlignCenter className="w-3 h-3" />
            </button>
            <button
              onClick={() => onAlignElements('right')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition flex-shrink-0"
              title="右揃え"
            >
              <AlignRight className="w-3 h-3" />
            </button>
            <div className="h-3 w-[1px] bg-slate-700 mx-0.5" />
            <button
              onClick={() => onAlignElements('top')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition flex-shrink-0"
              title="上揃え"
            >
              <AlignStartVertical className="w-3 h-3" />
            </button>
            <button
              onClick={() => onAlignElements('middle')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition flex-shrink-0"
              title="上下中央揃え"
            >
              <AlignCenterVertical className="w-3 h-3" />
            </button>
            <button
              onClick={() => onAlignElements('bottom')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition flex-shrink-0"
              title="下揃え"
            >
              <AlignEndVertical className="w-3 h-3" />
            </button>
            <div className="h-3 w-[1px] bg-slate-700 mx-0.5" />
            <button
              onClick={() => onAlignElements('distributeH')}
              className="p-1 hover:bg-slate-700 text-slate-300 hover:text-white rounded transition flex-shrink-0"
              title="水平等間隔に整列"
            >
              <AlignHorizontalSpaceAround className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* ─── 中央グループ: アイコン設定 & スナップ吸着 ─── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* アイコン詳細設定ボタン (ステータスバッジ内包) */}
        <button
          onClick={onOpenIconSettings}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white border border-cyan-800/60 shadow-sm transition text-xs font-semibold whitespace-nowrap flex-shrink-0"
          title="アイコン設定を開く（サイズ、丸み、枠線の太さ、属性連動カラー）"
        >
          <Sliders className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
          <span className="whitespace-nowrap">アイコン設定</span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-cyan-950/80 text-cyan-300 rounded border border-cyan-800/80 flex-shrink-0">
            {iconSize}px
          </span>
          {config.iconBorderWidth && config.iconBorderWidth > 0 ? (
            <span
              className="text-[9px] px-1 py-0.2 rounded font-mono border flex-shrink-0 whitespace-nowrap"
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

        <div className="h-4 w-[1px] bg-slate-700 mx-0.5 flex-shrink-0" />

        {/* スナップ吸着トグル & 間隔 */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 flex-shrink-0">
          <button
            onClick={() => onUpdateConfig({ snapEnabled: !config.snapEnabled })}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition whitespace-nowrap flex-shrink-0 ${
              config.snapEnabled
                ? 'bg-cyan-950 text-cyan-300 font-bold border border-cyan-700/80'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="近くの要素や端への位置スナップ（吸着）ON/OFF"
          >
            <Magnet className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="whitespace-nowrap">吸着</span>
          </button>

          {config.snapEnabled && (
            <div className="flex items-center gap-1 pl-1 pr-1.5 border-l border-slate-700 text-xs text-slate-400 flex-shrink-0" title="吸着時に開ける間隔(px)">
              <span className="text-[10px] text-slate-500 whitespace-nowrap">間隔:</span>
              <input
                type="range"
                min="0"
                max="24"
                step="2"
                value={config.snapGap ?? 8}
                onChange={(e) => onUpdateConfig({ snapGap: Number(e.target.value) })}
                className="w-12 accent-cyan-400 cursor-pointer h-1.5 bg-slate-700 rounded-lg flex-shrink-0"
              />
              <span className="font-mono text-[10px] w-3.5 text-cyan-300 whitespace-nowrap">{config.snapGap ?? 8}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── 右グループ: キャンバス設定・ズーム・エクスポート ─── */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* キャンバス背景・グリッド・解像度 */}
        <div className="flex items-center gap-1 bg-slate-800/80 px-1.5 py-1 rounded-lg border border-slate-700 flex-shrink-0">
          {/* グリッド表示トグル */}
          <button
            onClick={() => onUpdateConfig({ showGrid: !config.showGrid })}
            className={`p-1 rounded transition flex-shrink-0 ${
              config.showGrid
                ? 'bg-cyan-950 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="グリッド背景表示 ON/OFF"
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* キャンバス背景色 */}
          <div className="flex items-center gap-1 pl-1 border-l border-slate-700 flex-shrink-0" title="キャンバス背景色">
            <input
              type="color"
              value={config.bgColor}
              onChange={(e) => onUpdateConfig({ bgColor: e.target.value })}
              className="w-4 h-4 rounded cursor-pointer bg-transparent border-0 p-0"
            />
          </div>

          {/* キャンバスサイズプリセット */}
          <select
            value={`${config.width}x${config.height}`}
            onChange={(e) => {
              const [w, h] = e.target.value.split('x').map(Number);
              onUpdateConfig({ width: w, height: h });
            }}
            className="bg-transparent text-slate-300 text-[11px] focus:outline-none cursor-pointer pl-1 whitespace-nowrap flex-shrink-0"
            title="キャンバス解像度"
          >
            {CANVAS_PRESETS.map((p) => (
              <option key={p.name} value={`${p.width}x${p.height}`} className="bg-slate-900 text-slate-200">
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* ズーム */}
        <div className="flex items-center gap-0.5 bg-slate-800 px-1 py-0.5 rounded-md border border-slate-700 text-slate-300 flex-shrink-0">
          <button
            onClick={() => onUpdateConfig({ zoom: Math.max(0.4, Number((config.zoom - 0.1).toFixed(1))) })}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition flex-shrink-0"
            title="縮小"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono w-8 text-center whitespace-nowrap flex-shrink-0">
            {Math.round(config.zoom * 100)}%
          </span>
          <button
            onClick={() => onUpdateConfig({ zoom: Math.min(2.0, Number((config.zoom + 0.1).toFixed(1))) })}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition flex-shrink-0"
            title="拡大"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onUpdateConfig({ zoom: 1.0 })}
            className="p-1 hover:text-white hover:bg-slate-700 rounded transition text-slate-400 flex-shrink-0"
            title="100%にリセット"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
        </div>

        <div className="h-4 w-[1px] bg-slate-700 mx-0.5 flex-shrink-0" />

        {/* プロジェクト保存 (JSON) */}
        <button
          onClick={onSaveJson}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition flex-shrink-0"
          title="レイアウトを保存 (.json)"
        >
          <Save className="w-3.5 h-3.5" />
        </button>

        {/* プロジェクト読込 (JSON) */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition flex-shrink-0"
          title="レイアウトを読み込み (.json)"
        >
          <FolderOpen className="w-3.5 h-3.5" />
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
          className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition relative flex-shrink-0"
          title="画像をクリップボードにコピー"
        >
          {copySuccess ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>

        {/* PNG画像エクスポート */}
        <button
          onClick={onExportPng}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-md text-xs shadow-md transition transform active:scale-95 flex-shrink-0 whitespace-nowrap"
          title="キャンバスをPNG画像として保存"
        >
          <Download className="w-3.5 h-3.5 stroke-[2.5] flex-shrink-0" />
          <span className="whitespace-nowrap">PNG保存</span>
        </button>
      </div>
    </header>
  );
};
