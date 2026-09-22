import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CanvasIconItem, ContainerBox, Character, SnapLine, CanvasConfig } from '../types';
import { CanvasItemView } from './CanvasItemView';
import { ContainerBoxView } from './ContainerBoxView';
import { calculateSnap, Rect } from '../utils/snapGuide';

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
  onAlignBoxChildren: (boxId: string, type: 'grid' | 'row') => void;
  onDropCharacters: (charIds: string[], x: number, y: number) => void;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  externalSnapLines?: SnapLine[];
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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [snapLines, setSnapLines] = useState<SnapLine[]>([]);
  const [isDraggingBoxes, setIsDraggingBoxes] = useState(false);

  // ドラッグ移動管理
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

  // キャンバスの背景または非アクティブ枠からの範囲選択・クリック選択
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
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
      className="flex-1 h-full overflow-auto bg-slate-950 flex items-center justify-center p-8 relative"
      onMouseDown={handleCanvasMouseDown}
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
            isDragging={isDraggingBoxes && selectedIds.has(box.id)}
            onSelect={handleSelectElement}
            onUpdate={(id, updates) => {
              onUpdateBoxes(boxes.map((b) => (b.id === id ? { ...b, ...updates } : b)));
            }}
            onDelete={onDeleteBox}
            onDuplicate={onDuplicateBox}
            onAlignChildren={onAlignBoxChildren}
            onStartDrag={handleStartDrag}
            zoom={config.zoom}
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
  );
};
