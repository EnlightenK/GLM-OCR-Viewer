"""
GLM-OCR Viewer Backend
Serves pre-processed OCR results (CLI output) for the side-by-side viewer.
"""
import json
import re
from mimetypes import guess_type
from pathlib import Path
from urllib.parse import quote

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="GLM-OCR Viewer", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the built frontend if the dist folder exists
_dist = Path(__file__).parent.parent / "frontend" / "dist"
if _dist.is_dir():
    app.mount("/assets", StaticFiles(directory=_dist / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        # Let /api routes fall through (they're registered above)
        file = _dist / full_path
        if file.is_file():
            return FileResponse(file)
        return FileResponse(_dist / "index.html")

# Path prefix used in rewritten image URLs so the browser can fetch them
# via the Vite proxy (/api/v1/... → this server)
FILE_API = "/api/v1/file"


# ---------------------------------------------------------------------------
# File serving (used for PDFs and cropped images referenced in markdown)
# ---------------------------------------------------------------------------

@app.get("/api/v1/file")
async def serve_file(path: str = Query(..., description="Absolute path to the file")):
    """Serve any local file by absolute path (images, PDFs)."""
    fp = Path(path).resolve()
    if not fp.exists() or not fp.is_file():
        raise HTTPException(404, f"File not found: {path}")

    mime, _ = guess_type(fp.name)
    mime = mime or "application/octet-stream"

    encoded_name = quote(fp.name, safe="")
    return Response(
        content=fp.read_bytes(),
        media_type=mime,
        headers={"Content-Disposition": f"inline; filename*=UTF-8''{encoded_name}"},
    )


# ---------------------------------------------------------------------------
# Browse: list documents in an output directory
# ---------------------------------------------------------------------------

@app.get("/api/v1/browse/docs")
async def list_docs(output_dir: str = Query(..., description="Path to CLI output directory")):
    """
    Scan output_dir for subdirectories that contain both
    {name}.json and {name}.md (standard CLI output layout).
    """
    p = Path(output_dir).resolve()
    if not p.is_dir():
        raise HTTPException(404, f"Directory not found: {output_dir}")

    docs = []
    for subdir in sorted(p.iterdir()):
        if not subdir.is_dir():
            continue
        # Skip if no matching json/md pair (also skip _model.json-only dirs)
        json_file = subdir / f"{subdir.name}.json"
        md_file = subdir / f"{subdir.name}.md"
        if json_file.exists() and md_file.exists():
            docs.append({"name": subdir.name, "path": str(subdir)})

    return {"success": True, "data": docs}


# ---------------------------------------------------------------------------
# Browse: load a single document
# ---------------------------------------------------------------------------

@app.get("/api/v1/browse/doc/{doc_name}")
async def get_doc(
    doc_name: str,
    output_dir: str = Query(...),
    input_dir: str = Query("", description="Directory containing source PDFs (optional)"),
):
    """
    Load a pre-processed document and return a payload that matches
    the TaskStatusData shape the React frontend already understands.

    CLI JSON format:  [[{index, label, content, bbox_2d, image_path?}], ...]
    WebUI layout:     [{block_content, bbox, block_id, page_index}, ...]
    """
    doc_dir = Path(output_dir).resolve() / doc_name
    json_file = doc_dir / f"{doc_name}.json"
    md_file = doc_dir / f"{doc_name}.md"

    if not json_file.exists():
        raise HTTPException(404, f"JSON not found: {json_file}")

    # ------------------------------------------------------------------
    # 1. Parse CLI JSON  [[{...}], ...]
    # ------------------------------------------------------------------
    try:
        cli_pages = json.loads(json_file.read_text("utf-8"))
    except Exception as e:
        raise HTTPException(500, f"Failed to parse {json_file}: {e}")

    # ------------------------------------------------------------------
    # 2. Convert to WebUI layout format
    #    bbox_2d is already 0-1000 normalised → we set metadata w/h = 1000
    # ------------------------------------------------------------------
    layout = []
    for page_idx, page_blocks in enumerate(cli_pages):
        if not isinstance(page_blocks, list):
            continue
        for block in page_blocks:
            content = (block.get("content") or "").strip()

            if not content:
                # Image-only block: synthesise an img markdown tag
                img_rel = block.get("image_path", "")
                if img_rel:
                    abs_img = (doc_dir / img_rel).resolve()
                    content = f"![]({FILE_API}?path={quote(abs_img.as_posix(), safe='/:')})"
                else:
                    continue

            layout.append({
                "block_content": content,
                "bbox": block.get("bbox_2d"),
                "block_id": page_idx * 100_000 + block.get("index", 0),
                "page_index": page_idx + 1,  # 1-based for the frontend
            })

    # ------------------------------------------------------------------
    # 3. Read markdown, rewrite relative imgs/ paths → proxied API URLs
    # ------------------------------------------------------------------
    full_markdown = md_file.read_text("utf-8") if md_file.exists() else ""

    def _rewrite_img(m: re.Match) -> str:
        rel = m.group(2)          # capture group 2 = the path
        abs_path = (doc_dir / rel).resolve()
        return f"![{m.group(1)}]({FILE_API}?path={quote(abs_path.as_posix(), safe='/:')})"

    # Matches ![alt text](imgs/...) — rewrites to proxied URL
    full_markdown = re.sub(
        r"!\[([^\]]*)\]\((imgs/[^)]+)\)",
        _rewrite_img,
        full_markdown,
    )

    # ------------------------------------------------------------------
    # 4. Locate source PDF
    # ------------------------------------------------------------------
    pdf_path = None
    if input_dir:
        base = Path(input_dir).resolve()
        for ext in (f"{doc_name}.pdf", f"{doc_name}.PDF"):
            for candidate in base.rglob(ext):
                pdf_path = candidate.as_posix()
                break
            if pdf_path:
                break

    return {
        "success": True,
        "data": {
            "doc_name": doc_name,
            "pdf_path": pdf_path,
            "status": "completed",
            "full_markdown": full_markdown,
            "metadata": {
                "total_pages": len(cli_pages),
                # bbox_2d uses 0-1000 normalised space, so treat the
                # "original" page size as 1000×1000 for scaling purposes.
                "width": 1000,
                "height": 1000,
                "original_filename": f"{doc_name}.pdf",
            },
            "layout": layout,
        },
    }


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"status": "ok", "service": "glm-ocr-viewer"}
