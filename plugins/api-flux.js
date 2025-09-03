// plugins/ai-flux.js

import { downloadFile } from '../lib/functions.js'

export default {
  command: ['flux', 'fluxai'],
  description: 'Membuat gambar dari deskripsi teks menggunakan Flux API.',
  category: 'API',

  execute: async (ctx) => {
    // Ambil semua teks setelah perintah
    const prompt = ctx.message.text.split(' ').slice(1).join(' ').trim()

    if (!prompt) {
      return ctx.reply('Format salah. Masukkan deskripsi gambar setelah perintah.\n\nContoh:\n/flux seekor kadal cyberpunk')
    }

    let processingMsg
    try {
      processingMsg = await ctx.reply('🎨 AI sedang menggambar dengan Flux, mohon tunggu...', { reply_to_message_id: ctx.message.message_id })
      
      const apiUrl = `https://api.siputzx.my.id/api/ai/flux?prompt=${encodeURIComponent(prompt)}`
      
      // Panggil API dan unduh hasilnya
      const imageBuffer = await downloadFile(apiUrl)

      // Kirim hasil gambar
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
      ctx.handleError(error, 'flux')
    }
  }
}
