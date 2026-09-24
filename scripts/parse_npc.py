import re
import json

with open("npc_page_sample.html", "r", encoding="utf-8") as f:
    html = f.read()

# メインコンテンツ領域を取得
content_start = html.find('id="body"')
if content_start == -1:
    content_start = 0
content = html[content_start:]

# h2 または h3 を見つけて学校ごとに分割
# どのような見出しがあるかチェック
sections = re.split(r'<h[23][^>]*>(.*?)</h[23]>', content)
print(f"Total section parts: {len(sections)}")

for i in range(1, len(sections), 2):
    heading = re.sub(r'<[^>]+>', '', sections[i]).strip()
    body = sections[i+1]
    # body 内の画像と名前を探す
    # テーブルを探す
    tables = re.findall(r'<table.*?>(.*?)</table>', body, re.DOTALL)
    print(f"Section: {heading}, Tables: {len(tables)}, chars in body: {len(body)}")
