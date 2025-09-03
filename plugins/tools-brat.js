// plugins/tools-brat.js

import fetch from 'node-fetch'
import { downloadFile } from '../lib/functions.js' // Impor helper yang diperlukan

const Enc = (text) => encodeURIComponent(text)

export default {
  command: ['brat'],
  description: 'Membuat gambar dari teks (Text to Image).', // Deskripsi diperbarui
  category: 'Tools',

  execute: async (ctx) => {
    const args = ctx.message.text.split(' ').slice(1)
    const text = args.join(' ')

    if (!text) {
      return ctx.reply('Format salah. Masukkan teks setelah perintah.\n\nContoh:\n/brat halo semua', { reply_to_message_id: ctx.message.message_id })
    }

    if (text.length > 250) {
      return ctx.reply('Teks terlalu panjang. Maksimal 250 karakter.', { reply_to_message_id: ctx.message.message_id })
    }

    let processingMsg
    try {
      processingMsg = await ctx.reply('⏳ Sedang membuat gambar dari teks...', { reply_to_message_id: ctx.message.message_id })

      const apiUrl = `https://aqul-brat.hf.space/?text=${Enc(text)}`
      const imageBuffer = await downloadFile(apiUrl)

      // --- PERUBAHAN DI SINI: Kirim sebagai FOTO ---
      await ctx.replyWithPhoto({ source: imageBuffer }, {
        caption: '✅ Gambar dari teks berhasil dibuat!',
        reply_to_message_id: ctx.message.message_id
      })
      // --- AKHIR PERUBAHAN ---

      await ctx.deleteMessage(processingMsg.message_id)

    } catch (error) {
      if (processingMsg) {
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
      }
      // Panggil handleError dari ctx
      ctx.handleError(error, 'brat')
    }
  }
}



