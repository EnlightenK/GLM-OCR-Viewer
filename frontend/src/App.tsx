import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, FolderOpen, FileText, ChevronRight, Search } from 'lucide-react'
import { FilePreview } from '@/components/viewer/FilePreview'
import { OCRResults } from '@/components/viewer/OCRResults'
import { useOcrStore } from '@/store/useOcrStore'
import {
  listBrowseDocs,
  getBrowseDoc,
  fetchPdfBlob,
  type BrowseDoc,
} from '@/libs/browseApi'
import type { TaskResponse, UploadedFile } from '@/types'

export default function App() {
  const [outputDir, setOutputDir] = useState('')
  const [inputDir, setInputDir] = useState('')
  const [docs, setDocs] = useState<BrowseDoc[]>([])
  const [filteredDocs, setFilteredDocs] = useState<BrowseDoc[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDoc, setSelectedDoc] = useState<string | null>(null)
  const [docData, setDocData] = useState<TaskResponse | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [loadingDocs, setLoadingDocs] = useState(false)
  const [loadingDoc, setLoadingDoc] = useState(false)

  const setBlocks = useOcrStore(s => s.setBlocks)

  // -----------------------------------------------------------------------
  // Load the document list from the output directory
  // -----------------------------------------------------------------------
  const handleLoadDocs = useCallback(async () => {
    if (!outputDir.trim()) {
      toast.error('Please enter an output directory path')
      return
    }
    setLoadingDocs(true)
    setDocs([])
    setFilteredDocs([])
    setSelectedDoc(null)
    setDocData(null)
    setUploadedFile(null)
    setBlocks([])
    try {
      const list = await listBrowseDocs(outputDir.trim())
      setDocs(list)
      setFilteredDocs(list)
      if (list.length === 0) {
        toast.info('No processed documents found in that directory')
      } else {
        toast.success(`Found ${list.length} document${list.length > 1 ? 's' : ''}`)
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err.message || 'Failed to load documents'
      toast.error(msg)
    } finally {
      setLoadingDocs(false)
    }
  }, [outputDir, setBlocks])

  // -----------------------------------------------------------------------
  // Filter document list by search query
  // -----------------------------------------------------------------------
  const handleSearch = (q: string) => {
    setSearchQuery(q)
    if (!q.trim()) {
      setFilteredDocs(docs)
    } else {
      setFilteredDocs(
        docs.filter(d => d.name.toLowerCase().includes(q.toLowerCase()))
      )
    }
  }

  // -----------------------------------------------------------------------
  // Load a single document when clicked in the sidebar
  // -----------------------------------------------------------------------
  const handleSelectDoc = useCallback(
    async (name: string) => {
      if (loadingDoc) return
      setSelectedDoc(name)
      setDocData(null)
      setUploadedFile(null)
      setBlocks([])
      setLoadingDoc(true)

      try {
        const data = await getBrowseDoc(name, outputDir.trim(), inputDir.trim())

        // Build synthetic TaskResponse that FilePreview + OCRResults expect
        const taskResponse: TaskResponse = {
          fileId: name,
          status: 'completed',
          response: data,
          error_message: null,
        }
        setDocData(taskResponse)

        // Load the source PDF as a blob → File → UploadedFile
        if (data.pdf_path) {
          try {
            const blob = await fetchPdfBlob(data.pdf_path)
            const file = new File([blob], `${name}.pdf`, { type: 'application/pdf' })
            setUploadedFile({
              id: name,
              name: `${name}.pdf`,
              size: file.size,
              type: 'application/pdf',
              file,
              uploadTime: new Date(),
              error: null,
            })
          } catch {
            // PDF not available – show results without the viewer
            toast.warning('PDF not found – showing results only')
          }
        }
      } catch (err: any) {
        const msg = err?.response?.data?.detail || err.message || 'Failed to load document'
        toast.error(msg)
        setDocData({
          fileId: name,
          status: 'failed',
          response: null,
          error_message: msg,
        })
      } finally {
        setLoadingDoc(false)
      }
    },
    [outputDir, inputDir, loadingDoc, setBlocks]
  )

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className='h-screen flex overflow-hidden bg-gray-50'>
      {/* ---------------------------------------------------------------- */}
      {/* Sidebar                                                           */}
      {/* ---------------------------------------------------------------- */}
      <aside className='w-64 shrink-0 flex flex-col bg-white border-r border-border overflow-hidden'>
        {/* Header */}
        <div className='p-4 border-b border-border'>
          <h1 className='text-base font-semibold mb-3 flex items-center gap-2'>
            <FolderOpen className='size-4' />
            GLM-OCR Viewer
          </h1>

          {/* Output dir */}
          <label className='block text-xs text-gray-500 mb-1'>Output Dir</label>
          <input
            type='text'
            value={outputDir}
            onChange={e => setOutputDir(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoadDocs()}
            placeholder='/path/to/output'
            className='w-full text-sm border border-border rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-primary'
          />

          {/* Input dir (optional) */}
          <label className='block text-xs text-gray-500 mb-1'>
            Input Dir <span className='text-gray-400'>(PDFs, optional)</span>
          </label>
          <input
            type='text'
            value={inputDir}
            onChange={e => setInputDir(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLoadDocs()}
            placeholder='/path/to/pdfs'
            className='w-full text-sm border border-border rounded px-2 py-1 mb-3 focus:outline-none focus:ring-1 focus:ring-primary'
          />

          <button
            onClick={handleLoadDocs}
            disabled={loadingDocs}
            className='w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground text-sm py-1.5 rounded hover:opacity-90 disabled:opacity-50 cursor-pointer'>
            {loadingDocs ? (
              <Loader2 className='size-4 animate-spin' />
            ) : (
              <FolderOpen className='size-4' />
            )}
            Load
          </button>
        </div>

        {/* Search */}
        {docs.length > 0 && (
          <div className='px-3 py-2 border-b border-border'>
            <div className='flex items-center gap-2 border border-border rounded px-2 py-1'>
              <Search className='size-3.5 text-gray-400 shrink-0' />
              <input
                type='text'
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                placeholder='Filter docs…'
                className='flex-1 text-sm focus:outline-none bg-transparent'
              />
            </div>
          </div>
        )}

        {/* Document list */}
        <div className='flex-1 overflow-y-auto'>
          {loadingDocs ? (
            <div className='flex items-center justify-center py-8'>
              <Loader2 className='size-5 animate-spin text-gray-400' />
            </div>
          ) : filteredDocs.length > 0 ? (
            <ul className='py-1'>
              {filteredDocs.map(doc => (
                <li key={doc.name}>
                  <button
                    onClick={() => handleSelectDoc(doc.name)}
                    disabled={loadingDoc}
                    className={`w-full text-left flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 ${
                      selectedDoc === doc.name
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-gray-700'
                    }`}>
                    {loadingDoc && selectedDoc === doc.name ? (
                      <Loader2 className='size-3.5 animate-spin shrink-0' />
                    ) : selectedDoc === doc.name ? (
                      <ChevronRight className='size-3.5 shrink-0' />
                    ) : (
                      <FileText className='size-3.5 shrink-0 text-gray-400' />
                    )}
                    <span className='truncate'>{doc.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : docs.length > 0 && searchQuery ? (
            <p className='text-xs text-gray-400 text-center py-8'>No matches</p>
          ) : (
            <p className='text-xs text-gray-400 text-center py-8'>
              Enter a directory and click Load
            </p>
          )}
        </div>

        {/* Footer */}
        {docs.length > 0 && (
          <div className='px-3 py-2 border-t border-border text-xs text-gray-400'>
            {filteredDocs.length} / {docs.length} docs
          </div>
        )}
      </aside>

      {/* ---------------------------------------------------------------- */}
      {/* Main split view                                                   */}
      {/* ---------------------------------------------------------------- */}
      <main className='h-screen flex-1 min-w-0 grid grid-cols-2 overflow-hidden'>
        <FilePreview file={uploadedFile} result={docData} />
        <OCRResults result={docData} fileName={selectedDoc ?? undefined} />
      </main>
    </div>
  )
}
