import { CanvasIconItem } from '../types';

export interface SpacingAdjustOptions {
  targetGap: number; // 調整後の目標間隔 (px)
  minGap: number;    // 対象とする最小間隔 (px)
  maxGap: number;    // 対象とする最大間隔 (px)
}

/**
 * 選択中のアイコン群に対して、minGap〜maxGapの範囲にある近接アイコン（クラスタ）を自動検出し、
 * 各クラスタ内で左上のアイコンを基準に右下方向へ目標間隔 (targetGap) で再配置する。
 * maxGapより離れているアイコン群同士の相対距離は維持される。
 */
export function adjustClusterSpacing(
  selectedItems: CanvasIconItem[],
  options: SpacingAdjustOptions
): CanvasIconItem[] {
  if (selectedItems.length <= 1) return selectedItems;

  const { targetGap, minGap, maxGap } = options;
  const itemSize = selectedItems[0].size;

  // 1. グラフの連結成分（クラスタ）を検出
  // 2つのアイテム A, B が近接している条件:
  // 横方向または縦方向に近接しており、隙間 (edge-to-edge gap) が minGap <= gap <= maxGap
  const n = selectedItems.length;
  const adj: number[][] = Array.from({ length: n }, () => []);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = selectedItems[i];
      const b = selectedItems[j];

      // 水平方向の重なり/隣接チェック
      const yOverlap = Math.min(a.y + a.size, b.y + b.size) - Math.max(a.y, b.y);
      const xGap = a.x < b.x ? b.x - (a.x + a.size) : a.x - (b.x + b.size);

      // 垂直方向の重なり/隣接チェック
      const xOverlap = Math.min(a.x + a.size, b.x + b.size) - Math.max(a.x, b.x);
      const yGap = a.y < b.y ? b.y - (a.y + a.size) : a.y - (b.y + b.size);

      let isConnected = false;

      // 横隣り判定 (Y軸が概ね揃っていて、Xの隙間が範囲内)
      if (yOverlap > a.size * 0.3 && xGap >= minGap - 2 && xGap <= maxGap + 2) {
        isConnected = true;
      }
      // 縦隣り判定 (X軸が概ね揃っていて、Yの隙間が範囲内)
      if (xOverlap > a.size * 0.3 && yGap >= minGap - 2 && yGap <= maxGap + 2) {
        isConnected = true;
      }

      if (isConnected) {
        adj[i].push(j);
        adj[j].push(i);
      }
    }
  }

  // 連結成分に分解
  const visited = new Array(n).fill(false);
  const clusters: CanvasIconItem[][] = [];

  for (let i = 0; i < n; i++) {
    if (!visited[i]) {
      const cluster: CanvasIconItem[] = [];
      const queue = [i];
      visited[i] = true;

      while (queue.length > 0) {
        const u = queue.shift()!;
        cluster.push(selectedItems[u]);
        for (const v of adj[u]) {
          if (!visited[v]) {
            visited[v] = true;
            queue.push(v);
          }
        }
      }
      clusters.push(cluster);
    }
  }

  // 2. 各クラスタ内で左上基準で目標間隔 (targetGap) に再配置
  const result: CanvasIconItem[] = [];

  for (const cluster of clusters) {
    if (cluster.length <= 1) {
      result.push(...cluster);
      continue;
    }

    // 左上の基準アイコンを特定 (minX, minY)
    let minX = Infinity;
    let minY = Infinity;
    cluster.forEach((it) => {
      if (it.x < minX) minX = it.x;
      if (it.y < minY) minY = it.y;
    });

    // 行（Row: Y座標が概ね同じアイテム群）ごとにグループ化
    // クラスタ内を行ごとにソート
    const sortedCluster = [...cluster].sort((a, b) => a.y - b.y || a.x - b.x);
    const rows: CanvasIconItem[][] = [];

    for (const item of sortedCluster) {
      let placedInRow = false;
      for (const row of rows) {
        // 同じ行判定: Y座標の差がアイコンサイズの半分未満
        if (Math.abs(row[0].y - item.y) < itemSize * 0.5) {
          row.push(item);
          placedInRow = true;
          break;
        }
      }
      if (!placedInRow) {
        rows.push([item]);
      }
    }

    // 各行を Y 座標昇順、行内の各アイテムを X 座標昇順にソート
    rows.sort((a, b) => a[0].y - b[0].y);
    rows.forEach((row) => row.sort((a, b) => a.x - b.x));

    // 各行・各アイテムを左上 (minX, minY) を基準に targetGap で配置
    let currentY = minY;
    rows.forEach((row) => {
      let currentX = minX;
      row.forEach((item) => {
        result.push({
          ...item,
          x: Math.round(currentX),
          y: Math.round(currentY),
        });
        currentX += item.size + targetGap;
      });
      currentY += itemSize + targetGap;
    });
  }

  return result;
}
