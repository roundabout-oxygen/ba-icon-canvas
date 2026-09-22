import { SnapLine } from '../types';

export interface Rect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SnapResult {
  x: number;
  y: number;
  snapLines: SnapLine[];
}

const THRESHOLD = 6; // 吸着しきい値(px)

/**
 * PowerPoint風のスマートガイド吸着計算
 * ドラッグ中の矩形と他要素の端・中央を比較し、最も近い位置に吸着してガイド線を返す
 */
export function calculateSnap(
  dragRect: Rect,
  otherRects: Rect[],
  canvasWidth: number,
  canvasHeight: number,
  enabled: boolean = true,
  snapGap: number = 0
): SnapResult {
  if (!enabled) {
    return { x: dragRect.x, y: dragRect.y, snapLines: [] };
  }

  let bestX = dragRect.x;
  let bestY = dragRect.y;
  let minDiffX = THRESHOLD + 1;
  let minDiffY = THRESHOLD + 1;

  const dragLeft = dragRect.x;
  const dragRight = dragRect.x + dragRect.width;
  const dragCenterX = dragRect.x + dragRect.width / 2;

  const dragTop = dragRect.y;
  const dragBottom = dragRect.y + dragRect.height;
  const dragCenterY = dragRect.y + dragRect.height / 2;

  const snapLines: SnapLine[] = [];

  // 比較対象のXアンカー候補 (left, center, right, gapRight, gapLeft)
  interface AnchorX {
    pos: number;
    type: 'left' | 'center' | 'right';
    sourceYStart: number;
    sourceYEnd: number;
  }
  const anchorsX: AnchorX[] = [];

  // キャンバスの境界・中央
  anchorsX.push({ pos: 0, type: 'left', sourceYStart: 0, sourceYEnd: canvasHeight });
  anchorsX.push({ pos: canvasWidth / 2, type: 'center', sourceYStart: 0, sourceYEnd: canvasHeight });
  anchorsX.push({ pos: canvasWidth, type: 'right', sourceYStart: 0, sourceYEnd: canvasHeight });

  // 比較対象のYアンカー候補 (top, center, bottom, gapBottom, gapTop)
  interface AnchorY {
    pos: number;
    type: 'top' | 'center' | 'bottom';
    sourceXStart: number;
    sourceXEnd: number;
  }
  const anchorsY: AnchorY[] = [];

  // キャンバスの境界・中央
  anchorsY.push({ pos: 0, type: 'top', sourceXStart: 0, sourceXEnd: canvasWidth });
  anchorsY.push({ pos: canvasHeight / 2, type: 'center', sourceXStart: 0, sourceXEnd: canvasWidth });
  anchorsY.push({ pos: canvasHeight, type: 'bottom', sourceXStart: 0, sourceXEnd: canvasWidth });

  // 他の全要素からアンカーを収集
  for (const other of otherRects) {
    if (other.id === dragRect.id) continue;
    const oLeft = other.x;
    const oRight = other.x + other.width;
    const oCenterX = other.x + other.width / 2;
    const oTop = other.y;
    const oBottom = other.y + other.height;
    const oCenterY = other.y + other.height / 2;

    // 端同士・中心同士のアライメント
    anchorsX.push({ pos: oLeft, type: 'left', sourceYStart: oTop, sourceYEnd: oBottom });
    anchorsX.push({ pos: oCenterX, type: 'center', sourceYStart: oTop, sourceYEnd: oBottom });
    anchorsX.push({ pos: oRight, type: 'right', sourceYStart: oTop, sourceYEnd: oBottom });

    anchorsY.push({ pos: oTop, type: 'top', sourceXStart: oLeft, sourceXEnd: oRight });
    anchorsY.push({ pos: oCenterY, type: 'center', sourceXStart: oLeft, sourceXEnd: oRight });
    anchorsY.push({ pos: oBottom, type: 'bottom', sourceXStart: oLeft, sourceXEnd: oRight });

    // 間隔（Gap）吸着アンカー
    if (snapGap > 0) {
      // 他要素の右側に snapGap だけ離して配置 (dragLeft === oRight + snapGap)
      const gapR = oRight + snapGap;
      let diff = Math.abs(dragLeft - gapR);
      if (diff < minDiffX) {
        minDiffX = diff;
        bestX = gapR;
        anchorsX.push({ pos: gapR, type: 'left', sourceYStart: oTop, sourceYEnd: oBottom });
      }

      // 他要素の左側に snapGap だけ離して配置 (dragRight === oLeft - snapGap)
      const gapL = oLeft - snapGap;
      diff = Math.abs(dragRight - gapL);
      if (diff < minDiffX) {
        minDiffX = diff;
        bestX = gapL - dragRect.width;
        anchorsX.push({ pos: gapL, type: 'right', sourceYStart: oTop, sourceYEnd: oBottom });
      }

      // 他要素の下側に snapGap だけ離して配置 (dragTop === oBottom + snapGap)
      const gapB = oBottom + snapGap;
      let diffY = Math.abs(dragTop - gapB);
      if (diffY < minDiffY) {
        minDiffY = diffY;
        bestY = gapB;
        anchorsY.push({ pos: gapB, type: 'top', sourceXStart: oLeft, sourceXEnd: oRight });
      }

      // 他要素の上側に snapGap だけ離して配置 (dragBottom === oTop - snapGap)
      const gapT = oTop - snapGap;
      diffY = Math.abs(dragBottom - gapT);
      if (diffY < minDiffY) {
        minDiffY = diffY;
        bestY = gapT - dragRect.height;
        anchorsY.push({ pos: gapT, type: 'bottom', sourceXStart: oLeft, sourceXEnd: oRight });
      }
    }
  }

  // --- X方向スナップ計算 ---
  let bestAnchorX: AnchorX | null = null;
  let activeDragXVal = 0;

  for (const anchor of anchorsX) {
    // 1. dragLeft と比較
    let diff = Math.abs(dragLeft - anchor.pos);
    if (diff < minDiffX) {
      minDiffX = diff;
      bestX = anchor.pos;
      bestAnchorX = anchor;
      activeDragXVal = anchor.pos;
    }

    // 2. dragCenterX と比較
    diff = Math.abs(dragCenterX - anchor.pos);
    if (diff < minDiffX) {
      minDiffX = diff;
      bestX = anchor.pos - dragRect.width / 2;
      bestAnchorX = anchor;
      activeDragXVal = anchor.pos;
    }

    // 3. dragRight と比較
    diff = Math.abs(dragRight - anchor.pos);
    if (diff < minDiffX) {
      minDiffX = diff;
      bestX = anchor.pos - dragRect.width;
      bestAnchorX = anchor;
      activeDragXVal = anchor.pos;
    }
  }

  if (bestAnchorX && minDiffX <= THRESHOLD) {
    const minY = Math.min(dragTop, bestAnchorX.sourceYStart);
    const maxY = Math.max(dragBottom, bestAnchorX.sourceYEnd);
    snapLines.push({
      orientation: 'vertical',
      pos: activeDragXVal,
      start: Math.max(0, minY - 10),
      end: Math.min(canvasHeight, maxY + 10),
    });
  }

  // --- Y方向スナップ計算 ---
  let bestAnchorY: AnchorY | null = null;
  let activeDragYVal = 0;

  for (const anchor of anchorsY) {
    // 1. dragTop と比較
    let diff = Math.abs(dragTop - anchor.pos);
    if (diff < minDiffY) {
      minDiffY = diff;
      bestY = anchor.pos;
      bestAnchorY = anchor;
      activeDragYVal = anchor.pos;
    }

    // 2. dragCenterY と比較
    diff = Math.abs(dragCenterY - anchor.pos);
    if (diff < minDiffY) {
      minDiffY = diff;
      bestY = anchor.pos - dragRect.height / 2;
      bestAnchorY = anchor;
      activeDragYVal = anchor.pos;
    }

    // 3. dragBottom と比較
    diff = Math.abs(dragBottom - anchor.pos);
    if (diff < minDiffY) {
      minDiffY = diff;
      bestY = anchor.pos - dragRect.height;
      bestAnchorY = anchor;
      activeDragYVal = anchor.pos;
    }
  }

  if (bestAnchorY && minDiffY <= THRESHOLD) {
    const minX = Math.min(dragLeft, bestAnchorY.sourceXStart);
    const maxX = Math.max(dragRight, bestAnchorY.sourceXEnd);
    snapLines.push({
      orientation: 'horizontal',
      pos: activeDragYVal,
      start: Math.max(0, minX - 10),
      end: Math.min(canvasWidth, maxX + 10),
    });
  }

  return {
    x: minDiffX <= THRESHOLD ? Math.round(bestX) : dragRect.x,
    y: minDiffY <= THRESHOLD ? Math.round(bestY) : dragRect.y,
    snapLines,
  };
}
