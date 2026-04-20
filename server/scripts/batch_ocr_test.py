"""Run the full canonical-identifier pipeline against a folder of receipt images.

Usage (from server/):
    python scripts/batch_ocr_test.py ../../images

Prints per-image results and writes server/tests/fixtures/ocr_results.json
with the raw GCV text, cleaned lines, and resolved canonicals for each image.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path

# Allow running from server/
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent.parent / ".env")


async def run(images_dir: Path):
    from app.services.canonical_identifier.ocr import extract_lines
    from app.services.canonical_identifier.clean import clean_line
    from app.services.canonical_identifier.expand import expand
    from app.services.canonical_identifier.match import build_canonical_map, to_canonical
    from app.services.canonical_identifier.abbreviations import load_abbreviations
    from app.services.ingredient_loader import get_mealdb_ingredients

    mealdb = await get_mealdb_ingredients()
    cmap = build_canonical_map(mealdb)
    table = load_abbreviations()

    results = {}
    image_paths = sorted(images_dir.glob("*.jpg")) + sorted(images_dir.glob("*.JPG"))

    for img_path in image_paths:
        print(f"\n{'='*60}")
        print(f"  {img_path.name}")
        print('='*60)

        try:
            raw_text, lines = extract_lines(img_path.read_bytes())
        except Exception as e:
            print(f"  OCR ERROR: {e}")
            results[img_path.name] = {"error": str(e)}
            continue

        print(f"  Raw lines ({len(lines)}): {lines[:5]}{'...' if len(lines)>5 else ''}")

        resolved = []
        unresolved_lines = []
        seen = set()

        for raw_line in lines:
            cleaned = clean_line(raw_line)
            if cleaned is None:
                continue
            exp = expand(cleaned, table)
            m = to_canonical(exp, cmap)
            if m and m.name.lower() not in seen:
                seen.add(m.name.lower())
                resolved.append({"name": m.name, "kind": m.kind, "source": raw_line})
            elif not m:
                unresolved_lines.append({"raw": raw_line, "cleaned": cleaned, "expanded": exp})

        print(f"  Resolved ({len(resolved)}): {[r['name'] for r in resolved]}")
        print(f"  Unresolved ({len(unresolved_lines)}): {[u['cleaned'] for u in unresolved_lines[:8]]}")

        results[img_path.name] = {
            "raw_text": raw_text,
            "resolved": resolved,
            "unresolved": unresolved_lines,
        }

    out_path = Path(__file__).resolve().parent.parent / "tests" / "fixtures" / "ocr_results.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"\n\nWrote results to {out_path}")

    # Summary table
    print(f"\n{'IMAGE':<12} {'RESOLVED':>9} {'UNRESOLVED':>11}")
    print("-" * 35)
    for name, data in sorted(results.items()):
        if "error" in data:
            print(f"{name:<12} {'ERROR':>9}")
        else:
            print(f"{name:<12} {len(data['resolved']):>9} {len(data['unresolved']):>11}")


if __name__ == "__main__":
    images_dir = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("../../images")
    asyncio.run(run(images_dir))
