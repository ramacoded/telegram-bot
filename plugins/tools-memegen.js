// plugins/tools-memegen.js

import { downloadFile } from '../lib/functions.js'
import { uploader } from '../lib/uploader.js'
import fs from 'fs/promises'
import path from 'path'

export default {
  command: ['meme', 'smeme'],
  description: 'Membuat meme dari gambar dengan teks atas dan bawah.',
  category: 'Tools',
 
    execute: async (ctx) => {
    let tempImagePath
    try {
      const messageText = ctx.message.text || ctx.message.caption || ''
      const args = messageText.split(' ').slice(1).join(' ')
      if (!args || !args.includes('|')) {
        return ctx.reply('Format salah.\n\nContoh: /meme Teks Atas|Teks Bawah', { reply_to_message_id: ctx.message.message_id })
      }

      const replied = ctx.message.reply_to_message
      const photoMessage = replied?.photo ? replied : ctx.message
      
      if (!photoMessage.photo) {
        return ctx.reply('Silakan reply sebuah gambar atau kirim gambar dengan caption perintah ini.', { reply_to_message_id: ctx.message.message_id })
      }

      const processingMsg = await ctx.reply('⏳ Memproses gambar meme...', { reply_to_message_id: ctx.message.message_id })

      const fileId = photoMessage.photo[photoMessage.photo.length - 1].file_id
      const link = await ctx.telegram.getFileLink(fileId)
      const imageBuffer = await downloadFile(link.href)

      tempImagePath = path.join('tmp', `meme-src-${Date.now()}.jpg`)
      await fs.writeFile(tempImagePath, imageBuffer)
      
      const uploadedUrl = await uploader(tempImagePath)
      if (!uploadedUrl) {
        throw new Error('Gagal mengunggah gambar ke server.')
      }

      let [top, bottom] = args.split('|')
      top = encodeURIComponent(top.trim() || '_')
      bottom = encodeURIComponent(bottom.trim() || '_')
      const apiUrl = `https://api.memegen.link/images/custom/${top}/${bottom}.png?background=${uploadedUrl}`
      
      const memeBuffer = await downloadFile(apiUrl)

      // Langsung kirim sebagai gambar
      await ctx.replyWithPhoto(
          { source: memeBuffer },
          { 
              caption: '✅ Meme berhasil dibuat!',
              reply_to_message_id: ctx.message.message_id
          }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (e) {
      // Panggil handleError yang sudah global
      ctx.handleError(e, 'meme')
    } finally {
      if (tempImagePath) {
        await fs.unlink(tempImagePath).catch(() => {})
      }
    }
  }
}
