import re
import json

with open("npc_page_sample.html", "r", encoding="utf-8") as f:
    text = f.read()

body_idx = text.find('id="body"')
body_text = text[body_idx:]

# コメント欄やルールなどのフッターより前
footer_idx = body_text.find('id="comment"')
if footer_idx != -1:
    body_text = body_text[:footer_idx]

# 見出しとテーブルの対応関係を抽出
# h2/h3 と table を順に追う
elements = re.findall(r'(<h[234][^>]*>.*?</h[234]>|<table.*?>.*?</table>)', body_text, re.DOTALL)
print(f"Total elements (headings + tables): {len(elements)}")

current_school = "その他"
npc_list = []

for elem in elements:
    if elem.startswith('<h'):
        h_text = re.sub(r'<[^>]+>', '', elem).strip()
        h_text = h_text.replace('&dagger;', '').strip()
        # 学校名やカテゴリ
        current_school = h_text
        # print(f"Heading: {h_text}")
    elif elem.startswith('<table'):
        rows = re.findall(r'<tr>(.*?)</tr>', elem, re.DOTALL)
        for r in rows:
            tds = re.findall(r'<td.*?>(.*?)</td>', r, re.DOTALL)
            if not tds:
                continue
            # 画像が含まれているか確認
            # NPCテーブルの典型的な構造を調べる
            img_m = re.search(r'data-src=[\"\']([^\"\']+)[\"\']', r)
            if not img_m:
                img_m = re.search(r'src=[\"\']([^\"\']+)[\"\']', r)
            
            # 各セルのテキスト
            clean_tds = [re.sub(r'<[^>]+>', '', td).strip().replace('\n', '') for td in tds]
            if img_m:
                npc_list.append({
                    'school': current_school,
                    'tds': clean_tds,
                    'img_url': img_m.group(1),
                    'raw_row': r[:200]
                })

print(f"Found {len(npc_list)} candidate NPC rows with images.")
with open("npc_candidates.json", "w", encoding="utf-8") as f:
    json.dump(npc_list[:30], f, ensure_ascii=False, indent=2)

print("Saved first 30 candidates to npc_candidates.json")
