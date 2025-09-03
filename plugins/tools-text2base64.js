export default {
command: ['text2base64', 'base64enc'],
description: 'Mengubah teks menjadi format Base64.',
category: 'Tools',
execute: async (ctx) => {
const args = ctx.message.text.split(' ').slice(1)
const text = args.join(' ')
if (!text) {
return ctx.reply('Format salah.\n\nContoh: /text2base64 Hello World')
}
let processingMsg
try {
processingMsg = await ctx.reply('⏳ Mengonversi teks ke Base64...')
const apiUrl = `https://api.siputzx.my.id/api/tools/text2base64?text=${encodeURIComponent(text)}`
const response = await fetch(apiUrl)
const data = await response.json()
if (!data.status || !data.data || !data.data.base64) {
throw new Error(data.message || 'Gagal mengonversi teks.')
}
await ctx.deleteMessage(processingMsg.message_id)
const infoText = `${data.data.base64}`
await ctx.reply(infoText, { 
parse_mode: 'Markdown', 
reply_to_message_id: ctx.message.message_id 
})
} catch (error) {
if (processingMsg) {
await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
}
ctx.handleError(error, 'text2base64')
}
}
}
