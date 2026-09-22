import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Character, AttackType, DefenseType } from '../types';
import { ATTACK_COLORS, DEFENSE_COLORS } from '../utils/constants';
import { Search, ChevronLeft, ChevronRight, Check, CheckSquare, Square, Plus, ArrowDownAZ } from 'lucide-react';

interface SidebarProps {
  characters: Character[];
  onAddCharacters: (charIds: string[]) => void;
  placedCharIds: Set<string>;
  selectedSidebarCharIds: Set<string>;
  onSelectSidebarCharIds: (ids: Set<string>) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  characters,
  onAddCharacters,
  placedCharIds,
  selectedSidebarCharIds,
  onSelectSidebarCharIds,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(360); // 幅可変
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttack, setSelectedAttack] = useState<string>('all');
  const [selectedDefense, setSelectedDefense] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [hoveredChar, setHoveredChar] = useState<Character | null>(null);

  // 範囲選択用ref
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [selectionBox, setSelectionBox] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // 全学校一覧の抽出
  const schools = useMemo(() => {
    const list = Array.from(new Set(characters.map((c) => c.school).filter(Boolean)));
    return list.sort();
  }, [characters]);

  // フィルタリング ＆ デフォルトであいうえお順（日本語五十音順）にソート
  const filteredCharacters = useMemo(() => {
    const list = characters.filter((char) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!char.name.toLowerCase().includes(q)) return false;
      }
      if (selectedAttack !== 'all' && char.attack_type !== selectedAttack) return false;
      if (selectedDefense !== 'all' && char.defense_type !== selectedDefense) return false;
      if (selectedSchool !== 'all' && char.school !== selectedSchool) return false;
      if (selectedRole !== 'all' && char.role !== selectedRole) return false;
      return true;
    });

    // あいうえお順（日本語ロケール）でソート
    return list.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  }, [characters, searchQuery, selectedAttack, selectedDefense, selectedSchool, selectedRole]);

  // ドラッグ開始（複数選択時は選択中の全員、未選択アイコンをドラッグした場合はその1人）
  const handleDragStart = (e: React.DragEvent, char: Character) => {
    let idsToDrag: string[] = [];
    if (selectedSidebarCharIds.has(char.id) && selectedSidebarCharIds.size > 0) {
      idsToDrag = Array.from(selectedSidebarCharIds);
    } else {
      idsToDrag = [char.id];
      onSelectSidebarCharIds(new Set([char.id]));
    }

    e.dataTransfer.setData('application/json', JSON.stringify({ charIds: idsToDrag }));
    e.dataTransfer.effectAllowed = 'copy';

    // ドラッグ中のプレビューアイコン設定
    const dragGhost = document.createElement('div');
    dragGhost.style.padding = '4px 8px';
    dragGhost.style.background = '#0284c7';
    dragGhost.style.color = '#ffffff';
    dragGhost.style.borderRadius = '6px';
    dragGhost.style.fontSize = '12px';
    dragGhost.style.fontWeight = 'bold';
    dragGhost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.4)';
    dragGhost.innerText = idsToDrag.length > 1 ? `生徒 ${idsToDrag.length} 人を移動中` : char.name;
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 20, 20);
    setTimeout(() => document.body.removeChild(dragGhost), 0);
  };

  // アイコンクリック選択
  const handleItemClick = (charId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedSidebarCharIds);
    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      if (next.has(charId)) next.delete(charId);
      else next.add(charId);
    } else {
      // 単一トグル
      if (next.has(charId) && next.size === 1) {
        next.clear();
      } else {
        next.clear();
        next.add(charId);
      }
    }
    onSelectSidebarCharIds(next);
  };

  // 全選択・選択解除
  const handleSelectAll = () => {
    if (selectedSidebarCharIds.size === filteredCharacters.length) {
      onSelectSidebarCharIds(new Set());
    } else {
      onSelectSidebarCharIds(new Set(filteredCharacters.map((c) => c.id)));
    }
  };

  // リスト領域でのドラッグ範囲選択
  const handleMouseDownOnList = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // 左クリックのみ
    if (!listContainerRef.current) return;

    // クリック対象がアイコン自体の場合はアイテムクリックに委ねる
    const target = e.target as HTMLElement;
    if (target.closest('.character-card')) {
      return;
    }

    if (!e.shiftKey && !e.ctrlKey) {
      onSelectSidebarCharIds(new Set());
    }

    const rect = listContainerRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left + listContainerRef.current.scrollLeft;
    const startY = e.clientY - rect.top + listContainerRef.current.scrollTop;

    setSelectionBox({ startX, startY, currentX: startX, currentY: startY });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!listContainerRef.current) return;
      const curRect = listContainerRef.current.getBoundingClientRect();
      const currentX = moveEvent.clientX - curRect.left + listContainerRef.current.scrollLeft;
      const currentY = moveEvent.clientY - curRect.top + listContainerRef.current.scrollTop;

      setSelectionBox({ startX, startY, currentX, currentY });

      // 交差判定
      const selL = Math.min(startX, currentX);
      const selR = Math.max(startX, currentX);
      const selT = Math.min(startY, currentY);
      const selB = Math.max(startY, currentY);

      const next = new Set(e.shiftKey ? selectedSidebarCharIds : []);
      const cards = listContainerRef.current.querySelectorAll('.character-card');
      cards.forEach((card) => {
        const id = card.getAttribute('data-id');
        if (!id) return;
        const htmlCard = card as HTMLElement;
        const cardL = htmlCard.offsetLeft;
        const cardR = cardL + htmlCard.offsetWidth;
        const cardT = htmlCard.offsetTop;
        const cardB = cardT + htmlCard.offsetHeight;

        if (cardL < selR && cardR > selL && cardT < selB && cardB > selT) {
          next.add(id);
        }
      });

      onSelectSidebarCharIds(next);
    };

    const handleMouseUp = () => {
      setSelectionBox(null);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // サイドバー横幅リサイズ
  const handleWidthResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newW = Math.max(280, Math.min(600, startW + (moveEvent.clientX - startX)));
      setSidebarWidth(newW);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 text-slate-400 shrink-0">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 hover:text-white hover:bg-slate-800 rounded-lg transition"
          title="キャラクター辞書を展開"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <div className="mt-6 text-xs font-bold [writing-mode:vertical-rl] tracking-widest text-slate-400">
          生徒辞書 ({characters.length})
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ width: `${sidebarWidth}px` }}
      className="h-full bg-slate-900 border-r border-slate-700 flex flex-col select-none relative z-20 shrink-0"
    >
      {/* 右側の幅調整リサイズバー */}
      <div
        onMouseDown={handleWidthResizeStart}
        className="absolute top-0 right-0 w-1.5 h-full cursor-ew-resize hover:bg-cyan-500/50 transition z-40"
        title="ドラッグしてサイドバー幅を調整"
      />

      {/* ヘッダー */}
      <div className="p-2.5 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-sm text-slate-200">生徒辞書</span>
          <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
            {filteredCharacters.length}人
          </span>
          <span className="flex items-center text-[10px] text-cyan-400/90 font-medium ml-1">
            <ArrowDownAZ className="w-3.5 h-3.5 mr-0.5" />
            あいうえお順
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition"
          title="サイドバーを折りたたむ"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 絞り込みフィルター（余白最小限設計） */}
      <div className="p-2 border-b border-slate-800/80 space-y-1.5 shrink-0 text-xs">
        {/* 検索入力 */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="生徒名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-6 py-1 bg-slate-800/90 border border-slate-700 rounded text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* 攻撃タイプ */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 w-12 shrink-0">攻撃:</span>
          <div className="grid grid-cols-5 gap-1 flex-1 text-[10px]">
            <button
              onClick={() => setSelectedAttack('all')}
              className={`py-0.5 rounded text-center transition font-medium ${
                selectedAttack === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              全
            </button>
            {(['爆発', '貫通', '神秘', '振動'] as AttackType[]).map((atk) => {
              const col = ATTACK_COLORS[atk];
              const isSelected = selectedAttack === atk;
              return (
                <button
                  key={atk}
                  onClick={() => setSelectedAttack(isSelected ? 'all' : atk)}
                  className={`py-0.5 rounded text-center transition font-medium border ${
                    isSelected ? 'border-white text-white font-bold' : 'border-transparent text-slate-300'
                  }`}
                  style={{
                    backgroundColor: isSelected ? col.border : col.border + '33',
                    color: isSelected ? '#ffffff' : col.border,
                  }}
                >
                  {atk}
                </button>
              );
            })}
          </div>
        </div>

        {/* 防御タイプ */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-slate-400 w-12 shrink-0">防御:</span>
          <div className="grid grid-cols-5 gap-1 flex-1 text-[10px]">
            <button
              onClick={() => setSelectedDefense('all')}
              className={`py-0.5 rounded text-center transition font-medium ${
                selectedDefense === 'all'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 hover:bg-slate-800'
              }`}
            >
              全
            </button>
            {[
              { label: '軽装', full: '軽装備' },
              { label: '重装', full: '重装甲' },
              { label: '特殊', full: '特殊装甲' },
              { label: '弾力', full: '弾力装甲' },
            ].map(({ label, full }) => {
              const col = DEFENSE_COLORS[full];
              const isSelected = selectedDefense === full;
              return (
                <button
                  key={full}
                  onClick={() => setSelectedDefense(isSelected ? 'all' : full)}
                  className={`py-0.5 rounded text-center transition font-medium border ${
                    isSelected ? 'border-white text-white font-bold' : 'border-transparent text-slate-300'
                  }`}
                  style={{
                    backgroundColor: isSelected ? col.border : col.border + '33',
                    color: isSelected ? '#ffffff' : col.border,
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 学校 & 役割 */}
        <div className="grid grid-cols-2 gap-1 pt-0.5">
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">学校: すべて</option>
            {schools.map((sc) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">役割: すべて</option>
            <option value="STRIKER">STRIKER</option>
            <option value="SPECIAL">SPECIAL</option>
          </select>
        </div>

        {/* 選択操作バー（複数選択・全選択・一括追加） */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[10px]">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1 text-slate-400 hover:text-white transition"
          >
            {selectedSidebarCharIds.size === filteredCharacters.length && filteredCharacters.length > 0 ? (
              <CheckSquare className="w-3 h-3 text-cyan-400" />
            ) : (
              <Square className="w-3 h-3" />
            )}
            <span>全選択</span>
          </button>

          {selectedSidebarCharIds.size > 0 ? (
            <div className="flex items-center gap-1.5">
              <span className="text-cyan-400 font-bold font-mono">
                {selectedSidebarCharIds.size}人選択中
              </span>
              <button
                onClick={() => onAddCharacters(Array.from(selectedSidebarCharIds))}
                className="flex items-center gap-0.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-2 py-0.5 rounded shadow transition active:scale-95"
                title="選択した生徒をキャンバスに追加"
              >
                <Plus className="w-3 h-3 stroke-[3]" />
                <span>追加</span>
              </button>
            </div>
          ) : (
            <span className="text-slate-500 text-[9px]">ドラッグで範囲選択 / 複数選択可能</span>
          )}
        </div>
      </div>

      {/* 生徒アイコン一覧エリア (重なりを完全排除 & 縦スクロール) */}
      <div
        ref={listContainerRef}
        onMouseDown={handleMouseDownOnList}
        className="flex-1 min-h-0 overflow-y-auto p-1.5 relative select-none"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(54px, 1fr))',
          gap: '4px',
          alignContent: 'start',
        }}
      >
        {filteredCharacters.map((char) => {
          const isSelected = selectedSidebarCharIds.has(char.id);
          const isPlaced = placedCharIds.has(char.id);
          const atkColor = ATTACK_COLORS[char.attack_type]?.border || '#64748b';
          const defColor = DEFENSE_COLORS[char.defense_type]?.border || '#64748b';

          return (
            <div
              key={char.id}
              data-id={char.id}
              draggable
              onDragStart={(e) => handleDragStart(e, char)}
              onClick={(e) => handleItemClick(char.id, e)}
              onDoubleClick={() => onAddCharacters([char.id])}
              onMouseEnter={() => setHoveredChar(char)}
              onMouseLeave={() => setHoveredChar(null)}
              className={`character-card group relative w-full aspect-square shrink-0 rounded-md overflow-hidden border cursor-grab active:cursor-grabbing transition duration-75 ${
                isSelected
                  ? 'border-cyan-400 ring-2 ring-cyan-400 shadow-md shadow-cyan-500/30'
                  : isPlaced
                  ? 'border-cyan-700/80 ring-1 ring-cyan-600/40 opacity-90'
                  : 'border-slate-700/80 hover:border-slate-400'
              }`}
              title={`${char.name}\n攻撃: ${char.attack_type} / 防御: ${char.defense_type}\n(クリックで選択、ドラッグで追加)`}
            >
              {/* アイコン画像 */}
              <img
                src={char.icon}
                alt={char.name}
                className="w-full h-full object-cover pointer-events-none block"
                loading="lazy"
              />

              {/* 攻撃・防御のインジケータードット */}
              <div className="absolute top-0.5 left-0.5 flex gap-0.5 pointer-events-none">
                <span
                  className="w-1.5 h-1.5 rounded-full shadow border border-black/50"
                  style={{ backgroundColor: atkColor }}
                />
                <span
                  className="w-1.5 h-1.5 rounded-full shadow border border-black/50"
                  style={{ backgroundColor: defColor }}
                />
              </div>

              {/* 配置済みチェック */}
              {isPlaced && (
                <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-[8px] shadow pointer-events-none">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              {/* 選択時オーバーレイ */}
              {isSelected && (
                <div className="absolute inset-0 bg-cyan-500/20 pointer-events-none flex items-center justify-center">
                  <div className="w-4 h-4 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center font-black text-[9px] shadow">
                    ✓
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredCharacters.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 text-xs">
            該当する生徒が見つかりません
          </div>
        )}

        {/* 範囲選択枠 (Selection Box) */}
        {selectionBox && (
          <div
            className="absolute border border-cyan-400 bg-cyan-500/20 pointer-events-none z-50 rounded-sm"
            style={{
              left: `${Math.min(selectionBox.startX, selectionBox.currentX)}px`,
              top: `${Math.min(selectionBox.startY, selectionBox.currentY)}px`,
              width: `${Math.abs(selectionBox.currentX - selectionBox.startX)}px`,
              height: `${Math.abs(selectionBox.currentY - selectionBox.startY)}px`,
            }}
          />
        )}
      </div>

      {/* フッター情報 */}
      <div className="p-2 bg-slate-950/90 border-t border-slate-800 min-h-[50px] flex items-center shrink-0">
        {hoveredChar ? (
          <div className="flex items-center gap-2 w-full text-xs">
            <img src={hoveredChar.icon} alt="" className="w-8 h-8 rounded object-cover border border-slate-700 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-200 truncate text-[11px]">{hoveredChar.name}</div>
              <div className="text-[9px] text-slate-400 flex items-center gap-1.5">
                <span>{hoveredChar.school}</span>
                <span style={{ color: ATTACK_COLORS[hoveredChar.attack_type]?.border }}>
                  {hoveredChar.attack_type}
                </span>
                <span style={{ color: DEFENSE_COLORS[hoveredChar.defense_type]?.border }}>
                  {hoveredChar.defense_type}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-slate-500 text-center w-full">
            {selectedSidebarCharIds.size > 0
              ? `${selectedSidebarCharIds.size} 人選択中 (キャンバスへドラッグ)`
              : '生徒をドラッグして複数選択可能'}
          </div>
        )}
      </div>
    </div>
  );
};
