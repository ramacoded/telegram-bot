import { downloadFile } from '../lib/functions.js'
import { uploader } from '../lib/uploader.js'
import fs from 'fs/promises'
import path from 'path'
export default {
command: ['xnxx'],
description: 'Membuat gambar kanvas xnxx palsu.',
category: 'Canvas',
execute: async (ctx) => {
let tempImagePath
try {
const messageText = ctx.message.text || ctx.message.caption || ''
const args = messageText.split(' ').slice(1).join(' ')
if (!args) {
return ctx.reply('Format salah.\n\nContoh: /xnxx Judul Meme', { reply_to_message_id: ctx.message.message_id })
}
const replied = ctx.message.reply_to_message
const photoMessage = replied?.photo ? replied : ctx.message
if (!photoMessage.photo) {
return ctx.reply('Silakan reply sebuah gambar atau kirim gambar dengan caption perintah ini.', { reply_to_message_id: ctx.message.message_id })
}
const processingMsg = await ctx.reply('⏳ Memproses gambar...', { reply_to_message_id: ctx.message.message_id })
const fileId = photoMessage.photo[photoMessage.photo.length - 1].file_id
const link = await ctx.telegram.getFileLink(fileId)
const imageBuffer = await downloadFile(link.href)
tempImagePath = path.join('tmp', `meme-src-${Date.now()}.jpg`)
await fs.writeFile(tempImagePath, imageBuffer)
const uploadedUrl = await uploader(tempImagePath)
if (!uploadedUrl) {
throw new Error('Gagal mengunggah gambar ke server.')
}
const apiUrl = `https://api.siputzx.my.id/api/canvas/xnxx?title=${encodeURIComponent(args)}&image=${uploadedUrl}`
const resultBuffer = await downloadFile(apiUrl)
await ctx.replyWithPhoto(
{ source: resultBuffer },
{
caption: '✅ Gambar berhasil dibuat!',
reply_to_message_id: ctx.message.message_id
}
)
await ctx.deleteMessage(processingMsg.message_id)
} catch (e) {
ctx.handleError(e, 'xnxx')
} finally {
if (tempImagePath) {
await fs.unlink(tempImagePath).catch(() => {})
}
}
}
}
