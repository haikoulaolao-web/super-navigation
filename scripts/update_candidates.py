import json
import math
import os
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

RESOURCES = Path("resources.json")
OUTPUT = Path("dynamic-candidates.json")

TOKEN = os.environ.get("GITHUB_TOKEN", "").strip()

HEADERS = {
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "NAV-KING-V0.3.2"
}

if TOKEN:
    HEADERS["Authorization"] = f"Bearer {TOKEN}"

BLOCKED_TERMS = [
    "movie", "movies", "film", "cinema", "torrent movie", "streaming movie",
    "影视", "电影下载", "电视剧下载", "磁力影视", "在线看片",
    "crack", "keygen", "serial key", "pirated", "warez", "破解", "注册码",
    "casino", "gambling", "betting", "赌博", "博彩",
    "porn", "xxx", "adult content", "色情", "成人视频",
    "malware", "ransomware", "phishing", "stealer", "木马", "钓鱼",
    "drug market", "毒品交易", "carding", "盗刷", "洗钱"
]

SAFE_TOPIC_HINTS = [
    "learning", "education", "tutorial", "resources", "awesome",
    "programming", "design", "data", "productivity", "language",
    "developer", "tools", "open-source", "course", "guide"
]


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def load_json(path, fallback):
    if not path.exists():
        return fallback
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def text_blob(repo):
    parts = [
        repo.get("name", ""),
        repo.get("full_name", ""),
        repo.get("description") or "",
        " ".join(repo.get("topics") or [])
    ]
    return " ".join(parts).lower()


def is_blocked(repo):
    blob = text_blob(repo)
    return any(term.lower() in blob for term in BLOCKED_TERMS)


def query_github(query, per_page=30):
    params = {
        "q": f"{query} archived:false fork:false",
        "sort": "stars",
        "order": "desc",
        "per_page": str(per_page)
    }

    url = "https://api.github.com/search/repositories?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers=HEADERS)

    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp).get("items", [])


def keyword_overlap(career, repo):
    blob = text_blob(repo)
    score = 0

    for kw in career.get("keywords", []):
        k = str(kw).strip().lower()
        if k and k in blob:
            score += 2

    for skill in career.get("skills", []):
        s = str(skill).strip().lower()
        if s and s in blob:
            score += 1

    return score


def freshness_points(updated_at):
    if not updated_at:
        return 0

    try:
        dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
        age_days = max(0, (datetime.now(timezone.utc) - dt).days)
    except Exception:
        return 0

    if age_days <= 30:
        return 12
    if age_days <= 90:
        return 10
    if age_days <= 180:
        return 8
    if age_days <= 365:
        return 5
    if age_days <= 730:
        return 2
    return 0


def stars_points(stars):
    stars = max(0, int(stars or 0))
    if stars <= 0:
        return 0

    return min(35, round(math.log10(stars + 1) * 8))


def quality_points(repo):
    points = 0
    desc = (repo.get("description") or "").strip()
    topics = repo.get("topics") or []

    if desc:
        points += 5

    if repo.get("homepage"):
        points += 2

    if len(topics) >= 3:
        points += 3

    blob = text_blob(repo)

    if any(hint in blob for hint in SAFE_TOPIC_HINTS):
        points += 5

    return points


def dynamic_score(career, repo):
    score = 35
    score += min(25, keyword_overlap(career, repo) * 3)
    score += stars_points(repo.get("stargazers_count", 0))
    score += freshness_points(repo.get("updated_at"))
    score += quality_points(repo)

    return max(0, min(100, int(score)))


def make_candidate(career, repo):
    return {
        "name": repo.get("full_name") or repo.get("name") or "Unknown",
        "url": repo.get("html_url", ""),
        "description": repo.get("description") or "",
        "stars": repo.get("stargazers_count", 0),
        "updated_at": repo.get("updated_at", ""),
        "language": repo.get("language"),
        "topics": repo.get("topics") or [],
        "homepage": repo.get("homepage") or "",
        "source": "github_dynamic",
        "king_score": dynamic_score(career, repo)
    }


def build_query(career):
    queries = career.get("dynamic_queries") or []

    if queries:
        return queries[0]

    label = career.get("label", "")
    return f"{label} learning resources"


def main():
    data = load_json(RESOURCES, {"careers": []})
    careers = data.get("careers", [])

    result = {
        "version": "0.3.2",
        "generated_by": "github-actions",
        "updated_at": now_iso(),
        "policy": {
            "movies_excluded": True,
            "note": "自动筛选仅作技术过滤，不等同于正式法律审查。"
        },
        "careers": {}
    }

    for index, career in enumerate(careers):
        career_id = career.get("id")

        if not career_id:
            continue

        query = build_query(career)
        seen = set()
        candidates = []

        try:
            repos = query_github(query, per_page=30)
        except Exception as exc:
            result["careers"][career_id] = {
                "query": query,
                "error": str(exc),
                "candidates": []
            }
            continue

        for repo in repos:
            if repo.get("archived"):
                continue

            if repo.get("fork"):
                continue

            url = repo.get("html_url", "")

            if not url or url in seen:
                continue

            if is_blocked(repo):
                continue

            candidate = make_candidate(career, repo)

            if candidate["king_score"] < 55:
                continue

            seen.add(url)
            candidates.append(candidate)

        candidates.sort(
            key=lambda x: (x["king_score"], x["stars"]),
            reverse=True
        )

        result["careers"][career_id] = {
            "label": career.get("label", career_id),
            "query": query,
            "candidates": candidates[:20]
        }

        if index < len(careers) - 1:
            time.sleep(7)

    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    total = sum(
        len(v.get("candidates", []))
        for v in result["careers"].values()
        if isinstance(v, dict)
    )

    print(f"NAV KING dynamic pool updated: {total} candidates")


if __name__ == "__main__":
    main()
