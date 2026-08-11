import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud, File, AlertCircle } from 'lucide-react'

export default function FileDropzone({ onFile }) {
  const [error, setError] = useState(null)

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError(null)
    if (rejectedFiles.length > 0) {
      const err = rejectedFiles[0].errors[0]
      if (err.code === 'file-too-large') {
        setError('File is larger than 10MB limit')
      } else if (err.code === 'file-invalid-type') {
        setError('Invalid file type. Only PDF, DOCX, and TXT are supported.')
      } else {
        setError(err.message)
      }
      return
    }
    
    if (acceptedFiles.length > 0) {
      onFile(acceptedFiles[0])
    }
  }, [onFile])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt']
    }
  })

  return (
    <div className="space-y-4">
      <div 
        {...getRootProps()} 
        className={`card p-10 text-center border-dashed border-2 transition-all duration-200 cursor-pointer ${
          isDragActive 
            ? 'border-brand-500 bg-brand-500/10' 
            : 'border-white/15 hover:border-brand-500/50 hover:bg-white/5'
        }`}
      >
        <input {...getInputProps()} />
        <div className="w-16 h-16 rounded-2xl bg-surface-700 flex items-center justify-center mx-auto mb-4 shadow-card">
          <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-brand-400 animate-bounce' : 'text-slate-400'}`} />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">
          {isDragActive ? 'Drop your file here' : 'Drag & drop a file here'}
        </h3>
        <p className="text-sm text-slate-400 max-w-sm mx-auto mb-6">
          Supported formats: PDF, DOCX, TXT. Maximum file size: 10 MB.
        </p>
        <button className="btn-secondary pointer-events-none">Select File</button>
      </div>
      
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-rose-200">{error}</div>
        </div>
      )}
    </div>
  )
}
