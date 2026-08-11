import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react'

export default function UploadProgress({ progress = 0, status = 'idle', fileName = '' }) {
  const isComplete = status === 'ready'
  const isError = status === 'failed'
  const isProcessing = ['processing', 'uploading'].includes(status)
  
  let statusText = 'Waiting...'
  if (status === 'uploading') statusText = `Uploading ${fileName}... (${progress}%)`
  if (status === 'processing') statusText = 'AI is extracting and indexing content...'
  if (status === 'ready') statusText = 'Document indexed successfully!'
  if (status === 'failed') statusText = 'Processing failed.'

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-white flex items-center gap-2">
          {isProcessing && <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />}
          {isComplete && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
          {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
          {statusText}
        </h3>
        {isComplete && <span className="badge-success">Ready</span>}
        {isError && <span className="badge-danger">Error</span>}
      </div>
      
      <div className="h-2 bg-surface-600 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 rounded-full ${
            isError ? 'bg-rose-500' : isComplete ? 'bg-emerald-500' : 'bg-gradient-to-r from-brand-500 to-accent-500'
          }`}
          style={{ width: `${isComplete || isError ? 100 : progress}%` }} 
        />
      </div>
    </div>
  )
}
