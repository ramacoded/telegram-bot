import { downloadFile } from '../lib/functions.js'

export default {
  command: ['magicstudio', 'mstudio'],
  description: 'Membuat gambar dari deskripsi teks menggunakan Magic Studio API.',
  category: 'API',

  execute: async (ctx) => {
    const prompt = ctx.message.text.split(' ').slice(1).join(' ').trim()

    if (!prompt) {
      return ctx.reply('Format salah. Masukkan deskripsi gambar setelah perintah.\n\nContoh:\n/magicstudio seekor kucing yang terbang di luar angkasa')
    }

    let processingMsg
    try {
      processingMsg = await ctx.reply('✨ AI sedang menggambar dengan Magic Studio, mohon tunggu...', { reply_to_message_id: ctx.message.message_id })
      
      const apiUrl = `https://api.siputzx.my.id/api/ai/magicstudio?prompt=${encodeURIComponent(prompt)}`
      
      const imageBuffer = await downloadFile(apiUrl)

      await ctx.replyWithPhoto(
        { source: imageBuffer },
        { 
          caption: `*Prompt:*\n_${prompt}_`,
          parse_mode: 'Markdown',
          reply_to_message_id: ctx.message.message_id
        }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (error) {
      if (processingMsg) {
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
      }
      ctx.handleError(error, 'magicstudio')
    }
  }
}