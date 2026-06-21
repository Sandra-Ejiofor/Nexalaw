import nodemailer from 'nodemailer'

/**
 * Creates and returns a Nodemailer transport configured with SMTP env vars.
 */
function createTransport(): nodemailer.Transporter {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

/**
 * Sends a transactional email using the configured SMTP transport.
 *
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param html - HTML content of the email
 */
export async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<void> {
  const transporter = createTransport()

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject,
    html,
  })
}

/**
 * Sends a document processing completion notification.
 */
export async function sendProcessingCompleteEmail(
  to: string,
  documentName: string
): Promise<void> {
  await sendEmail(
    to,
    'Your document has been processed — Nexalaw',
    `
    <h2>Document Processed</h2>
    <p>Your document <strong>${documentName}</strong> has been processed and is ready for review.</p>
    <p>Log in to your Nexalaw dashboard to view the analysis.</p>
    <hr />
    <p style="font-size: 12px; color: #666;">
      This is an educational and legal literacy tool. It does not constitute legal advice.
      Consult a qualified legal professional for legal decisions.
    </p>
    `
  )
}

/**
 * Sends a 7-day retention expiry warning email.
 */
export async function sendExpiryWarningEmail(
  to: string,
  documentName: string,
  expiryDate: Date
): Promise<void> {
  const formattedDate = expiryDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  await sendEmail(
    to,
    'Your document will expire soon — Nexalaw',
    `
    <h2>Document Expiry Notice</h2>
    <p>Your document <strong>${documentName}</strong> will be automatically deleted on <strong>${formattedDate}</strong>.</p>
    <p>If you need to keep a copy, please download it from your Nexalaw dashboard before this date.</p>
    <hr />
    <p style="font-size: 12px; color: #666;">
      Documents are retained for 30 days per our data retention policy.
    </p>
    `
  )
}

/**
 * Sends a document deletion confirmation email.
 */
export async function sendDeletionConfirmationEmail(
  to: string,
  documentName: string
): Promise<void> {
  await sendEmail(
    to,
    'Your document has been deleted — Nexalaw',
    `
    <h2>Document Deleted</h2>
    <p>Your document <strong>${documentName}</strong> has been permanently deleted per our 30-day retention policy.</p>
    <hr />
    <p style="font-size: 12px; color: #666;">
      If you have questions about data retention, please contact our support team.
    </p>
    `
  )
}
