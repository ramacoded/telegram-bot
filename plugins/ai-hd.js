// plugins/ai-hd.js

import { downloadFile } from '../lib/functions.js'
import { Pxpic, upScale, remini } from '../lib/scraper.js' // Impor ketiga fungsi

export default {
  command: ['hd', 'hdr', 'remini', 'enhance'],
  description: 'Meningkatkan kualitas gambar menjadi HD menggunakan AI.',
  category: 'AI',

  execute: async (ctx) => {
    const replied = ctx.message.reply_to_message
    
    if (!replied || !replied.photo) {
      return ctx.reply('Perintah ini hanya berfungsi jika Anda me-reply sebuah gambar.')
    }
    
    let processingMsg
    try {
      processingMsg = await ctx.reply('⏳ Sedang meningkatkan kualitas gambar, mohon tunggu...')
      
      const fileId = replied.photo[replied.photo.length - 1].file_id
      const link = await ctx.telegram.getFileLink(fileId)
      const imageBuffer = await downloadFile(link.href)
      
      let resultBuffer

      // Mencoba API secara berurutan
      try {
        console.log('Mencoba API 1: Pxpic...')
        resultBuffer = await Pxpic(imageBuffer)
      } catch (e1) {
        console.error('Pxpic Gagal:', e1.message)
        try {
          console.log('Mencoba API 2: Pixelcut (upScale)...')
          resultBuffer = await upScale(imageBuffer)
        } catch (e2) {
          console.error('upScale Gagal:', e2.message)
          try {
            console.log('Mencoba API 3: Remini (vyro.ai)...')
            resultBuffer = await remini(imageBuffer)
          } catch (e3) {
            console.error('Remini Gagal:', e3.message)
            throw new Error('Semua API gagal memproses gambar.') // Lemparkan error final
          }
        }
      }

      // Kirim hasil jika salah satu API berhasil
      await ctx.replyWithPhoto(
        { source: resultBuffer },
        { 
          caption: '✅ Gambar berhasil ditingkatkan!',
          reply_to_message_id: ctx.message.message_id
        }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (error) {
      ctx.handleError(error, 'hd')
      const errorMessage = `Gagal memproses gambar.\n\nPenyebab: ${error.message}`
      if (processingMsg) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, errorMessage)
      } else {
        await ctx.reply(errorMessage)
      }
    }
  }
}
