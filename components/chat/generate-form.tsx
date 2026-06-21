'use client'

import { useState } from 'react'
import { FilePlus2, Loader2, CheckCircle2 } from 'lucide-react'

const TEMPLATES = [
  { id: 'nda', name: 'Non-Disclosure Agreement (NDA)' },
  { id: 'service_agreement', name: 'Service Agreement' },
  { id: 'employment_contract', name: 'Employment Contract' },
  { id: 'lease', name: 'Lease Agreement' },
  { id: 'partnership_agreement', name: 'Partnership Agreement' },
]

interface GenerateFormProps {
  onDone: () => void
}

export function GenerateForm({ onDone }: GenerateFormProps): React.JSX.Element {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplate) return

    setIsGenerating(true)

    try {
      await new Promise(resolve => setTimeout(resolve, 2000))
      setSuccess(true)
    } finally {
      setIsGenerating(false)
    }
  }

  if (success) {
    return (
      <div className="gen-form-success">
        <CheckCircle2 size={40} />
        <p>Document generated successfully!</p>
        <div className="gen-form-actions">
          <button className="gen-form-btn gen-form-btn-secondary" onClick={() => setSuccess(false)}>
            Generate Another
          </button>
          <button className="gen-form-btn gen-form-btn-primary" onClick={onDone}>
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="gen-form">
      <div className="gen-form-header">
        <FilePlus2 size={20} />
        <span>Generate a Legal Document</span>
      </div>

      <div className="gen-form-templates">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            className={`gen-form-template ${selectedTemplate === t.id ? 'selected' : ''}`}
            onClick={() => setSelectedTemplate(t.id)}
          >
            {t.name}
          </button>
        ))}
      </div>

      {selectedTemplate && (
        <form onSubmit={handleGenerate} className="gen-form-fields">
          <input className="gen-form-input" placeholder="Party 1 Name" required />
          <input className="gen-form-input" placeholder="Party 2 Name" required />
          <input className="gen-form-input" type="date" placeholder="Effective Date" required />
          <input className="gen-form-input" placeholder="Governing Law" required />

          <div className="gen-form-actions">
            <button type="submit" className="gen-form-btn gen-form-btn-primary" disabled={isGenerating}>
              {isGenerating ? (
                <><Loader2 className="chat-spinner" size={16} /> Generating...</>
              ) : (
                'Generate Document'
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
