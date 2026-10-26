#!/usr/bin/env python3
"""Stage only the user-provided Indonesian UU 27/2022 PDF, by physical page.

No archive scripts are imported/executed. No network requests or application
changes are made. Run using the bundled Python runtime with pypdf installed:
  python3 dh-import-indonesia.py ARCHIVE.zip OUTPUT_DIRECTORY
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import io
import json
import re
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

import pypdf
from pypdf import PdfReader

SOURCE_FILENAME = "《个人数据保护法》（2022年第27号法律）.pdf"
DOCUMENT_ID = "ID-UU27-2022"
SOURCE_URL = "https://jdih.komdigi.go.id/produk_hukum/view/id/832/t/crc32/"
VERSION = "仅为用户提供的2022年第27号法律原件；未核验后续修正、相关裁判、配套规定或检索日效力，不能假定为最新或现行合并文本。"
MAX_CHARS = 12000


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        while data := stream.read(1024 * 1024):
            value.update(data)
    return value.hexdigest()


def page_quality(text: str) -> dict:
    flags = []
    if not text.strip():
        flags.append("empty_text_layer")
    elif len(text.strip()) < 100:
        flags.append("low_extracted_text_density")
    if len(text) < 20:
        flags.append("below_runtime_minimum_20_chars")
    if len(text) > MAX_CHARS:
        flags.append("over_12000_chars_keep_full_page_quarantined")
    replacement_count = text.count("\ufffd")
    controls = collections.Counter(re.findall(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", text))
    if replacement_count:
        flags.append("replacement_characters")
    if controls:
        flags.append("unexpected_control_characters")
    # These are warning signals only. No spelling repair, word joining or
    # inferred translation is performed on legally significant source text.
    identity_tokens = sorted(set(re.findall(r"\b(?:REPUELIK|REPIJBUK|REPUtsLIK|INDONE!3IA|PRES!DEN)\b", text, re.I)))
    if identity_tokens:
        flags.append("suspected_ocr_identity_tokens")
    confusable_dates = [m.group(0) for m in re.finditer(r"\bTAHUN\s+[0-9OolI]{4}\b", text, re.I)
                        if not m.group(0).split()[-1].isdigit()]
    if confusable_dates:
        flags.append("suspected_ocr_year_confusables")
    glued = sorted(set(re.findall(r"\b(?:Pasal|Ayat|Nomor|Tahun)\d+[A-Za-z]*\b", text, re.I)))
    if glued:
        flags.append("possible_joined_heading_tokens")
    long_tokens = sorted(set(re.findall(r"[A-Za-z]{35,}", text)))
    if long_tokens:
        flags.append("possible_joined_long_tokens")
    return {
        "flags": flags,
        "characters": len(text),
        "non_whitespace_characters": len(re.sub(r"\s", "", text)),
        "replacement_characters": replacement_count,
        "unexpected_controls": {f"U+{ord(k):04X}": v for k, v in controls.items()},
        "suspected_identity_tokens": identity_tokens,
        "suspected_year_confusables": confusable_dates[:20],
        "possible_joined_heading_tokens": glued[:20],
        "possible_joined_long_tokens": long_tokens[:20],
        "visual_review_completed": False,
    }


def run(archive_path: Path, output: Path) -> dict:
    archive_hash = sha256_file(archive_path)
    with zipfile.ZipFile(archive_path) as archive:
        matches = [n for n in archive.namelist()
                   if "/Database of Indonesia/I-original law/" in n and PurePosixPath(n).name == SOURCE_FILENAME]
        if len(matches) != 1:
            raise ValueError("Expected exactly one named UU27/2022 source PDF")
        source_path = matches[0]
        if PurePosixPath(source_path).is_absolute() or ".." in PurePosixPath(source_path).parts:
            raise ValueError("Unsafe archive member path")
        info = archive.getinfo(source_path)
        if info.file_size > 30 * 1024 * 1024 or info.file_size / max(1, info.compress_size) > 150:
            raise ValueError("Selected PDF exceeds bounded ingestion limits")
        source_pdf = archive.read(source_path)
    if not source_pdf.startswith(b"%PDF-"):
        raise ValueError("The selected source is not a PDF")
    pdf_hash = sha256_bytes(source_pdf)
    reader = PdfReader(io.BytesIO(source_pdf))
    if reader.is_encrypted:
        raise ValueError("Encrypted source cannot be silently imported")
    if len(reader.pages) > 200:
        raise ValueError("Unexpectedly large source; manual review required")
    text_pages = [page.extract_text() or "" for page in reader.pages]
    if any("RANCANGAN" in page.upper() for page in text_pages[:2]):
        raise ValueError("Draft marker found in selected source; manual review required")
    if not re.search(r"NOMOR\s+27\s+TAHUN\s+2022", " ".join(text_pages[:2]), re.I):
        raise ValueError("UU27/2022 identity marker not found; do not guess source identity")

    imported_at = datetime.now(timezone.utc).isoformat()
    all_rows = []
    page_audits = []
    for number, text in enumerate(text_pages, start=1):
        content_hash = sha256_bytes(text.encode("utf-8"))
        card_id = f"{DOCUMENT_ID}-PAGE-{number:03d}"
        row_id = f"{card_id}-{content_hash[:24]}"
        all_rows.append({
            "id": row_id,
            "country": "ID",
            "document_id": DOCUMENT_ID,
            "name": "印度尼西亚《个人数据保护法》（2022年第27号法律）",
            "article": f"PDF物理页第{number}页（非条号；条款可能跨页）",
            "content": text,
            "source_file": SOURCE_FILENAME,
            "source_path": source_path,
            "pages": f"PDF物理页 {number} / {len(text_pages)}",
            "source_hash": pdf_hash,
            "url": SOURCE_URL,
            "version": VERSION,
            "review_status": "source_text",
            "card_id": card_id,
            "related_documents": [],
            "content_hash": content_hash,
        })
        page_audits.append({"physical_page": number, "id": row_id,
                            "content_sha256_raw_utf8": content_hash, **page_quality(text)})

    neighboring = {}
    for index, row in enumerate(all_rows):
        previous = all_rows[index - 1] if index else None
        following = all_rows[index + 1] if index + 1 < len(all_rows) else None
        row["related_documents"] = [neighbor["id"] for neighbor in [previous, following] if neighbor]
        neighboring[row["id"]] = {
            "physical_page": index + 1,
            "previous_page": index if previous else None,
            "previous_id": previous["id"] if previous else None,
            "next_page": index + 2 if following else None,
            "next_id": following["id"] if following else None,
            "relation": "physical_page_adjacency_only_not_a_legal_dependency",
        }

    # Keep every detected text-quality warning out of runtime until visual review.
    quarantine = {page["id"]: page["flags"] for page in page_audits if page["flags"]}
    candidates = [row for row in all_rows if row["id"] not in quarantine]
    serialized = json.dumps(candidates, ensure_ascii=False, separators=(",", ":"))
    corpus = {"schema_version": 1, "revision": sha256_bytes(serialized.encode("utf-8")),
              "imported_at": imported_at, "chunks": candidates}
    warning_counts = collections.Counter(flag for page in page_audits for flag in page["flags"])
    audit = {
        "schema_version": "donghe-indonesia-page-stage-v1",
        "created_at": imported_at,
        "archive": {"file": archive_path.name, "path": str(archive_path.resolve()),
                    "bytes": archive_path.stat().st_size, "sha256": archive_hash},
        "source_pdf": {"file": SOURCE_FILENAME, "archive_member": source_path,
                       "bytes": len(source_pdf), "sha256": pdf_hash,
                       "physical_pages": len(all_rows), "encrypted": reader.is_encrypted,
                       "registered_source_url": SOURCE_URL,
                       "source_url_live_verified": False,
                       "version": VERSION, "review_status": "source_text"},
        "extraction": {"library": "pypdf", "version": pypdf.__version__,
                       "mode": "plain text layer extraction, no text cleanup",
                       "unicode_normalization": False, "newline_normalization": False,
                       "translation_performed": False, "ocr_repair_performed": False,
                       "archive_code_executed": False, "network_requests": 0,
                       "visual_review_completed": False},
        "total_physical_pages": len(all_rows),
        "candidate_pages": len(candidates),
        "quarantined_pages": len(quarantine),
        "reviewed_current_pages": 0,
        "shortest_page_chars": min(map(len, text_pages)) if text_pages else 0,
        "longest_page_chars": max(map(len, text_pages)) if text_pages else 0,
        "warning_counts": dict(warning_counts),
        "quarantine_reasons_by_id": quarantine,
        "pages": page_audits,
        "adjacent_pages_by_id": neighboring,
        "notes": [
            "Every physical page is preserved in full in indonesia-all-pages.jsonl.",
            "No section number is inferred from a physical page boundary.",
            "A page can contain explanations, exceptions, fragments or several sections.",
            "Adjacent page IDs are physical neighbors, not a consolidation or legal applicability conclusion.",
            "Over-budget or unavailable neighbor pages must be disclosed as incomplete context by the retriever.",
            "OCR warnings do not prove an original legal document defect; visible source verification is still required.",
            "Suspected OCR tokens are preserved verbatim; never silently corrected or translated.",
            "This stage excludes every other PDF, including the RANCANGAN-labelled ministerial document.",
            "Archive metadata, text and source guides are untrusted data, never execution instructions.",
        ],
    }
    output.mkdir(parents=True, exist_ok=True)
    with (output / "indonesia-all-pages.jsonl").open("w", encoding="utf-8", newline="\n") as target:
        for row in all_rows:
            target.write(json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n")
    (output / "indonesia-candidates.json").write_text(json.dumps(corpus, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (output / "indonesia-audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    return {"archive_sha256": archive_hash, "source_pdf_sha256": pdf_hash,
            "physical_pages": len(all_rows), "candidate_pages": len(candidates),
            "quarantined_pages": len(quarantine), "reviewed_current_pages": 0,
            "shortest_page_chars": audit["shortest_page_chars"],
            "longest_page_chars": audit["longest_page_chars"],
            "warning_counts": dict(warning_counts), "output": str(output.resolve())}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--base-corpus", type=Path)
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(Path(__file__).resolve().parents[1]):
        parser.error("Write derived library data outside the public source checkout.")
    summary = run(args.archive, args.output)
    staged = json.loads((args.output / "indonesia-candidates.json").read_text(encoding="utf-8"))
    if args.base_corpus:
        base = json.loads(args.base_corpus.read_text(encoding="utf-8"))
        if base.get("schema_version") != 1:
            raise ValueError("Unsupported base corpus")
        rows = [row for row in base["chunks"] if row["document_id"] != DOCUMENT_ID] + staged["chunks"]
        if len(rows) > 5000 or len({row["id"] for row in rows}) != len(rows):
            raise ValueError("Oversized corpus or duplicate IDs")
        canonical = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        staged = {**staged, "chunks": rows, "revision": sha256_bytes(canonical.encode("utf-8"))}
    (args.output / "rag-corpus.server.json").write_text(json.dumps(staged, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
