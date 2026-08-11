import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, FileText } from 'lucide-react'
import FileDropzone from '../components/upload/FileDropzone'
import UploadProgress from '../components/upload/UploadProgress'
import api from '../services/api'

export default function UploadPage() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('idle') // idle, uploading, processing, ready, failed
  const [progress, setProgress] = useState(0)
  const [documentId, setDocumentId] = useState(null)
  const navigate = useNavigate()

  const handleFileUpload = async (selectedFile) => {
    setFile(selectedFile)
    setStatus('uploading')
    setProgress(0)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      // Phase 5: POST to backend
      const res = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          // Keep it at 99% until backend responds
          setProgress(pct === 100 ? 99 : pct)
        }
      })
      
      setDocumentId(res.data.id)
      setStatus(res.data.status) // usually "processing"
      
    } catch (err) {
      console.error(err)
      setStatus('failed')
      alert('Upload failed: ' + err.message)
    }
  }

  // Poll for document status if it's processing
  useEffect(() => {
    if (status !== 'processing' || !documentId) return
    
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/documents/${documentId}`)
        setStatus(res.data.status)
        if (res.data.status === 'ready' || res.data.status === 'failed') {
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Polling failed', err)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [status, documentId])

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Upload className="w-6 h-6 text-brand-400" />
        <h1 className="text-2xl font-bold text-white">Upload Document</h1>
      </div>

      <div className="space-y-6">
        {status === 'idle' && (
          <FileDropzone onFile={handleFileUpload} />
        )}

        {status !== 'idle' && (
          <div className="animate-fade-in">
            <UploadProgress progress={progress} status={status} fileName={file?.name} />
          </div>
        )}

        {status === 'ready' && documentId && (
          <div className="card p-6 bg-brand-500/10 border-brand-500/30 text-center animate-fade-in">
            <h3 className="text-lg font-semibold text-white mb-2">Ready to query!</h3>
            <p className="text-slate-400 text-sm mb-6">Your document has been indexed and is ready for questions.</p>
            <button 
              onClick={() => navigate(`/chat/${documentId}`)}
              className="btn-primary"
            >
              <FileText className="w-4 h-4" />
              Go to Chat
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
