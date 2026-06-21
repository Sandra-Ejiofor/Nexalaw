import Link from 'next/link'
import { FileText, AlertCircle, Clock, CheckCircle } from 'lucide-react'

interface DocumentCardProps {
  id: string
  fileName: string
  fileType: string
  uploadedAt: Date
  processingStatus: string
  riskCount?: number
  documentType?: string
}

export function DocumentCard({ id, fileName, fileType, uploadedAt, processingStatus, riskCount, documentType }: DocumentCardProps): React.JSX.Element {
  const formatType = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

  return (
    <>
      <Link href={`/library/${id}`} className="doc-card">
        <div className="doc-card-icon">
          <FileText size={24} />
          <span className="doc-card-type">{fileType.toUpperCase()}</span>
        </div>

        <div className="doc-card-body">
          <h3 className="doc-card-title">{fileName}</h3>
          <div className="doc-card-meta">
            {documentType && <span className="doc-card-badge">{formatType(documentType)}</span>}
            <span className="doc-card-date">
              <Clock size={12} />
              {new Date(uploadedAt).toLocaleDateString()}
            </span>
            <span className={`doc-card-status ${processingStatus}`}>
              {processingStatus === 'completed' && <CheckCircle size={12} />}
              {processingStatus.charAt(0).toUpperCase() + processingStatus.slice(1)}
            </span>
          </div>
        </div>

        {riskCount !== undefined && riskCount > 0 && (
          <div className="doc-card-risk">
            <AlertCircle size={14} />
            {riskCount}
          </div>
        )}
      </Link>

      <style>{`
        .doc-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
          text-decoration: none;
          color: inherit;
          transition: border-color 0.2s;
        }

        .doc-card:hover {
          border-color: var(--color-secondary);
        }

        .doc-card-icon {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          color: var(--color-secondary);
          flex-shrink: 0;
        }

        .doc-card-type {
          font-size: 10px;
          font-weight: 600;
          color: var(--color-on-surface-variant);
          letter-spacing: 0.5px;
        }

        .doc-card-body {
          flex: 1;
          min-width: 0;
        }

        .doc-card-title {
          font-family: var(--typography-title-small-font-family);
          font-size: var(--typography-title-small-font-size);
          font-weight: 500;
          margin-bottom: 8px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .doc-card-meta {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        .doc-card-badge {
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 500;
          background-color: var(--color-surface-container);
          border: 1px solid var(--color-outline-variant);
        }

        .doc-card-date {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          color: var(--color-on-surface-variant);
        }

        .doc-card-status {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .doc-card-status.completed {
          background-color: hsla(120, 60%, 50%, 0.1);
          color: hsl(120, 60%, 30%);
        }

        .doc-card-status.processing,
        .doc-card-status.pending {
          background-color: hsla(40, 80%, 50%, 0.1);
          color: hsl(40, 80%, 30%);
        }

        .doc-card-status.failed {
          background-color: hsla(0, 65%, 48%, 0.1);
          color: hsl(0, 65%, 48%);
        }

        .doc-card-risk {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background-color: hsla(0, 65%, 48%, 0.1);
          color: hsl(0, 65%, 48%);
          font-size: 13px;
          font-weight: 600;
          flex-shrink: 0;
        }
      `}</style>
    </>
  )
}
