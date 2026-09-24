import urllib.request
import re
import json
import os

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}

# 1. キャラクター一覧
url_chars = 'https://bluearchive.wikiru.jp/?%E3%82%AD%E3%83%A3%E3%83%A9%E3%82%AF%E3%82%BF%E3%83%BC%E4%B8%80%E8%A6%A7'
print("Fetching playable characters...")
req = urllib.request.Request(url_chars, headers=headers)
with urllib.request.urlopen(req, timeout=15) as res:
    chars_html = res.read().decode('utf-8', errors='ignore')

start = chars_html.find('id="sortabletable1"')
end = chars_html.find('</table>', start)
table_html = chars_html[start:end]
rows = re.findall(r'<tr>(.*?)</tr>', table_html, re.DOTALL)
print(f"Playable rows: {len(rows)}")

playable_list = []
for r in rows[1:]:
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
        
        playable_list.append({
            'name': name,
            'rarity': rarity,
            'img_url': 'https://bluearchive.wikiru.jp/' + img_rel if img_rel else '',
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

print(f"Parsed {len(playable_list)} playable characters.")

# 2. NPC一覧
url_npc = 'https://bluearchive.wikiru.jp/?NPC%E4%B8%80%E8%A6%A7'
print("Fetching NPC characters...")
req_npc = urllib.request.Request(url_npc, headers=headers)
with urllib.request.urlopen(req_npc, timeout=15) as res:
    npc_html = res.read().decode('utf-8', errors='ignore')

# NPC一覧ページの構造を調べるためにテーブルやリストを探す
with open("npc_page_sample.html", "w", encoding="utf-8") as f:
    f.write(npc_html)

print("Saved npc_page_sample.html. Checking tables...")
tables = re.findall(r'<table.*?>(.*?)</table>', npc_html, re.DOTALL)
print(f"Found {len(tables)} tables in NPC page.")
