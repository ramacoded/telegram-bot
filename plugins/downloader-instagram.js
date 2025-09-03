import axios from 'axios'
import { downloadFile } from '../lib/functions.js'

export default {
command: ['igdl', 'instagram'],
description: 'Mengunduh video atau foto dari Instagram.',
category: 'Downloader',

execute: async (ctx) => {
const url = ctx.message.text.split(' ').slice(1).join(' ').trim()

if (!url || !url.includes('instagram.com')) {
return ctx.reply('Format salah. Masukkan URL Instagram yang valid.\n\nContoh:\n/igdl https://www.instagram.com/reel/DMNiqN2TV3v/')
}

let processingMsg
try {
processingMsg = await ctx.reply('Sedang memproses, harap tunggu...', { reply_to_message_id: ctx.message.message_id })

const apiUrl = `https://api.siputzx.my.id/api/d/igdl?url=${encodeURIComponent(url)}`

const { data } = await axios.get(apiUrl)

if (!data.status || !data.data || data.data.length === 0) {
throw new Error('Gagal mendapatkan data atau tidak ada media yang ditemukan.')
}

for (const item of data.data) {
const mediaUrl = item.url
const mediaBuffer = await downloadFile(mediaUrl)

if (mediaUrl.includes('.mp4')) {
await ctx.replyWithVideo(
{ source: mediaBuffer },
{ reply_to_message_id: ctx.message.message_id }
)
} else {
await ctx.replyWithPhoto(
{ source: mediaBuffer },
{ reply_to_message_id: ctx.message.message_id }
)
}
}

await ctx.deleteMessage(processingMsg.message_id)

} catch (error) {
if (processingMsg) {
await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
}
ctx.handleError(error, 'igdl')
}
}
}