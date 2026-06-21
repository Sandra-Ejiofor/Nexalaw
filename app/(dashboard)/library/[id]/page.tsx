import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Clock, AlertCircle, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { ChatInterface } from '@/components/query/ChatInterface'
import { ClauseViewer } from '@/components/documents/ClauseViewer'

export default async function LibraryDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string })?.id ?? ''

  const { id: documentId } = await params

  const document = await prisma.document.findFirst({
    where: { id: documentId, userId },
    include: {
      clauses: {
        orderBy: { startIndex: 'asc' },
        include: {
          riskFlags: true,
        },
      },
    },
  })

  if (!document) {
    redirect('/library')
  }

  const chatSession = await prisma.session.create({
    data: {
      userId,
      documentId,
    },
  })

  const highRisks = document.clauses.reduce(
    (acc, clause) => acc + clause.riskFlags.filter((r) => r.riskLevel === 'high').length,
    0
  )
  const mediumRisks = document.clauses.reduce(
    (acc, clause) => acc + clause.riskFlags.filter((r) => r.riskLevel === 'medium').length,
    0
  )

  return (
    <div className="doc-detail-page">
      <Link href="/library" className="back-link">
        <ArrowLeft size={16} /> Back to library
      </Link>

      <div className="header-section">
        <div>
          <h1 style={{ marginBottom: '8px' }}>{document.fileName}</h1>
          <div className="meta-info">
            <span className="badge">
              <Clock size={14} /> Uploaded{' '}
              {new Date(document.uploadedAt).toLocaleDateString()}
            </span>
            <span className={`status-badge ${document.processingStatus}`}>
              {document.processingStatus.charAt(0).toUpperCase() +
                document.processingStatus.slice(1)}
            </span>
          </div>
        </div>

        <div className="risk-summary">
          <div className="risk-count high">
            <AlertCircle size={20} />
            <div>
              <span className="count">{highRisks}</span>
              <span className="label">High Risks</span>
            </div>
          </div>
          <div className="risk-count medium">
            <AlertCircle size={20} />
            <div>
              <span className="count">{mediumRisks}</span>
              <span className="label">Medium Risks</span>
            </div>
          </div>
          {highRisks === 0 && mediumRisks === 0 && document.processingStatus === 'completed' && (
            <div className="risk-count safe">
              <ShieldCheck size={20} />
              <div>
                <span className="label">No major risks detected</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="two-col-layout">
        <div className="main-column">
          <h2 style={{ marginBottom: '24px' }}>Document Analysis</h2>
          {document.processingStatus === 'completed' ? (
            <ClauseViewer clauses={document.clauses} />
          ) : (
            <div className="processing-state">
              <Clock size={32} />
              <h3>Document is being processed</h3>
              <p>
                We are analyzing the document and extracting clauses. Please check back in a
                moment.
              </p>
            </div>
          )}
        </div>

        <div className="side-column">
          <h2 style={{ marginBottom: '24px' }}>Ask Nexalaw</h2>
          <div className="sticky-sidebar">
            <ChatInterface documentId={document.id} sessionId={chatSession.id} />
          </div>
        </div>
      </div>

      <style>{`
        .doc-detail-page {
          max-width: 1200px;
          margin: 0 auto;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: var(--color-on-surface-variant);
          text-decoration: none;
          font-weight: 500;
          margin-bottom: 24px;
        }
        .back-link:hover {
          color: var(--color-secondary);
        }
        .header-section {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          flex-wrap: wrap;
          gap: 24px;
          margin-bottom: 40px;
          padding-bottom: 24px;
          border-bottom: 1px solid var(--color-outline-variant);
        }
        .meta-info {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 12px;
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 14px;
          color: var(--color-on-surface-variant);
        }
        .status-badge {
          font-size: 14px;
          padding: 4px 12px;
          border-radius: 16px;
          background-color: var(--color-surface-container);
        }
        .status-badge.completed { background-color: hsla(120, 60%, 50%, 0.1); color: hsl(120, 60%, 30%); }
        
        .risk-summary {
          display: flex;
          gap: 16px;
        }
        .risk-count {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 24px;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
        }
        .risk-count.high { border-color: hsl(0, 65%, 48%); color: hsl(0, 65%, 48%); }
        .risk-count.medium { border-color: hsl(40, 80%, 40%); color: hsl(40, 80%, 40%); }
        .risk-count.safe { border-color: hsl(120, 60%, 40%); color: hsl(120, 60%, 40%); }
        .risk-count .count {
          display: block;
          font-size: 24px;
          font-weight: 600;
          line-height: 1;
        }
        .risk-count .label {
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .two-col-layout {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: 48px;
        }
        @media (max-width: 1024px) {
          .two-col-layout {
            grid-template-columns: 1fr;
          }
        }

        .sticky-sidebar {
          position: sticky;
          top: 24px;
        }

        .processing-state {
          padding: 80px 24px;
          text-align: center;
          background-color: var(--color-surface-container-lowest);
          border: 1px dashed var(--color-outline);
          color: var(--color-on-surface-variant);
        }
        .processing-state svg {
          margin-bottom: 16px;
          opacity: 0.5;
        }
        .processing-state h3 {
          margin-bottom: 8px;
          color: var(--color-on-surface);
        }
      `}</style>
    </div>
  )
}
