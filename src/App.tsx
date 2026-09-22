import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Character, CanvasIconItem, ContainerBox, CanvasConfig, HistoryState } from './types';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { PRESET_BOX_THEMES, APP_VERSION } from './utils/constants';
import { toPng, toBlob } from 'html-to-image';

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
    showGrid: false,
  });

  const [iconSize, setIconSize] = useState<number>(64);
  const [items, setItems] = useState<CanvasIconItem[]>([]);
  const [boxes, setBoxes] = useState<ContainerBox[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  // 初回データ読み込み
  useEffect(() => {
    fetch('characters.json')
      .then((res) => res.json())
      .then((data: Character[]) => {
        setCharacters(data);
        setLoading(false);

        // 初期デモ枠（添付画像のような赤・黄・青・緑枠を1つ用意）
        const initialBoxes: ContainerBox[] = [
          {
            id: 'box_red',
            type: 'box',
            label: '赤枠',
            x: 40,
            y: 30,
            width: 720,
            height: 160,
            borderColor: '#ef4444',
            borderWidth: 4,
            borderRadius: 6,
            bgColor: '#fee2e2',
            bgOpacity: 0.15,
            zIndex: 1,
          },
          {
            id: 'box_yellow',
            type: 'box',
            label: '黄枠',
            x: 40,
            y: 210,
            width: 720,
            height: 160,
            borderColor: '#eab308',
            borderWidth: 4,
            borderRadius: 6,
            bgColor: '#fef9c3',
            bgOpacity: 0.2,
            zIndex: 1,
          },
          {
            id: 'box_blue',
            type: 'box',
            label: '青枠',
            x: 40,
            y: 390,
            width: 720,
            height: 160,
            borderColor: '#3b82f6',
            borderWidth: 4,
            borderRadius: 6,
            bgColor: '#dbeafe',
            bgOpacity: 0.15,
            zIndex: 1,
          },
          {
            id: 'box_green',
            type: 'box',
            label: '緑枠',
            x: 40,
            y: 570,
            width: 720,
            height: 160,
            borderColor: '#22c55e',
            borderWidth: 4,
            borderRadius: 6,
            bgColor: '#dcfce7',
            bgOpacity: 0.15,
            zIndex: 1,
          },
        ];
        setBoxes(initialBoxes);

        // 添付画像の生徒の一部を初期配置（赤枠内に数名）
        const sampleNames = ['ハスミ', 'ノノミ', 'チェリノ', 'モモイ', 'ミドリ', 'ジュンコ'];
        const sampleItems: CanvasIconItem[] = [];
        let curX = 55;
        let curY = 45;

        data.forEach((c) => {
          if (sampleNames.some((sn) => c.name.startsWith(sn)) && sampleItems.length < 6) {
            sampleItems.push({
              id: `item_${Date.now()}_${sampleItems.length}`,
              type: 'icon',
              charId: c.id,
              x: curX,
              y: curY,
              size: 64,
              zIndex: 10,
            });
            curX += 74;
          }
        });
        setItems(sampleItems);

        // 履歴初期化
        historyRef.current = [{ items: sampleItems, boxes: initialBoxes, config }];
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

  // 生徒アイコンをキャンバスへドロップ
  const handleDropCharacter = (charId: string, x: number, y: number) => {
    const newItem: CanvasIconItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type: 'icon',
      charId,
      x,
      y,
      size: iconSize,
      zIndex: 10 + items.length,
    };
    const nextItems = [...items, newItem];
    setItems(nextItems);
    setSelectedIds(new Set([newItem.id]));
    pushHistory(nextItems, boxes, config);
  };

  // サイドバーからダブルクリックで中央に追加
  const handleAddCharacter = (charId: string) => {
    const centerX = Math.max(20, Math.round(config.width / 2 - iconSize / 2 + (Math.random() * 40 - 20)));
    const centerY = Math.max(20, Math.round(config.height / 2 - iconSize / 2 + (Math.random() * 40 - 20)));
    handleDropCharacter(charId, centerX, centerY);
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
      x: 60 + boxes.length * 20,
      y: 60 + boxes.length * 20,
      width: 600,
      height: 180,
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

    // X座標昇順（左から右）でソート
    childItems.sort((a, b) => (a.y === b.y ? a.x - b.x : a.y - b.y));

    const itemW = childItems[0].size;
    const gap = 10;
    const availWidth = box.width - padding * 2;

    const nextItems = items.map((it) => {
      const idx = childItems.findIndex((c) => c.id === it.id);
      if (idx === -1) return it;

      if (alignType === 'row') {
        const x = box.x + padding + idx * (itemW + gap);
        const y = box.y + padding;
        return { ...it, x, y };
      } else {
        // グリッド
        const cols = Math.max(1, Math.floor(availWidth / (itemW + gap)));
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = box.x + padding + col * (itemW + gap);
        const y = box.y + padding + row * (itemW + gap);
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
      // 選択ハイライトを一時解除して画像生成
      const prevSelected = new Set(selectedIds);
      setSelectedIds(new Set());

      await new Promise((r) => setTimeout(r, 50));
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2, // 高解像度出力
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
          onAddCharacter={handleAddCharacter}
          placedCharIds={placedCharIds}
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
          onDropCharacter={handleDropCharacter}
          canvasRef={canvasRef}
        />
      </div>
    </div>
  );
}
