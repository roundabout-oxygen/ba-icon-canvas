import React, { useState, useMemo } from 'react';
import { Character, AttackType, DefenseType, Role } from '../types';
import { ATTACK_COLORS, DEFENSE_COLORS } from '../utils/constants';
import { Search, Filter, Plus, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface SidebarProps {
  characters: Character[];
  onAddCharacter: (charId: string) => void;
  placedCharIds: Set<string>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  characters,
  onAddCharacter,
  placedCharIds,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAttack, setSelectedAttack] = useState<string>('all');
  const [selectedDefense, setSelectedDefense] = useState<string>('all');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [hoveredChar, setHoveredChar] = useState<Character | null>(null);

  // 全学校一覧の抽出
  const schools = useMemo(() => {
    const list = Array.from(new Set(characters.map((c) => c.school).filter(Boolean)));
    return list.sort();
  }, [characters]);

  // フィルタリング
  const filteredCharacters = useMemo(() => {
    return characters.filter((char) => {
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
  }, [characters, searchQuery, selectedAttack, selectedDefense, selectedSchool, selectedRole]);

  // ドラッグ開始
  const handleDragStart = (e: React.DragEvent, char: Character) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ charId: char.id }));
    e.dataTransfer.effectAllowed = 'copy';
  };

  if (isCollapsed) {
    return (
      <div className="w-12 h-full bg-slate-900 border-r border-slate-700 flex flex-col items-center py-4 text-slate-400">
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
    <div className="w-80 h-full bg-slate-900 border-r border-slate-700 flex flex-col select-none relative z-20">
      {/* ヘッダー */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="font-bold text-sm text-slate-200">生徒辞書</span>
          <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-mono">
            {filteredCharacters.length} / {characters.length}
          </span>
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition"
          title="サイドバーを折りたたむ"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* 検索バー */}
      <div className="p-3 border-b border-slate-800/80 space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="生徒名で検索..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800/90 border border-slate-700 rounded-md text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* 攻撃属性フィルター */}
        <div>
          <div className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
            <span>攻撃タイプ</span>
          </div>
          <div className="grid grid-cols-5 gap-1 text-[11px]">
            <button
              onClick={() => setSelectedAttack('all')}
              className={`py-1 rounded text-center transition font-medium ${
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
                  className={`py-1 rounded text-center transition font-medium border ${
                    isSelected
                      ? 'border-white text-white font-bold shadow'
                      : 'border-transparent text-slate-300 hover:opacity-80'
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

        {/* 防御属性フィルター */}
        <div>
          <div className="text-[10px] text-slate-400 font-semibold mb-1">防御タイプ</div>
          <div className="grid grid-cols-5 gap-1 text-[10px]">
            <button
              onClick={() => setSelectedDefense('all')}
              className={`py-1 rounded text-center transition font-medium ${
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
                  className={`py-1 rounded text-center transition font-medium border ${
                    isSelected
                      ? 'border-white text-white font-bold shadow'
                      : 'border-transparent text-slate-300 hover:opacity-80'
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

        {/* 学校 & 役割 フィルター (ドロップダウン) */}
        <div className="grid grid-cols-2 gap-1.5 pt-1">
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">すべての学校</option>
            {schools.map((sc) => (
              <option key={sc} value={sc}>
                {sc}
              </option>
            ))}
          </select>

          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-500"
          >
            <option value="all">すべての役割</option>
            <option value="STRIKER">STRIKER</option>
            <option value="SPECIAL">SPECIAL</option>
          </select>
        </div>
      </div>

      {/* 生徒アイコン一覧 */}
      <div className="flex-1 overflow-y-auto p-2.5 grid grid-cols-4 gap-2 content-start">
        {filteredCharacters.map((char) => {
          const isPlaced = placedCharIds.has(char.id);
          const atkColor = ATTACK_COLORS[char.attack_type]?.border || '#64748b';
          const defColor = DEFENSE_COLORS[char.defense_type]?.border || '#64748b';

          return (
            <div
              key={char.id}
              draggable
              onDragStart={(e) => handleDragStart(e, char)}
              onDoubleClick={() => onAddCharacter(char.id)}
              onMouseEnter={() => setHoveredChar(char)}
              onMouseLeave={() => setHoveredChar(null)}
              className={`group relative aspect-square bg-slate-800/80 rounded-lg overflow-hidden border cursor-grab active:cursor-grabbing hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20 transition duration-150 ${
                isPlaced ? 'border-cyan-600/60 ring-1 ring-cyan-500/30' : 'border-slate-700/60'
              }`}
              title={`${char.name} (ダブルクリックで追加、またはドラッグ)`}
            >
              {/* アイコン画像 */}
              <img
                src={char.icon}
                alt={char.name}
                className="w-full h-full object-cover group-hover:scale-105 transition duration-150"
                loading="lazy"
              />

              {/* 攻撃・防御のインジケータードット */}
              <div className="absolute top-1 left-1 flex gap-0.5 pointer-events-none">
                <span
                  className="w-2 h-2 rounded-full shadow-sm border border-black/40"
                  style={{ backgroundColor: atkColor }}
                  title={`攻撃: ${char.attack_type}`}
                />
                <span
                  className="w-2 h-2 rounded-full shadow-sm border border-black/40"
                  style={{ backgroundColor: defColor }}
                  title={`防御: ${char.defense_type}`}
                />
              </div>

              {/* 配置済みチェックマーク */}
              {isPlaced && (
                <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center font-bold text-[10px] shadow">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              )}

              {/* クイック追加ボタン (ホバー時) */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddCharacter(char.id);
                }}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition"
                title="キャンバスに追加"
              >
                <Plus className="w-5 h-5 bg-cyan-500 rounded-full p-0.5 text-slate-900 shadow-md" />
              </button>
            </div>
          );
        })}

        {filteredCharacters.length === 0 && (
          <div className="col-span-4 py-12 text-center text-slate-500 text-xs">
            該当する生徒が見つかりません
          </div>
        )}
      </div>

      {/* フッター（ホバー中の詳細情報プレビュー） */}
      <div className="p-2.5 bg-slate-950/80 border-t border-slate-800 min-h-[56px] flex items-center">
        {hoveredChar ? (
          <div className="flex items-center gap-2 w-full text-xs">
            <img src={hoveredChar.icon} alt="" className="w-9 h-9 rounded object-cover border border-slate-700" />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-slate-200 truncate">{hoveredChar.name}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-2">
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
          <div className="text-[11px] text-slate-500 text-center w-full">
            生徒をキャンバスへドラッグ＆ドロップして配置
          </div>
        )}
      </div>
    </div>
  );
};
