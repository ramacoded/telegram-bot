// lib/scraper.js

import { Blob } from 'buffer'
import fs from 'fs'
import { fileTypeFromBuffer } from 'file-type'

const API_BASE_URL = 'https://api4g.iloveimg.com'
const WEB_URL = 'https://www.iloveimg.com/id/hapus-latar-belakang'

export async function removeBg(imageBuffer) {
  // Step 1 & 2: Dapatkan token dan task ID
  const pageResponse = await fetch(WEB_URL)
  const html = await pageResponse.text()
  const token = html.match(/ey[a-zA-Z0-9?%-_/]+/g)[1]
  const taskId = html.match(/taskId = '(\w+)/)[1]
  if (!token || !taskId) throw new Error('Gagal mendapatkan Token atau Task ID dari iLoveIMG.')
  const authHeader = { 'Authorization': `Bearer ${token}` }

  // Step 3: Upload gambar
  const fileName = Math.random().toString(36).slice(2) + '.jpg'
  const uploadForm = new FormData()
  uploadForm.append('name', fileName)
  uploadForm.append('chunk', '0')
  uploadForm.append('chunks', '1')
  uploadForm.append('task', taskId)
  const imageBlob = new Blob([imageBuffer])
  uploadForm.append('file', imageBlob, fileName)

  const uploadResponse = await fetch(`${API_BASE_URL}/v1/upload`, {
    method: 'POST',
    headers: authHeader,
    body: uploadForm
  })
  if (!uploadResponse.ok) throw new Error('Gagal mengupload gambar ke iLoveIMG.')
  const { server_filename: serverFilename } = await uploadResponse.json()

  // Step 4: Proses remove background
  const processForm = new FormData()
  processForm.append('task', taskId)
  processForm.append('server_filename', serverFilename)

  const processResponse = await fetch(`${API_BASE_URL}/v1/removebackground`, {
    method: 'POST',
    headers: authHeader,
    body: processForm
  })

  const contentType = processResponse.headers.get('content-type')
  if (!processResponse.ok || !contentType.startsWith('image/')) {
    throw new Error('Gagal memproses gambar. Server tidak mengembalikan hasil gambar.')
  }

  // DIUBAH: Menggunakan .arrayBuffer() dan mengubahnya menjadi Buffer
  const arrayBuffer = await processResponse.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

/**
 * API 1: Pxpic Enhancer (versi fetch)
 * @param {Buffer} imageBuffer Buffer gambar
 * @returns {Promise<Buffer>} Buffer gambar hasil
 */
export async function Pxpic(imageBuffer) {
  const { ext, mime } = await fileTypeFromBuffer(imageBuffer) || { ext: 'bin', mime: 'application/octet-stream' }
  const fileName = Math.random().toString(36).slice(2, 8) + '.' + ext

  const presignedUrlResponse = await fetch("https://pxpic.com/getSignedUrl", {
    method: 'POST',
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folder: "uploads", fileName })
  })
  const presignedData = await presignedUrlResponse.json()

  await fetch(presignedData.presignedUrl, {
    method: 'PUT',
    headers: { "Content-Type": mime },
    body: imageBuffer
  })
  const url = "https://files.fotoenhancer.com/uploads/" + fileName

  const apiResponse = await fetch("https://pxpic.com/callAiFunction", {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ imageUrl: url, targetFormat: 'png', aiFunction: 'enhance' }).toString()
  })
  const resultData = await apiResponse.json()

  if (!resultData?.resultImageUrl) throw new Error('Pxpic failed to return an image URL.')
  
  const resultResponse = await fetch(resultData.resultImageUrl)
  const resultBuffer = await resultResponse.arrayBuffer()
  return Buffer.from(resultBuffer)
}

/**
 * API 2: Pixelcut Upscaler (versi fetch)
 * @param {Buffer} imageBuffer Buffer gambar
 * @returns {Promise<Buffer>} Buffer gambar hasil
 */
export async function upScale(imageBuffer) {
  const form = new FormData()
  form.append("image", imageBuffer, { filename: 'image.jpeg' })
  form.append("scale", 2)

  const response = await fetch("https://api2.pixelcut.app/image/upscale/v1", {
    method: 'POST',
    headers: form.getHeaders(),
    body: form
  })

  if (!response.ok) throw new Error(`Pixelcut API returned status ${response.status}`)
  const resultBuffer = await response.arrayBuffer()
  return Buffer.from(resultBuffer)
}

/**
 * API 3: Remini/Vyro Enhancer (versi fetch)
 * @param {Buffer} imageBuffer Buffer gambar
 * @returns {Promise<Buffer>} Buffer gambar hasil
 */
export async function remini(imageBuffer) {
  const form = new FormData()
  form.append('model_version', 1)
  form.append('image', imageBuffer, { filename: 'enhance.jpg', contentType: 'image/jpeg' })

  const response = await fetch('https://inferenceengine.vyro.ai/enhance', {
    method: 'POST',
    headers: { 'User-Agent': 'okhttp/4.9.3' },
    body: form
  })

  if (!response.ok) throw new Error(`Vyro API returned status ${response.status}`)
  const resultBuffer = await response.arrayBuffer()
  return Buffer.from(resultBuffer)
}

