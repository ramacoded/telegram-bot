import { downloadFile } from '../lib/functions.js'
export default {
command: ['roblox', 'robloxstalk'],
description: 'Mencari informasi akun pengguna Roblox.',
category: 'Stalking',
execute: async (ctx) => {
const args = ctx.message.text.split(' ').slice(1)
const username = args[0]
if (!username) {
return ctx.reply('Format salah.\n\nContoh: /roblox nama_pengguna')
}
let processingMsg
try {
processingMsg = await ctx.reply(`⏳ Mencari informasi untuk pengguna Roblox: ${username}...`)
const apiUrl = `https://api.siputzx.my.id/api/stalk/roblox?user=${encodeURIComponent(username)}`
const response = await fetch(apiUrl)
const data = await response.json()
if (!data.status || !data.data) {
throw new Error(data.message || 'Gagal mendapatkan data pengguna.')
}
const profile = data.data
const basicInfo = profile.basic
const presence = profile.presence.userPresences[0] || {}
const social = profile.social
const avatarUrl = profile.avatar.headshot.data[0]?.imageUrl
const profileText = `
*Profil Roblox Ditemukan* 🎮

*Nama:* \`${basicInfo.name}\`
*Nama Tampilan:* ${basicInfo.displayName}
*ID Pengguna:* \`${basicInfo.id}\`
*Status:* ${presence.userPresenceType === 2 ? '🟢 In-Game' : presence.userPresenceType === 1 ? '🌐 Online' : '⚪️ Offline'}
*Terakhir Terlihat:* ${presence.lastLocation || 'Tidak diketahui'}

*Bergabung Pada:*
${new Date(basicInfo.created).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}

*Pengikut:* ${social.followers.count}
*Mengikuti:* ${social.following.count}
*Teman:* ${social.friends.count}

*Tentang:*
_${basicInfo.description || 'Tidak ada deskripsi.'}_

*Link Profil:*
[Kunjungi Profil](https://www.roblox.com/users/${basicInfo.id}/profile)
`.trim()
if (avatarUrl) {
const avatarBuffer = await downloadFile(avatarUrl)
await ctx.replyWithPhoto(
{ source: avatarBuffer },
{
caption: profileText,
parse_mode: 'Markdown',
reply_to_message_id: ctx.message.message_id
}
)
} else {
await ctx.replyWithMarkdown(profileText, { reply_to_message_id: ctx.message.message_id })
}
await ctx.deleteMessage(processingMsg.message_id)
} catch (error) {
if (processingMsg) {
await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
}
ctx.handleError(error, 'roblox')
}
}
}
