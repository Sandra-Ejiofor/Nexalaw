export interface TemplateField {
  name: string
  label: string
  type: 'text' | 'date' | 'number' | 'textarea'
  required: boolean
}

export interface TemplateDefinition {
  id: string
  name: string
  description: string
  fields: TemplateField[]
}

export const TEMPLATES: TemplateDefinition[] = [
  {
    id: 'nda',
    name: 'Non-Disclosure Agreement (NDA)',
    description: 'A mutual or unilateral non-disclosure agreement to protect confidential information.',
    fields: [
      { name: 'party1Name', label: 'Disclosing Party Name', type: 'text', required: true },
      { name: 'party2Name', label: 'Receiving Party Name', type: 'text', required: true },
      { name: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
      { name: 'governingLaw', label: 'Governing Law (State/Country)', type: 'text', required: true },
      { name: 'confidentialityPeriod', label: 'Confidentiality Period (years)', type: 'number', required: true },
      { name: 'purpose', label: 'Purpose of Disclosure', type: 'textarea', required: false },
    ],
  },
  {
    id: 'service_agreement',
    name: 'Service Agreement',
    description: 'A contract for services to be rendered between a client and a service provider.',
    fields: [
      { name: 'clientName', label: 'Client Name', type: 'text', required: true },
      { name: 'serviceProvider', label: 'Service Provider Name', type: 'text', required: true },
      { name: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
      { name: 'governingLaw', label: 'Governing Law (State/Country)', type: 'text', required: true },
      { name: 'servicesDescription', label: 'Description of Services', type: 'textarea', required: true },
      { name: 'paymentTerms', label: 'Payment Terms', type: 'text', required: true },
    ],
  },
  {
    id: 'employment_contract',
    name: 'Employment Contract',
    description: 'An employment agreement between an employer and an employee.',
    fields: [
      { name: 'employerName', label: 'Employer Name', type: 'text', required: true },
      { name: 'employeeName', label: 'Employee Name', type: 'text', required: true },
      { name: 'jobTitle', label: 'Job Title', type: 'text', required: true },
      { name: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
      { name: 'governingLaw', label: 'Governing Law (State/Country)', type: 'text', required: true },
      { name: 'salary', label: 'Salary', type: 'text', required: true },
      { name: 'noticePeriod', label: 'Notice Period (weeks)', type: 'number', required: true },
    ],
  },
  {
    id: 'lease',
    name: 'Lease Agreement',
    description: 'A residential or commercial lease agreement between a landlord and a tenant.',
    fields: [
      { name: 'landlordName', label: 'Landlord Name', type: 'text', required: true },
      { name: 'tenantName', label: 'Tenant Name', type: 'text', required: true },
      { name: 'propertyAddress', label: 'Property Address', type: 'textarea', required: true },
      { name: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
      { name: 'governingLaw', label: 'Governing Law (State/Country)', type: 'text', required: true },
      { name: 'monthlyRent', label: 'Monthly Rent', type: 'text', required: true },
      { name: 'leaseTerm', label: 'Lease Term (months)', type: 'number', required: true },
    ],
  },
  {
    id: 'partnership_agreement',
    name: 'Partnership Agreement',
    description: 'An agreement outlining the terms of a business partnership.',
    fields: [
      { name: 'partner1Name', label: 'Partner 1 Name', type: 'text', required: true },
      { name: 'partner2Name', label: 'Partner 2 Name', type: 'text', required: true },
      { name: 'businessName', label: 'Business Name', type: 'text', required: true },
      { name: 'effectiveDate', label: 'Effective Date', type: 'date', required: true },
      { name: 'governingLaw', label: 'Governing Law (State/Country)', type: 'text', required: true },
      { name: 'partner1Contribution', label: 'Partner 1 Contribution', type: 'text', required: true },
      { name: 'partner2Contribution', label: 'Partner 2 Contribution', type: 'text', required: true },
    ],
  },
]

export function getTemplate(id: string): TemplateDefinition | undefined {
  return TEMPLATES.find(t => t.id === id)
}

export function getTemplateName(id: string): string {
  return getTemplate(id)?.name ?? id
}
