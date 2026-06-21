'use client'

import { FileText, AlertCircle, X } from 'lucide-react'
import Link from 'next/link'

interface DocumentPreviewProps {
  documentId: string
  fileName: string
  riskCount?: number
  onDismiss?: () => void
}

export function DocumentPreview({ documentId, fileName, riskCount, onDismiss }: DocumentPreviewProps): React.JSX.Element {
  return (
    <div className="doc-preview">
      <Link href={`/library/${documentId}`} className="doc-preview-link">
        <FileText size={16} />
        <span className="doc-preview-name">{fileName}</span>
      </Link>

      {riskCount !== undefined && riskCount > 0 && (
        <span className="doc-preview-risks">
          <AlertCircle size={14} />
          {riskCount} risk{riskCount !== 1 ? 's' : ''}
        </span>
      )}

      {onDismiss && (
        <button className="doc-preview-dismiss" onClick={onDismiss} aria-label="Dismiss document preview">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
