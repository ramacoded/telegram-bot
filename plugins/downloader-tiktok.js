// plugins/downloader-tiktok.js

import { downloadFile } from '../lib/functions.js'
import fs from 'fs/promises'
import path from 'path'

const CAPTION_LIMIT = 1024

function isUrl(string) {
  try { new URL(string); return true }
  catch (_) { return false }
}

export default {
  command: ['tiktok', 'tt', 'ttdl'],
  description: 'Mengunduh video atau slideshow TikTok tanpa watermark dari URL.',
  category: 'Downloader',

  execute: async (ctx) => { // <-- { bot } sudah dihapus
    const args = ctx.message.text.split(' ').slice(1)
    const link = args[0]

    if (!link || !isUrl(link) || !link.includes('tiktok.com')) {
      return ctx.reply('Format salah. Masukkan URL TikTok yang valid.')
    }

    let processingMsg
    try {
      processingMsg = await ctx.reply('⏳ Sedang memproses link TikTok, mohon tunggu...')
      
      const apiUrl = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(link)}`
      const response = await fetch(apiUrl)
      const data = await response.json()

      if (!data.status || !data.data) {
        throw new Error(data.message || 'Gagal mendapatkan data dari API.')
      }

      const result = data.data
      const title = result.metadata.title || 'Tidak ada judul'
      const creator = result.metadata.creator || 'Tidak diketahui'
      const fullCaption = `*Judul:* ${title}\n*Author:* ${creator}`.trim()
      
      if (result.type === 'video') {
        const videoUrl = result.urls[0]
        const videoBuffer = await downloadFile(videoUrl)

        if (fullCaption.length > CAPTION_LIMIT) {
          await ctx.replyWithVideo({ source: videoBuffer }, { reply_to_message_id: ctx.message.message_id })
          const now = new Date(); const timestamp = now.toISOString().replace(/[:.]/g, '-'); const txtFileName = `caption-${timestamp}.txt`; const txtFilePath = path.join('tmp', txtFileName)
          await fs.writeFile(txtFilePath, fullCaption.replace(/[*_`]/g, '')) // Simpan sebagai teks biasa
          await ctx.replyWithDocument({ source: txtFilePath, filename: txtFileName }, { caption: 'Informasi video dikirim sebagai file karena caption terlalu panjang.' })
          await fs.unlink(txtFilePath)
        } else {
          await ctx.replyWithVideo({ source: videoBuffer }, { caption: fullCaption, parse_mode: 'Markdown', reply_to_message_id: ctx.message.message_id })
        }

      } else if (result.type === 'slideshow') {
        let mediaGroup = []
        
        // Cek panjang caption SEBELUM membuat media group
        if (fullCaption.length > CAPTION_LIMIT) {
            // Jika caption panjang, kirim semua gambar tanpa caption
            for (let i = 0; i < result.urls.length; i++) {
                if (i >= 10) break; // Batasi maksimal 10 media
                mediaGroup.push({ type: 'photo', media: result.urls[i][0] })
            }
            await ctx.replyWithMediaGroup(mediaGroup, { reply_to_message_id: ctx.message.message_id })

            // Kirim caption terpisah sebagai file txt
            const now = new Date(); const timestamp = now.toISOString().replace(/[:.]/g, '-'); const txtFileName = `caption-${timestamp}.txt`; const txtFilePath = path.join('tmp', txtFileName)
            await fs.writeFile(txtFilePath, fullCaption.replace(/[*_`]/g, ''))
            await ctx.replyWithDocument({ source: txtFilePath, filename: txtFileName }, { caption: 'Informasi slideshow dikirim sebagai file karena caption terlalu panjang.' })
            await fs.unlink(txtFilePath)
        } else {
            // Jika caption normal, buat media group dengan caption di gambar pertama
            for (let i = 0; i < result.urls.length; i++) {
                if (i >= 10) break; // Batasi maksimal 10 media
                const imageUrl = result.urls[i][0]
                if (i === 0) {
                    mediaGroup.push({ type: 'photo', media: imageUrl, caption: fullCaption, parse_mode: 'Markdown' })
                } else {
                    mediaGroup.push({ type: 'photo', media: imageUrl })
                }
            }
            await ctx.replyWithMediaGroup(mediaGroup, { reply_to_message_id: ctx.message.message_id })
        }
      } else {
        throw new Error('Tipe konten tidak didukung.')
      }

      await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id)

    } catch (error) {
      if (processingMsg) {
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
      }
      // Memanggil handleError dari ctx, tanpa { bot }
      ctx.handleError(error, 'tiktok')
    }
  }
}
