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
    // 縦方向のガイドライン: 上下を貫通して画面全体に長く表示（別枠同士の整列も一目で確認可能）
    snapLines.push({
      orientation: 'vertical',
      pos: activeDragXVal,
      start: 0,
      end: canvasHeight,
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
    // 横方向のガイドライン: 左右を貫通して画面全体に長く表示
    snapLines.push({
      orientation: 'horizontal',
      pos: activeDragYVal,
      start: 0,
      end: canvasWidth,
    });
  }

  return {
    x: minDiffX <= THRESHOLD ? Math.round(bestX) : dragRect.x,
    y: minDiffY <= THRESHOLD ? Math.round(bestY) : dragRect.y,
    snapLines,
  };
}

/**
 * キーボード十字キー微調整用ガイド線判定
 * 座標は変更（吸着）せず、現在位置で揃っている要素があればガイド線のみを返す
 */
export function getGuideLinesOnly(
  rect: Rect,
  otherRects: Rect[],
  canvasWidth: number,
  canvasHeight: number,
  snapGap: number = 0,
  threshold: number = 2
): SnapLine[] {
  const snapLines: SnapLine[] = [];
  const foundX = new Set<number>();
  const foundY = new Set<number>();

  const rectLeft = rect.x;
  const rectRight = rect.x + rect.width;
  const rectCenterX = rect.x + rect.width / 2;

  const rectTop = rect.y;
  const rectBottom = rect.y + rect.height;
  const rectCenterY = rect.y + rect.height / 2;

  // キャンバス中央
  if (Math.abs(rectCenterX - canvasWidth / 2) <= threshold) {
    foundX.add(canvasWidth / 2);
  }
  if (Math.abs(rectCenterY - canvasHeight / 2) <= threshold) {
    foundY.add(canvasHeight / 2);
  }

  for (const other of otherRects) {
    if (other.id === rect.id) continue;
    const oLeft = other.x;
    const oRight = other.x + other.width;
    const oCenterX = other.x + other.width / 2;
    const oTop = other.y;
    const oBottom = other.y + other.height;
    const oCenterY = other.y + other.height / 2;

    // X方向の整列チェック (左端、中央、右端、間隔)
    const xChecks = [
      { rVal: rectLeft, oVal: oLeft },
      { rVal: rectLeft, oVal: oRight },
      { rVal: rectCenterX, oVal: oCenterX },
      { rVal: rectRight, oVal: oLeft },
      { rVal: rectRight, oVal: oRight },
    ];
    if (snapGap > 0) {
      xChecks.push({ rVal: rectLeft, oVal: oRight + snapGap });
      xChecks.push({ rVal: rectRight, oVal: oLeft - snapGap });
    }

    for (const check of xChecks) {
      if (Math.abs(check.rVal - check.oVal) <= threshold) {
        foundX.add(check.oVal);
      }
    }

    // Y方向の整列チェック (上端、中央、下端、間隔)
    const yChecks = [
      { rVal: rectTop, oVal: oTop },
      { rVal: rectTop, oVal: oBottom },
      { rVal: rectCenterY, oVal: oCenterY },
      { rVal: rectBottom, oVal: oTop },
      { rVal: rectBottom, oVal: oBottom },
    ];
    if (snapGap > 0) {
      yChecks.push({ rVal: rectTop, oVal: oBottom + snapGap });
      yChecks.push({ rVal: rectBottom, oVal: oTop - snapGap });
    }

    for (const check of yChecks) {
      if (Math.abs(check.rVal - check.oVal) <= threshold) {
        foundY.add(check.oVal);
      }
    }
  }

  foundX.forEach((pos) => {
    snapLines.push({
      orientation: 'vertical',
      pos,
      start: 0,
      end: canvasHeight,
    });
  });

  foundY.forEach((pos) => {
    snapLines.push({
      orientation: 'horizontal',
      pos,
      start: 0,
      end: canvasWidth,
    });
  });

  return snapLines;
}
