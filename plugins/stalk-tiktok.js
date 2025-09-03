import axios from 'axios'
import { downloadFile } from '../lib/functions.js'

export default {
command: ['stalktiktok', 'tiktokstalk'],
description: 'Mencari informasi pengguna TikTok.',
category: 'Stalking',

execute: async (ctx) => {
const user = ctx.message.text.split(' ').slice(1).join(' ').trim()

if (!user) {
return ctx.reply('Format salah. Masukkan username TikTok.\n\nContoh:\n/stalktiktok mrbeast')
}

let processingMsg
try {
processingMsg = await ctx.reply('🔍 Mencari informasi pengguna TikTok...', { reply_to_message_id: ctx.message.message_id })

const apiUrl = `https://api.siputzx.my.id/api/stalk/tiktok?username=${encodeURIComponent(user)}`

const { data } = await axios.get(apiUrl)

if (!data.status || !data.data.user) {
return ctx.reply('Pengguna tidak ditemukan atau terjadi kesalahan.')
}

const userInfo = data.data.user
const stats = data.data.stats
const imageBuffer = await downloadFile(userInfo.avatarLarger)
const createDate = new Date(userInfo.createTime * 1000).toLocaleDateString('id-ID', {
day: '2-digit',
month: 'long',
year: 'numeric'
})

const caption = `*Informasi Pengguna TikTok*\n\n` +
`*Username:* ${userInfo.uniqueId}\n` +
`*Nickname:* ${userInfo.nickname}\n` +
`*Bio:* ${userInfo.signature || 'N/A'}\n` +
`*Pengikut:* ${stats.followerCount}\n` +
`*Mengikuti:* ${stats.followingCount}\n` +
`*Total Suka:* ${stats.heartCount}\n` +
`*Jumlah Video:* ${stats.videoCount}\n` +
`*Terverifikasi:* ${userInfo.verified ? 'Ya' : 'Tidak'}\n` +
`*Link Bio:* ${userInfo.bioLink?.link || 'N/A'}\n` +
`*Bergabung pada:* ${createDate}`

await ctx.replyWithPhoto(
{ source: imageBuffer },
{
caption: caption,
parse_mode: 'Markdown',
reply_to_message_id: ctx.message.message_id
}
)

await ctx.deleteMessage(processingMsg.message_id)

} catch (error) {
if (processingMsg) {
await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
}
if (error.response && error.response.status === 400) {
ctx.reply('Pengguna tidak ditemukan atau terjadi kesalahan pada API.')
} else {
ctx.handleError(error, 'stalktiktok')
}
}
}
}