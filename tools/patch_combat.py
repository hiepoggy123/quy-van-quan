# -*- coding: utf-8 -*-
with open('quy-van-app.js', 'r', encoding='utf-8') as f:
    c = f.read()

target = "recordQuestProgress('game', 1);"
replacement = "recordQuestProgress('game', 1);\n            recordQuestProgress('hunt', 1);"
if target in c:
    c = c.replace(target, replacement, 1)
    with open('quy-van-app.js', 'w', encoding='utf-8') as f:
        f.write(c)
    print("Updated combat quest progress hook!")
else:
    print("target not found")
