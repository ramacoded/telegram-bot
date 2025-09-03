import axios from 'axios'

export default {
command: ['stalkgithub', 'githubstalk'],
description: 'Mencari informasi pengguna GitHub.',
category: 'Stalking',

execute: async (ctx) => {
const user = ctx.message.text.split(' ').slice(1).join(' ').trim()

if (!user) {
return ctx.reply('Format salah. Masukkan username GitHub.\n\nContoh:\n/stalkgithub octocat')
}

let processingMsg
try {
processingMsg = await ctx.reply('🔍 Mencari informasi pengguna GitHub...', { reply_to_message_id: ctx.message.message_id })

const apiUrl = `https://api.siputzx.my.id/api/stalk/github?user=${encodeURIComponent(user)}`

const { data } = await axios.get(apiUrl)

if (!data.status) {
throw new Error('Pengguna tidak ditemukan atau terjadi kesalahan.')
}

const info = data.data

const caption = `*Informasi Pengguna GitHub*\n\n` +
`*Username:* ${info.username}\n` +
`*Nickname:* ${info.nickname || 'N/A'}\n` +
`*Bio:* ${info.bio || 'N/A'}\n` +
`*Followers:* ${info.followers}\n` +
`*Following:* ${info.following}\n` +
`*Public Repos:* ${info.public_repo}\n` +
`*Public Gists:* ${info.public_gists}\n` +
`*Perusahaan:* ${info.company || 'N/A'}\n` +
`*Lokasi:* ${info.location || 'N/A'}\n` +
`*Blog:* ${info.blog || 'N/A'}\n` +
`*URL:* ${info.url}\n` +
`*Bergabung pada:* ${new Date(info.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`

await ctx.replyWithPhoto(
{ url: info.profile_pic },
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
ctx.handleError(error, 'stalkgithub')
}
}
}