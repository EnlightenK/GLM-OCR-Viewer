# GLM-OCR Viewer — User Guide

## Overview

The viewer is a local web application that lets you browse your OCR results side-by-side:
- **Left panel** — original PDF with interactive bounding-box highlights
- **Right panel** — Markdown and JSON tabs for the OCR output

It reads files you already processed with the `glmocr` CLI. No API key, no re-processing.

---

## Requirements

| Tool | Minimum version | Check |
|---|---|---|
| Python | 3.9 | `python3 --version` |
| uv | latest | `uv --version` |
| Node.js | 18 | `node --version` |
| npm | 8 | `npm --version` |

Install uv: https://docs.astral.sh/uv/getting-started/installation/

---

## First-Time Setup

You only need to run these install steps once.

### 1. Install Python dependencies

```bash
cd backend
uv sync
```

Expected output ends with something like:
```
Resolved 10 packages in ...ms
Installed 10 packages in ...ms
```

### 2. Install Node dependencies

```bash
cd frontend
npm install
```

Expected output ends with something like:
```
added 312 packages in 30s
```

---

## Starting the App

You need **two terminals** running at the same time — one for the backend, one for the frontend.

### Terminal 1 — Backend

```bash
cd backend
uv run uvicorn main:app --reload --port 8010
```

You should see:
```
INFO:     Started server process [...]
INFO:     Uvicorn running on http://0.0.0.0:8010 (Press CTRL+C to quit)
```

> The `--reload` flag restarts the server automatically when you edit backend code.  
> Remove it in production to avoid the overhead.

### Terminal 2 — Frontend

```bash
cd frontend
npm run dev
```

You should see:
```
  VITE v7.x.x  ready in ...ms

  ➜  Local:   http://localhost:3007/
  ➜  Network: http://0.0.0.0:3007/
```

### Open the app

Go to **http://localhost:3007** in your browser.

---

## Using the Viewer

### Step 1 — Enter your directories

The sidebar on the left has two path fields.

**Output Dir** *(required)*  
The folder where `glmocr` wrote its results. The viewer looks for subfolders that each contain a `.json` and a `.md` file with the same name as the folder:

```
/your/output/dir/
├── document_a/
│   ├── document_a.json
│   ├── document_a.md
│   └── imgs/           ← image crops (if any)
├── document_b/
│   ├── document_b.json
│   └── document_b.md
└── ...
```

Example using the bundled samples:
```
/home/user/GLM-OCR/examples/result
```

**Input Dir** *(optional)*  
The folder containing your original PDF files. When provided, the PDF panel becomes active. The viewer searches this folder recursively for a file whose base name matches the document name.

```
/your/input/dir/
├── document_a.pdf
├── document_b.pdf
└── ...
```

### Step 2 — Click Load

Click the **Load** button (or press Enter in either path field).

The sidebar fills with the list of discovered documents. A toast at the top confirms how many were found.

> If you see "No processed documents found", double-check that your output folder contains subfolders with matching `.json` + `.md` pairs.

### Step 3 — Select a document

Click any document name in the list. A spinner appears while it loads.

- The **left panel** shows the PDF (if an Input Dir was provided and the PDF was found).  
  If the PDF is not found, only the right panel is populated.
- The **right panel** shows the OCR results.

### Step 4 — Explore the results

**Markdown tab (default)**

Each content block is rendered with full math (KaTeX), tables, code highlighting, and images. Blocks are interactively linked to the PDF:

| Action | Effect |
|---|---|
| Hover over a block | Yellow highlight appears on the PDF at the matching region |
| Click a block | Highlight is pinned; PDF scrolls to that region |
| Click on the PDF | Matching block in the Markdown panel is highlighted and scrolled into view |
| Click the Copy button | Block text is copied to clipboard |

**JSON tab**

Shows the raw structured output — useful for inspecting bounding boxes, labels, and page indices.

**Toolbar buttons (top-right of the right panel)**

| Button | Action |
|---|---|
| Copy icon | Copy the full Markdown text to clipboard |
| Download icon | Save the Markdown as a `.md` file |

**PDF toolbar (top of the left panel)**

| Control | Action |
|---|---|
| `< >` arrows | Previous / next page |
| Page number input | Jump to a specific page |
| `−` / `+` | Zoom out / in |
| Rotate-left icon | Reset zoom to fit |

### Step 5 — Switch documents

Click another document in the sidebar. The panels update immediately.

Use the **search box** that appears above the list to filter by name when you have many documents.

---

## Troubleshooting

### "Directory not found" error when clicking Load

The path you entered does not exist or is not accessible. Use an **absolute path** (starting with `/`), not a relative one.

```
# Wrong
output/results

# Correct
/home/user/my_project/output/results
```

### Documents appear in the list but the PDF panel is blank

Either:
- You left **Input Dir** empty — enter the folder containing your PDFs and click Load again.
- The PDF filename does not match the document folder name. The viewer looks for `{docname}.pdf` inside the input directory.

### Images in the Markdown panel are broken

Image crops are served through the backend. If the backend is not running on port 8010, images will fail to load. Make sure Terminal 1 (backend) is still running.

### Port already in use

If port 8010 or 3007 is taken by another process, start the servers on different ports:

```bash
# Backend on a different port
uvicorn main:app --reload --port 8020

# Frontend — edit vite.config.ts proxy target to match, then:
npm run dev -- --port 3008
```

### Backend "Module not found" error

You skipped the install step. Run:
```bash
cd backend
uv sync
```

### Frontend "Cannot find module" error

You skipped the install step. Run:
```bash
cd frontend
npm install
```

---

## Stopping the App

Press `Ctrl+C` in each terminal to stop the backend and frontend servers.

---

## Quick Reference

```
# Every time you want to use the viewer:

# Terminal 1
cd backend && uv run uvicorn main:app --reload --port 8010

# Terminal 2
cd frontend && npm run dev

# Browser
http://localhost:3007
```
