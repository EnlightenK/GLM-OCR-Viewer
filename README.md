# GLM-OCR Viewer

A standalone side-by-side viewer for [GLM-OCR](https://github.com/zai-org/GLM-OCR) CLI output — PDF on the left, Markdown/JSON on the right, with interactive bounding-box highlighting that syncs between both panels.

> This viewer is a companion tool for [zai-org/GLM-OCR](https://github.com/zai-org/GLM-OCR).  
> For the full OCR pipeline (model, CLI, self-hosting), see the main repo.

---

## Features

- Side-by-side PDF and Markdown/JSON panels
- Click any text block → jumps to the corresponding region on the PDF
- Click any region on the PDF → jumps to the corresponding block in the Markdown
- Full math rendering (KaTeX), tables, code blocks, and inline images
- Supports multi-page PDFs with zoom and page navigation
- Reads directly from disk — no API key, no re-processing

---

## Requirements

| Tool | Minimum version |
|------|----------------|
| Python | 3.9+ |
| [uv](https://docs.astral.sh/uv/) | latest |
| Node.js | 18+ |

---

## Setup

### 1. Backend

```bash
cd backend
uv sync
```

### 2. Frontend

```bash
cd frontend
npm install
```

---

## Running

You need two terminals.

**Terminal 1 — Backend (port 8010)**

```bash
cd backend
uv run uvicorn main:app --reload --port 8010
```

**Terminal 2 — Frontend (port 3007)**

```bash
cd frontend
npm run dev
```

Then open **http://localhost:3007** in your browser.

---

## Usage

1. Enter the **Output Dir** — where `glmocr` wrote its results.  
   Expected layout:
   ```
   output_dir/
   ├── document_a/
   │   ├── document_a.json
   │   ├── document_a.md
   │   └── imgs/
   └── ...
   ```
2. (Optional) Enter the **Input Dir** — folder containing the original PDFs. Enables the PDF panel.
3. Click **Load** → the sidebar fills with discovered documents.
4. Click a document to view it.

See [GUIDE.md](GUIDE.md) for full usage instructions and troubleshooting.

---

## Generating input files

This viewer reads output produced by the `glmocr` CLI from [zai-org/GLM-OCR](https://github.com/zai-org/GLM-OCR).

```bash
# Example: process a folder of PDFs
glmocr --input ./pdfs --output ./output
```

Refer to the [main repo](https://github.com/zai-org/GLM-OCR) for installation and usage of the OCR pipeline.

---

## Stack

- **Backend**: FastAPI + Uvicorn (Python)
- **Frontend**: React 19, Vite, Tailwind CSS, react-pdf, KaTeX
