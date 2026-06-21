'use client'

import { AlertCircle, FileText } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardBody } from '@/components/ui'

interface RiskFlag {
  id: string
  riskLevel: 'low' | 'medium' | 'high'
  riskCategory: string
  description: string
  recommendation: string
}

interface Clause {
  id: string
  clauseType: string
  rawText: string
  simplifiedText?: string | null
  isFlagged: boolean
  riskFlags: RiskFlag[]
}

interface ClauseViewerProps {
  clauses: Clause[]
}

export function ClauseViewer({ clauses }: ClauseViewerProps) {
  if (clauses.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-on-surface-variant)' }}>
        <FileText size={32} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
        <p>No clauses extracted from this document yet.</p>
      </div>
    )
  }

  return (
    <div className="clauses-list">
      {clauses.map((clause) => {
        const hasRisks = clause.isFlagged && clause.riskFlags.length > 0
        const formatType = (type: string) => type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

        return (
          <Card key={clause.id} className={`clause-card ${hasRisks ? 'flagged' : ''}`}>
            <CardHeader className="clause-header">
              <CardTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="type-badge">{formatType(clause.clauseType)}</span>
                  {hasRisks && <AlertCircle size={18} color="hsl(0, 65%, 48%)" />}
                </div>
              </CardTitle>
            </CardHeader>
            <CardBody>
              <div className="clause-content">
                <div className="raw-text">
                  <h5>Original Text</h5>
                  <p>{clause.rawText}</p>
                </div>
                
                {clause.simplifiedText && (
                  <div className="simplified-text">
                    <h5>Plain English Explanation</h5>
                    <p>{clause.simplifiedText}</p>
                  </div>
                )}

                {hasRisks && (
                  <div className="risks-container">
                    <h5>Detected Risks</h5>
                    {clause.riskFlags.map(risk => (
                      <div key={risk.id} className={`risk-item ${risk.riskLevel}`}>
                        <div className="risk-header">
                          <AlertCircle size={16} />
                          <strong>{formatType(risk.riskCategory)}</strong>
                          <span className={`risk-level ${risk.riskLevel}`}>{risk.riskLevel}</span>
                        </div>
                        <p>{risk.description}</p>
                        <p className="recommendation"><strong>Recommendation:</strong> {risk.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardBody>
          </Card>
        )
      })}

      <style>{`
        .clauses-list {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .clause-card {
          border-left: 4px solid var(--color-primary);
        }
        .clause-card.flagged {
          border-left-color: hsl(0, 65%, 48%);
        }
        .clause-header {
          margin-bottom: 12px;
        }
        .type-badge {
          display: inline-block;
          padding: 4px 12px;
          background-color: var(--color-surface-container);
          border: 1px solid var(--color-outline-variant);
          font-size: var(--typography-label-small-font-size);
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .clause-content h5 {
          font-family: var(--typography-label-large-font-family);
          font-size: var(--typography-label-small-font-size);
          color: var(--color-on-surface-variant);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .raw-text {
          margin-bottom: 24px;
        }
        .raw-text p {
          font-family: 'Geist', sans-serif;
          font-size: 14px;
          line-height: 1.6;
          color: var(--color-on-surface);
          background-color: var(--color-surface);
          padding: 16px;
          border: 1px solid var(--color-outline-variant);
          white-space: pre-wrap;
        }
        .simplified-text {
          margin-bottom: 24px;
        }
        .simplified-text p {
          font-family: var(--typography-body-large-font-family);
          font-size: 16px;
          line-height: 1.6;
          color: var(--color-on-surface);
          background-color: hsla(22, 90%, 58%, 0.05);
          padding: 16px;
          border-left: 2px solid var(--color-secondary);
        }
        .risks-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .risk-item {
          padding: 16px;
          background-color: var(--color-surface);
          border: 1px solid var(--color-outline-variant);
        }
        .risk-item.high {
          border-color: hsl(0, 65%, 48%);
          background-color: hsla(0, 65%, 48%, 0.05);
        }
        .risk-item.medium {
          border-color: hsl(40, 80%, 40%);
          background-color: hsla(40, 80%, 40%, 0.05);
        }
        .risk-item.low {
          border-color: var(--color-outline);
        }
        .risk-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        .risk-item.high .risk-header { color: hsl(0, 65%, 48%); }
        .risk-item.medium .risk-header { color: hsl(40, 80%, 40%); }
        .risk-level {
          font-size: 12px;
          padding: 2px 8px;
          border-radius: 12px;
          text-transform: uppercase;
          font-weight: 600;
          margin-left: auto;
        }
        .risk-level.high { background-color: hsl(0, 65%, 48%); color: white; }
        .risk-level.medium { background-color: hsl(40, 80%, 40%); color: white; }
        .risk-level.low { background-color: var(--color-surface-container-highest); color: var(--color-on-surface); }
        .recommendation {
          margin-top: 8px;
          font-size: 14px;
          color: var(--color-on-surface-variant);
        }
      `}</style>
    </div>
  )
}
