import os
import re
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ICONS_DIR = os.path.join(BASE_DIR, "public", "icons")
OUTPUT_JSON = os.path.join(BASE_DIR, "public", "characters.json")
DIST_JSON = os.path.join(BASE_DIR, "dist", "characters.json")

os.makedirs(ICONS_DIR, exist_ok=True)

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# 1. プレイアブルキャラ
url_chars = 'https://bluearchive.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7'
print("Fetching playable characters...")
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

print(f"Loaded {len(playable_characters)} playable characters.")
playable_names = set(c['name'] for c in playable_characters)

# 2. NPCキャラ
url_npc = 'https://bluearchive.wikiru.jp/?NPC%E4%B8%80%E8%A6%A7'
print("Fetching NPC characters...")
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

# アイコンダウンロード
all_targets = playable_characters + unique_npcs
print(f"Total characters to verify/download: {len(all_targets)}")

def download_icon(char):
    if not char['img_url']:
        return char['name'], False
    target_path = os.path.join(ICONS_DIR, char['filename'])
    if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
        return char['name'], True
    try:
        req = urllib.request.Request(char['img_url'], headers=headers)
        with urllib.request.urlopen(req, timeout=12) as res:
            data = res.read()
            with open(target_path, 'wb') as out_f:
                out_f.write(data)
        return char['name'], True
    except Exception as e:
        print(f"Error downloading {char['name']} ({char['img_url']}): {e}")
        return char['name'], False

with ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(download_icon, all_targets))

ok_count = sum(1 for _, ok in results if ok)
print(f"Download complete: {ok_count}/{len(all_targets)} icons present.")

# 統合リスト構築
final_db = []
# 1. プレイアブルキャラ
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

# 2. NPCキャラ
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

print(f"Successfully saved {len(final_db)} characters to {OUTPUT_JSON}.")
