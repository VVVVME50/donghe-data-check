#!/usr/bin/env python3
"""Offline ZIP ingestion; never imports or executes archive code.

Usage: python3 scripts/import-rag.py ARCHIVE.zip PRIVATE_OUTPUT_DIRECTORY
Card content is source/version reference text, never professionally reviewed law.
source_hash is the registered/original PDF SHA256; content SHA256 (raw UTF-8)
is used in id and is recorded separately in audit.json.
"""
from __future__ import annotations

import argparse
import collections
import hashlib
import json
import re
import unicodedata
import zipfile
from pathlib import Path, PurePosixPath

ROOT = "Database（MPST）/"
PREFIXES = {
    "MY": ROOT + "Database of Malaysia/法规库/",
    "PH": ROOT + "Database of Philippines/法规库/知识卡片_2026-10-24/知识卡片/",
    "SG": ROOT + "Database of Singapore/法规库/法律卡片/",
    "TH": ROOT + "Database of Thailand/法规库/卡片-优化2.0/",
}
COUNTRY_DIRS = {code: ROOT + "Database of " + country + "/" for code, country in
                [("MY", "Malaysia"), ("PH", "Philippines"), ("SG", "Singapore"), ("TH", "Thailand")]}
FIELDS = {"id", "country", "document_id", "name", "article", "content", "source_file",
          "source_path", "pages", "source_hash", "url", "version", "review_status",
          "card_id", "related_documents"}
RUNTIME_PATTERNS = {
    "MY": re.compile(r"ACT(?:500|562|563|588|658|709|854|866)_"),
    "PH": re.compile(r"(?:RA10173|RA8792|RA11967|RA10175|RA4200|RA12010|RA8484|RA11934|RA9995)_"),
    "SG": re.compile(r"(?:PDPA2012|PDPCR|PDPNDBR|PDPR2021|SCA2007|ETA2010)_"),
    "TH": re.compile(r"^(?:个人数据保护法|电子交易安全方法|电子交易法|直销和直销市场法|网络安全法|计算机犯罪法|数字平台服务|数字身份|预防和打击技术犯罪)"),
}
FENCE = re.compile(r"^```[^\r\n]*\r?\n(.*?)^```[ \t]*\r?$", re.M | re.S)
CARD_START = re.compile(r"^###\s*卡片标题[：:]", re.M)
URL = re.compile(r"https?://[^\s<>\]）]+")
SHA = re.compile(r"^[0-9a-f]{64}$", re.I)


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def clean_label(value: str | None) -> str | None:
    if value is None:
        return None
    return value.strip().strip("` ").replace("**", "").strip() or None


def find_line(pattern: str, text: str) -> str | None:
    match = re.search(pattern, text, re.M)
    return clean_label(match.group(1)) if match else None


def normal_title(value: str) -> str:
    """Title identity only; this is never applied to source content."""
    match = re.search(r"《([^》]+)》", value)
    if match:
        value = match.group(1)
    value = re.split(r"[（(]", value)[0]
    return re.sub(r"[^\w\u4e00-\u9fff]+", "", value).lower()


def first_url(value: str) -> str | None:
    match = URL.search(value)
    if not match:
        return None
    # Markdown closing ')' is not part of a URL. Literal balanced URL parentheses
    # are retained when possible; the archive is not fetched or trusted here.
    url = match.group(0).rstrip("；。，")
    while url.endswith(")") and url.count(")") > url.count("("):
        url = url[:-1]
    return url or None


def page_range(value: str | list | None) -> list[int]:
    if isinstance(value, list):
        return [int(x) for x in value if isinstance(x, int) and x > 0]
    if not value:
        return []
    match = re.search(r"PDF(?:物理)?(?:第|页|\s)*\s*(\d+)(?:\s*[—–-]\s*(\d+))?", value)
    if not match:
        return []
    return [int(match.group(1)), int(match.group(2) or match.group(1))]


class Archive:
    def __init__(self, path: Path):
        self.zip = zipfile.ZipFile(path)
        self.names = [i.filename for i in self.zip.infolist() if not i.is_dir()]
        for name in self.names:
            p = PurePosixPath(name)
            if p.is_absolute() or ".." in p.parts:
                raise ValueError("Archive contains an unsafe member path")
        self.hashes: dict[str, str] = {}

    def text(self, member: str) -> str:
        # Decode directly, without universal-newline conversion or text cleanup.
        return self.zip.read(member).decode("utf-8")

    def json(self, member: str):
        return json.loads(self.text(member))

    def original_path(self, country: str, filename: str | None) -> str | None:
        if not filename:
            return None
        matches = [n for n in self.names if n.startswith(COUNTRY_DIRS[country])
                   and n.endswith(".pdf") and PurePosixPath(n).name == filename]
        return matches[0] if len(matches) == 1 else None

    def file_hash(self, member: str) -> str:
        if member not in self.hashes:
            value = hashlib.sha256()
            with self.zip.open(member) as stream:
                while chunk := stream.read(1024 * 1024):
                    value.update(chunk)
            self.hashes[member] = value.hexdigest()
        return self.hashes[member]


def canonical_files(archive: Archive, country: str) -> list[str]:
    prefix = PREFIXES[country]
    files = []
    for name in archive.names:
        if not name.startswith(prefix) or not name.endswith(".md"):
            continue
        relative = name[len(prefix):]
        if "/" in relative:
            continue
        if country in {"MY", "SG"} and not relative.startswith("知识卡片_"):
            continue
        files.append(name)
    return sorted(files)


def load_metadata(archive: Archive) -> dict:
    meta = {}
    my = PREFIXES["MY"]
    meta["my_versions"] = archive.json(my + "输入文件版本登记.json")
    my_audit = archive.json(my + "来源与拆分检查.json")
    meta["my_quotes"] = {row["card"]: row for row in my_audit["quote_checks"]}
    ph_path = ROOT + "Database of Philippines/法规库/知识卡片_2026-10-24/工作底稿_不导入知识库/制卡审计.json"
    ph = archive.json(ph_path)
    meta["ph_cards"] = {row["id"]: row for row in ph["cards"]}
    meta["ph_inventory"] = {row["source_id"]: row for row in ph["inventory"]}
    meta["ph_stats"] = ph["stats"]
    meta["sg_urls"] = {}
    sg_manifest = ROOT + "Database of Singapore/S-original law/新加坡法规文件清单.md"
    for line in archive.text(sg_manifest).splitlines():
        if line.startswith("|") and "http" in line:
            columns = [c.strip() for c in line.strip("|").split("|")]
            if len(columns) >= 4:
                meta["sg_urls"][re.sub(r"\W", "", columns[1]).lower()] = first_url(columns[3])
    meta["th_sources"] = collections.defaultdict(list)
    th_work = ROOT + "Database of Thailand/法规库/拆卡准备_2026-10-24/提取工作底稿_不导入知识库/"
    for name in archive.names:
        if name.startswith(th_work) and name.endswith(".json") and not name.endswith("/PDF清点.json"):
            data = archive.json(name)
            if isinstance(data, dict) and isinstance(data.get("pages"), list) and "file" in data:
                meta["th_sources"][normal_title(data["file"])].append(data)
    meta["th_urls"] = {}
    th_manifest = ROOT + "Database of Thailand/T-original law/东合智检_泰国法规库.md"
    for line in archive.text(th_manifest).splitlines():
        if line.startswith("|") and "http" in line:
            columns = [c.strip() for c in line.strip("|").split("|")]
            if len(columns) >= 5:
                meta["th_urls"][normal_title(columns[2])] = first_url(columns[4])
    return meta


def source_register(header: str) -> dict[str, dict]:
    result = {}
    for line in header.splitlines():
        columns = [x.strip() for x in line.strip("|").split("|")]
        if len(columns) >= 4 and re.fullmatch(r"MY-SRC-\d+", columns[0]) and SHA.fullmatch(columns[3]):
            result[columns[0]] = {"file": columns[1], "sha256": columns[3], "pdf_pages": columns[2]}
    return result


def get_body(country: str, block: str) -> str:
    fences = FENCE.findall(block)
    if country == "PH":
        # Common opening language and the actual subclause are separate fences.
        newline = "\r\n" if "\r\n" in block else "\n"
        return newline.join(fences)
    if country in {"MY", "SG"}:
        # Later MY fences are automatically extracted condition/exception fields,
        # not additional original source paragraphs.
        return fences[0] if fences else ""
    match = re.search(r"^-\s*\*\*原文内容\*\*[^\r\n]*[:：][ \t]*\r?\n(.*?)"
                      r"(?=^-\s*\*\*原文内容（中译）|^-\s*\*\*适用条件|\Z)", block, re.M | re.S)
    return match.group(1) if match else ""


TH_ALIASES = {
    "数字平台服务通知义务皇家法令": "须履行通知义务的数字平台服务业务皇家法令",
    "数字身份识别与认证服务监管皇家法令": "须获许可的数字身份识别与认证服务业务监管皇家法令",
}


def make_record(archive: Archive, meta: dict, country: str, member: str,
                header: str, block: str) -> tuple[dict, list[str]]:
    filename = PurePosixPath(member).name
    title = block.splitlines()[0].strip()
    body = get_body(country, block)
    flags: list[str] = []
    name = find_line(r"^#\s+(.+)$", header) or filename[:-3]
    source_file = None
    registered_hash = None
    url = None
    version = None
    pages: list[int] = []
    related: list[str] = []

    if country == "MY":
        card_id = find_line(r"^-\s*卡片编码[：:]\s*(.+)$", block) or title
        article = find_line(r"^-\s*法律名称与规则归属[：:]\s*([^；\r\n]+)", block) or title
        document_id = "MY-" + (re.search(r"MY_(ACT\d+)_", filename).group(1))
        register = source_register(header)
        quote = meta["my_quotes"].get(card_id, {})
        source_id = quote.get("source") or find_line(r"^-\s*来源编号[：:]\s*(MY-SRC-\d+)", block)
        source = register.get(source_id, {})
        source_file = source.get("file") or find_line(r"^-\s*来源文件[：:]\s*(.+)$", block)
        registered_hash = source.get("sha256")
        pages = page_range(quote.get("pages"))
        version = meta["my_versions"].get(source_id, {}).get("version")
        related = [source for source in register if source != source_id]
        url = first_url(header)
        review_status = "source_text"
        if not quote:
            flags.append("my_quote_audit_missing")
        elif quote.get("exact_substring") is not True:
            flags.append("my_quote_not_exact_substring")
    elif country == "PH":
        card_id = find_line(r"^-\s*卡片ID[：:]\s*(.+)$", block) or title.split("｜")[0]
        entry = meta["ph_cards"].get(card_id, {})
        document_id = "PH-" + str(entry.get("group") or re.search(r"PH_(RA\d+|ACT\d+|CA\d+)_", filename, re.I).group(1))
        article = find_line(r"^-\s*条文定位[：:]\s*(.+)$", block) or title
        source_id = find_line(r"^-\s*原文出处[：:]\s*`([^`]+)`", block)
        if not source_id and entry.get("source"):
            source_id = "SRC-PH-" + entry["source"]
        source = meta["ph_inventory"].get(source_id, {})
        source_file = source.get("file")
        registered_hash = source.get("sha256")
        pages = page_range(entry.get("source_pages"))
        version = find_line(r"^-\s*版本与适用限制[：:]\s*(.+)$", block)
        related_line = find_line(r"^\*\*关联卡片／合读来源\*\*[：:]\s*(.+)$", block) or ""
        related = list(dict.fromkeys(re.findall(r"\b(?:RA|CA|Act)\s?\d+\b", related_line)))
        url = source.get("html") or None
        if not url and entry.get("source") == entry.get("group"):
            url = first_url(header)
        review_status = "version_reference"
        if entry.get("bucket") != "参考":
            flags.append("ph_not_reference_bucket")
    elif country == "SG":
        document_id = "SG-" + re.search(r"知识卡片_([^_]+)_", filename).group(1)
        card_id = title
        article = find_line(r"^\*\*法律依据\*\*[：:]\s*(.+)$", block) or title
        source_file = find_line(r"^\*\*源文件\*\*[：:]\s*(.+)$", header)
        full_name = find_line(r"^\*\*法规全称\*\*[：:]\s*(.+)$", header) or ""
        url = meta["sg_urls"].get(re.sub(r"\W", "", full_name).lower())
        version = find_line(r"^\*\*(?:版本|版本说明)\*\*[：:]\s*(.+)$", header)
        review_status = "source_text"
    else:
        document_id = "TH-" + digest(filename)[:16]
        article = find_line(r"^-\s*\*\*法律依据\*\*[：:]\s*(.+)$", block) or title
        card_id = title
        normalized = normal_title(filename[:-3])
        source_key = TH_ALIASES.get(normalized, normalized)
        candidates = meta["th_sources"].get(source_key, [])
        if len(candidates) == 1:
            source = candidates[0]
            source_file = source["file"]
            registered_hash = source.get("sha256")
            # Determine only literal exact substring page matches. No guessed page.
            significant = body.strip()
            matches = [row["page"] for row in source["pages"]
                       if significant and significant in row.get("text", "")]
            if len(matches) == 1:
                pages = [matches[0], matches[0]]
        else:
            flags.append("th_source_mapping_missing_or_ambiguous")
        url = meta["th_urls"].get(source_key) or meta["th_urls"].get(normalized)
        review_status = "source_text"
        thai = len(re.findall(r"[\u0e00-\u0e7f]", body))
        latin = len(re.findall(r"[a-zA-Z]", body))
        han = len(re.findall(r"[\u4e00-\u9fff]", body))
        if "（泰文" in block and latin / max(1, thai + latin + han) > 0.7:
            flags.append("th_declared_thai_but_latin_dominant")
        tags = find_line(r"^-\s*\*\*业务场景标签\*\*[：:]\s*(.+)$", block) or ""
        if "数、据、保、护" in tags or re.search(r"(?:[\u4e00-\u9fff]、){5,}", tags):
            flags.append("th_character_split_tags")
        if "（待译）" in body:
            flags.append("th_translation_placeholder_in_original")

    original_path = archive.original_path(country, source_file)
    if original_path:
        actual_hash = archive.file_hash(original_path)
        if registered_hash and registered_hash.lower() != actual_hash:
            flags.append("source_pdf_hash_mismatch")
        source_hash = registered_hash or actual_hash
    else:
        source_hash = registered_hash
        flags.append("source_pdf_path_unresolved")
    if not body.strip():
        flags.append("empty_original_content")
    if "\ufffd" in body or re.search(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", body):
        flags.append("invalid_or_control_characters_in_original")
    if country == "SG":
        numbered_section = re.search(r"第(\d+)条", article)
        if numbered_section and re.search(r"\b" + numbered_section.group(1) + r"[A-Z]{1,3}\.(?:—|\s*\()", body):
            # Upstream splitters swallowed lettered sections into the preceding
            # numbered section. Preserve full text in all; do not mis-cite it.
            flags.append("sg_mixed_section_numbering_requires_structural_split")
    if not pages:
        flags.append("page_locator_unavailable")
    if not url:
        flags.append("source_url_unavailable")
    text_hash = digest(body)
    stable_id = country + "-" + digest(document_id + "\0" + card_id)[:12] + "-" + text_hash[:24]
    record = {"id": stable_id, "country": country, "document_id": document_id,
              "name": name, "article": article, "content": body,
              "source_file": source_file, "source_path": original_path or member,
              "pages": pages, "source_hash": source_hash, "url": url, "version": version,
              "review_status": review_status, "card_id": card_id,
              "related_documents": related}
    assert set(record) == FIELDS
    return record, flags


def run(zip_path: Path, output: Path) -> dict:
    archive = Archive(zip_path)
    metadata = load_metadata(archive)
    output.mkdir(parents=True, exist_ok=True)
    all_records = []
    runtime = []
    flags_by_id = {}
    excluded = {}
    markdown_paths = {}
    document_counts = collections.Counter()
    seen_ids = collections.Counter()
    parse_errors = []
    for country in PREFIXES:
        for member in canonical_files(archive, country):
            text = archive.text(member)
            matches = list(CARD_START.finditer(text))
            header = text[:matches[0].start()] if matches else text
            document_counts[country] += 1
            for index, match in enumerate(matches):
                end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
                block = text[match.end():end]
                try:
                    record, flags = make_record(archive, metadata, country, member, header, block)
                except Exception as exc:
                    parse_errors.append({"country": country, "member": member,
                                         "card_title": block.splitlines()[0][:180], "error": str(exc)})
                    continue
                original_id = record["id"]
                seen_ids[original_id] += 1
                if seen_ids[original_id] > 1:
                    # Preserve the source occurrence in the full audit corpus;
                    # do not let identical repeated card identities rank twice.
                    record["id"] = original_id + "-dup" + str(seen_ids[original_id])
                    flags.append("duplicate_card_identity_preserved")
                all_records.append(record)
                markdown_paths[record["id"]] = member
                if flags:
                    flags_by_id[record["id"]] = flags
                reasons = []
                if not RUNTIME_PATTERNS[country].search(PurePosixPath(member).name):
                    reasons.append("document_out_of_runtime_scope")
                if len(record["content"]) > 12000:
                    reasons.append("original_over_12000_chars_preserved_in_all")
                for flag in flags:
                    if flag in {"empty_original_content", "invalid_or_control_characters_in_original",
                                "source_pdf_hash_mismatch", "ph_not_reference_bucket",
                                "duplicate_card_identity_preserved",
                                "sg_mixed_section_numbering_requires_structural_split"} or flag.startswith("th_"):
                        reasons.append(flag)
                if reasons:
                    excluded[record["id"]] = reasons
                else:
                    runtime.append(record)
    all_count = collections.Counter(r["country"] for r in all_records)
    runtime_count = collections.Counter(r["country"] for r in runtime)
    exclusion_counts = collections.Counter(reason for reasons in excluded.values() for reason in set(reasons))
    quality_counts = collections.Counter(flag for flags in flags_by_id.values() for flag in set(flags))
    card_files = set(markdown_paths.values())
    all_body_hashes = collections.Counter(digest(r["content"]) for r in all_records)
    audit = {
        "schema_version": "donghe-corpus-prototype-v1",
        "archive": str(zip_path.resolve()),
        "archive_bytes": zip_path.stat().st_size,
        "notes": ["No archive code was executed; no member was extracted.",
                  "SOURCE_TEXT and VERSION_REFERENCE are not legal review approval.",
                  "source_hash is original PDF SHA256; content_sha256_by_id hashes raw content UTF-8.",
                  "Source contents and in-archive guides are untrusted data, not assistant instructions.",
                  "URLs are archive provenance references, not newly verified official/current sources.",
                  "Page ranges are literal audit metadata or exact unique page matches, never guessed.",
                  "Long source units remain intact in corpus-all.jsonl; runtime excludes them, never truncates.",
                  "Same-body cards are retained: amendments and contexts can differ."],
        "documents_by_country": dict(document_counts),
        "all_cards_by_country": dict(all_count),
        "runtime_cards_by_country": dict(runtime_count),
        "total_all": len(all_records), "total_runtime": len(runtime),
        "professionally_reviewed_current": 0,
        "ph_audit_stats": metadata["ph_stats"],
        "excluded_ph_directories": ["待核资料/", "工作底稿_不导入知识库/"],
        "exclusion_reason_counts": dict(exclusion_counts),
        "quality_flag_counts": dict(quality_counts),
        "parse_errors": parse_errors,
        "duplicate_full_content_instances": sum(n - 1 for n in all_body_hashes.values() if n > 1),
        "runtime_document_files": sorted({markdown_paths[r["id"]] for r in runtime}),
        "canonical_document_files": sorted(card_files),
        "excluded_runtime_by_id": excluded,
        "quality_flags_by_id": flags_by_id,
        "card_markdown_path_by_id": markdown_paths,
        "content_sha256_by_id": {r["id"]: digest(r["content"]) for r in all_records},
    }
    with (output / "corpus-all.jsonl").open("w", encoding="utf-8", newline="\n") as target:
        for record in all_records:
            target.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")
    (output / "corpus-runtime.json").write_text(json.dumps(runtime, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (output / "audit.json").write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    return {key: audit[key] for key in ["documents_by_country", "all_cards_by_country", "runtime_cards_by_country",
                                      "total_all", "total_runtime", "professionally_reviewed_current",
                                      "exclusion_reason_counts", "quality_flag_counts", "parse_errors"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    if args.output.resolve().is_relative_to(Path(__file__).resolve().parents[1]):
        parser.error("Write derived library data outside the public source checkout.")
    summary = run(args.archive, args.output)
    from datetime import datetime, timezone
    rows = json.loads((args.output / "corpus-runtime.json").read_text(encoding="utf-8"))
    for row in rows:
        for key in ["source_file", "source_path", "source_hash", "url", "version"]:
            row[key] = row[key] or ""
        pages = row["pages"]
        page_label = "原库页码（起算方式待核对） " if pages and pages[0] <= 0 else "PDF物理页 "
        row["pages"] = (page_label + (str(pages[0]) if pages[0] == pages[-1] else str(pages[0]) + "—" + str(pages[-1]))) if pages else ""
        row["content_hash"] = digest(row["content"])
        if not row["version"]:
            row["version"] = "用户提供的资料版本；未提取版本日期，现行效力待复核"
    canonical = json.dumps(rows, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
    corpus = {"schema_version": 1, "revision": hashlib.sha256(canonical.encode()).hexdigest(), "imported_at": datetime.now(timezone.utc).isoformat(), "chunks": rows}
    (args.output / "rag-corpus.server.json").write_text(json.dumps(corpus, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
