import os
import re
import json
import time
import urllib.request

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS_DIR = os.path.join(BASE_DIR, "public", "icons")
OUTPUT_JSON = os.path.join(BASE_DIR, "public", "characters.json")
DIST_JSON = os.path.join(BASE_DIR, "dist", "characters.json")

os.makedirs(ICONS_DIR, exist_ok=True)

# Wiki管理者へ配慮した User-Agent (一般的なブラウザ識別 + プロジェクト識別情報)
headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (BlueArchiveIconCanvas-SyncBot/1.0; +https://github.com/roundabout-oxygen/ba-icon-canvas)'
}

# 1. プレイアブルキャラクター一覧取得 (1リクエスト)
url_chars = 'https://bluearchive.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7'
print("Fetching playable characters list from wiki...")
req = urllib.request.Request(url_chars, headers=headers)
with urllib.request.urlopen(req, timeout=15) as res:
    chars_html = res.read().decode('utf-8', errors='ignore')

start = chars_html.find('id="sortabletable1"')
end = chars_html.find('</table>', start)
table_html = chars_html[start:end]
rows = re.findall(r'<tr>(.*?)</tr>', table_html, re.DOTALL)

playable_characters = []
for i, r in enumerate(rows[1:]):
    tds = re.findall(r'<td.*?>(.*?)</td>', r, re.DOTALL)
    if len(tds) >= 11:
        rarity = re.sub(r'<[^>]+>', '', tds[0]).strip()
        img_m = re.search(r'data-src=[\"\']([^\"\']+)[\"\']', tds[1])
        if not img_m:
            img_m = re.search(r'src=[\"\']([^\"\']+)[\"\']', tds[1])
        img_rel = img_m.group(1) if img_m else ''
        
        name_m = re.search(r'title=[\"\']([^\"\']+)[\"\']', tds[2])
        name = name_m.group(1) if name_m else re.sub(r'<[^>]+>', '', tds[2]).strip()
        name = name.replace('\n', '').strip()
        
        weapon = re.sub(r'<[^>]+>', '', tds[3]).strip()
        cover = re.sub(r'<[^>]+>', '', tds[4]).strip()
        role = re.sub(r'<[^>]+>', '', tds[5]).strip()
        pos = re.sub(r'<[^>]+>', '', tds[6]).strip()
        cls = re.sub(r'<[^>]+>', '', tds[7]).strip()
        school = re.sub(r'<[^>]+>', '', tds[8]).strip()
        atk = re.sub(r'<[^>]+>', '', tds[9]).strip()
        df = re.sub(r'<[^>]+>', '', tds[10]).replace('\n', '').replace(' ', '').strip()
        
        safe_name = re.sub(r'[\\/*?:"<>|]', '_', name)
        filename = f"{safe_name}.png"
        
        playable_characters.append({
            'name': name,
            'rarity': rarity,
            'img_url': 'https://bluearchive.wikiru.jp/' + img_rel if img_rel else '',
            'filename': filename,
            'local_icon': f"icons/{filename}",
            'weapon': weapon,
            'cover': cover,
            'role': role,
            'pos': pos,
            'class': cls,
            'school': school,
            'attack_type': atk,
            'defense_type': df,
            'is_npc': False
        })

print(f"Loaded {len(playable_characters)} playable characters from wiki.")
playable_names = set(c['name'] for c in playable_characters)

# 2. リクエスト間隔を空けてから NPC一覧取得 (1リクエスト)
time.sleep(1.5)

url_npc = 'https://bluearchive.wikiru.jp/?NPC%E4%B8%80%E8%A6%A7'
print("Fetching NPC characters list from wiki...")
req_npc = urllib.request.Request(url_npc, headers=headers)
with urllib.request.urlopen(req_npc, timeout=15) as res:
    npc_html = res.read().decode('utf-8', errors='ignore')

body_idx = npc_html.find('id="body"')
body_text = npc_html[body_idx:]
footer_idx = body_text.find('id="comment"')
if footer_idx != -1:
    body_text = body_text[:footer_idx]

parts = re.split(r'(<h[23][^>]*>.*?</h[23]>)', body_text, flags=re.DOTALL)

school_mapping = [
    ('アビドス', 'アビドス'),
    ('アリウス', 'アリウス'),
    ('ヴァルキューレ', 'ヴァルキューレ'),
    ('オデッセイア', 'オデュッセイア'),
    ('オデュッセイア', 'オデュッセイア'),
    ('クロノス', 'クロノス'),
    ('ゲヘナ', 'ゲヘナ'),
    ('山海経', '山海経'),
    ('トリニティ', 'トリニティ'),
    ('ハイランダー', 'ハイランダー'),
    ('百鬼夜行', '百鬼夜行'),
    ('ミレニアム', 'ミレニアム'),
    ('レッドウィンター', 'レッドウィンター'),
    ('連邦生徒会', '連邦生徒会'),
    ('SRT', 'SRT'),
    ('ワイルドハント', 'ワイルドハント'),
    ('シッテムの箱', 'シッテムの箱'),
    ('七囚人', '七囚人'),
    ('その他生徒', 'その他'),
]

current_school = "その他"
npc_candidates = []

for p in parts:
    if p.startswith('<h2') or p.startswith('<h3'):
        title = re.sub(r'<[^>]+>', '', p).replace('&dagger;', '').strip()
        if any(ignore in title for ignore in ['着替え一覧', 'イベント', 'メインストーリー', 'コメント']):
            current_school = "IGNORE"
            continue
        
        matched = False
        for pattern, sch in school_mapping:
            if pattern in title:
                current_school = sch
                matched = True
                break
        if not matched:
            current_school = title
    else:
        if current_school == "IGNORE":
            continue
        
        tds = re.findall(r'<td[^>]*>(.*?)</td>', p, re.DOTALL)
        for td in tds:
            img_m = re.search(r'data-src=[\"\']([^\"\']+)[\"\']', td)
            if not img_m:
                img_m = re.search(r'src=[\"\']([^\"\']+)[\"\']', td)
            if not img_m:
                continue
            
            img_url = img_m.group(1)
            if 'adsbygoogle' in img_url or 'banner' in img_url.lower():
                continue
            
            name_m = re.search(r'title=[\"\']([^\"\']+)[\"\']', td)
            title_name = name_m.group(1).strip() if name_m else ''
            
            text_lines = [l.strip().replace('&nbsp;', '') for l in re.sub(r'<[^>]+>', '\n', td).split('\n') if l.strip()]
            display_name = text_lines[-1] if text_lines else ''
            display_name = display_name.replace('NPC', '').strip()
            
            candidate_name = display_name if display_name and len(display_name) > 0 else title_name
            if not candidate_name or candidate_name in ['広告', 'TOP', 'MENU']:
                continue
            
            # プレイアブルキャラに同名がある場合は除外
            if candidate_name in playable_names or title_name in playable_names:
                continue
            
            safe_name = re.sub(r'[\\/*?:"<>|]', '_', candidate_name)
            filename = f"npc_{safe_name}.png"
            
            npc_candidates.append({
                'name': candidate_name,
                'rarity': '',
                'img_url': 'https://bluearchive.wikiru.jp/' + img_url if not img_url.startswith('http') else img_url,
                'filename': filename,
                'local_icon': f"icons/{filename}",
                'weapon': '',
                'cover': '',
                'role': '',
                'pos': '',
                'class': '',
                'school': current_school,
                'attack_type': '',
                'defense_type': '',
                'is_npc': True
            })

# 重複除去
seen = set()
unique_npcs = []
for n in npc_candidates:
    key = (n['name'], n['school'])
    if key not in seen:
        seen.add(key)
        unique_npcs.append(n)

print(f"Loaded {len(unique_npcs)} unique NPC characters.")

# 3. 差分アイコンダウンロード (新規キャラのみ、サーバー負荷軽減のため1件ずつ1.5秒インターバル)
all_targets = playable_characters + unique_npcs
print(f"Total characters verified: {len(all_targets)}")

new_downloads = 0
for char in all_targets:
    if not char['img_url']:
        continue
    target_path = os.path.join(ICONS_DIR, char['filename'])
    if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
        continue
    
    # 既存ローカルに存在しない新規キャラのみダウンロード
    print(f"New character icon found: {char['name']} -> downloading...")
    time.sleep(1.5)  # 連続アクセスを防止しWikiへの負荷を最小限に抑える
    try:
        req = urllib.request.Request(char['img_url'], headers=headers)
        with urllib.request.urlopen(req, timeout=12) as res:
            data = res.read()
            with open(target_path, 'wb') as out_f:
                out_f.write(data)
        new_downloads += 1
    except Exception as e:
        print(f"Error downloading icon for {char['name']}: {e}")

print(f"Icon sync completed. Newly downloaded icons: {new_downloads}")

# 4. 統合データベース保存
final_db = []
for idx, c in enumerate(playable_characters):
    final_db.append({
        'id': f"char_{idx+1:03d}",
        'name': c['name'],
        'rarity': c['rarity'],
        'icon': c['local_icon'],
        'weapon': c['weapon'],
        'cover': c['cover'],
        'role': c['role'],
        'pos': c['pos'],
        'class': c['class'],
        'school': c['school'],
        'attack_type': c['attack_type'],
        'defense_type': c['defense_type'],
        'is_npc': False
    })

for idx, c in enumerate(unique_npcs):
    final_db.append({
        'id': f"npc_{idx+1:03d}",
        'name': c['name'],
        'rarity': '',
        'icon': c['local_icon'],
        'weapon': '',
        'cover': '',
        'role': '',
        'pos': '',
        'class': '',
        'school': c['school'],
        'attack_type': '',
        'defense_type': '',
        'is_npc': True
    })

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(final_db, f, ensure_ascii=False, indent=2)

if os.path.exists(os.path.dirname(DIST_JSON)):
    with open(DIST_JSON, "w", encoding="utf-8") as f:
        json.dump(final_db, f, ensure_ascii=False, indent=2)

print(f"Database successfully updated. Total entries: {len(final_db)}")
