import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Character,
  CanvasIconItem,
  ContainerBox,
  CanvasTextItem,
  CanvasConfig,
  HistoryState,
  SnapLine,
  IconBorderColorMode,
  TextStylePreset,
} from './types';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { IconSettingsModal } from './components/IconSettingsModal';
import { PRESET_BOX_THEMES, APP_VERSION } from './utils/constants';
import { toPng, toBlob } from 'html-to-image';
import { getGuideLinesOnly, Rect } from './utils/snapGuide';

export function App() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);

  // キャンバス設定 (標準はアイコンサイズ64、角の丸み8、枠線太さ2、枠線色: 防御属性連動)
  const [config, setConfig] = useState<CanvasConfig>({
    width: 1200,
    height: 800,
    bgColor: '#0f172a',
    zoom: 1.0,
    snapEnabled: true,
    snapGap: 8,
    iconBorderRadius: 8,
    showGrid: false,
    iconBorderWidth: 2,
    iconBorderColorMode: 'defense',
    iconBorderColor: '#ffffff',
  });

  const [iconSize, setIconSize] = useState<number>(64);
  const [isIconSettingsOpen, setIsIconSettingsOpen] = useState(false);
  const [items, setItems] = useState<CanvasIconItem[]>([]);
  const [boxes, setBoxes] = useState<ContainerBox[]>([]);
  const [texts, setTexts] = useState<CanvasTextItem[]>([]);
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
        setTexts([]);

        // 履歴初期化
        historyRef.current = [{ items: [], boxes: [], texts: [], config }];
        historyIndexRef.current = 0;
      })
      .catch((err) => {
        console.error('Failed to load characters:', err);
        setLoading(false);
      });
  }, []);

  // 履歴プッシュ (状態変更時)
  const pushHistory = useCallback(
    (
      newItems: CanvasIconItem[],
      newBoxes: ContainerBox[],
      newTexts: CanvasTextItem[],
      newConfig: CanvasConfig
    ) => {
      if (isUndoRedoActionRef.current) return;
      const history = historyRef.current.slice(0, historyIndexRef.current + 1);
      history.push({ items: newItems, boxes: newBoxes, texts: newTexts, config: newConfig });
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
      setTexts(state.texts || []);
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
      setTexts(state.texts || []);
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
      pushHistory(newItems, boxes, texts, config);
    },
    [boxes, texts, config, pushHistory]
  );

  // ボックス更新
  const handleUpdateBoxes = useCallback(
    (newBoxes: ContainerBox[]) => {
      setBoxes(newBoxes);
      pushHistory(items, newBoxes, texts, config);
    },
    [items, texts, config, pushHistory]
  );

  // テキスト更新
  const handleUpdateTexts = useCallback(
    (newTexts: CanvasTextItem[]) => {
      setTexts(newTexts);
      pushHistory(items, boxes, newTexts, config);
    },
    [items, boxes, config, pushHistory]
  );

  // コンフィグ更新
  const handleUpdateConfig = useCallback(
    (updates: Partial<CanvasConfig>) => {
      const next = { ...config, ...updates };
      setConfig(next);
      pushHistory(items, boxes, texts, next);
    },
    [config, items, boxes, texts, pushHistory]
  );

  // アイコンサイズ一括変更 (選択中があれば選択中のみ、未選択時は配置済みの全アイコンを一括変更)
  const handleChangeIconSize = (size: number) => {
    setIconSize(size);
    if (selectedIds.size > 0) {
      const nextItems = items.map((it) => (selectedIds.has(it.id) ? { ...it, size } : it));
      handleUpdateItems(nextItems);
    } else if (items.length > 0) {
      const nextItems = items.map((it) => ({ ...it, size }));
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
    pushHistory(nextItems, boxes, texts, config);
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
    pushHistory(nextItems, boxes, texts, config);
  };

  // アイテム削除
  const handleDeleteItem = (id: string) => {
    const nextItems = items.filter((it) => it.id !== id);
    setItems(nextItems);
    const nextSelected = new Set(selectedIds);
    nextSelected.delete(id);
    setSelectedIds(nextSelected);
    pushHistory(nextItems, boxes, texts, config);
  };

  // ボックス削除
  const handleDeleteBox = (id: string) => {
    const nextBoxes = boxes.filter((b) => b.id !== id);
    setBoxes(nextBoxes);
    const nextSelected = new Set(selectedIds);
    nextSelected.delete(id);
    setSelectedIds(nextSelected);
    pushHistory(items, nextBoxes, texts, config);
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
    pushHistory(items, nextBoxes, texts, config);
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
    pushHistory(items, nextBoxes, texts, config);
  };

  // テキストの追加
  const handleAddText = (preset: TextStylePreset = 'title') => {
    let defaultText = 'タイトル';
    let fontSize = 24;
    let color = '#38bdf8';
    let bgColor = 'transparent';
    let borderColor = 'transparent';
    let borderWidth = 0;

    if (preset === 'title') {
      defaultText = '総力戦・大決戦 編成方針';
      fontSize = 24;
      color = '#38bdf8';
      bgColor = 'transparent';
      borderColor = 'transparent';
      borderWidth = 0;
    } else if (preset === 'tag') {
      defaultText = '1凸編成（メイン）';
      fontSize = 14;
      color = '#e2e8f0';
      bgColor = 'rgba(30, 41, 59, 0.85)';
      borderColor = 'rgba(56, 189, 248, 0.4)';
      borderWidth = 1;
    } else {
      defaultText = '編成メモ・解説';
      fontSize = 14;
      color = '#cbd5e1';
      bgColor = 'transparent';
      borderColor = 'transparent';
      borderWidth = 0;
    }

    const newText: CanvasTextItem = {
      id: `text_${Date.now()}`,
      type: 'text',
      text: defaultText,
      x: 60,
      y: 40 + texts.length * 40,
      fontSize,
      fontWeight: 'bold',
      color,
      bgColor,
      borderColor,
      borderWidth,
      borderRadius: preset === 'tag' ? 6 : 0,
      stylePreset: preset,
      zIndex: 20 + texts.length,
    };

    const nextTexts = [...texts, newText];
    setTexts(nextTexts);
    setSelectedIds(new Set([newText.id]));
    pushHistory(items, boxes, nextTexts, config);
  };

  // テキスト削除
  const handleDeleteText = (id: string) => {
    const nextTexts = texts.filter((t) => t.id !== id);
    setTexts(nextTexts);
    const nextSelected = new Set(selectedIds);
    nextSelected.delete(id);
    setSelectedIds(nextSelected);
    pushHistory(items, boxes, nextTexts, config);
  };

  // テキスト複製
  const handleDuplicateText = (id: string) => {
    const src = texts.find((t) => t.id === id);
    if (!src) return;
    const newText: CanvasTextItem = {
      ...src,
      id: `text_${Date.now()}`,
      x: src.x + 20,
      y: src.y + 20,
    };
    const nextTexts = [...texts, newText];
    setTexts(nextTexts);
    setSelectedIds(new Set([newText.id]));
    pushHistory(items, boxes, nextTexts, config);
  };

  // 枠内のアイテムを整列（横一列 or 行・間隔保持型スマートグリッド）
  // 要望対応: 複数枠選択時は、それぞれの枠内で同じ設定（余白・間隔）で一括整列
  const handleAlignBoxChildren = (
    boxId: string,
    alignType: 'grid' | 'row',
    leftPadding: number = 16,
    iconGap?: number
  ) => {
    const originBox = boxes.find((b) => b.id === boxId);
    if (!originBox) return;

    // 複数枠が選択されている状態でそのいずれかが操作された場合、選択されている全枠を対象にする
    const selectedBoxes = boxes.filter((b) => selectedIds.has(b.id));
    const targetBoxes =
      selectedBoxes.some((b) => b.id === boxId) && selectedBoxes.length > 1
        ? selectedBoxes
        : [originBox];

    const gap = iconGap !== undefined ? iconGap : (config.snapGap ?? 8);
    const minPadding = 8;

    const allPosUpdates = new Map<string, { x: number; y: number; size: number }>();

    for (const box of targetBoxes) {
      // 枠の領域内にあるアイコンを抽出
      const childItems = items.filter(
        (it) =>
          it.x >= box.x - 20 &&
          it.x + it.size <= box.x + box.width + 20 &&
          it.y >= box.y - 20 &&
          it.y + it.size <= box.y + box.height + 20
      );

      if (childItems.length === 0) continue;

      // 枠内のアイコンサイズを統一 (現在設定値の iconSize または枠内最初のアイテムサイズ)
      const itemW = iconSize || childItems[0].size;
      const cellStep = itemW + gap;

      if (alignType === 'row') {
        // 横一列整列: X順にソートして指定の左端余白で左寄せ
        const sorted = [...childItems].sort((a, b) => a.x - b.x);
        const startX = leftPadding;
        const startY = Math.max(minPadding, Math.round((box.height - itemW) / 2));

        sorted.forEach((it, idx) => {
          allPosUpdates.set(it.id, {
            size: itemW,
            x: box.x + startX + idx * cellStep,
            y: box.y + startY,
          });
        });
        continue;
      }

      // === 行・間隔保持型スマートグリッド整列 ===
      // 1. 行（Row）のクラスタリング: Y座標の近接度（アイコンサイズの半分以内）で行を判別
      const sortedByY = [...childItems].sort((a, b) => a.y - b.y || a.x - b.x);
      const rowGroups: CanvasIconItem[][] = [];

      for (const item of sortedByY) {
        let placed = false;
        for (const row of rowGroups) {
          if (Math.abs(row[0].y - item.y) < itemW * 0.5) {
            row.push(item);
            placed = true;
            break;
          }
        }
        if (!placed) {
          rowGroups.push([item]);
        }
      }

      // 行をY座標順にソート
      rowGroups.sort((a, b) => a[0].y - b[0].y);

      // 枠内全体の基準最小X座標
      const globalMinX = Math.min(...childItems.map((c) => c.x));

      // 2. 各アイテムの (row, col) インデックスを決定
      interface GridItemPos {
        item: CanvasIconItem;
        row: number;
        col: number;
      }
      const gridPositions: GridItemPos[] = [];

      rowGroups.forEach((rowItems, rowIndex) => {
        // 行内を X 座標順にソート
        rowItems.sort((a, b) => a.x - b.x);

        let lastCol = -1;
        let lastRightX = -Infinity;

        rowItems.forEach((item, itemIdx) => {
          // 全体最小Xからの概算セルインデックス
          let col = Math.max(0, Math.round((item.x - globalMinX) / cellStep));

          if (itemIdx > 0) {
            // 直前のアイテムとの実際の隙間
            const actualGap = item.x - lastRightX;
            if (actualGap < itemW * 0.6) {
              // 隣接（1マス未満）なら連続した次の列
              col = lastCol + 1;
            } else {
              // 1マス分以上空いている場合は、空きマス数を計算してスペースを維持
              const emptyCells = Math.max(1, Math.round(actualGap / cellStep));
              col = Math.max(lastCol + 1 + emptyCells, col);
            }
          }

          gridPositions.push({ item, row: rowIndex, col });
          lastCol = col;
          lastRightX = item.x + itemW;
        });
      });

      // 3. 左端間隔 (leftPadding) による左寄せ ＆ 上下中央センタリング
      const maxRow = Math.max(...gridPositions.map((g) => g.row));
      const totalGridHeight = (maxRow + 1) * itemW + maxRow * gap;

      const startX = leftPadding; // 指定された左端間隔で左寄せ！
      const startY = Math.max(minPadding, Math.round((box.height - totalGridHeight) / 2));

      // 4. 新しい座標を蓄積
      gridPositions.forEach(({ item, row, col }) => {
        allPosUpdates.set(item.id, {
          size: itemW,
          x: Math.round(box.x + startX + col * cellStep),
          y: Math.round(box.y + startY + row * cellStep),
        });
      });
    }

    if (allPosUpdates.size === 0) return;

    const nextItems = items.map((it) => {
      const update = allPosUpdates.get(it.id);
      if (!update) return it;
      return {
        ...it,
        size: update.size,
        x: update.x,
        y: update.y,
      };
    });

    handleUpdateItems(nextItems);
  };

  // 選択中要素の整列機能 (生徒アイコン または 枠)
  const handleAlignElements = (
    type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'distributeH' | 'distributeV'
  ) => {
    const selectedBoxes = boxes.filter((b) => selectedIds.has(b.id));
    const selectedItems = items.filter((it) => selectedIds.has(it.id));

    // === 要望対応: 枠が複数選択されている場合、枠同士を吸着間隔で整列・等間隔配置 ===
    if (selectedBoxes.length >= 2) {
      const minX = Math.min(...selectedBoxes.map((b) => b.x));
      const maxX = Math.max(...selectedBoxes.map((b) => b.x + b.width));
      const minY = Math.min(...selectedBoxes.map((b) => b.y));
      const maxY = Math.max(...selectedBoxes.map((b) => b.y + b.height));

      let updatedBoxes = [...boxes];

      if (type === 'left') {
        updatedBoxes = boxes.map((b) => (selectedIds.has(b.id) ? { ...b, x: minX } : b));
      } else if (type === 'center') {
        const midX = (minX + maxX) / 2;
        updatedBoxes = boxes.map((b) =>
          selectedIds.has(b.id) ? { ...b, x: Math.round(midX - b.width / 2) } : b
        );
      } else if (type === 'right') {
        updatedBoxes = boxes.map((b) => (selectedIds.has(b.id) ? { ...b, x: maxX - b.width } : b));
      } else if (type === 'top') {
        updatedBoxes = boxes.map((b) => (selectedIds.has(b.id) ? { ...b, y: minY } : b));
      } else if (type === 'middle') {
        const midY = (minY + maxY) / 2;
        updatedBoxes = boxes.map((b) =>
          selectedIds.has(b.id) ? { ...b, y: Math.round(midY - b.height / 2) } : b
        );
      } else if (type === 'bottom') {
        updatedBoxes = boxes.map((b) => (selectedIds.has(b.id) ? { ...b, y: maxY - b.height } : b));
      } else if (type === 'distributeV') {
        // 縦方向: 吸着間隔 config.snapGap (例: 8px) で上から順にピッタリ等間隔に配置！
        const sorted = [...selectedBoxes].sort((a, b) => a.y - b.y);
        const gap = config.snapGap ?? 8;
        let currentY = minY;
        const posMap = new Map<string, number>();
        sorted.forEach((b) => {
          posMap.set(b.id, Math.round(currentY));
          currentY += b.height + gap;
        });
        updatedBoxes = boxes.map((b) => (posMap.has(b.id) ? { ...b, y: posMap.get(b.id)! } : b));
      } else if (type === 'distributeH') {
        // 横方向: 吸着間隔 config.snapGap で左から順に等間隔に配置！
        const sorted = [...selectedBoxes].sort((a, b) => a.x - b.x);
        const gap = config.snapGap ?? 8;
        let currentX = minX;
        const posMap = new Map<string, number>();
        sorted.forEach((b) => {
          posMap.set(b.id, Math.round(currentX));
          currentX += b.width + gap;
        });
        updatedBoxes = boxes.map((b) => (posMap.has(b.id) ? { ...b, x: posMap.get(b.id)! } : b));
      }

      // 各枠の移動差分 (dx, dy) を計算し、枠内の生徒アイコンも一緒に追従させる
      const boxDeltaMap = new Map<string, { dx: number; dy: number }>();
      updatedBoxes.forEach((nb) => {
        const ob = boxes.find((b) => b.id === nb.id);
        if (ob) {
          boxDeltaMap.set(nb.id, { dx: nb.x - ob.x, dy: nb.y - ob.y });
        }
      });

      const updatedItems = items.map((it) => {
        for (const [boxId, delta] of boxDeltaMap.entries()) {
          const ob = boxes.find((b) => b.id === boxId);
          if (
            ob &&
            it.x >= ob.x - 5 &&
            it.x + it.size <= ob.x + ob.width + 5 &&
            it.y >= ob.y - 5 &&
            it.y + it.size <= ob.y + ob.height + 5
          ) {
            return {
              ...it,
              x: it.x + delta.dx,
              y: it.y + delta.dy,
            };
          }
        }
        return it;
      });

      setBoxes(updatedBoxes);
      setItems(updatedItems);
      pushHistory(updatedItems, updatedBoxes, texts, config);
      return;
    }

    // 生徒アイコンが複数選択されている場合
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
    } else if (type === 'distributeV') {
      const sorted = [...selectedItems].sort((a, b) => a.y - b.y);
      const totalHeight = sorted.reduce((sum, item) => sum + item.size, 0);
      const totalSpace = maxY - minY - totalHeight;
      const gap = totalSpace / (sorted.length - 1);
      let currentY = minY;
      const posMap = new Map<string, number>();
      sorted.forEach((item) => {
        posMap.set(item.id, Math.round(currentY));
        currentY += item.size + gap;
      });
      updated = items.map((it) => (posMap.has(it.id) ? { ...it, y: posMap.get(it.id)! } : it));
    }

    handleUpdateItems(updated);
  };

  // 全消去
  const handleClearAll = () => {
    if (window.confirm('キャンバス上のすべての要素をクリアしますか？')) {
      setItems([]);
      setBoxes([]);
      setTexts([]);
      setSelectedIds(new Set());
      pushHistory([], [], [], config);
    }
  };

  // PNG画像保存 (拡大・スクロール時も見切れずキャンバス全体を2倍高精細で出力)
  const handleExportPng = async () => {
    if (!canvasRef.current) return;
    try {
      const prevSelected = new Set(selectedIds);
      setSelectedIds(new Set());

      await new Promise((r) => setTimeout(r, 50));
      const dataUrl = await toPng(canvasRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        width: config.width,
        height: config.height,
        style: {
          transform: 'none',
          margin: '0',
          left: '0',
          top: '0',
        },
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

  // クリップボードへコピー (拡大時も見切れず全体をコピー)
  const handleCopyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      const prevSelected = new Set(selectedIds);
      setSelectedIds(new Set());
      await new Promise((r) => setTimeout(r, 50));

      const blob = await toBlob(canvasRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        width: config.width,
        height: config.height,
        style: {
          transform: 'none',
          margin: '0',
          left: '0',
          top: '0',
        },
      });
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
      texts,
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
        if (json.items && (json.boxes || json.texts)) {
          setItems(json.items || []);
          setBoxes(json.boxes || []);
          setTexts(json.texts || []);
          if (json.config) setConfig(json.config);
          setSelectedIds(new Set());
          pushHistory(json.items || [], json.boxes || [], json.texts || [], json.config || config);
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
          const nextTexts = texts.filter((t) => !selectedIds.has(t.id));
          setItems(nextItems);
          setBoxes(nextBoxes);
          setTexts(nextTexts);
          setSelectedIds(new Set());
          pushHistory(nextItems, nextBoxes, nextTexts, config);
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
        const allIds = new Set([
          ...items.map((i) => i.id),
          ...boxes.map((b) => b.id),
          ...texts.map((t) => t.id),
        ]);
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
        const nextTexts = texts.map((t) =>
          selectedIds.has(t.id) ? { ...t, x: t.x + dx, y: t.y + dy } : t
        );

        setItems(nextItems);
        setBoxes(nextBoxes);
        setTexts(nextTexts);

        // 代表要素の位置からガイド線を判定
        const selectedItem = nextItems.find((it) => selectedIds.has(it.id));
        const selectedBox = nextBoxes.find((b) => selectedIds.has(b.id));
        const selectedText = nextTexts.find((t) => selectedIds.has(t.id));
        const activeRect: Rect | null = selectedItem
          ? { id: selectedItem.id, x: selectedItem.x, y: selectedItem.y, width: selectedItem.size, height: selectedItem.size }
          : selectedBox
          ? { id: selectedBox.id, x: selectedBox.x, y: selectedBox.y, width: selectedBox.width, height: selectedBox.height }
          : selectedText
          ? {
              id: selectedText.id,
              x: selectedText.x,
              y: selectedText.y,
              width: Math.max(60, selectedText.text.length * selectedText.fontSize * 0.85),
              height: Math.max(28, selectedText.fontSize * 1.4),
            }
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
          nextTexts.forEach((t) => {
            if (!selectedIds.has(t.id)) {
              otherRects.push({
                id: t.id,
                x: t.x,
                y: t.y,
                width: Math.max(60, t.text.length * t.fontSize * 0.85),
                height: Math.max(28, t.fontSize * 1.4),
              });
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
          pushHistory(nextItems, nextBoxes, nextTexts, config);
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (snapLinesTimerRef.current) clearTimeout(snapLinesTimerRef.current);
      if (historyDebounceRef.current) clearTimeout(historyDebounceRef.current);
    };
  }, [items, boxes, texts, selectedIds, config, handleUndo, handleRedo, pushHistory]);

  // プレビュー用に各属性の代表生徒をピックアップ（ヒナ:爆発、イオリ:貫通、アリス:神秘、ユカリ:振動、ケイ/臨戦アリス:複合装甲）
  const previewCharacters = useMemo(() => {
    const list: Character[] = [];
    const targets = ['ヒナ', 'イオリ', 'アリス', 'ユカリ', 'ケイ'];
    for (const t of targets) {
      const found = characters.find((c) => c.name === t || c.name.startsWith(t));
      if (found) list.push(found);
    }
    if (list.length < 5) {
      characters.forEach((c) => {
        if (list.length < 5 && !list.some((it) => it.id === c.id)) list.push(c);
      });
    }
    return list;
  }, [characters]);

  // 選択中の生徒アイコンの数
  const selectedIconCount = useMemo(() => {
    return items.filter((it) => selectedIds.has(it.id)).length;
  }, [items, selectedIds]);

  // アイコン詳細設定の適用
  const handleApplyIconSettings = (settings: {
    size: number;
    radius: number;
    borderWidth: number;
    colorMode: IconBorderColorMode;
    color: string;
    applyTo: 'all' | 'selected';
  }) => {
    setIconSize(settings.size);

    const nextConfig: CanvasConfig = {
      ...config,
      iconBorderRadius: settings.radius,
      iconBorderWidth: settings.borderWidth,
      iconBorderColorMode: settings.colorMode,
      iconBorderColor: settings.color,
    };
    setConfig(nextConfig);

    let nextItems: CanvasIconItem[] = [];
    if (settings.applyTo === 'selected') {
      nextItems = items.map((it) => {
        if (!selectedIds.has(it.id)) return it;
        return {
          ...it,
          size: settings.size,
          borderRadius: settings.radius,
          borderWidth: settings.borderWidth,
          borderColorMode: settings.colorMode,
          borderColor: settings.color,
        };
      });
    } else {
      nextItems = items.map((it) => ({
        ...it,
        size: settings.size,
        borderRadius: settings.radius,
        borderWidth: settings.borderWidth,
        borderColorMode: settings.colorMode,
        borderColor: settings.color,
      }));
    }

    setItems(nextItems);
    pushHistory(nextItems, boxes, texts, nextConfig);
  };

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
        onAddText={handleAddText}
        onExportPng={handleExportPng}
        onCopyToClipboard={handleCopyToClipboard}
        onSaveJson={handleSaveJson}
        onLoadJson={handleLoadJson}
        onClearAll={handleClearAll}
        iconSize={iconSize}
        onChangeIconSize={handleChangeIconSize}
        onOpenIconSettings={() => setIsIconSettingsOpen(true)}
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
          texts={texts}
          charactersMap={charactersMap}
          config={config}
          selectedIds={selectedIds}
          onSelectIds={setSelectedIds}
          onUpdateItems={handleUpdateItems}
          onUpdateBoxes={handleUpdateBoxes}
          onUpdateTexts={handleUpdateTexts}
          onDeleteItem={handleDeleteItem}
          onDeleteBox={handleDeleteBox}
          onDeleteText={handleDeleteText}
          onDuplicateBox={handleDuplicateBox}
          onDuplicateText={handleDuplicateText}
          onAlignBoxChildren={handleAlignBoxChildren}
          onDropCharacters={handleDropCharacters}
          canvasRef={canvasRef}
          externalSnapLines={keyboardSnapLines}
          onUpdateConfig={handleUpdateConfig}
          currentIconSize={iconSize}
        />
      </div>

      {/* アイコン詳細設定モーダル */}
      <IconSettingsModal
        isOpen={isIconSettingsOpen}
        onClose={() => setIsIconSettingsOpen(false)}
        currentSize={iconSize}
        currentRadius={config.iconBorderRadius ?? 8}
        currentBorderWidth={config.iconBorderWidth ?? 2}
        currentColorMode={config.iconBorderColorMode ?? 'defense'}
        currentColor={config.iconBorderColor ?? '#ffffff'}
        selectedCount={selectedIconCount}
        previewCharacters={previewCharacters}
        onApply={handleApplyIconSettings}
      />
    </div>
  );
}
