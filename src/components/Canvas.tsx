import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CanvasIconItem, ContainerBox, Character, SnapLine, CanvasConfig } from '../types';
import { CanvasItemView } from './CanvasItemView';
import { ContainerBoxView } from './ContainerBoxView';
import { calculateSnap, Rect } from '../utils/snapGuide';
import { adjustClusterSpacing, SpacingAdjustOptions } from '../utils/spacingCluster';
import { SpacingAdjustModal } from './SpacingAdjustModal';
import { Sliders, Maximize2, RotateCcw } from 'lucide-react';

interface CanvasProps {
  items: CanvasIconItem[];
  boxes: ContainerBox[];
  charactersMap: Map<string, Character>;
  config: CanvasConfig;
  selectedIds: Set<string>;
  onSelectIds: (ids: Set<string>) => void;
  onUpdateItems: (items: CanvasIconItem[]) => void;
  onUpdateBoxes: (boxes: ContainerBox[]) => void;
  onDeleteItem: (id: string) => void;
  onDeleteBox: (id: string) => void;
  onDuplicateBox: (id: string) => void;
  onAlignBoxChildren: (boxId: string, type: 'grid' | 'row', leftPadding?: number, iconGap?: number) => void;
  onDropCharacters: (charIds: string[], x: number, y: number) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  externalSnapLines?: SnapLine[];
  onUpdateConfig?: (updates: Partial<CanvasConfig>) => void;
  currentIconSize?: number;
}

export const Canvas: React.FC<CanvasProps> = ({
  items,
  boxes,
  charactersMap,
  config,
  selectedIds,
  onSelectIds,
  onUpdateItems,
  onUpdateBoxes,
  onDeleteItem,
  onDeleteBox,
  onDuplicateBox,
  onAlignBoxChildren,
  onDropCharacters,
  canvasRef,
  externalSnapLines,
  onUpdateConfig,
  currentIconSize = 64,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [isDraggingBoxes, setIsDraggingBoxes] = useState(false);

  // ビュー移動（パン）状態
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef<{
    startX: number;
    startY: number;
    initX: number;
    initY: number;
    moved: boolean;
  } | null>(null);
  const lastPanMovedRef = useRef<boolean>(false);

  // 右クリックコンテキストメニュー & 間隔調整モーダル
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showSpacingModal, setShowSpacingModal] = useState(false);

  // マウスホイールによるスクロール拡大縮小
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !onUpdateConfig) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      const nextZoom = Math.min(3.0, Math.max(0.25, Math.round(config.zoom * factor * 100) / 100));
      if (nextZoom !== config.zoom) {
        onUpdateConfig({ zoom: nextZoom });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [config.zoom, onUpdateConfig]);

  // ドラグラフ移動管理
  const dragRef = useRef<{
    activeId: string;
    isBox: boolean;
    startX: number;
    startY: number;
    itemInitPositions: Map<string, { x: number; y: number }>;
    boxInitPositions: Map<string, { x: number; y: number }>;
  } | null>(null);

  // 範囲選択 (Selection Box)
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // ドロップ受け入れ
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const rawX = (e.clientX - rect.left) / config.zoom;
    const rawY = (e.clientY - rect.top) / config.zoom;

    try {
      const dataStr = e.dataTransfer.getData('application/json');
      if (dataStr) {
        const data = JSON.parse(dataStr);
        const x = Math.max(0, Math.round(rawX - 32));
        const y = Math.max(0, Math.round(rawY - 32));

        if (data.charIds && Array.isArray(data.charIds) && data.charIds.length > 0) {
          onDropCharacters(data.charIds, x, y);
        } else if (data.charId) {
          onDropCharacters([data.charId], x, y);
        }
      }
    } catch (err) {
      console.error('Failed to parse dropped data:', err);
    }
  };

  // 要素クリック選択
  const handleSelectElement = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey || e.ctrlKey) {
      const next = new Set(selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      onSelectIds(next);
    } else {
      onSelectIds(new Set([id]));
    }
  };

  // ドラッグ開始
  const handleStartDrag = (
    id: string,
    initialX: number,
    initialY: number,
    e: React.MouseEvent
  ) => {
    e.preventDefault();

    // 選択されていない要素なら単一選択にする
    let currentSelected = selectedIds;
    if (!selectedIds.has(id)) {
      currentSelected = new Set([id]);
      onSelectIds(currentSelected);
    }

    const isBox = boxes.some((b) => b.id === id);
    if (isBox) {
      setIsDraggingBoxes(true);
    }

    // 選択中の全要素の初期座標を記録
    const itemInitPositions = new Map<string, { x: number; y: number }>();
    items.forEach((it) => {
      if (currentSelected.has(it.id)) {
        itemInitPositions.set(it.id, { x: it.x, y: it.y });
      }
    });

    const boxInitPositions = new Map<string, { x: number; y: number }>();
    boxes.forEach((b) => {
      if (currentSelected.has(b.id)) {
        boxInitPositions.set(b.id, { x: b.x, y: b.y });
      }
    });

    dragRef.current = {
      activeId: id,
      isBox,
      startX: e.clientX,
      startY: e.clientY,
      itemInitPositions,
      boxInitPositions,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragRef.current || !canvasRef.current) return;
      const { activeId, startX, startY, itemInitPositions, boxInitPositions, isBox } = dragRef.current;

      const deltaX = (moveEvent.clientX - startX) / config.zoom;
      const deltaY = (moveEvent.clientY - startY) / config.zoom;

      // 単一要素のスナップ対象矩形
      let dragRect: Rect | null = null;
      if (isBox) {
        const b = boxes.find((bx) => bx.id === activeId);
        const init = boxInitPositions.get(activeId);
        if (b && init) {
          dragRect = { id: b.id, x: init.x + deltaX, y: init.y + deltaY, width: b.width, height: b.height };
        }
      } else {
        const it = items.find((itm) => itm.id === activeId);
        const init = itemInitPositions.get(activeId);
        if (it && init) {
          dragRect = { id: it.id, x: init.x + deltaX, y: init.y + deltaY, width: it.size, height: it.size };
        }
      }

      if (!dragRect) return;

      // 他の非選択要素の矩形リストを作成
      const otherRects: Rect[] = [];
      items.forEach((it) => {
        if (!currentSelected.has(it.id)) {
          otherRects.push({ id: it.id, x: it.x, y: it.y, width: it.size, height: it.size });
        }
      });
      boxes.forEach((b) => {
        if (!currentSelected.has(b.id)) {
          otherRects.push({ id: b.id, x: b.x, y: b.y, width: b.width, height: b.height });
        }
      });

      // スナップ計算
      const snap = calculateSnap(
        dragRect,
        otherRects,
        config.width,
        config.height,
        config.snapEnabled,
        config.snapGap ?? 8
      );

      setSnapLines(snap.snapLines);

      // 実効差分 (スナップ後の位置 - 初期位置)
      const initActive = isBox
        ? boxInitPositions.get(activeId)!
        : itemInitPositions.get(activeId)!;
      const effectiveDx = snap.x - initActive.x;
      const effectiveDy = snap.y - initActive.y;

      // 選択中の全アイテムの位置を一括更新
      if (itemInitPositions.size > 0) {
        onUpdateItems(
          items.map((it) => {
            const init = itemInitPositions.get(it.id);
            if (!init) return it;
            return {
              ...it,
              x: Math.round(init.x + effectiveDx),
              y: Math.round(init.y + effectiveDy),
            };
          })
        );
      }

      // 選択中の全ボックスの位置を一括更新
      if (boxInitPositions.size > 0) {
        onUpdateBoxes(
          boxes.map((b) => {
            const init = boxInitPositions.get(b.id);
            if (!init) return b;
            return {
              ...b,
              x: Math.round(init.x + effectiveDx),
              y: Math.round(init.y + effectiveDy),
            };
          })
        );
      }
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      setIsDraggingBoxes(false);
      setSnapLines([]);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // 複数枠の連動サイズ変更
  const handleBoxResizeStart = (primaryBoxId: string, handle: string, e: React.MouseEvent) => {
    e.stopPropagation();

    // プライマリ枠が選択中なら選択中の全枠、そうでなければプライマリ枠のみ
    const targetBoxIds = selectedIds.has(primaryBoxId)
      ? boxes.filter((b) => selectedIds.has(b.id)).map((b) => b.id)
      : [primaryBoxId];

    const startBoxesMap = new Map<string, ContainerBox>();
    targetBoxIds.forEach((id) => {
      const b = boxes.find((bx) => bx.id === id);
      if (b) startBoxesMap.set(id, { ...b });
    });

    const primaryStart = startBoxesMap.get(primaryBoxId);
    if (!primaryStart) return;

    const startX = e.clientX;
    const startY = e.clientY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / config.zoom;
      const dy = (moveEvent.clientY - startY) / config.zoom;

      // プライマリ枠の新しい端の絶対座標 (仮値)
      let targetRightX = primaryStart.x + Math.max(80, primaryStart.width + dx);
      let targetBottomY = primaryStart.y + Math.max(60, primaryStart.height + dy);
      let targetLeftX = handle.includes('l') ? primaryStart.x + dx : null;
      let targetTopY = handle.includes('t') ? primaryStart.y + dy : null;

      // 要望対応: 枠の幅や高さを変える時も他の枠のガイド線が出るようにする
      const otherRects: Rect[] = [];
      boxes.forEach((b) => {
        if (!targetBoxIds.includes(b.id)) {
          otherRects.push({ id: b.id, x: b.x, y: b.y, width: b.width, height: b.height });
        }
      });
      items.forEach((it) => {
        otherRects.push({ id: it.id, x: it.x, y: it.y, width: it.size, height: it.size });
      });

      const currentSnapLines: SnapLine[] = [];
      const threshold = 6;

      const snapGap = config.snapGap ?? 8;

      // X方向の比較アンカー (他枠の左端、中央、右端、キャンバス境界、および吸着間隔)
      const xAnchors: number[] = [0, config.width / 2, config.width];
      otherRects.forEach((r) => {
        xAnchors.push(r.x);
        xAnchors.push(r.x + r.width / 2);
        xAnchors.push(r.x + r.width);
        if (snapGap > 0) {
          xAnchors.push(r.x - snapGap);
          xAnchors.push(r.x + r.width + snapGap);
        }
      });

      // Y方向の比較アンカー (他枠の上端、中央、下端、キャンバス境界、および吸着間隔)
      const yAnchors: number[] = [0, config.height / 2, config.height];
      otherRects.forEach((r) => {
        yAnchors.push(r.y);
        yAnchors.push(r.y + r.height / 2);
        yAnchors.push(r.y + r.height);
        if (snapGap > 0) {
          yAnchors.push(r.y - snapGap);
          yAnchors.push(r.y + r.height + snapGap);
        }
      });

      // 右端リサイズ時のガイド線 & スナップ
      if (handle.includes('r')) {
        let bestDiff = threshold + 1;
        let snapVal = targetRightX;
        for (const anchor of xAnchors) {
          const diff = Math.abs(targetRightX - anchor);
          if (diff < bestDiff) {
            bestDiff = diff;
            snapVal = anchor;
          }
        }
        if (bestDiff <= threshold) {
          if (config.snapEnabled) targetRightX = snapVal;
          currentSnapLines.push({
            orientation: 'vertical',
            pos: snapVal,
            start: 0,
            end: config.height,
          });
        }
      }

      // 左端リサイズ時のガイド線 & スナップ
      if (handle.includes('l') && targetLeftX !== null) {
        let bestDiff = threshold + 1;
        let snapVal = targetLeftX;
        for (const anchor of xAnchors) {
          const diff = Math.abs(targetLeftX - anchor);
          if (diff < bestDiff) {
            bestDiff = diff;
            snapVal = anchor;
          }
        }
        if (bestDiff <= threshold) {
          if (config.snapEnabled) targetLeftX = snapVal;
          currentSnapLines.push({
            orientation: 'vertical',
            pos: snapVal,
            start: 0,
            end: config.height,
          });
        }
      }

      // 下端リサイズ時のガイド線 & スナップ
      if (handle.includes('b')) {
        let bestDiff = threshold + 1;
        let snapVal = targetBottomY;
        for (const anchor of yAnchors) {
          const diff = Math.abs(targetBottomY - anchor);
          if (diff < bestDiff) {
            bestDiff = diff;
            snapVal = anchor;
          }
        }
        if (bestDiff <= threshold) {
          if (config.snapEnabled) targetBottomY = snapVal;
          currentSnapLines.push({
            orientation: 'horizontal',
            pos: snapVal,
            start: 0,
            end: config.width,
          });
        }
      }

      // 上端リサイズ時のガイド線 & スナップ
      if (handle.includes('t') && targetTopY !== null) {
        let bestDiff = threshold + 1;
        let snapVal = targetTopY;
        for (const anchor of yAnchors) {
          const diff = Math.abs(targetTopY - anchor);
          if (diff < bestDiff) {
            bestDiff = diff;
            snapVal = anchor;
          }
        }
        if (bestDiff <= threshold) {
          if (config.snapEnabled) targetTopY = snapVal;
          currentSnapLines.push({
            orientation: 'horizontal',
            pos: snapVal,
            start: 0,
            end: config.width,
          });
        }
      }

      setSnapLines(currentSnapLines);

      const nextBoxes = boxes.map((b) => {
        const init = startBoxesMap.get(b.id);
        if (!init) return b;

        let nextX = init.x;
        let nextY = init.y;
        let nextW = init.width;
        let nextH = init.height;

        // 要望対応: 複数枠連動 - 右端のサイズ変更すると同じ位置まで全部幅が変わる
        if (handle.includes('r')) {
          nextW = Math.max(80, targetRightX - init.x);
        }
        if (handle.includes('b')) {
          nextH = Math.max(60, targetBottomY - init.y);
        }
        if (targetLeftX !== null) {
          const maxLeft = init.x + init.width - 80;
          nextX = Math.min(maxLeft, targetLeftX);
          nextW = Math.max(80, init.x + init.width - nextX);
        }
        if (targetTopY !== null) {
          const maxTop = init.y + init.height - 60;
          nextY = Math.min(maxTop, targetTopY);
          nextH = Math.max(60, init.y + init.height - nextY);
        }

        return {
          ...b,
          x: Math.round(nextX),
          y: Math.round(nextY),
          width: Math.round(nextW),
          height: Math.round(nextH),
        };
      });

      onUpdateBoxes(nextBoxes);
    };

    const handleMouseUp = () => {
      setSnapLines([]);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // コンテキストメニュー外クリック監視
  useEffect(() => {
    if (!contextMenu) return;
    const handleOutsideClick = () => {
      setContextMenu(null);
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, [contextMenu]);

  // 右クリックコンテキストメニュー (アイコン選択時)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();

    // 右クリックドラッグでパン移動を行った直後はメニューを開かない
    if (lastPanMovedRef.current) {
      lastPanMovedRef.current = false;
      return;
    }

    const selectedIconCount = items.filter((it) => selectedIds.has(it.id)).length;
    if (selectedIconCount >= 1) {
      e.stopPropagation();
      const menuW = 200;
      const menuH = 90;
      const posX = Math.min(e.clientX, window.innerWidth - menuW - 10);
      const posY = Math.min(e.clientY, window.innerHeight - menuH - 10);
      setContextMenu({ x: Math.max(10, posX), y: Math.max(10, posY) });
    } else {
      setContextMenu(null);
    }
  };

  // 選択中アイコンのサイズを基準サイズに一括統一
  const handleUnifySelectedSizes = () => {
    const nextItems = items.map((it) =>
      selectedIds.has(it.id) ? { ...it, size: currentIconSize } : it
    );
    onUpdateItems(nextItems);
  };

  // アイコン間隔の適用
  const handleApplySpacing = (options: SpacingAdjustOptions) => {
    const selectedItems = items.filter((it) => selectedIds.has(it.id));
    if (selectedItems.length < 2) return;

    const adjustedItems = adjustClusterSpacing(selectedItems, options);
    const adjustedMap = new Map(adjustedItems.map((it) => [it.id, it]));

    const nextItems = items.map((it) => adjustedMap.get(it.id) || it);
    onUpdateItems(nextItems);
  };

  // キャンバスの背景または非アクティブ枠からの範囲選択・クリック選択・右ドラッグによるパン
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (contextMenu) {
      setContextMenu(null);
    }

    // === 要望対応: 右クリック(button===2) またはホイールクリック(button===1) のドラッグでビュー移動（パン） ===
    if (e.button === 2 || e.button === 1) {
      if (e.button === 1) {
        e.preventDefault();
      }
      panStartRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        initX: pan.x,
        initY: pan.y,
        moved: false,
      };
      setIsPanning(true);

      const handlePanMove = (moveEvent: MouseEvent) => {
        if (!panStartRef.current) return;
        const dx = moveEvent.clientX - panStartRef.current.startX;
        const dy = moveEvent.clientY - panStartRef.current.startY;
        if (Math.hypot(dx, dy) > 3) {
          panStartRef.current.moved = true;
        }
        setPan({
          x: Math.round(panStartRef.current.initX + dx),
          y: Math.round(panStartRef.current.initY + dy),
        });
      };

      const handlePanUp = () => {
        if (panStartRef.current) {
          lastPanMovedRef.current = panStartRef.current.moved;
          panStartRef.current = null;
        }
        setIsPanning(false);
        window.removeEventListener('mousemove', handlePanMove);
        window.removeEventListener('mouseup', handlePanUp);
      };

      window.addEventListener('mousemove', handlePanMove);
      window.addEventListener('mouseup', handlePanUp);
      return;
    }

    // 左クリック(button===0) 以外の操作は範囲選択等を行わない
    if (e.button !== 0) return;

    const target = e.target as HTMLElement;

    // 生徒アイコン自体、リサイズハンドル、ヘッダー操作ボタンなどの直接操作時はキャンバス選択を開始しない
    if (
      target.closest('[data-item-id]') ||
      target.closest('[data-resize-handle]') ||
      target.closest('button') ||
      target.closest('.box-drag-handle')
    ) {
      return;
    }

    // クリックされた位置にある枠（もしあれば）を取得
    const clickedBoxEl = target.closest('[data-box-id]');
    const clickedBoxId = clickedBoxEl?.getAttribute('data-box-id');

    // すでにアクティブ（選択状態）の枠の上でのマウスダウンは、ContainerBoxViewの枠ドラッグ移動に任せる
    if (clickedBoxId && selectedIds.has(clickedBoxId)) {
      return;
    }

    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const startX = (e.clientX - rect.left) / config.zoom;
    const startY = (e.clientY - rect.top) / config.zoom;

    let hasDragged = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const curX = (moveEvent.clientX - rect.left) / config.zoom;
      const curY = (moveEvent.clientY - rect.top) / config.zoom;

      const dist = Math.hypot(moveEvent.clientX - e.clientX, moveEvent.clientY - e.clientY);
      if (dist > 4) {
        hasDragged = true;
      }

      if (!hasDragged) return;

      setSelectionBox({ startX, startY, currentX: curX, currentY: curY });

      // 選択矩形に交差する要素を検出
      const selLeft = Math.min(startX, curX);
      const selRight = Math.max(startX, curX);
      const selTop = Math.min(startY, curY);
      const selBottom = Math.max(startY, curY);

      const intersectingItemIds: string[] = [];
      items.forEach((it) => {
        if (
          it.x < selRight &&
          it.x + it.size > selLeft &&
          it.y < selBottom &&
          it.y + it.size > selTop
        ) {
          intersectingItemIds.push(it.id);
        }
      });

      const newSelected = new Set<string>(e.shiftKey ? selectedIds : []);

      if (intersectingItemIds.length > 0) {
        // 要望対応: 範囲内に生徒アイコンがある場合はアイコンを選択（枠は除外してアイコン選択を快適に）
        intersectingItemIds.forEach((id) => newSelected.add(id));
      } else {
        // 要望対応: 「ドラッグ範囲内にアイコンなしで枠だけの時は枠を選択」
        boxes.forEach((b) => {
          if (
            b.x < selRight &&
            b.x + b.width > selLeft &&
            b.y < selBottom &&
            b.y + b.height > selTop
          ) {
            newSelected.add(b.id);
          }
        });
      }

      onSelectIds(newSelected);
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      setSelectionBox(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      // 移動量が小さかった（単なるクリック）場合
      if (!hasDragged) {
        if (clickedBoxId) {
          // 非アクティブな枠の上でクリックした時はその枠を選択
          if (upEvent.shiftKey || upEvent.ctrlKey) {
            const next = new Set(selectedIds);
            if (next.has(clickedBoxId)) next.delete(clickedBoxId);
            else next.add(clickedBoxId);
            onSelectIds(next);
          } else {
            onSelectIds(new Set([clickedBoxId]));
          }
        } else {
          // 何もないキャンバス背景をクリックした時は選択解除
          if (!upEvent.shiftKey && !upEvent.ctrlKey) {
            onSelectIds(new Set());
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 h-full overflow-hidden bg-slate-950 flex items-center justify-center relative select-none ${
        isPanning ? 'cursor-grabbing' : ''
      }`}
      onMouseDown={handleCanvasMouseDown}
      onContextMenu={handleContextMenu}
      onDoubleClick={(e) => {
        // キャンバス背景ダブルクリックでビュー位置（パン）を中央にリセット
        if (e.target === containerRef.current) {
          setPan({ x: 0, y: 0 });
        }
      }}
    >
      {/* ビューパン移動ラッパー */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px)`,
          transition: isPanning ? 'none' : 'transform 0.05s ease-out',
        }}
        className="flex items-center justify-center p-8"
      >
        {/* ズーム拡大縮小を適用するキャンバス本体 */}
        <div
          ref={canvasRef}
          id="canvas-bg"
          style={{
            width: `${config.width}px`,
            height: `${config.height}px`,
            backgroundColor: config.bgColor,
            transform: `scale(${config.zoom})`,
            transformOrigin: 'center center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className="relative select-none transition-transform duration-75 overflow-hidden rounded-md border border-slate-700/50"
      >
        {/* グリッド背景 (設定でONの場合) */}
        {config.showGrid && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundImage: 'radial-gradient(#94a3b8 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          />
        )}

        {/* グループ枠（コンテナ/囲みボックス） */}
        {boxes.map((box) => (
          <ContainerBoxView
            key={box.id}
            box={box}
            isSelected={selectedIds.has(box.id)}
            selectedBoxCount={boxes.filter((b) => selectedIds.has(b.id)).length}
            isDragging={isDraggingBoxes && selectedIds.has(box.id)}
            onSelect={handleSelectElement}
            onUpdate={(id, updates) => {
              onUpdateBoxes(boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)));
            }}
            onDelete={onDeleteBox}
            onDuplicate={onDuplicateBox}
            onAlignChildren={onAlignBoxChildren}
            onStartDrag={handleStartDrag}
            onStartResize={handleBoxResizeStart}
            zoom={config.zoom}
            defaultGap={config.snapGap ?? 8}
          />
        ))}

        {/* 生徒アイコン */}
        {items.map((item) => {
          const char = charactersMap.get(item.charId);
          if (!char) return null;
          return (
            <CanvasItemView
              key={item.id}
              item={item}
              character={char}
              isSelected={selectedIds.has(item.id)}
              borderRadius={config.iconBorderRadius ?? 8}
              defaultBorderWidth={config.iconBorderWidth ?? 0}
              defaultColorMode={config.iconBorderColorMode ?? 'custom'}
              defaultBorderColor={config.iconBorderColor ?? '#ffffff'}
              onSelect={handleSelectElement}
              onDelete={onDeleteItem}
              onStartDrag={handleStartDrag}
            />
          );
        })}

        {/* PowerPoint風スマートガイド線（スナップライン）SVGオーバーレイ (最前面 z-[100]) */}
        {((externalSnapLines && externalSnapLines.length > 0) || snapLines.length > 0) && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-[100]">
            {(externalSnapLines && externalSnapLines.length > 0 ? externalSnapLines : snapLines).map((line, idx) => {
              if (line.orientation === 'vertical') {
                return (
                  <line
                    key={idx}
                    x1={line.pos}
                    y1={line.start}
                    x2={line.pos}
                    y2={line.end}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                );
              } else {
                return (
                  <line
                    key={idx}
                    x1={line.start}
                    y1={line.pos}
                    x2={line.end}
                    y2={line.pos}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                );
              }
            })}
          </svg>
        )}

        {/* 範囲選択矩形 (Selection Box) */}
        {selectionBox && (
          <div
            className="absolute border border-cyan-400 bg-cyan-500/15 pointer-events-none z-40 rounded-sm"
            style={{
              left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
              top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
              width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
              height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
            }}
          />
        )}
      </div>
      </div>

      {/* ビュー位置リセットボタン (パン移動されている時のみ右下に表示) */}
      {(pan.x !== 0 || pan.y !== 0) && (
        <button
          onClick={() => setPan({ x: 0, y: 0 })}
          className="absolute bottom-4 right-4 z-30 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/50 px-3 py-1.5 rounded-lg text-xs font-medium shadow-xl backdrop-blur flex items-center gap-1.5 transition select-none animate-in fade-in slide-in-from-bottom-2 duration-150"
          title="ビュー位置を中央にリセット"
        >
          <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
          <span>ビュー位置をリセット</span>
        </button>
      )}

      {/* 右クリックコンテキストメニュー (最前面 portal) */}
      {contextMenu &&
        createPortal(
          <div
            className="fixed bg-slate-900/95 backdrop-blur border border-slate-700 shadow-2xl rounded-lg py-1 px-1 z-[9999] min-w-[190px] animate-in fade-in zoom-in-95 duration-100 select-none"
            style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {items.filter((it) => selectedIds.has(it.id)).length >= 2 && (
              <button
                onClick={() => {
                  setContextMenu(null);
                  setShowSpacingModal(true);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-cyan-600/30 hover:text-cyan-300 rounded transition font-medium text-left"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span>間隔を調整する...</span>
              </button>
            )}
            <button
              onClick={() => {
                setContextMenu(null);
                handleUnifySelectedSizes();
              }}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-200 hover:bg-cyan-600/30 hover:text-cyan-300 rounded transition font-medium text-left"
            >
              <Maximize2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>アイコンサイズを揃える ({currentIconSize}px)</span>
            </button>
          </div>,
          document.body
        )}

      {/* アイコン間隔調整ダイアログ */}
      <SpacingAdjustModal
        isOpen={showSpacingModal}
        selectedCount={items.filter((it) => selectedIds.has(it.id)).length}
        onConfirm={handleApplySpacing}
        onClose={() => setShowSpacingModal(false)}
      />
    </div>
  );
};
