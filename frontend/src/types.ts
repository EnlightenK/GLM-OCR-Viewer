/**
 * Shared types for the GLM-OCR Viewer.
 * These mirror the shapes from the original apps/frontend to allow reuse
 * of FilePreview and OCRResults components.
 */

export type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface UploadedFile {
  id: string
  name: string
  size: number
  type: string
  file: File
  uploadTime: Date
  error: string | null
}

export interface TaskStatusData {
  task_id?: string | number
  document_id?: string
  status: TaskStatus
  full_markdown?: string
  metadata?: {
    task_id?: string
    document_id?: string
    original_filename?: string
    processing_mode?: string
    total_pages?: number
    merge_timestamp?: number
    width?: number
    height?: number
  }
  layout?: Array<{
    block_content: string
    bbox: [number, number, number, number] | null
    block_id: number
    text_length?: number | null
    page_index: number
  }>
  images?: Record<string, string>
  error_message?: string | null
}

export interface TaskResponse {
  fileId: string
  status: TaskStatus
  response: TaskStatusData | null
  error_message?: string | null
}
