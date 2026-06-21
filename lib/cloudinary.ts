import { v2 as cloudinary } from 'cloudinary'
import { writeFile, mkdir, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { CLOUDINARY_FOLDER, SIGNED_URL_EXPIRY_SECONDS } from '@/constants'

const LOCAL_UPLOADS_DIR = join(process.cwd(), 'public', 'uploads')
const LOCAL_PREFIX = 'local::'

function isCloudinaryConfigured(): boolean {
  const key = process.env.CLOUDINARY_API_KEY
  const secret = process.env.CLOUDINARY_API_SECRET
  const name = process.env.CLOUDINARY_CLOUD_NAME
  if (!key || !secret || !name) return false
  if (key === '123456789012345' || secret === 'test-cloudinary-secret-key' || name === 'nexalaw-test') return false
  return true
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string
): Promise<string> {
  if (isCloudinaryConfigured()) {
    try {
      return await new Promise<string>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: CLOUDINARY_FOLDER,
            resource_type: 'raw',
            public_id: `${Date.now()}-${fileName.replace(/\.[^/.]+$/, '')}`,
          },
          (error, result) => {
            if (error) { reject(error); return }
            if (!result) { reject(new Error('Cloudinary upload returned no result')); return }
            resolve(result.public_id)
          }
        )
        uploadStream.end(fileBuffer)
      })
    } catch (err) {
      console.warn('[storage] Cloudinary upload failed, falling back to local storage:', err)
    }
  }

  if (!existsSync(LOCAL_UPLOADS_DIR)) {
    await mkdir(LOCAL_UPLOADS_DIR, { recursive: true })
  }

  const safeName = `${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const filePath = join(LOCAL_UPLOADS_DIR, safeName)
  await writeFile(filePath, fileBuffer)
  return `${LOCAL_PREFIX}${safeName}`
}

export function getSignedUrl(storageRef: string): string {
  if (storageRef.startsWith(LOCAL_PREFIX)) {
    const fileName = storageRef.slice(LOCAL_PREFIX.length)
    return `/uploads/${fileName}`
  }

  return cloudinary.url(storageRef, {
    type: 'authenticated',
    sign_url: true,
    resource_type: 'raw',
    expires_at: Math.floor(Date.now() / 1000) + SIGNED_URL_EXPIRY_SECONDS,
  })
}

export async function deleteFromCloudinary(storageRef: string): Promise<void> {
  if (storageRef.startsWith(LOCAL_PREFIX)) {
    const fileName = storageRef.slice(LOCAL_PREFIX.length)
    const filePath = join(LOCAL_UPLOADS_DIR, fileName)
    try {
      await unlink(filePath)
    } catch {
      // File may already be deleted
    }
    return
  }

  await cloudinary.uploader.destroy(storageRef, { resource_type: 'raw' })
}

export { cloudinary }
