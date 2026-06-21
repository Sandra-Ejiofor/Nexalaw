export const ERROR_CODES = {
  E001: 'Please upload a document to continue.',
  E002: "We couldn't process this document. Please upload a valid PDF or text-based file.",
  E003: 'This question depends on the specific document. Please upload the relevant document.',
  E004: 'No matching section was found in this document.',
  E005: 'This section is unclear. You may want to review the original text or consult a legal professional.',
  E006: 'This file format is not supported. Please upload a PDF or plain text document.',
  E007: 'Something went wrong. Please try again later.',
  E008: 'This assistant only handles legal documents and legal questions.',
  E009: 'This document does not appear to be a legal document.',
} as const

export type ErrorCode = keyof typeof ERROR_CODES
