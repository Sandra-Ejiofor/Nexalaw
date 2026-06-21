'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, X, FileText, AlertCircle } from 'lucide-react'
import { Button, Card, CardBody } from '@/components/ui'
import { MAX_FILE_SIZE_BYTES, ACCEPTED_MIME_TYPES } from '@/constants'

export function DocumentUpload() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const validateFile = (file: File): boolean => {
    setError(null)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError('File size exceeds the 10MB limit.')
      return false
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!ACCEPTED_MIME_TYPES.includes(file.type as any)) {
      setError('Unsupported file format. Please upload a PDF, TXT, or DOCX file.')
      return false
    }
    return true
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile)
    }
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
        setError(data.message || 'Failed to upload document.')
        setIsUploading(false)
        return
      }

      setFile(null)
      router.refresh()
    } catch {
      setError('An unexpected error occurred during upload.')
      setIsUploading(false)
    }
  }

  return (
    <div style={{ marginBottom: '40px' }}>
      <Card>
        <CardBody>
          <div
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !file && fileInputRef.current?.click()}
          >
            {!file ? (
              <div className="dropzone-content">
                <Upload size={32} color="var(--color-secondary)" style={{ marginBottom: '16px' }} />
                <h3>Upload a legal document</h3>
                <p>Drag and drop your file here, or click to browse</p>
                <p className="hint">Supported formats: PDF, DOCX, TXT (Max 10MB)</p>
              </div>
            ) : (
              <div className="file-preview">
                <FileText size={32} color="var(--color-primary)" />
                <div className="file-info">
                  <h4>{file.name}</h4>
                  <p>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button 
                  className="clear-btn" 
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                  disabled={isUploading}
                >
                  <X size={20} />
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".pdf,.txt,.docx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              style={{ display: 'none' }}
            />
          </div>

          {error && (
            <div className="error-message">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {file && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? 'Uploading & Processing...' : 'Process Document'}
              </Button>
            </div>
          )}
        </CardBody>
      </Card>

      <style>{`
        .dropzone {
          border: 2px dashed var(--color-outline-variant);
          padding: 48px 24px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s ease;
          background-color: var(--color-surface);
        }
        .dropzone.dragging {
          border-color: var(--color-secondary);
          background-color: hsla(22, 90%, 58%, 0.05);
        }
        .dropzone:hover:not(.dragging) {
          border-color: var(--color-outline);
        }
        .dropzone-content h3 {
          margin-bottom: 8px;
          font-family: var(--typography-title-medium-font-family);
        }
        .dropzone-content p {
          color: var(--color-on-surface-variant);
          margin-bottom: 8px;
        }
        .dropzone-content .hint {
          font-size: var(--typography-label-small-font-size);
          color: var(--color-outline);
        }
        .file-preview {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 16px;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          text-align: left;
        }
        .file-info {
          flex: 1;
        }
        .file-info h4 {
          margin-bottom: 4px;
        }
        .file-info p {
          font-size: var(--typography-body-small-font-size);
          color: var(--color-on-surface-variant);
        }
        .clear-btn {
          padding: 8px;
          color: var(--color-on-surface-variant);
          background: none;
          border: none;
          cursor: pointer;
        }
        .clear-btn:hover {
          color: hsl(0, 65%, 48%);
        }
        .error-message {
          margin-top: 16px;
          padding: 12px;
          background-color: hsla(0, 65%, 48%, 0.1);
          color: hsl(0, 65%, 48%);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: var(--typography-body-medium-font-size);
        }
      `}</style>
    </div>
  )
}
