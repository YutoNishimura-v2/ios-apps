"""参考にする売れているゲームの、ストア公式スクショを取り込む（社内の比較用）。

使い方: python tools/concepts/fetch_refs.py <出力フォルダ>
Steam の appdetails と App Store の iTunes lookup（どちらも公開 API）から画像の URL を取り、保存する。
"""
import json
import os
import sys
import urllib.request

OUT = sys.argv[1]
os.makedirs(OUT, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (concept-reference-fetch)"}

STEAM = {
    "blackhole": 3694480,
    "nodebuster": 3107330,
    "balatro": 2379780,
    "vampire": 1794680,
    "tasty": 946010,
    "katamari": 848350,
    "cookie": 1454400,
    "gnorp": 1473350,
    "bills": 4421010,
    "digging": 3244220,
}
APPSTORE = {
    "shin_kingyo": ("1155430828", "jp"),
    "ridiculous": ("601831815", "us"),
}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def save(name, url):
    path = os.path.join(OUT, name)
    try:
        data = get(url)
        with open(path, "wb") as f:
            f.write(data)
        print("ok", name, len(data))
    except Exception as e:  # noqa: BLE001
        print("ng", name, e)


for name, appid in STEAM.items():
    try:
        d = json.loads(get(f"https://store.steampowered.com/api/appdetails?appids={appid}"))[str(appid)]
    except Exception as e:  # noqa: BLE001
        print("ng", name, e)
        continue
    if not d.get("success"):
        print("ng", name, "not found")
        continue
    data = d["data"]
    save(f"{name}_header.jpg", data["header_image"].split("?")[0])
    for i, s in enumerate(data.get("screenshots", [])[:3]):
        save(f"{name}_{i}.jpg", s["path_full"].split("?")[0])

for name, (appid, country) in APPSTORE.items():
    try:
        d = json.loads(get(f"https://itunes.apple.com/lookup?id={appid}&country={country}"))
    except Exception as e:  # noqa: BLE001
        print("ng", name, e)
        continue
    res = d.get("results", [])
    if not res:
        print("ng", name, "not found")
        continue
    print("title", name, res[0].get("trackName"))
    for i, u in enumerate(res[0].get("screenshotUrls", [])[:3]):
        save(f"{name}_{i}.jpg", u)
