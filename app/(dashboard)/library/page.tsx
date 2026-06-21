import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DocumentCard } from '@/components/library/document-card'
import { FileText, FilePlus2 } from 'lucide-react'

export default async function LibraryPage() {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as { id?: string })?.id ?? ''

  const [documents, generatedDocs] = await Promise.all([
    prisma.document.findMany({
      where: { userId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        riskFlags: {
          select: { riskLevel: true },
        },
      },
    }),
    prisma.generatedDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <div className="library-page">
      <div className="library-header">
        <h1>Library</h1>
        <p>View all uploaded and generated documents.</p>
      </div>

      {documents.length > 0 && (
        <section className="library-section">
          <h2 className="library-section-title">
            <FileText size={20} />
            Uploaded Documents
          </h2>
          <div className="library-grid">
            {documents.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                fileName={doc.fileName}
                fileType={doc.fileType}
                uploadedAt={doc.uploadedAt}
                processingStatus={doc.processingStatus}
                riskCount={doc.riskFlags.filter((r) => r.riskLevel === 'high').length}
                documentType={doc.documentType}
              />
            ))}
          </div>
        </section>
      )}

      {generatedDocs.length > 0 && (
        <section className="library-section">
          <h2 className="library-section-title">
            <FilePlus2 size={20} />
            Generated Documents
          </h2>
          <div className="library-grid">
            {generatedDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                id={doc.id}
                fileName={`${doc.templateType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} - ${new Date(doc.createdAt).toLocaleDateString()}`}
                fileType={doc.outputFormat}
                uploadedAt={doc.createdAt}
                processingStatus={doc.generationStatus}
              />
            ))}
          </div>
        </section>
      )}

      {documents.length === 0 && generatedDocs.length === 0 && (
        <div className="library-empty">
          <FileText size={48} color="var(--color-outline)" />
          <h3>No documents yet</h3>
          <p>Upload a document from the chat to get started, or generate a legal document.</p>
        </div>
      )}

      <style>{`
        .library-page {
          max-width: 1000px;
        }

        .library-header {
          margin-bottom: 32px;
        }

        .library-header h1 {
          margin-bottom: 8px;
        }

        .library-header p {
          color: var(--color-on-surface-variant);
        }

        .library-section {
          margin-bottom: 40px;
        }

        .library-section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          font-family: var(--typography-title-medium-font-family);
          font-size: var(--typography-title-medium-font-size);
          font-weight: 500;
          color: var(--color-on-surface);
        }

        .library-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .library-empty {
          padding: 64px 24px;
          text-align: center;
          background-color: var(--color-surface-container-lowest);
          border: 1px solid var(--color-outline-variant);
        }

        .library-empty svg {
          margin-bottom: 16px;
        }

        .library-empty h3 {
          margin-bottom: 8px;
        }

        .library-empty p {
          color: var(--color-on-surface-variant);
        }
      `}</style>
    </div>
  )
}
