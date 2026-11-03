#!/usr/bin/env python3
"""GitHub Releases から SideStore / AltStore 用のソース（apps.json）と配布ページを作る。

使い方: python3 scripts/build_source.py <出力ディレクトリ>
環境変数: GITHUB_REPOSITORY（owner/repo）、GH_TOKEN（API のレート制限よけ。なくても動く）
apps/<ターゲット名>/app.json があるアプリを載せる。リリースのタグは <ターゲット名>-v<バージョン>。
"""
import json
import os
import shutil
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MAX_VERSIONS = 5


def api(path):
    req = urllib.request.Request(
        f"https://api.github.com{path}",
        headers={"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"},
    )
    token = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req) as res:
        return json.load(res)


def list_releases(repo):
    releases, page = [], 1
    while True:
        batch = api(f"/repos/{repo}/releases?per_page=100&page={page}")
        releases += batch
        if len(batch) < 100:
            return [r for r in releases if not r["draft"] and not r["prerelease"]]
        page += 1


def app_versions(target, info, releases):
    prefix = f"{target}-v"
    versions = []
    for rel in sorted(releases, key=lambda r: r["published_at"], reverse=True):
        if not rel["tag_name"].startswith(prefix):
            continue
        ipa = next((a for a in rel["assets"] if a["name"].endswith(".ipa")), None)
        if ipa is None:
            continue
        version = rel["tag_name"][len(prefix):]
        versions.append({
            "version": version,
            # ビルド番号はバージョンの末尾（= Actions の run_number）と同じにしている
            "buildVersion": version.rsplit(".", 1)[-1],
            "date": rel["published_at"],
            "localizedDescription": rel.get("body") or "",
            "downloadURL": ipa["browser_download_url"],
            "size": ipa["size"],
            "minOSVersion": info["minOSVersion"],
        })
        if len(versions) == MAX_VERSIONS:
            break
    return versions


def main():
    out_dir = Path(sys.argv[1])
    repo = os.environ["GITHUB_REPOSITORY"]
    owner, name = repo.split("/")
    base_url = f"https://{owner.lower()}.github.io/{name}"
    meta = json.loads((ROOT / "pages" / "source.json").read_text(encoding="utf-8"))
    releases = list_releases(repo)

    (out_dir / "icons").mkdir(parents=True, exist_ok=True)
    apps = []
    for app_dir in sorted(p for p in (ROOT / "apps").iterdir() if (p / "app.json").is_file()):
        target = app_dir.name
        info = json.loads((app_dir / "app.json").read_text(encoding="utf-8"))
        shutil.copyfile(app_dir / info["icon"], out_dir / "icons" / f"{target}.png")
        versions = app_versions(target, info, releases)
        if not versions:
            print(f"skip {target}: no release yet")
            continue
        latest = versions[0]
        apps.append({
            "name": info["name"],
            "bundleIdentifier": info["bundleIdentifier"],
            "developerName": info["developerName"],
            "subtitle": info.get("subtitle", ""),
            "localizedDescription": info["localizedDescription"],
            "iconURL": f"{base_url}/icons/{target}.png",
            "tintColor": info.get("tintColor", ""),
            "screenshots": [],
            "versions": versions,
            "appPermissions": {"entitlements": [], "privacy": {}},
            # 古いクライアント向けの互換キー
            "version": latest["version"],
            "versionDate": latest["date"],
            "downloadURL": latest["downloadURL"],
            "size": latest["size"],
        })

    source = {**meta, "sourceURL": f"{base_url}/apps.json", "apps": apps, "news": []}
    if apps:
        source.setdefault("iconURL", apps[0]["iconURL"])
    (out_dir / "apps.json").write_text(json.dumps(source, ensure_ascii=False, indent=2), encoding="utf-8")
    page = (ROOT / "pages" / "index.html").read_text(encoding="utf-8")
    (out_dir / "index.html").write_text(page.replace("{{SOURCE_URL}}", source["sourceURL"]), encoding="utf-8")
    for app in apps:
        print(f"{app['bundleIdentifier']} {app['version']} {app['size']} bytes")


if __name__ == "__main__":
    main()
