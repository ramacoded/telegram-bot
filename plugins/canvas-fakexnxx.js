// plugins/canvas-fakexnxx.js
import { downloadFile } from '../lib/functions.js'
export default {
command: ['fakexnxx'],
description: 'Membuat gambar kanvas komentar xnxx palsu.',
category: 'Canvas',
execute: async (ctx) => {
const args = ctx.message.text.split(' ').slice(1).join(' ')
if (!args || !args.includes('|')) {
return ctx.reply('Format salah.\n\nContoh: /fakexnxx Nama|Komentar')
}
let [name, quote] = args.split('|')
const likes = Math.floor(Math.random() * 1000)
const dislikes = Math.floor(Math.random() * 200)
const apiUrl = `https://api.siputzx.my.id/api/canvas/fake-xnxx?name=${encodeURIComponent(name.trim())}&quote=${encodeURIComponent(quote.trim())}&likes=${likes}&dislikes=${dislikes}`
let processingMsg
try {
processingMsg = await ctx.reply('⏳ Sedang membuat gambar...')
const imageBuffer = await downloadFile(apiUrl)
await ctx.replyWithPhoto(
{ source: imageBuffer },
{
caption: '✅ Gambar berhasil dibuat!',
reply_to_message_id: ctx.message.message_id
}
)
await ctx.deleteMessage(processingMsg.message_id)
} catch (error) {
if (processingMsg) {
await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
}
ctx.handleError(error, 'fakexnxx')
}
}
}
