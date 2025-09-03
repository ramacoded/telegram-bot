import { downloadFile } from '../lib/functions.js'
import { uploader } from '../lib/uploader.js'
import fs from 'fs/promises'
import path from 'path'
export default {
command: ['qr2text', 'readqr'],
description: 'Membaca teks dari gambar QR Code.',
category: 'Tools',
execute: async (ctx) => {
let tempImagePath
try {
const replied = ctx.message.reply_to_message
const photoMessage = replied?.photo ? replied : ctx.message
if (!photoMessage.photo) {
return ctx.reply('Silakan reply sebuah gambar QR Code atau kirim gambar dengan caption perintah ini.')
}
const processingMsg = await ctx.reply('⏳ Membaca QR Code...')
const fileId = photoMessage.photo[photoMessage.photo.length - 1].file_id
const link = await ctx.telegram.getFileLink(fileId)
const imageBuffer = await downloadFile(link.href)
tempImagePath = path.join('tmp', `qr-src-${Date.now()}.jpg`)
await fs.writeFile(tempImagePath, imageBuffer)
const uploadedUrl = await uploader(tempImagePath)
if (!uploadedUrl) {
throw new Error('Gagal mengunggah gambar QR Code.')
}
const apiUrl = `https://api.siputzx.my.id/api/tools/qr2text?url=${uploadedUrl}`
const response = await fetch(apiUrl)
const data = await response.json()
if (!data.status || !data.data || !data.data.text) {
throw new Error(data.message || 'Gagal membaca QR Code dari gambar.')
}
const resultText = `
*QR Code Berhasil Dibaca* ✅

*Teks:*
\`\`\`
${data.data.text}
\`\`\`
`.trim()
await ctx.telegram.editMessageText(
ctx.chat.id,
processingMsg.message_id,
null,
resultText,
{ parse_mode: 'Markdown' }
)
} catch (e) {
if (processingMsg) {
await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
}
ctx.handleError(e, 'qr2text')
} finally {
if (tempImagePath) {
await fs.unlink(tempImagePath).catch(() => {})
}
}
}
}
