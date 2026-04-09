import { useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { TaskResponse } from '@/types'
import { MarkdownPreview } from '@/components/ocr/MarkdownPreview'
import { useOcrStore } from '@/store/useOcrStore'
import { AppWindowIcon, CopyIcon, DownloadIcon, FileJsonIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { JsonPreview } from '@/components/ocr/JsonPreview'

interface OCRResultsProps {
  result: TaskResponse | null
  fileName?: string
}

export function OCRResults({ result, fileName }: OCRResultsProps) {
  const setBlocks = useOcrStore(s => s.setBlocks)

  const layout = useMemo(() => result?.response?.layout || [], [result?.response?.layout])

  const pageHeight = result?.response?.metadata?.height ?? 2339

  const blocks = useMemo(() => {
    if (result?.status !== 'completed') return []
    return layout
      .filter((b: any) => {
        if (!b.block_content || b.block_content.trim() === '') return false
        return true
      })
      .map((b: any, index: number) => {
        const blockContent = b.block_content.trim()
        let bbox: [number, number, number, number] | null = null
        let width = 0
        let height = 0
        if (b.bbox) {
          const [x1, y1, x2, y2] = b.bbox as [number, number, number, number]
          width = x2 - x1
          height = y2 - y1
          bbox = [x1, y1, x2, y2]
        }
        return {
          id: b.block_id ?? index + Math.random() * 1_000_000,
          content: blockContent,
          bbox,
          pageIndex: b.page_index ?? 1,
          isImage: blockContent.startsWith('![]('),
          width,
          height,
        }
      })
  }, [layout, pageHeight, result?.status])

  useEffect(() => {
    if (blocks.length > 0) {
      setBlocks(blocks)
    } else {
      setBlocks([])
    }
  }, [blocks, setBlocks])

  const handleCopy = () => {
    if (!result?.response?.full_markdown) return
    navigator.clipboard.writeText(result.response.full_markdown)
    toast.success('Copied')
  }

  const handleDownload = () => {
    if (!result?.response?.full_markdown) return
    const blob = new Blob([result.response.full_markdown], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${fileName || 'result'}.md`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Downloaded')
  }

  const response = result?.response
  const status = result?.status
  const error_message = result?.error_message

  return (
    <div className='h-screen flex flex-col bg-white border-l border-border'>
      <Tabs defaultValue='markdown' className='flex-1 flex flex-col overflow-hidden'>
        <div className='px-4 pt-4 pb-0 bg-white sticky top-0 z-10 flex items-center justify-between'>
          <TabsList className='grid grid-cols-2'>
            <TabsTrigger value='markdown' className='cursor-pointer'>
              <AppWindowIcon className='size-4' />Markdown
            </TabsTrigger>
            <TabsTrigger value='json' className='cursor-pointer'>
              <FileJsonIcon className='size-4' />JSON
            </TabsTrigger>
          </TabsList>
          {status === 'completed' && (
            <div className='flex items-center gap-2'>
              <Button
                variant='outline'
                size='icon'
                className='cursor-pointer'
                onClick={handleCopy}>
                <CopyIcon className='size-4' />
              </Button>
              <Button
                variant='outline'
                size='icon'
                className='cursor-pointer'
                onClick={handleDownload}>
                <DownloadIcon className='size-4' />
              </Button>
            </div>
          )}
        </div>

        <div className='flex-1 overflow-hidden'>
          <TabsContent value='markdown' className='h-full m-0 mt-0'>
            {blocks.length > 0 && status === 'completed' ? (
              <MarkdownPreview />
            ) : status === 'completed' ? (
              <div className='h-full flex items-center justify-center'>
                <p className='text-gray-500'>No markdown content</p>
              </div>
            ) : status === 'failed' ? (
              <div className='h-full flex items-center justify-center'>
                <div className='text-center text-red-500'>
                  <p>Failed to load</p>
                  {error_message && (
                    <p className='text-sm mt-2 text-gray-500'>{error_message}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className='h-full flex items-center justify-center'>
                <p className='text-gray-500'>Select a document</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value='json' className='h-full m-0 mt-0 overflow-auto'>
            <div className='p-4'>
              {response && status === 'completed' ? (
                <div className='bg-gray-100 p-4 rounded-lg overflow-auto'>
                  <JsonPreview json={response} />
                </div>
              ) : (
                <div className='h-full flex items-center justify-center'>
                  <p className='text-gray-500'>No data</p>
                </div>
              )}
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
