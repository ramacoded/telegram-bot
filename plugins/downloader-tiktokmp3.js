// plugins/downloader-tiktokmp3.js

import { tmpdir } from 'os'
import { spawn } from 'child_process'
import { randomBytes } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { downloadFile } from '../lib/functions.js'

/**
 * Mengonversi buffer media (video/audio) menjadi MP3 menggunakan FFmpeg.
 * @param {Buffer} buffer - Buffer dari file media.
 * @returns {Promise<Buffer>} Buffer dari file MP3 hasil konversi.
 */
async function toAudio(buffer) {
  const tempInputPath = path.join(tmpdir(), `${randomBytes(6).toString('hex')}.tmp`)
  const tempOutputPath = path.join(tmpdir(), `${randomBytes(6).toString('hex')}.mp3`)

  await fs.writeFile(tempInputPath, buffer)

  try {
    await new Promise((resolve, reject) => {
      const ffmpegProcess = spawn('ffmpeg', [
        '-y', '-i', tempInputPath, '-vn', '-acodec', 'libmp3lame', '-b:a', '128k', tempOutputPath
      ])
      ffmpegProcess.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with code ${code}`)))
      ffmpegProcess.on('error', (err) => reject(err))
    })
    return fs.readFile(tempOutputPath)
  } finally {
    // Selalu pastikan file sementara dihapus
    await fs.unlink(tempInputPath).catch(() => {})
    await fs.unlink(tempOutputPath).catch(() => {})
  }
}

function isUrl(string) {
  try { new URL(string); return true } catch (_) { return false }
}

export default {
  command: ['tiktokmp3', 'tiktokaudio', 'ttmp3'],
  description: 'Mengunduh video TikTok lalu mengonversinya menjadi MP3.',
  category: 'Downloader',

  execute: async (ctx) => {
    const args = ctx.message.text.split(' ')
    const link = args[1]

    if (!link || !isUrl(link) || !link.includes('tiktok.com')) {
      return ctx.reply('Format salah. Masukkan URL TikTok yang valid.')
    }

    let processingMsg
    try {
      processingMsg = await ctx.reply('⏳ Mengunduh video dan mengonversi ke MP3, mohon tunggu...')
      
      const apiUrl = `https://api.siputzx.my.id/api/d/tiktok?url=${encodeURIComponent(link)}`
      const response = await fetch(apiUrl)
      const data = await response.json()
      
      if (!data.status || !data.data?.urls?.[0]) {
        throw new Error(data.message || 'Gagal mendapatkan URL video dari API.')
      }
      const videoUrl = data.data.urls[0]

      // Unduh video ke buffer
      const videoBuffer = await downloadFile(videoUrl)
      
      // Gunakan fungsi toAudio yang Anda berikan untuk konversi
      const audioBuffer = await toAudio(videoBuffer)
      
      const title = data.data.metadata.title || 'Audio TikTok'
      const author = data.data.metadata.creator || 'Tidak diketahui'

      await ctx.replyWithAudio(
        { source: audioBuffer },
        {
          title: title,
          performer: author,
          caption: `✅ Audio berhasil diekstrak!\n\n*Judul:* ${title}\n*Artis:* ${author}`,
          parse_mode: 'Markdown',
          reply_to_message_id: ctx.message.message_id
        }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (error) {
      ctx.handleError(error, 'tiktokmp3')
      const errorMessage = `Gagal memproses permintaan.\n\nPenyebab: ${error.message}`
      if (processingMsg) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, errorMessage)
      } else {
        await ctx.reply(errorMessage)
      }
    }
  }
}
