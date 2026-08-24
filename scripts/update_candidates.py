import json
from datetime import datetime, timezone
from pathlib import Path

OUTPUT = Path("dynamic-candidates.json")

# NAV KING V0.3.1
# GitHub 动态候选池基础更新器
#
# 当前阶段：
# 1. 保留已有候选资源
# 2. 统一数据结构
# 3. 更新时间戳
# 4. 为后续 GitHub Search API 自动发现资源预留接口
#
# 不调用任何付费 AI API。

def load_candidates():
    if not OUTPUT.exists():
        return {
            "version": "0.3.1",
            "updated_at": None,
            "candidates": []
        }

    with OUTPUT.open("r", encoding="utf-8") as f:
        return json.load(f)


def normalize(data):
    candidates = data.get("candidates", [])

    cleaned = []

    for item in candidates:
        if not isinstance(item, dict):
            continue

        name = str(item.get("name", "")).strip()
        url = str(item.get("url", "")).strip()

        if not name or not url:
            continue

        cleaned.append(item)

    data["version"] = "0.3.1"
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    data["candidates"] = cleaned

    return data


def save_candidates(data):
    with OUTPUT.open("w", encoding="utf-8") as f:
        json.dump(
            data,
            f,
            ensure_ascii=False,
            indent=2
        )


def main():
    data = load_candidates()
    data = normalize(data)
    save_candidates(data)

    print(
        f"NAV KING candidate pool updated: "
        f"{len(data['candidates'])} candidates"
    )


if __name__ == "__main__":
    main()
