#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
slide-study — 簡報／錄音／錄影深度研究 pipeline（單檔 CLI）。

Copyright (c) 2026 @Miles

子命令：
  doctor            檢查依賴（ffmpeg/ffprobe/poppler/uv/ASR/notebooklm）
  create <folder>   自動判斷來源情境 → 離線單檔 HTML 研究報告（＋逐字稿／NotebookLM）

純 stdlib；OpenCC 繁化以 `uv run --with opencc` 子行程處理。
中間素材一律走系統暫存，結束即清除；只有交付成果寫進 <folder>/成果/。
ASR 使用 mlx-whisper，需 macOS + Apple Silicon。
"""
import argparse, base64, json, os, re, subprocess, sys, glob, html, shutil, time, hashlib, tempfile
from datetime import datetime
from pathlib import Path
from types import SimpleNamespace

AUDIO_EXT = (".m4a", ".mp3", ".mp4", ".wav", ".m4v", ".mov", ".aac", ".flac")
VIDEO_EXT = (".mp4", ".m4v", ".mov")
DEFAULT_ASR_MODEL = "mlx-community/whisper-large-v3-mlx"
CREATE_OUTPUTS = {"html", "transcript", "notebooklm"}
CREATE_SCENARIOS = {"auto", "presentation", "meeting", "screencast", "reference"}
NOTEBOOKLM_PRESETS = {
    "summary": "audio,mind-map,briefing",
    "learning": "audio,mind-map,quiz,flashcards,study-guide",
    "presentation": "slide-deck,briefing",
    "all": "audio,slide-deck,mind-map,quiz,flashcards,briefing,study-guide",
}

# ---------- helpers ----------
def sh(cmd, **kw):
    return subprocess.run(cmd, text=True, capture_output=True, **kw)

def find_one(folder, exts):
    for f in sorted(Path(folder).iterdir()):
        if f.suffix.lower() in exts:
            return f
    return None

def find_pdf(folder):
    return find_one(folder, (".pdf",))

def hms(sec):
    sec = int(sec); return f"{sec//3600:02d}:{(sec%3600)//60:02d}:{sec%60:02d}"

def info(msg): print(f"[slide-study] {msg}", flush=True)
def die(msg, code=1): print(f"[slide-study][ERROR] {msg}", file=sys.stderr); sys.exit(code)

# ============================================================ doctor
def cmd_doctor(a):
    # pdfinfo 必檢：缺了 _pdf_slide_score 會靜默把簡報 PDF 誤判成參考附件並丟棄
    need = {"ffmpeg":"brew install ffmpeg", "ffprobe":"brew install ffmpeg",
            "pdftoppm":"brew install poppler", "pdftotext":"brew install poppler",
            "pdfinfo":"brew install poppler",
            "uv":"curl -LsSf https://astral.sh/uv/install.sh | sh"}
    ok = True
    for tool, hintc in need.items():
        p = shutil.which(tool)
        print(f"  [{'OK' if p else '--'}] {tool:10} {p or '缺，裝：'+hintc}")
        ok = ok and bool(p)
    # ASR
    asr = shutil.which("mlx_whisper")
    print(f"  [{'OK' if asr else '--'}] mlx_whisper  {asr or '缺（Apple Silicon 建議）：uv tool install mlx-whisper；或改用 faster-whisper'}")
    nb = shutil.which("notebooklm")
    nb_hint = nb or '缺（要 NotebookLM 才需）：uv tool install "notebooklm-py[browser]"'
    print(f"  [{'OK' if nb else '--'}] notebooklm   {nb_hint}")
    # opencc via uv
    r = sh(["uv","run","--with","opencc","python","-c","import opencc;print('ok')"])
    print(f"  [{'OK' if r.returncode==0 else '--'}] opencc(uv)   {'可用' if r.returncode==0 else r.stderr.strip()[:80]}")
    print("doctor:", "OK" if ok else "有缺項，請先補齊")
    sys.exit(0 if ok else 1)

# ============================================================ ASR helpers
# 預設第一遍就帶 anti-loop 旗標：避免 whisper 重複迴圈，也避免低信心 fallback 螺旋導致變慢卡住。
ANTILOOP = ["--condition-on-previous-text","False",
            "--compression-ratio-threshold","2.4","--logprob-threshold","-1.0",
            "--hallucination-silence-threshold","2.0"]

def _detect_loop(segments):
    """回傳 (loop_found, cut_seconds)。找最長的連續相同文字 run。"""
    best_len, best_start = 1, None
    i = 0
    while i < len(segments):
        j = i
        while j+1 < len(segments) and segments[j+1]["text"].strip()==segments[i]["text"].strip():
            j += 1
        run = j - i + 1
        if run > best_len:
            best_len, best_start = run, segments[i]["start"]
        i = j + 1
    if best_len >= 8 and best_start is not None:
        return True, max(0.0, best_start - 60.0)
    return False, None

def _run_whisper(audio, outdir, model, extra=None):
    outdir = Path(outdir); outdir.mkdir(parents=True, exist_ok=True)
    cmd = ["mlx_whisper", str(audio), "--model", model, "--language", "zh",
           "--output-format","json","--output-dir",str(outdir),"--verbose","False"]
    if extra: cmd += extra
    r = subprocess.run(cmd)
    js = list(outdir.glob("*.json"))
    if r.returncode or not js: die("mlx_whisper 失敗（檢查模型/音檔）")
    return json.load(open(js[0]))

# ============================================================ render helpers
def _esc(t): return html.escape(str(t), quote=True)
# ============================================================ create (simplified public workflow)
def _resolve_arg_path(folder, value, exts, label):
    if not value:
        return None
    p = Path(value)
    if not p.is_absolute():
        p = Path(folder) / p
    p = p.resolve()
    if not p.is_file() or p.suffix.lower() not in exts:
        die(f"{label}不存在或格式不支援：{p}")
    return p

def _source_files(folder, exts):
    return sorted(
        p.resolve() for p in Path(folder).iterdir()
        if p.is_file() and not p.name.startswith(".") and p.suffix.lower() in exts
    )

def _media_kind(path):
    if path is None:
        return None
    r = sh(["ffprobe", "-v", "error", "-select_streams", "v:0",
            "-show_entries", "stream=codec_type", "-of", "csv=p=0", str(path)])
    if r.returncode != 0:
        # 不能靜默當成 audio：錄影被誤判成錄音會讓 screencast 情境整個失效
        die(f"ffprobe 無法讀取媒體檔 {path.name}：{r.stderr.strip()[:200]}")
    return "video" if "video" in r.stdout else "audio"

def _media_duration(path):
    if path is None:
        return 0.0
    r = sh(["ffprobe", "-v", "error", "-show_entries", "format=duration",
            "-of", "default=noprint_wrappers=1:nokey=1", str(path)])
    try:
        return float(r.stdout.strip())
    except Exception:
        # 時長只影響時間標記，不阻斷流程；但要講出來，不要靜默回 0
        info(f"ffprobe 取不到 {path.name} 的時長，時間標記會以平均值估算。")
        return 0.0

def _pdf_slide_score(pdf):
    r = sh(["pdfinfo", str(pdf)])
    pages = 1
    width = height = 0.0
    if r.returncode == 0:
        m = re.search(r"^Pages:\s+(\d+)", r.stdout, re.M)
        if m:
            pages = max(1, int(m.group(1)))
        m = re.search(r"^Page size:\s+([\d.]+)\s+x\s+([\d.]+)", r.stdout, re.M)
        if m:
            width, height = float(m.group(1)), float(m.group(2))
    t = sh(["pdftotext", "-layout", str(pdf), "-"])
    chars_per_page = len(re.sub(r"\s+", "", t.stdout)) / pages if t.returncode == 0 else 0
    lines_per_page = len([x for x in t.stdout.splitlines() if x.strip()]) / pages if t.returncode == 0 else 0
    score = 0.0
    ratio = width / height if height else 0
    if ratio >= 1.15:
        score += 0.45
    elif ratio >= 0.9:
        score += 0.2
    if chars_per_page <= 900:
        score += 0.3
    elif chars_per_page <= 1800:
        score += 0.15
    if lines_per_page <= 25:
        score += 0.15
    if pages >= 3:
        score += 0.1
    name = pdf.stem.lower()
    if any(x in name for x in ("slide", "deck", "presentation", "簡報", "投影片")):
        score += 0.1
    if any(x in name for x in ("mail", "email", "letter", "minutes", "信件", "會議紀錄")):
        score -= 0.3
    return max(0.0, min(1.0, score)), {
        "pages": pages,
        "aspect_ratio": round(ratio, 2),
        "chars_per_page": round(chars_per_page),
        "lines_per_page": round(lines_per_page),
    }

def _video_scene_count(video, threshold):
    vf = f"select=gt(scene\\,{threshold}),showinfo"
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-loglevel", "info", "-i", str(video),
         "-vf", vf, "-an", "-f", "null", "-"],
        text=True, capture_output=True
    )
    return len(re.findall(r"showinfo.*pts_time:", r.stderr))

def _candidate_error(kind, paths, flag):
    names = "\n".join(f"  - {p.name}" for p in paths)
    die(f"找到多個{kind}，不會自動猜測：\n{names}\n請用 {flag} 明確指定。", 2)

def _resolve_create_sources(a):
    folder = Path(a.folder).resolve()
    if not folder.is_dir():
        die(f"資料夾不存在：{folder}")
    pdfs = _source_files(folder, (".pdf",))
    media_files = _source_files(folder, AUDIO_EXT)
    pdf = _resolve_arg_path(folder, a.pdf, (".pdf",), "PDF") if a.pdf else None
    media = _resolve_arg_path(folder, a.media, AUDIO_EXT, "媒體檔") if a.media else None
    references = [_resolve_arg_path(folder, x, (".pdf",), "參考附件") for x in (a.reference or [])]
    if pdf is None:
        if len(pdfs) > 1:
            _candidate_error(" PDF", pdfs, "--pdf <檔名>")
        pdf = pdfs[0] if pdfs else None
    if media is None:
        if len(media_files) > 1:
            _candidate_error("媒體檔", media_files, "--media <檔名>")
        media = media_files[0] if media_files else None
    kind = _media_kind(media)
    scenario = a.scenario
    detection = []
    if scenario == "auto":
        if pdf and media:
            score, meta = _pdf_slide_score(pdf)
            detection.append(f"PDF slide confidence={score:.2f} ({meta})")
            if score >= 0.65:
                scenario = "presentation"
            elif score <= 0.35:
                scenario = "reference"
                if pdf not in references:
                    references.append(pdf)
                pdf = None
            else:
                die(
                    f"無法安全判定 {pdf.name} 是簡報或參考附件（confidence={score:.2f}）。"
                    "\n請改用 --scenario presentation 或 --scenario reference。", 2
                )
        elif pdf:
            scenario = "presentation"
        elif media and kind == "audio":
            scenario = "meeting"
        elif media and kind == "video":
            scenes = _video_scene_count(media, a.frame_threshold)
            detection.append(f"video scene changes={scenes}")
            scenario = "screencast" if 2 <= scenes <= a.max_frames else "meeting"
        else:
            die("資料夾中找不到支援的 PDF、錄音或錄影檔。")
    if scenario == "presentation":
        if not pdf:
            die("簡報研究需要 PDF；只有螢幕錄影請改用 --scenario screencast。")
    elif scenario == "meeting":
        if not media:
            die("會議整理需要錄音或錄影檔。")
        if pdf and pdf not in references:
            references.append(pdf)
        pdf = None
    elif scenario == "screencast":
        if not media or kind != "video":
            die("錄影重建需要含畫面的錄影檔。")
        if pdf and pdf not in references:
            references.append(pdf)
        pdf = None
    elif scenario == "reference":
        if not media:
            die("附件輔助情境需要錄音或錄影檔。")
        if pdf and pdf not in references:
            references.append(pdf)
        pdf = None
    return {
        "folder": folder,
        "scenario": scenario,
        "pdf": pdf,
        "media": media,
        "media_kind": kind,
        "references": references,
        "detection": detection,
    }

def _extract_pdf_for_create(pdf, temp_dir, dpi, maxw):
    slides = Path(temp_dir) / "slides"
    slides.mkdir(parents=True, exist_ok=True)
    r = sh(["pdftoppm", "-png", "-r", str(dpi), str(pdf), str(slides / "slide")])
    if r.returncode:
        die("pdftoppm 失敗：" + r.stderr[:300])
    for f in list(slides.glob("slide-*.png")):
        m = re.search(r"slide-0*(\d+)\.png$", f.name)
        if m:
            target = slides / f"slide-{int(m.group(1)):02d}.png"
            if f != target:
                f.rename(target)
    images = sorted(slides.glob("slide-*.png"))
    if not images:
        die("PDF 未產生任何頁面圖片。")
    if shutil.which("sips"):
        for image in images:
            sh(["sips", "-Z", str(maxw), str(image)])
    texts = []
    for i in range(1, len(images) + 1):
        r = sh(["pdftotext", "-f", str(i), "-l", str(i), str(pdf), "-"])
        texts.append(r.stdout.strip() if r.returncode == 0 else "")
    return images, texts, [None] * len(images)

def _extract_screencast_for_create(video, temp_dir, threshold, min_gap, max_frames):
    slides = Path(temp_dir) / "slides"
    slides.mkdir(parents=True, exist_ok=True)
    vf = (
        "select=isnan(prev_selected_t)+"
        f"gte(t-prev_selected_t\\,{min_gap})*gt(scene\\,{threshold}),showinfo"
    )
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", "-i", str(video), "-vf", vf,
         "-vsync", "vfr", str(slides / "slide-%03d.png")],
        text=True, capture_output=True
    )
    if r.returncode:
        die("錄影截幀失敗：" + r.stderr[-500:])
    images = sorted(slides.glob("slide-*.png"))
    timestamps = [float(x) for x in re.findall(r"showinfo.*pts_time:([\d.]+)", r.stderr)]
    if not images:
        fallback = slides / "slide-001.png"
        pos = min(5.0, max(0.0, _media_duration(video) / 10))
        r = sh(["ffmpeg", "-y", "-ss", str(pos), "-i", str(video), "-frames:v", "1", str(fallback)])
        if r.returncode or not fallback.exists():
            die("錄影沒有可用畫面。")
        images, timestamps = [fallback], [pos]
    if len(images) > max_frames:
        die(
            f"錄影產生 {len(images)} 張候選畫面，超過上限 {max_frames}。"
            "\n請提高 --frame-threshold 或改用 --scenario meeting。", 2
        )
    normalized = []
    for i, image in enumerate(images, 1):
        target = slides / f"slide-{i:02d}.png"
        if image != target:
            image.rename(target)
        normalized.append(target)
    if len(timestamps) < len(normalized):
        duration = _media_duration(video)
        timestamps = [duration * i / max(1, len(normalized)) for i in range(len(normalized))]
    return normalized, [""] * len(normalized), timestamps[:len(normalized)]

def _convert_zh_hant(texts):
    if not texts or not shutil.which("uv"):
        return texts
    marker = "\n<<<SLIDE_STUDY_SEPARATOR>>>\n"
    code = (
        "from opencc import OpenCC;import sys;"
        "sys.stdout.write(OpenCC('s2twp').convert(sys.stdin.read()))"
    )
    r = sh(["uv", "run", "--with", "opencc", "python", "-c", code], input=marker.join(texts))
    if r.returncode != 0:
        info("OpenCC 暫時不可用，保留 ASR 原文。")
        return texts
    converted = r.stdout.split(marker)
    return converted if len(converted) == len(texts) else texts

def _paragraphize_segments(segments):
    cleaned = []
    for s in segments:
        text = str(s.get("text", "")).strip()
        if not text:
            continue
        start, end = float(s.get("start", 0)), float(s.get("end", 0))
        if cleaned and cleaned[-1]["text"] == text:
            cleaned[-1]["end"] = end
        else:
            cleaned.append({"start": start, "end": end, "text": text})
    paras, current = [], None
    for item in cleaned:
        if current is None:
            current = dict(item)
            continue
        if item["end"] - current["start"] > 45 or item["start"] - current["end"] > 2.5:
            paras.append(current)
            current = dict(item)
        else:
            current["text"] += item["text"]
            current["end"] = item["end"]
    if current:
        paras.append(current)
    converted = _convert_zh_hant([p["text"] for p in paras])
    for p, text in zip(paras, converted):
        p["text"] = text
    return paras

def _transcribe_for_create(media, temp_dir, model):
    if not shutil.which("mlx_whisper"):
        die("缺 mlx_whisper：請先執行 uv tool install mlx-whisper。")
    first = _run_whisper(media, Path(temp_dir) / "asr", model, extra=ANTILOOP)
    segments = first.get("segments", [])
    loop, cut = _detect_loop(segments)
    if loop:
        info(f"偵測到重複迴圈，從 {hms(cut)} 切尾重轉。")
        wav = Path(temp_dir) / "tail.wav"
        r = sh(["ffmpeg", "-y", "-ss", str(int(cut)), "-i", str(media),
                "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", str(wav)])
        if r.returncode:
            die("切分 ASR 音軌失敗：" + r.stderr[-300:])
        tail = _run_whisper(wav, Path(temp_dir) / "asr-tail", model, extra=ANTILOOP)
        merged = [s for s in segments if float(s.get("start", 0)) < cut]
        for s in tail.get("segments", []):
            merged.append({
                "start": float(s.get("start", 0)) + cut,
                "end": float(s.get("end", 0)) + cut,
                "text": s.get("text", ""),
            })
        segments = sorted(merged, key=lambda x: float(x.get("start", 0)))
    return _paragraphize_segments(segments)

def _transcript_markdown(title, paragraphs):
    total = paragraphs[-1]["end"] if paragraphs else 0
    lines = [
        f"# {title} — 逐字稿",
        "",
        f"> 錄音長度約 {hms(total)}，共 {len(paragraphs)} 段。",
        "> 自動語音辨識結果；專有名詞請對照原始資料確認。",
        "",
        "---",
    ]
    for p in paragraphs:
        lines += ["", f"**[{hms(p['start'])}]** {p['text']}"]
    return "\n".join(lines) + "\n"

def _compact(text, limit=900):
    text = re.sub(r"\s+", " ", text or "").strip()
    return text if len(text) <= limit else text[:limit].rstrip() + "…"

def _unit_title(text, fallback):
    lines = [re.sub(r"\s+", " ", x).strip() for x in (text or "").splitlines() if x.strip()]
    if not lines:
        return fallback
    return _compact(lines[0], 48)

def _ngrams(text, n=2):
    chars = re.sub(r"[\W_]+", "", (text or "").lower())
    return {chars[i:i+n] for i in range(max(0, len(chars)-n+1))}

def _align_paragraphs(text, paragraphs, index, total):
    if not paragraphs:
        return ""
    target = _ngrams(text)
    ranked = []
    if target:
        for p in paragraphs:
            grams = _ngrams(p["text"])
            if not grams:
                continue
            ranked.append((len(target & grams) / len(target | grams), p))
    chosen = [p for score, p in sorted(ranked, key=lambda x: x[0], reverse=True)[:2] if score >= 0.015]
    if not chosen:
        pos = min(len(paragraphs) - 1, int(index * len(paragraphs) / max(1, total)))
        chosen = [paragraphs[pos]]
    return _compact(" ".join(p["text"] for p in sorted(chosen, key=lambda p: p["start"])), 1000)

def _chapters_from_paragraphs(paragraphs):
    if not paragraphs:
        return [{
            "n": 1, "title": "未辨識到語音內容", "summary": "媒體中沒有可辨識的旁白。",
            "speaker": "", "start": 0, "end": 0, "image": None,
        }]
    buckets = []
    current = None
    for p in paragraphs:
        bucket = int(p["start"] // 300)
        if current is None or current["bucket"] != bucket:
            if current:
                buckets.append(current)
            current = {"bucket": bucket, "start": p["start"], "end": p["end"], "texts": [p["text"]]}
        else:
            current["end"] = p["end"]
            current["texts"].append(p["text"])
    if current:
        buckets.append(current)
    units = []
    for i, b in enumerate(buckets, 1):
        text = "".join(b["texts"])
        units.append({
            "n": i,
            "title": _compact(re.split(r"[。！？!?]", text)[0], 42) or f"章節 {i}",
            "summary": _compact(text, 1200),
            "speaker": _compact(text, 1200),
            "start": b["start"],
            "end": b["end"],
            "image": None,
        })
    return units

def _reference_text(references):
    blocks = []
    for pdf in references:
        r = sh(["pdftotext", "-layout", str(pdf), "-"])
        text = _compact(r.stdout, 2400) if r.returncode == 0 else ""
        blocks.append(f"{pdf.name}：{text or '無法抽取文字，請直接檢視附件。'}")
    return "\n\n".join(blocks)

def _image_data_uri(path):
    mime = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return f"data:{mime};base64," + base64.b64encode(path.read_bytes()).decode("ascii")

def _build_create_report(resolved, images, slide_texts, timestamps, paragraphs):
    scenario = resolved["scenario"]
    units = []
    if scenario == "presentation":
        for i, (image, text) in enumerate(zip(images, slide_texts), 1):
            units.append({
                "n": i,
                "title": _unit_title(text, f"投影片 {i}"),
                "summary": _compact(text, 1200) or "此頁為影像式投影片，文字內容請直接參考畫面。",
                "speaker": _align_paragraphs(text, paragraphs, i - 1, len(images)),
                "start": None,
                "end": None,
                "image": _image_data_uri(image),
            })
    elif scenario == "screencast":
        duration = _media_duration(resolved["media"])
        for i, image in enumerate(images, 1):
            start = timestamps[i-1] if i-1 < len(timestamps) else duration * (i-1) / len(images)
            end = timestamps[i] if i < len(timestamps) else duration
            related = [p["text"] for p in paragraphs if p["start"] < end and p["end"] >= start]
            speaker = _compact("".join(related), 1200)
            units.append({
                "n": i,
                "title": f"錄影重點畫面 {i}",
                "summary": speaker or f"此畫面出現在約 {hms(start)}，請搭配原始錄影判讀。",
                "speaker": speaker,
                "start": start,
                "end": end,
                "image": _image_data_uri(image),
            })
    else:
        units = _chapters_from_paragraphs(paragraphs)
    title = resolved["folder"].name
    labels = {
        "presentation": "逐頁簡報研究",
        "meeting": "會議章節研究",
        "screencast": "錄影畫面研究",
        "reference": "會議與附件綜合研究",
    }
    return {
        "title": title,
        "scenario": scenario,
        "scenario_label": labels[scenario],
        "lead": f"依 {labels[scenario]} 情境整理；自動產出內容需回看原始資料確認專有名詞與關鍵數字。",
        "units": units,
        "reference_text": _reference_text(resolved["references"]),
        "detection": resolved["detection"],
    }

CREATE_CSS = """
:root{color-scheme:light;--ink:#202124;--muted:#5f6368;--line:#d8dbe2;--paper:#f7f8fa;--panel:#fff;--accent:#6b4fd8;--green:#0b7a75;--soft:#e7f4ee;--shadow:0 16px 40px rgba(32,33,36,.08)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--paper);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif;line-height:1.72}
.hero{background:linear-gradient(135deg,#f4efff,#eef8f4 52%,#fff7e9);border-bottom:1px solid var(--line)}.hero-inner{max-width:1180px;margin:auto;padding:52px 24px 40px}
.eyebrow{color:var(--green);font-weight:750}.hero h1{margin:8px 0 14px;font-size:42px;line-height:1.2}.lead{max-width:900px;font-size:18px}.pill{display:inline-block;margin:6px 6px 0 0;padding:4px 11px;border:1px solid var(--line);border-radius:999px;background:#ffffffc7;font-size:13px}
.layout{display:grid;grid-template-columns:260px minmax(0,1fr);gap:26px;max-width:1260px;margin:auto;padding:28px 24px 64px}.toc{position:sticky;top:18px;align-self:start;max-height:calc(100vh - 36px);overflow:auto;padding:17px;border:1px solid var(--line);border-radius:9px;background:var(--panel);box-shadow:var(--shadow)}.toc h2{margin:0 0 10px;font-size:16px}.toc a{display:block;padding:7px 0;border-top:1px solid #edf0f3;color:#3b3f46;font-size:14px;text-decoration:none}.toc a:hover{color:var(--accent)}
.content{min-width:0}.overview,.unit{margin-bottom:28px;border:1px solid var(--line);border-radius:9px;background:var(--panel);box-shadow:var(--shadow);overflow:hidden}.overview{padding:26px}.overview h2{margin-top:0}.reference{white-space:pre-wrap;padding:14px;border-left:4px solid var(--accent);background:#f4f1ff;border-radius:6px}
.unit-head{display:flex;align-items:center;gap:12px;padding:18px 22px;border-bottom:1px solid var(--line);background:#fbfcfd}.num{color:var(--accent);font-weight:800}.unit-head h2{margin:0;font-size:22px}.time{margin-left:auto;color:var(--muted);font-size:13px}.unit-body{display:grid;grid-template-columns:minmax(280px,46%) minmax(0,1fr)}.unit-body.text-only{grid-template-columns:1fr}
figure{margin:0;padding:18px;background:#eef0f3;border-right:1px solid var(--line)}figure img{display:block;width:100%;height:auto;border:1px solid #ccd0d7;border-radius:6px}.notes{padding:22px}.notes h3{margin:18px 0 7px;font-size:16px}.notes h3:first-child{margin-top:0}.notes p{margin:0;white-space:pre-wrap}.speaker{margin-top:10px;padding:12px 14px;border-left:4px solid var(--green);background:var(--soft);border-radius:6px}.muted{color:var(--muted)}
@media(max-width:960px){.layout{grid-template-columns:1fr}.toc{position:static;max-height:none}}@media(max-width:760px){.hero h1{font-size:32px}.unit-body{grid-template-columns:1fr}figure{border-right:0;border-bottom:1px solid var(--line)}}"""

def _render_create_html(report):
    toc = ['<a href="#overview">總覽</a>']
    sections = []
    for unit in report["units"]:
        n = int(unit["n"])
        toc.append(f'<a href="#unit-{n:02d}">{n:02d} {_esc(unit["title"])}</a>')
        timing = ""
        if unit.get("start") is not None:
            timing = f'<span class="time">{hms(unit["start"])}–{hms(unit.get("end", unit["start"]))}</span>'
        image = ""
        cls = "unit-body text-only"
        if unit.get("image"):
            cls = "unit-body"
            image = f'<figure><img src="{unit["image"]}" alt="第 {n} 個內容畫面"></figure>'
        speaker = (
            f'<div class="speaker">{_esc(unit["speaker"])}</div>'
            if unit.get("speaker")
            else '<p class="muted">沒有可用的旁白內容；此段依畫面或附件補充。</p>'
        )
        sections.append(
            f'<section id="unit-{n:02d}" class="unit">'
            f'<div class="unit-head"><span class="num">{n:02d}</span><h2>{_esc(unit["title"])}</h2>{timing}</div>'
            f'<div class="{cls}">{image}<div class="notes"><h3>內容摘要</h3><p>{_esc(unit["summary"])}</p>'
            f'<h3>講者內容</h3>{speaker}</div></div></section>'
        )
    ref = ""
    if report.get("reference_text"):
        ref = f'<h3>附件補充</h3><div class="reference">{_esc(report["reference_text"])}</div>'
    notes = "".join(f'<span class="pill">{_esc(x)}</span>' for x in report.get("detection", []))
    return f"""<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{_esc(report['title'])}｜研究報告</title><style>{CREATE_CSS}</style></head><body>
<header class="hero"><div class="hero-inner"><p class="eyebrow">{_esc(report['scenario_label'])}</p><h1>{_esc(report['title'])}</h1><p class="lead">{_esc(report['lead'])}</p><div>{notes}</div></div></header>
<main class="layout"><aside class="toc"><h2>目錄</h2>{''.join(toc)}</aside><div class="content">
<section id="overview" class="overview"><h2>研究總覽</h2><p>{_esc(report['lead'])}</p>{ref}</section>
{''.join(sections)}</div></main></body></html>"""

def _render_create_markdown(report):
    lines = [f"# {report['title']} — 研究報告", "", report["lead"], ""]
    if report.get("reference_text"):
        lines += ["## 附件補充", "", report["reference_text"], ""]
    for unit in report["units"]:
        lines += [
            f"## {int(unit['n']):02d} {unit['title']}",
            "",
            unit["summary"],
            "",
            "**講者內容**",
            "",
            unit.get("speaker") or "沒有可用的旁白內容。",
            "",
        ]
    return "\n".join(lines)

def _safe_name(name):
    return re.sub(r'[\\/:*?"<>|]+', "_", name).strip() or "slide-study"

def _unique_path(path):
    if not path.exists():
        return path
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    candidate = path.with_name(f"{path.stem}_{stamp}{path.suffix}")
    index = 2
    while candidate.exists():
        candidate = path.with_name(f"{path.stem}_{stamp}_{index}{path.suffix}")
        index += 1
    return candidate

def _publish_file(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    target = _unique_path(target)
    partial = target.with_name(target.name + ".partial")
    shutil.copy2(source, partial)
    os.replace(partial, target)
    return target

def _notebooklm_artifacts(a):
    if a.notebooklm_preset == "custom":
        arts = [x.strip() for x in (a.notebooklm_artifacts or "").split(",") if x.strip()]
        if not arts:
            die("--notebooklm-preset custom 必須搭配 --notebooklm-artifacts。")
        unknown = [x for x in arts if x not in ART]
        if unknown:
            die("未知 NotebookLM 產物：" + ", ".join(unknown))
        return ",".join(arts)
    return NOTEBOOKLM_PRESETS[a.notebooklm_preset]

def _publish_notebooklm(stage_outputs, output_dir):
    target = output_dir / "notebooklm"
    if target.exists():
        stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        target = output_dir / f"notebooklm_{stamp}"
        index = 2
        while target.exists():
            target = output_dir / f"notebooklm_{stamp}_{index}"
            index += 1
    target.mkdir(parents=True, exist_ok=False)
    rename = {
        "audio_overview.mp3": "podcast.mp3",
        "briefing_doc.md": "briefing.md",
    }
    published = []
    for source in sorted(stage_outputs.iterdir()):
        if not source.is_file() or source.name == "mind_map.json":
            continue
        dest = target / rename.get(source.name, source.name)
        shutil.copy2(source, dest)
        published.append(dest)
    if not published:
        shutil.rmtree(target)
        die("NotebookLM 沒有產生可交付檔案。")
    return published

def cmd_create(a):
    requested = [x.strip().lower() for x in a.outputs.split(",") if x.strip()]
    unknown = sorted(set(requested) - CREATE_OUTPUTS)
    if unknown:
        die("未知輸出：" + ", ".join(unknown))
    if "html" not in requested:
        die("--outputs 必須包含 html。")
    resolved = _resolve_create_sources(a)
    folder = resolved["folder"]
    output_dir = Path(a.output_dir) if a.output_dir else folder / "成果"
    if not output_dir.is_absolute():
        output_dir = folder / output_dir
    output_dir = output_dir.resolve()
    title = _safe_name(folder.name)
    published = []
    info(f"情境：{resolved['scenario']}；輸出：{','.join(requested)}")
    with tempfile.TemporaryDirectory(prefix="slide-study-") as temp:
        temp_path = Path(temp)
        images, slide_texts, timestamps = [], [], []
        if resolved["scenario"] == "presentation":
            images, slide_texts, timestamps = _extract_pdf_for_create(
                resolved["pdf"], temp_path, a.dpi, a.maxw
            )
        elif resolved["scenario"] == "screencast":
            images, slide_texts, timestamps = _extract_screencast_for_create(
                resolved["media"], temp_path, a.frame_threshold, a.min_frame_gap, a.max_frames
            )
        paragraphs = []
        if resolved["media"]:
            info(f"轉錄：{resolved['media'].name}")
            paragraphs = _transcribe_for_create(resolved["media"], temp_path, a.asr_model)
        report = _build_create_report(resolved, images, slide_texts, timestamps, paragraphs)
        html_text = _render_create_html(report)
        if "<!doctype html>" not in html_text.lower() or 'src="assets/' in html_text:
            die("HTML 驗證失敗：不是有效單檔報告。")
        html_stage = temp_path / f"{title}_研究報告.html"
        html_stage.write_text(html_text, encoding="utf-8")
        published.append(_publish_file(html_stage, output_dir / html_stage.name))
        transcript_text = _transcript_markdown(title, paragraphs) if paragraphs else ""
        if "transcript" in requested:
            if resolved["media"]:
                transcript_stage = temp_path / f"{title}_逐字稿.md"
                transcript_stage.write_text(transcript_text, encoding="utf-8")
                published.append(_publish_file(transcript_stage, output_dir / transcript_stage.name))
            else:
                info("無旁白來源，已略過 transcript。")
        if "notebooklm" in requested:
            nb_source = temp_path / "notebooklm-source"
            nb_source.mkdir()
            nb_name = title  # 用主題名，不要用暫存目錄名（否則 notebook 與檔名都叫 notebooklm-source）
            (nb_source / f"{nb_name}_簡報詳細說明.md").write_text(
                _render_create_markdown(report), encoding="utf-8"
            )
            if transcript_text:
                (nb_source / f"{nb_name}_逐字稿.md").write_text(transcript_text, encoding="utf-8")
            source_pdf = resolved["pdf"] or (resolved["references"][0] if resolved["references"] else None)
            if source_pdf:
                shutil.copy2(source_pdf, nb_source / source_pdf.name)
            artifacts = _notebooklm_artifacts(a)
            cmd_notebooklm(SimpleNamespace(
                folder=str(nb_source),
                name=title,
                lang_code="zh_Hant",
                artifacts=artifacts,
                focus=a.focus,
            ))
            published += _publish_notebooklm(nb_source / "notebooklm" / "outputs", output_dir)
    info("完成，僅保留交付成果：")
    for path in published:
        print(path)

# ============================================================ notebooklm
ART = {  # name: (gen subcmd, gen flags use lang?, has --wait/--retry, download spec)
    "audio":      dict(sub="audio",      lang=True,  wait=True,  extra=["--format","deep-dive","--length","long"], dl=("audio","audio_overview.mp3",None)),
    "slide-deck": dict(sub="slide-deck", lang=True,  wait=True,  extra=[], dl=("slide-deck","slide_deck.pdf",None)),
    "mind-map":   dict(sub="mind-map",   lang=False, wait=False, extra=[], dl=("mind-map","mind_map.json",None)),
    "quiz":       dict(sub="quiz",       lang=False, wait=True,  extra=[], dl=("quiz","quiz.md",["--format","markdown"])),
    "flashcards": dict(sub="flashcards", lang=False, wait=True,  extra=[], dl=("flashcards","flashcards.md",["--format","markdown"])),
    "briefing":   dict(sub="report",     lang=True,  wait=True,  extra=["--format","briefing-doc"], dl=("report","briefing_doc.md","REPORT")),
    "study-guide":dict(sub="report",     lang=True,  wait=True,  extra=["--format","study-guide"], dl=("report","study_guide.md","REPORT")),
}

def _nb(args_list):
    return subprocess.run(["notebooklm"]+args_list)

def cmd_notebooklm(a):
    if not shutil.which("notebooklm"): die('缺 notebooklm：uv tool install "notebooklm-py[browser]"')
    # auth
    r = sh(["notebooklm","auth","check","--test","--json"])
    okauth = r.returncode==0 and '"token_fetch": true' in r.stdout.lower()
    if not okauth:
        die("NotebookLM 未登入或登入過期。請依 SKILL.md 的『NotebookLM 登入』步驟登入後再跑此命令。")
    folder=a.folder; name=getattr(a,"name","") or Path(folder).name
    out=Path(folder)/"notebooklm"/"outputs"; out.mkdir(parents=True,exist_ok=True)
    lang=a.lang_code
    arts=[x.strip() for x in a.artifacts.split(",") if x.strip()]
    desc=a.focus or f"深入剖析這場演講「{name}」的核心論點。請全程繁體中文。"
    # create + use
    info("建立 notebook…")
    r=sh(["notebooklm","create",name,"--json"])
    try: nbid=json.loads(r.stdout)["notebook"]["id"]
    except Exception: die("建立 notebook 失敗："+r.stdout[:200]+r.stderr[:200])
    NB=["-n",nbid]  # 一律顯式指定 notebook：notebooklm 的全域 current 在 generate/download 不可靠，會誤打到別的 notebook
    _nb(["use",nbid])
    # upload sources
    pdf=find_pdf(folder); tr=Path(folder)/f"{name}_逐字稿.md"; dd=Path(folder)/f"{name}_簡報詳細說明.md"
    if pdf: info(f"上傳 PDF…"); _nb(["source","add",str(pdf),"--type","file","--mime-type","application/pdf"]+NB)
    if tr.exists(): info("上傳逐字稿…"); _nb(["source","add",str(tr)]+NB)
    if dd.exists(): info("上傳逐頁說明…"); _nb(["source","add",str(dd)]+NB)
    # wait sources ready
    for _ in range(30):
        s=sh(["notebooklm","source","list"]+NB).stdout
        if "processing" not in s and "preparing" not in s: break
        time.sleep(10)
    # generate + poll-download
    saved_report_hashes=set()  # report 標題由 NotebookLM 自創，不能靠標題比對；改用內容雜湊去重、依生成順序指派
    POLL=45  # 每次 20s，最多 15 分鐘（audio deep-dive/報告較慢）
    for art in arts:
        spec=ART.get(art)
        if not spec: info(f"略過未知產物：{art}"); continue
        info(f"生成 {art}（no-wait）…")
        gen=["generate",spec["sub"]]
        # mind-map 的 generate 簽名只有 [OPTIONS]、不吃 [DESCRIPTION]；多傳 desc 會讓 generate 報錯失敗
        if spec["sub"] in ("audio","slide-deck","quiz","flashcards"): gen+=[desc]
        gen+=spec["extra"]
        if spec["lang"]: gen+=["--language",lang]
        if spec["sub"]=="report": gen+=["--append",desc]
        if spec["wait"]: gen+=["--no-wait"]
        sh(["notebooklm"]+gen+NB)
        dtype,fname,mode=spec["dl"]
        ok=False
        for _ in range(POLL):
            if mode=="REPORT":
                # 清空暫存避免 --all 每輪累積一堆編號重複檔；挑「最新且內容尚未存過」的報告
                tmp=Path(folder)/"_work"/"reports_all"; shutil.rmtree(tmp,ignore_errors=True); tmp.mkdir(parents=True,exist_ok=True)
                sh(["notebooklm","download","report","--all",str(tmp)]+NB)
                for f in sorted(tmp.glob("*.md"), key=lambda f:f.stat().st_mtime, reverse=True):
                    h=hashlib.md5(f.read_bytes()).hexdigest()
                    if h not in saved_report_hashes:
                        shutil.copy(f, out/fname); saved_report_hashes.add(h); ok=True; break
                if ok: break
            else:
                dlcmd=["notebooklm","download",dtype]
                if mode: dlcmd+=mode
                dlcmd+=[str(out/fname)]+NB
                if sh(dlcmd).returncode==0 and (out/fname).exists(): ok=True; break
            time.sleep(20)
        info(("OK " if ok else "TIMEOUT ")+f"{art} → {fname if ok else '(稍後再 download)'}")
        if art=="mind-map" and (out/"mind_map.json").exists():
            try:
                d=json.load(open(out/"mind_map.json")); ol=["# 心智圖："+d.get("name","")+"\n"]
                def w(n,dep):
                    for ch in n.get("children",[]): ol.append("  "*dep+"- "+ch["name"]); w(ch,dep+1)
                w(d,0); (out/"mind_map.md").write_text("\n".join(ol)+"\n")
            except Exception: pass
    info(f"NotebookLM 完成 → {out}")

# ============================================================ main
def main():
    ap=argparse.ArgumentParser(prog="slide-study", description="簡報深度研究 pipeline")
    sub=ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("doctor").set_defaults(fn=cmd_doctor)
    pc=sub.add_parser("create", help="簡化入口：自動判斷來源並產出單檔 HTML／逐字稿／NotebookLM")
    pc.add_argument("folder")
    pc.add_argument("--scenario", choices=sorted(CREATE_SCENARIOS), default="auto")
    pc.add_argument("--outputs", default="html,transcript",
                    help="html,transcript,notebooklm 的逗號分隔組合；預設 html,transcript")
    pc.add_argument("--notebooklm-preset",
                    choices=["summary","learning","presentation","all","custom"],
                    default="summary")
    pc.add_argument("--notebooklm-artifacts", default="",
                    help="preset=custom 時指定 audio,slide-deck,mind-map,quiz,flashcards,briefing,study-guide")
    pc.add_argument("--focus", default="")
    pc.add_argument("--output-dir", default="")
    source=pc.add_argument_group("來源衝突時才需指定")
    source.add_argument("--pdf", default="")
    source.add_argument("--media", default="")
    source.add_argument("--reference", action="append", default=[])
    advanced=pc.add_argument_group("進階技術參數")
    advanced.add_argument("--dpi", type=int, default=150)
    advanced.add_argument("--maxw", type=int, default=1800)
    advanced.add_argument("--asr-model", default=DEFAULT_ASR_MODEL)
    advanced.add_argument("--frame-threshold", type=float, default=0.12)
    advanced.add_argument("--min-frame-gap", type=float, default=5.0)
    advanced.add_argument("--max-frames", type=int, default=120)
    pc.set_defaults(fn=cmd_create)
    a=ap.parse_args(); a.fn(a)

if __name__=="__main__":
    main()
