import re
import json

with open("npc_page_sample.html", "r", encoding="utf-8") as f:
    text = f.read()

body_idx = text.find('id="body"')
body_text = text[body_idx:]
footer_idx = body_text.find('id="comment"')
if footer_idx != -1:
    body_text = body_text[:footer_idx]

# h2, h3, h4 と td を抽出
# 学校（大見出し）と、キャラ名・アイコンURLを抽出する
lines = body_text.split('\n')
current_h2 = "その他"
current_h3 = "その他"

# より正確にDOM構造を辿るため、h2/h3 と table を解析
parts = re.split(r'(<h[23][^>]*>.*?</h[23]>)', body_text, flags=re.DOTALL)

school_map = {
    'アビドス高等学校': 'アビドス高等学校',
    'アリウス分校': 'アリウス分校',
    'ヴァルキューレ警察学校': 'ヴァルキューレ警察学校',
    'オデッセイア海洋高等学校': 'オデッセイア海洋高等学校',
    'クロノススクール': 'クロノススクール',
    'ゲヘナ学園': 'ゲヘナ学園',
    '山海経高級中学校': '山海経高級中学校',
    'トリニティ総合学園': 'トリニティ総合学園',
    'ハイランダー鉄道学園': 'ハイランダー鉄道学園',
    '百鬼夜行連合学院': '百鬼夜行連合学院',
    'ミレニアムサイエンススクール': 'ミレニアムサイエンススクール',
    'レッドウィンター連邦学園': 'レッドウィンター連邦学園',
    '連邦生徒会': '連邦生徒会',
    'SRT特殊学園': 'SRT特殊学園',
    'ワイルドハント芸術学院': 'ワイルドハント芸術学院',
    'シッテムの箱': 'シッテムの箱',
    'その他生徒': 'その他',
    '七囚人': '七囚人',
}

npc_records = []
current_school = "その他"

for p in parts:
    if p.startswith('<h2') or p.startswith('<h3'):
        title = re.sub(r'<[^>]+>', '', p).replace('&dagger;', '').strip()
        # 不要な見出し（着替え一覧など）
        if '着替え一覧' in title or 'イベント' in title or 'メインストーリー' in title:
            current_school = "IGNORE"
            continue
        
        # 学校判定
        matched_school = None
        for k, v in school_map.items():
            if k in title:
                matched_school = v
                break
        if matched_school:
            current_school = matched_school
        else:
            # 見出しそのまま（例: カイザーコーポレーション、ゲマトリア、市民 など）
            current_school = title
    else:
        if current_school == "IGNORE":
            continue
        # このセクション内のセルを探索
        # 各 <td ...>...</td> を探索
        tds = re.findall(r'<td[^>]*>(.*?)</td>', p, re.DOTALL)
        for td in tds:
            # 画像があるか
            img_m = re.search(r'data-src=[\"\']([^\"\']+)[\"\']', td)
            if not img_m:
                img_m = re.search(r'src=[\"\']([^\"\']+)[\"\']', td)
            if not img_m:
                continue
            
            img_url = img_m.group(1)
            if 'adsbygoogle' in img_url or 'banner' in img_url.lower():
                continue
            
            # キャラ名を探す
            # 1. title="..."
            name_m = re.search(r'title=[\"\']([^\"\']+)[\"\']', td)
            # 2. 最後の行 <br />名前
            clean_text = re.sub(r'<[^>]+>', '\n', td).strip()
            lines = [l.strip().replace('&nbsp;', '') for l in clean_text.split('\n') if l.strip()]
            
            name = None
            if name_m and name_m.group(1) and not name_m.group(1).startswith('http'):
                name = name_m.group(1)
            elif lines:
                name = lines[-1]
            
            if not name:
                continue
            
            name = name.replace('NPC', '').replace('&nbsp;', '').strip()
            # 空文字や無効なものは除外
            if not name or name in ['広告', 'TOP', 'MENU']:
                continue
            
            # 重複チェック（このリスト内）
            npc_records.append({
                'name': name,
                'school': current_school,
                'img_url': 'https://bluearchive.wikiru.jp/' + img_url if not img_url.startswith('http') else img_url,
                'raw_td': td[:100]
            })

print(f"Total extracted NPCs: {len(npc_records)}")
with open("npc_extracted.json", "w", encoding="utf-8") as f:
    json.dump(npc_records, f, ensure_ascii=False, indent=2)
