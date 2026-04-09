import axios from 'axios'
import type { TaskStatusData, TaskStatus } from '@/types'

const BASE = '/api/v1'

export interface BrowseDoc {
  name: string
  path: string
}

export interface BrowseDocData extends TaskStatusData {
  doc_name: string
  pdf_path: string | null
  status: TaskStatus
}

export async function listBrowseDocs(outputDir: string): Promise<BrowseDoc[]> {
  const r = await axios.get(`${BASE}/browse/docs`, {
    params: { output_dir: outputDir },
  })
  return r.data.data
}

export async function getBrowseDoc(
  name: string,
  outputDir: string,
  inputDir: string
): Promise<BrowseDocData> {
  const r = await axios.get(`${BASE}/browse/doc/${encodeURIComponent(name)}`, {
    params: { output_dir: outputDir, input_dir: inputDir },
  })
  return r.data.data
}

export async function fetchPdfBlob(pdfPath: string): Promise<Blob> {
  const r = await axios.get(`${BASE}/file`, {
    params: { path: pdfPath },
    responseType: 'blob',
  })
  return r.data
}
