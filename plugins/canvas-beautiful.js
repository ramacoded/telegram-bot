// plugins/canvas-beautiful.js

import { downloadFile } from '../lib/functions.js'
import { uploader } from '../lib/uploader.js'
import fs from 'fs/promises'
import path from 'path'

export default {
  command: ['beautiful'],
  description: 'Memberikan efek "beautiful" pada wajah di gambar.',
  category: 'Canvas',

  execute: async (ctx) => {
    let tempImagePath
    try {
      const replied = ctx.message.reply_to_message
      const photoMessage = replied?.photo ? replied : ctx.message
      
      if (!photoMessage.photo) {
        return ctx.reply('Silakan reply sebuah gambar atau kirim gambar dengan caption perintah ini.')
      }

      const processingMsg = await ctx.reply('✨ Sedang memproses gambar, mohon tunggu...')

      // 1. Download gambar dari Telegram
      const fileId = photoMessage.photo[photoMessage.photo.length - 1].file_id
      const link = await ctx.telegram.getFileLink(fileId)
      const imageBuffer = await downloadFile(link.href)

      // 2. Simpan & Upload gambar sumber ke uploader
      tempImagePath = path.join('tmp', `beautiful-src-${Date.now()}.jpg`)
      await fs.writeFile(tempImagePath, imageBuffer)
      const uploadedUrl = await uploader(tempImagePath)
      if (!uploadedUrl) throw new Error('Gagal mengunggah gambar sumber.')

      // 3. Panggil API beautiful dengan URL gambar yang sudah diunggah
      const apiUrl = `https://api.siputzx.my.id/api/m/beautiful?image=${uploadedUrl}`
      const resultBuffer = await downloadFile(apiUrl)

      // 4. Kirim hasil gambar
      await ctx.replyWithPhoto(
        { source: resultBuffer },
        {
          caption: '✅ Gambar berhasil diproses!',
          reply_to_message_id: ctx.message.message_id
        }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (e) {
      if (processingMsg) await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
      ctx.handleError(e, 'beautiful')
    } finally {
      // 5. Selalu hapus file sementara setelah selesai
      if (tempImagePath) {
        await fs.unlink(tempImagePath).catch(() => {})
      }
    }
  }
}
