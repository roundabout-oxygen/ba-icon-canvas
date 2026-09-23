/**
 * ひらがなをカタカナに変換するユーティリティ
 */
export const hiraganaToKatakana = (str: string): string => {
  return str.replace(/[\u3041-\u3096]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) + 0x60)
  );
};

/**
 * カタカナをひらがなに変換するユーティリティ
 */
export const katakanaToHiragana = (str: string): string => {
  return str.replace(/[\u30a1-\u30f6]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
};

/**
 * ひらがな・カタカナ・英数大文字小文字を正規化して検索一致判定を行う
 */
export const matchFuzzyJapanese = (target: string, query: string): boolean => {
  if (!query) return true;
  const q = query.trim().toLowerCase();
  const t = target.toLowerCase();

  // 完全一致・部分一致
  if (t.includes(q)) return true;

  // カタカナ化して比較（クエリがひらがなでもカタカナでも対応）
  const qKata = hiraganaToKatakana(q);
  const tKata = hiraganaToKatakana(t);
  if (tKata.includes(qKata)) return true;

  // ひらがな化して比較
  const qHira = katakanaToHiragana(q);
  const tHira = katakanaToHiragana(t);
  if (tHira.includes(qHira)) return true;

  return false;
};
