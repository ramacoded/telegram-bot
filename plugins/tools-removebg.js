import { downloadFile, generateRandomId } from '../lib/functions.js'
import { removeBg } from '../lib/scraper.js'
export default {
command: ['removebg', 'nobg'],
description: 'Menghapus latar belakang dari gambar atau stiker (via iLoveIMG Scraper).',
category: 'Tools',
execute: async (ctx) => {
const replied = ctx.message.reply_to_message
let fileId
if (replied && replied.photo) {
fileId = replied.photo?.[replied.photo.length - 1]?.file_id
} else if (replied && replied.sticker && !replied.sticker.is_animated) {
fileId = replied.sticker.file_id
} else {
return ctx.reply('Perintah ini hanya berfungsi jika Anda me-reply sebuah gambar atau stiker.')
}
let processingMsg
try {
processingMsg = await ctx.reply('⏳ Menghapus latar belakang via iLoveIMG, mohon tunggu...')
const link = await ctx.telegram.getFileLink(fileId)
const imageBuffer = await downloadFile(link.href)
const resultBuffer = await removeBg(imageBuffer)
const randomName = generateRandomId(8)
await ctx.replyWithDocument(
{ source: resultBuffer, filename: `${randomName}-removebg.png` },
{
caption: '✅ Latar belakang berhasil dihapus!',
reply_to_message_id: ctx.message.message_id
}
)
await ctx.deleteMessage(processingMsg.message_id)
} catch (error) {
if (processingMsg) {
await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
}
ctx.handleError(error, 'removebg')
}
}
}
