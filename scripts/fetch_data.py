import os
import re
import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor

HTML_PATH = r"C:\Users\madok\.gemini\antigravity\brain\a8cbaf01-7e50-42ee-9004-2ae4d3cdc46e\.system_generated\steps\4\content.md"
BASE_DIR = r"C:\Users\madok\.gemini\antigravity\scratch\ba-icon-canvas"
ICONS_DIR = os.path.join(BASE_DIR, "public", "icons")
OUTPUT_JSON = os.path.join(BASE_DIR, "public", "characters.json")

os.makedirs(ICONS_DIR, exist_ok=True)

with open(HTML_PATH, "r", encoding="utf-8", errors="ignore") as f:
    content = f.read()

start = content.find('id="sortabletable1"')
end = content.find('</table>', start)
table_html = content[start:end]

rows = re.findall(r'<tr>(.*?)</tr>', table_html, re.DOTALL)
characters = []

print(f"Found {len(rows)} rows in table.")

for i, r in enumerate(rows[1:]):
    tds = re.findall(r'<td.*?>(.*?)</td>', r, re.DOTALL)
    if len(tds) >= 11:
        rarity = re.sub(r'<[^>]+>', '', tds[0]).strip()
        img_m = re.search(r'data-src=[\"\']([^\"\']+)[\"\']', tds[1])
        img_rel = img_m.group(1) if img_m else ''
        
        name_m = re.search(r'title=[\"\']([^\"\']+)[\"\']', tds[2])
        name = name_m.group(1) if name_m else re.sub(r'<[^>]+>', '', tds[2]).strip()
        
        weapon = re.sub(r'<[^>]+>', '', tds[3]).strip()
        cover = re.sub(r'<[^>]+>', '', tds[4]).strip()
        role = re.sub(r'<[^>]+>', '', tds[5]).strip()
        pos = re.sub(r'<[^>]+>', '', tds[6]).strip()
        cls = re.sub(r'<[^>]+>', '', tds[7]).strip()
        school = re.sub(r'<[^>]+>', '', tds[8]).strip()
        atk = re.sub(r'<[^>]+>', '', tds[9]).strip()
        df = re.sub(r'<[^>]+>', '', tds[10]).replace('\n', '').replace(' ', '').strip()
        
        # Safe filename for icon
        safe_name = re.sub(r'[\\/*?:"<>|]', '_', name)
        filename = f"{safe_name}.png"
        
        characters.append({
            'id': f"char_{i+1:03d}",
            'name': name,
            'rarity': rarity,
            'img_url': 'https://bluearchive.wikiru.jp/' + img_rel if img_rel else '',
            'local_icon': f"icons/{filename}",
            'filename': filename,
            'weapon': weapon,
            'cover': cover,
            'role': role,
            'pos': pos,
            'class': cls,
            'school': school,
            'attack_type': atk,
            'defense_type': df
        })

print(f"Parsed {len(characters)} characters.")

# Download icons in parallel
def download_icon(char):
    if not char['img_url']:
        return char['name'], False
    target_path = os.path.join(ICONS_DIR, char['filename'])
    if os.path.exists(target_path) and os.path.getsize(target_path) > 0:
        return char['name'], True
    try:
        req = urllib.request.Request(char['img_url'], headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as res:
            data = res.read()
            with open(target_path, 'wb') as out_f:
                out_f.write(data)
        return char['name'], True
    except Exception as e:
        print(f"Error downloading {char['name']}: {e}")
        return char['name'], False

print("Starting parallel download of student icons...")
with ThreadPoolExecutor(max_workers=10) as executor:
    results = list(executor.map(download_icon, characters))

success_count = sum(1 for _, ok in results if ok)
print(f"Successfully downloaded {success_count}/{len(characters)} icons.")

# Save JSON (remove raw img_url, keep local_icon)
clean_characters = []
for c in characters:
    clean_characters.append({
        'id': c['id'],
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
        'defense_type': c['defense_type']
    })

with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
    json.dump(clean_characters, f, ensure_ascii=False, indent=2)

print(f"Saved character metadata to {OUTPUT_JSON}")
