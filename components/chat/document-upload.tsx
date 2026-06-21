'use client'

import { useState } from 'react'
import { Upload, FileText, X, AlertCircle, Loader2 } from 'lucide-react'

interface DocumentUploadProps {
  onUploadComplete: (documentId: string, fileName: string) => void
}

export function DocumentUpload({ onUploadComplete }: DocumentUploadProps): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (!selected) return
    e.target.value = ''

    if (selected.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB.')
      return
    }

    setFile(selected)
    setError(null)
  }

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.message || 'Upload failed.')
        return
      }

      onUploadComplete(data.data.documentId, file.name)
      setFile(null)
    } catch {
      setError('Network error during upload.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="doc-upload">
      {!file ? (
        <label className="doc-upload-drop">
          <Upload size={24} />
          <span>Upload a document to analyze</span>
          <span className="doc-upload-hint">PDF, DOCX, or TXT (max 10MB)</span>
          <input type="file" accept=".pdf,.docx,.txt" onChange={handleFileSelect} hidden />
        </label>
      ) : (
        <div className="doc-upload-preview">
          <FileText size={20} />
          <span className="doc-upload-name">{file.name}</span>
          <button className="doc-upload-clear" onClick={() => setFile(null)} disabled={isUploading}>
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="doc-upload-error">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {file && !isUploading && (
        <button className="doc-upload-btn" onClick={handleUpload}>
          Process Document
        </button>
      )}

      {isUploading && (
        <div className="doc-upload-processing">
          <Loader2 className="chat-spinner" size={16} />
          Uploading & processing...
        </div>
      )}
    </div>
  )
}
