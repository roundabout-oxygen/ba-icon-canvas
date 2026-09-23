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

  // --- 1. X方向スナップ計算 ---
  let snapLineX: number | null = null;

  // キャンバス境界・中央とのアライメント
  const canvasAnchorsX = [0, canvasWidth / 2, canvasWidth];
  for (const cPos of canvasAnchorsX) {
    const candidates = [
      { dPos: dragLeft, targetX: cPos },
      { dPos: dragCenterX, targetX: cPos - dragRect.width / 2 },
      { dPos: dragRight, targetX: cPos - dragRect.width },
    ];
    for (const { dPos, targetX } of candidates) {
      const diff = Math.abs(dPos - cPos);
      if (diff < minDiffX) {
        minDiffX = diff;
        bestX = targetX;
        snapLineX = cPos;
      }
    }
  }

  // 他要素とのアライメント＆間隔（Gap）吸着
  for (const other of otherRects) {
    if (other.id === dragRect.id) continue;
    const oLeft = other.x;
    const oRight = other.x + other.width;
    const oCenterX = other.x + other.width / 2;

    // 端・中央の一致
    for (const oPos of [oLeft, oCenterX, oRight]) {
      const candidates = [
        { dPos: dragLeft, targetX: oPos },
        { dPos: dragCenterX, targetX: oPos - dragRect.width / 2 },
        { dPos: dragRight, targetX: oPos - dragRect.width },
      ];
      for (const { dPos, targetX } of candidates) {
        const diff = Math.abs(dPos - oPos);
        if (diff < minDiffX) {
          minDiffX = diff;
          bestX = targetX;
          snapLineX = oPos;
        }
      }
    }

    // 間隔（Gap）吸着: 他枠・要素と snapGap だけ離して配置
    if (snapGap > 0) {
      // 右側に snapGap 離して配置 (dragLeft === oRight + snapGap)
      const gapR = oRight + snapGap;
      const diffR = Math.abs(dragLeft - gapR);
      if (diffR < minDiffX) {
        minDiffX = diffR;
        bestX = gapR;
        snapLineX = gapR;
      }

      // 左側に snapGap 離して配置 (dragRight === oLeft - snapGap)
      const gapL = oLeft - snapGap;
      const diffL = Math.abs(dragRight - gapL);
      if (diffL < minDiffX) {
        minDiffX = diffL;
        bestX = gapL - dragRect.width;
        snapLineX = gapL;
      }
    }
  }

  if (snapLineX !== null && minDiffX <= THRESHOLD) {
    snapLines.push({
      orientation: 'vertical',
      pos: snapLineX,
      start: 0,
      end: canvasHeight,
    });
  }

  // --- 2. Y方向スナップ計算 ---
  let snapLineY: number | null = null;

  // キャンバス境界・中央とのアライメント
  const canvasAnchorsY = [0, canvasHeight / 2, canvasHeight];
  for (const cPos of canvasAnchorsY) {
    const candidates = [
      { dPos: dragTop, targetY: cPos },
      { dPos: dragCenterY, targetY: cPos - dragRect.height / 2 },
      { dPos: dragBottom, targetY: cPos - dragRect.height },
    ];
    for (const { dPos, targetY } of candidates) {
      const diff = Math.abs(dPos - cPos);
      if (diff < minDiffY) {
        minDiffY = diff;
        bestY = targetY;
        snapLineY = cPos;
      }
    }
  }

  // 他要素とのアライメント＆間隔（Gap）吸着
  for (const other of otherRects) {
    if (other.id === dragRect.id) continue;
    const oTop = other.y;
    const oBottom = other.y + other.height;
    const oCenterY = other.y + other.height / 2;

    // 端・中央の一致
    for (const oPos of [oTop, oCenterY, oBottom]) {
      const candidates = [
        { dPos: dragTop, targetY: oPos },
        { dPos: dragCenterY, targetY: oPos - dragRect.height / 2 },
        { dPos: dragBottom, targetY: oPos - dragRect.height },
      ];
      for (const { dPos, targetY } of candidates) {
        const diff = Math.abs(dPos - oPos);
        if (diff < minDiffY) {
          minDiffY = diff;
          bestY = targetY;
          snapLineY = oPos;
        }
      }
    }

    // 間隔（Gap）吸着: 他枠・要素と snapGap だけ離して配置 (枠同士の上下間隔で最重要)
    if (snapGap > 0) {
      // 下側に snapGap 離して配置 (dragTop === oBottom + snapGap)
      const gapB = oBottom + snapGap;
      const diffB = Math.abs(dragTop - gapB);
      if (diffB < minDiffY) {
        minDiffY = diffB;
        bestY = gapB;
        snapLineY = gapB;
      }

      // 上側に snapGap 離して配置 (dragBottom === oTop - snapGap)
      const gapT = oTop - snapGap;
      const diffT = Math.abs(dragBottom - gapT);
      if (diffT < minDiffY) {
        minDiffY = diffT;
        bestY = gapT - dragRect.height;
        snapLineY = gapT;
      }
    }
  }

  if (snapLineY !== null && minDiffY <= THRESHOLD) {
    snapLines.push({
      orientation: 'horizontal',
      pos: snapLineY,
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
