"""Genera src/assets.js: font Montserrat e immagini incorporati in base64.

Serve perché aprendo index.html con doppio clic (file://) il browser non permette
di caricare font e immagini a runtime. Rilanciare dopo aver cambiato i file in
src/fonts o src/icone:  python src/build-assets.py
"""
import base64, json, os

base = os.path.dirname(os.path.abspath(__file__))
b64 = lambda path: base64.b64encode(open(os.path.join(base, path), "rb").read()).decode()

assets = {
    "fonts": {
        "regular": b64("fonts/Montserrat-Regular.ttf"),
        "italic": b64("fonts/Montserrat-Italic.ttf"),
        "semibold": b64("fonts/Montserrat-SemiBold.ttf"),
        "bold": b64("fonts/Montserrat-Bold.ttf"),
    },
    "logo": "data:image/png;base64," + b64("icone/1T_Logo_R.png"),
    "footer": "data:image/png;base64," + b64("icone/1T Foother_Solo_loghi.png"),
}
with open(os.path.join(base, "assets.js"), "w", encoding="utf8") as f:
    f.write("// File generato da build-assets.py: non modificare a mano\nwindow.ASSETS = " + json.dumps(assets) + ";\n")
print("assets.js", os.path.getsize(os.path.join(base, "assets.js")) // 1024, "KB")
