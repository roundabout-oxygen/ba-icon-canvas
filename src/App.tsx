import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Character, CanvasIconItem, ContainerBox, CanvasConfig, HistoryState, SnapLine } from './types';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { PRESET_BOX_THEMES, APP_VERSION } from './utils/constants';
import { toPng, toBlob } from 'html-to-image';
import { getGuideLinesOnly, Rect } from './utils/snapGuide';

export function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  // キャンバス設定
  const [config, setConfig] = useState<CanvasConfig>({
    width: 1200,
    height: 800,
    bgColor: '#0f172a',
    zoom: 1.0,
    snapEnabled: true,
    snapGap: 8,
    iconBorderRadius: 8,
    showGrid: false,
  });

  const [iconSize, setIconSize] = useState<number>(64);
  const [items, setItems] = useState<CanvasIconItem[]>([]);
  const [boxes, setBoxes] = useState<ContainerBox[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedSidebarCharIds, setSelectedSidebarCharIds] = useState<Set<string>>(new Set());
  const [keyboardSnapLines, setKeyboardSnapLines] = useState<SnapLine[]>([]);
  const snapLinesTimerRef = useRef<NodeJS.Timeout | null>(null);
  const historyDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // アンドゥ・リドゥ履歴スタック
  const historyRef = useRef<HistoryState[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoActionRef = useRef<boolean>(false);

  const canvasRef = useRef<HTMLDivElement>(null);

  // 生徒データMap
  const charactersMap = useMemo(() => {
    const map = new Map<string, Character>();
    characters.forEach((c) => map.set(c.id, c));
    return map;
  }, [characters]);

  // 配置済み生徒IDセット
  const placedCharIds = useMemo(() => {
    return new Set(items.map((it) => it.charId));
  }, [items]);

  // 初回データ読み込み (キャンバスは完全な無地スタート)
  useEffect(() => {
    fetch('characters.json')
      .then((res) => res.json())
      .then((data: Character[]) => {
        // あいうえお順（日本語五十音順）にソートして格納
        const sorted = data.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
        setCharacters(sorted);
        setLoading(false);

        // 要望: キャンバス部は最初は何も配置していない無地スタート
        setBoxes([]);
        setItems([]);

        // 履歴初期化
        historyRef.current = [{ items: [], boxes: [], config }];
        historyIndexRef.current = 0;
      })
      .catch((err) => {
        console.error('Failed to load characters:', err);
        setLoading(false);
      });
  }, []);

  // 履歴プッシュ (状態変更時)
  const pushHistory = useCallback(
    (newItems: CanvasIconItem[], newBoxes: ContainerBox[], newConfig: CanvasConfig) => {
      if (isUndoRedoActionRef.current) return;
      const history = historyRef.current.slice(0, historyIndexRef.current + 1);
      history.push({ items: newItems, boxes: newBoxes, config: newConfig });
      if (history.length > 50) history.shift();
      historyRef.current = history;
      historyIndexRef.current = history.length - 1;
    },
    []
  );

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      isUndoRedoActionRef.current = true;
      historyIndexRef.current -= 1;
      const state = historyRef.current[historyIndexRef.current];
      setItems(state.items);
      setBoxes(state.boxes);
      setConfig(state.config);
      setTimeout(() => {
        isUndoRedoActionRef.current = false;
      }, 50);
    }
  }, []);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyRef.current.length - 1) {
      isUndoRedoActionRef.current = true;
      historyIndexRef.current += 1;
      const state = historyRef.current[historyIndexRef.current];
      setItems(state.items);
      setBoxes(state.boxes);
      setConfig(state.config);
      setTimeout(() => {
        isUndoRedoActionRef.current = false;
      }, 50);
    }
  }, []);

  // アイテム更新
  const handleUpdateItems = useCallback(
    (newItems: CanvasIconItem[]) => {
      setItems(newItems);
      pushHistory(newItems, boxes, config);
    },
    [boxes, config, pushHistory]
  );

  // ボックス更新
  const handleUpdateBoxes = useCallback(
    (newBoxes: ContainerBox[]) => {
      setBoxes(newBoxes);
      pushHistory(items, newBoxes, config);
    },
    [items, config, pushHistory]
  );

  // コンフィグ更新
  const handleUpdateConfig = useCallback(
    (updates: Partial<CanvasConfig>) => {
      const next = { ...config, ...updates };
      setConfig(next);
      pushHistory(items, boxes, next);
    },
    [config, items, boxes, pushHistory]
  );

  // アイコンサイズ一括変更
  const handleChangeIconSize = (size: number) => {
    setIconSize(size);
    if (selectedIds.size > 0) {
      const nextItems = items.map((it) => (selectedIds.has(it.id) ? { ...it, size } : it));
      handleUpdateItems(nextItems);
    }
  };

  // ドラッグ＆ドロップで任意位置に複数配置
  const handleDropCharacters = (charIds: string[], dropX: number, dropY: number) => {
    const cols = 6;
    const gap = 8;
    const newItems: CanvasIconItem[] = charIds.map((charId, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      return {
        id: `item_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'icon',
        charId,
        x: Math.min(config.width - iconSize - 10, Math.max(10, dropX + col * (iconSize + gap))),
        y: Math.min(config.height - iconSize - 10, Math.max(10, dropY + row * (iconSize + gap))),
        size: iconSize,
        zIndex: 10 + items.length + idx,
      };
    });

    const nextItems = [...items, ...newItems];
    setItems(nextItems);
    setSelectedIds(new Set(newItems.map((it) => it.id)));
    pushHistory(nextItems, boxes, config);
  };

  /**
   * 要望対応: 「＋で追加すると中央に出てくるので右上端に重ならないように配置されていくようにしてください」
   * 右上端から左方向・下方向にスロットを探索し、既存アイテムと重ならない位置に配置
   */
  const handleAddCharactersToTopRight = (charIds: string[]) => {
    const padRight = 20;
    const padTop = 20;
    const gap = 8;
    const poolCols = 5; // 右上の横並び列数

    const currentItems = [...items];
    const newlyCreated: CanvasIconItem[] = [];

    charIds.forEach((charId, i) => {
      // 既存アイテムと重複しない空きスロットを探す
      let slot = 0;
      let foundX = 0;
      let foundY = 0;

      while (slot < 300) {
        const col = slot % poolCols;
        const row = Math.floor(slot / poolCols);
        // 右上角から左へ col 列、下へ row 行
        const testX = config.width - padRight - iconSize - col * (iconSize + gap);
        const testY = padTop + row * (iconSize + gap);

        // 現在のアイテムおよび今回追加済みのアイテムと重なっていないか判定
        const overlaps = [...currentItems, ...newlyCreated].some((it) => {
          return (
            Math.abs(it.x - testX) < iconSize * 0.75 &&
            Math.abs(it.y - testY) < iconSize * 0.75
          );
        });

        if (!overlaps) {
          foundX = testX;
          foundY = testY;
          break;
        }
        slot++;
      }

      if (slot >= 300) {
        // 万が一スロットが見つからなかった場合のフォールバック
        foundX = Math.max(20, config.width - padRight - iconSize - (i % poolCols) * (iconSize + gap));
        foundY = padTop + Math.floor(i / poolCols) * (iconSize + gap);
      }

      const newItem: CanvasIconItem = {
        id: `item_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'icon',
        charId,
        x: Math.round(foundX),
        y: Math.round(foundY),
        size: iconSize,
        zIndex: 10 + currentItems.length + i,
      };

      newlyCreated.push(newItem);
    });

    const nextItems = [...items, ...newlyCreated];
    setItems(nextItems);
    setSelectedIds(new Set(newlyCreated.map((it) => it.id)));
    pushHistory(nextItems, boxes, config);
  };

  // アイテム削除
  const handleDeleteItem = (id: string) => {
    const nextItems = items.filter((it) => it.id !== id);
    setItems(nextItems);
    const nextSelected = new Set(selectedIds);
    nextSelected.delete(id);
    setSelectedIds(nextSelected);
    pushHistory(nextItems, boxes, config);
  };

  // ボックス削除
  const handleDeleteBox = (id: string) => {
    const nextBoxes = boxes.filter((b) => b.id !== id);
    setBoxes(nextBoxes);
    const nextSelected = new Set(selectedIds);
    nextSelected.delete(id);
    setSelectedIds(nextSelected);
    pushHistory(items, nextBoxes, config);
  };

  // ボックス複製
  const handleDuplicateBox = (id: string) => {
    const src = boxes.find((b) => b.id === id);
    if (!src) return;
    const newBox: ContainerBox = {
      ...src,
      id: `box_${Date.now()}`,
      x: src.x + 30,
      y: src.y + 30,
    };
    const nextBoxes = [...boxes, newBox];
    setBoxes(nextBoxes);
    setSelectedIds(new Set([newBox.id]));
    pushHistory(items, nextBoxes, config);
  };

  // 枠の新規追加
  const handleAddBox = (themeIndex: number) => {
    const theme = PRESET_BOX_THEMES[themeIndex] || PRESET_BOX_THEMES[0];
    const newBox: ContainerBox = {
      id: `box_${Date.now()}`,
      type: 'box',
      label: theme.name,
      x: 40 + boxes.length * 20,
      y: 40 + boxes.length * 20,
      width: 680,
      height: 160,
      borderColor: theme.borderColor,
      borderWidth: 4,
      borderRadius: 6,
      bgColor: theme.bgColor,
      bgOpacity: theme.opacity,
      zIndex: 1 + boxes.length,
    };
    const nextBoxes = [...boxes, newBox];
    setBoxes(nextBoxes);
    setSelectedIds(new Set([newBox.id]));
    pushHistory(items, nextBoxes, config);
  };

  // 枠内のアイテムを整列（横一列 or グリッド）
  const handleAlignBoxChildren = (boxId: string, alignType: 'grid' | 'row') => {
    const box = boxes.find((b) => b.id === boxId);
    if (!box) return;

    // 枠の領域内にあるアイコンを抽出
    const padding = 12;
    const childItems = items.filter(
      (it) =>
        it.x >= box.x - 20 &&
        it.x + it.size <= box.x + box.width + 20 &&
        it.y >= box.y - 20 &&
        it.y + it.size <= box.y + box.height + 20
    );

    if (childItems.length === 0) return;

    // Y座標・X座標順でソート
    childItems.sort((a, b) => (Math.abs(a.y - b.y) > 20 ? a.y - b.y : a.x - b.x));

    const itemW = childItems[0].size;
    const gap = 10;
    const minPadding = 12;
    const availWidth = box.width - minPadding * 2;

    // グリッド計算 (左右センタリング)
    const maxCols = Math.max(1, Math.floor((availWidth + gap) / (itemW + gap)));
    const actualCols = alignType === 'row' ? childItems.length : Math.min(maxCols, childItems.length);
    const totalGridWidth = actualCols * itemW + (actualCols - 1) * gap;
    const startX = Math.max(minPadding, Math.round((box.width - totalGridWidth) / 2));

    // 要望対応: 上下方向も枠の中央に配置（上下センタリング）
    const totalRows = alignType === 'row' ? 1 : Math.ceil(childItems.length / maxCols);
    const totalGridHeight = totalRows * itemW + (totalRows - 1) * gap;
    const startY = Math.max(minPadding, Math.round((box.height - totalGridHeight) / 2));

    const nextItems = items.map((it) => {
      const idx = childItems.findIndex((c) => c.id === it.id);
      if (idx === -1) return it;

      if (alignType === 'row') {
        const x = box.x + startX + idx * (itemW + gap);
        const y = box.y + startY;
        return { ...it, x, y };
      } else {
        // グリッド
        const col = idx % maxCols;
        const row = Math.floor(idx / maxCols);
        const x = box.x + startX + col * (itemW + gap);
        const y = box.y + startY + row * (itemW + gap);
        return { ...it, x, y };
      }
    });

    handleUpdateItems(nextItems);
  };

  // 選択中要素の整列機能
  const handleAlignElements = (
    type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distributeH' | 'distributeV'
  ) => {
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    if (selectedItems.length < 2) return;

    let minX = Math.min(...selectedItems.map((i) => i.x));
    let maxX = Math.max(...selectedItems.map((i) => i.x + i.size));
    let minY = Math.min(...selectedItems.map((i) => i.y));
    let maxY = Math.max(...selectedItems.map((i) => i.y + i.size));

    let updated = [...items];

    if (type === 'left') {
      updated = items.map((it) => (selectedIds.has(it.id) ? { ...it, x: minX } : it));
    } else if (type === 'center') {
      const midX = (minX + maxX) / 2;
      updated = items.map((it) =>
        selectedIds.has(it.id) ? { ...it, x: Math.round(midX - it.size / 2) } : it
      );
    } else if (type === 'right') {
      updated = items.map((it) => (selectedIds.has(it.id) ? { ...it, x: maxX - it.size } : it));
    } else if (type === 'top') {
      updated = items.map((it) => (selectedIds.has(it.id) ? { ...it, y: minY } : it));
    } else if (type === 'middle') {
      const midY = (minY + maxY) / 2;
      updated = items.map((it) =>
        selectedIds.has(it.id) ? { ...it, y: Math.round(midY - it.size / 2) } : it
      );
    } else if (type === 'bottom') {
      updated = items.map((it) => (selectedIds.has(it.id) ? { ...it, y: maxY - it.size } : it));
    } else if (type === 'distributeH') {
      const sorted = [...selectedItems].sort((a, b) => a.x - b.x);
      const totalWidth = sorted.reduce((sum, item) => sum + item.size, 0);
      const totalSpace = maxX - minX - totalWidth;
      const gap = totalSpace / (sorted.length - 1);
      let currentX = minX;
      const posMap = new Map<string, number>();
      sorted.forEach((item) => {
        posMap.set(item.id, Math.round(currentX));
        currentX += item.size + gap;
      });
      updated = items.map((it) => (posMap.has(it.id) ? { ...it, x: posMap.get(it.id)! } : it));
    }

    handleUpdateItems(updated);
  };

  // 全消去
  const handleClearAll = () => {
    if (window.confirm('キャンバス上のすべての要素をクリアしますか？')) {
      setItems([]);
      setBoxes([]);
      setSelectedIds(new Set());
      pushHistory([], [], config);
    }
  };

  // PNG画像保存
  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    try {
      const prevSelected = new Set(selectedIds);
      setSelectedIds(new Set());

      await new Promise((r) => setTimeout(r, 50));
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        cacheBust: true,
      });

      setSelectedIds(prevSelected);

      const link = document.createElement('a');
      link.download = `BlueArchive-Canvas-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('画像の出力に失敗しました。');
    }
  };

  // クリップボードへコピー
  const handleCopyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      const prevSelected = new Set(selectedIds);
      setSelectedIds(new Set());
      await new Promise((r) => setTimeout(r, 50));

      const blob = await toBlob(canvasRef.current, { pixelRatio: 2, cacheBust: true });
      setSelectedIds(prevSelected);

      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'image/png': blob,
          }),
        ]);
      }
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // プロジェクトJSON保存
  const handleSaveJson = () => {
    const data = {
      version: APP_VERSION,
      config,
      boxes,
      items,
      savedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.download = `ba-canvas-project-${Date.now()}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  // プロジェクトJSON読み込み
  const handleLoadJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.items && json.boxes) {
          setItems(json.items);
          setBoxes(json.boxes);
          if (json.config) setConfig(json.config);
          setSelectedIds(new Set());
          pushHistory(json.items, json.boxes, json.config || config);
        }
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // キーボードショートカット
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Delete / Backspace で削除
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.size > 0) {
          const nextItems = items.filter((it) => !selectedIds.has(it.id));
          const nextBoxes = boxes.filter((b) => !selectedIds.has(b.id));
          setItems(nextItems);
          setBoxes(nextBoxes);
          setSelectedIds(new Set());
          pushHistory(nextItems, nextBoxes, config);
        }
      }

      // Ctrl+Z / Ctrl+Y
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }

      // Ctrl+A 全選択
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIds = new Set([...items.map((i) => i.id), ...boxes.map((b) => b.id)]);
        setSelectedIds(allIds);
      }

      // Escape 選択解除
      if (e.key === 'Escape') {
        setSelectedIds(new Set());
        setKeyboardSnapLines([]);
      }

      // 十字キーによるアイコン・要素の微調整移動（吸着なし・スマートガイド線表示）
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (selectedIds.size === 0) return;
        e.preventDefault();

        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;

        const nextItems = items.map((it) =>
          selectedIds.has(it.id) ? { ...it, x: it.x + dx, y: it.y + dy } : it
        );
        const nextBoxes = boxes.map((b) =>
          selectedIds.has(b.id) ? { ...b, x: b.x + dx, y: b.y + dy } : b
        );

        setItems(nextItems);
        setBoxes(nextBoxes);

        // 代表要素の位置からガイド線を判定
        const selectedItem = nextItems.find((it) => selectedIds.has(it.id));
        const selectedBox = nextBoxes.find((b) => selectedIds.has(b.id));
        const activeRect: Rect | null = selectedItem
          ? { id: selectedItem.id, x: selectedItem.x, y: selectedItem.y, width: selectedItem.size, height: selectedItem.size }
          : selectedBox
          ? { id: selectedBox.id, x: selectedBox.x, y: selectedBox.y, width: selectedBox.width, height: selectedBox.height }
          : null;

        if (activeRect) {
          const otherRects: Rect[] = [];
          nextItems.forEach((it) => {
            if (!selectedIds.has(it.id)) {
              otherRects.push({ id: it.id, x: it.x, y: it.y, width: it.size, height: it.size });
            }
          });
          nextBoxes.forEach((b) => {
            if (!selectedIds.has(b.id)) {
              otherRects.push({ id: b.id, x: b.x, y: b.y, width: b.width, height: b.height });
            }
          });

          const lines = getGuideLinesOnly(
            activeRect,
            otherRects,
            config.width,
            config.height,
            config.snapGap ?? 8,
            2
          );
          setKeyboardSnapLines(lines);

          if (snapLinesTimerRef.current) clearTimeout(snapLinesTimerRef.current);
          snapLinesTimerRef.current = setTimeout(() => {
            setKeyboardSnapLines([]);
          }, 1200);
        }

        // 連続押しを考慮した履歴のデバウンス保存
        if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
        historyDebounceRef.current = setTimeout(() => {
          pushHistory(nextItems, nextBoxes, config);
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (snapLinesTimerRef.current) clearTimeout(snapLinesTimerRef.current);
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, [items, boxes, selectedIds, config, handleUndo, handleRedo, pushHistory]);

  return (
    <div className="w-screen h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* ツールバー */}
      <Toolbar
        config={config}
        onUpdateConfig={handleUpdateConfig}
        canUndo={historyIndexRef.current > 0}
        canRedo={historyIndexRef.current < historyRef.current.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        selectedCount={selectedIds.size}
        onAlignElements={handleAlignElements}
        onAddBox={handleAddBox}
        onExportPng={handleExportPng}
        onCopyToClipboard={handleCopyToClipboard}
        onSaveJson={handleSaveJson}
        onLoadJson={handleLoadJson}
        onClearAll={handleClearAll}
        iconSize={iconSize}
        onChangeIconSize={handleChangeIconSize}
      />

      {/* メインエリア: 左サイドバー + 右キャンバス */}
      <div className="flex-1 flex overflow-hidden relative">
        <Sidebar
          characters={characters}
          onAddCharacters={handleAddCharactersToTopRight}
          placedCharIds={placedCharIds}
          selectedSidebarCharIds={selectedSidebarCharIds}
          onSelectSidebarCharIds={setSelectedSidebarCharIds}
        />

        <Canvas
          items={items}
          boxes={boxes}
          charactersMap={charactersMap}
          config={config}
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
          onUpdateItems={handleUpdateItems}
          onUpdateBoxes={handleUpdateBoxes}
          onDeleteItem={handleDeleteItem}
          onDeleteBox={handleDeleteBox}
          onDuplicateBox={handleDuplicateBox}
          onAlignBoxChildren={handleAlignBoxChildren}
          onDropCharacters={handleDropCharacters}
          canvasRef={canvasRef}
          externalSnapLines={keyboardSnapLines}
          onUpdateConfig={handleUpdateConfig}
        />
      </div>
    </div>
  );
}
