// plugins/tools-tomp3.js

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
        '-y',              // Timpa file output jika sudah ada
        '-i', tempInputPath, // File input
        '-vn',             // Hilangkan video
        '-acodec', 'libmp3lame', // Codec audio MP3
        '-b:a', '128k',    // Bitrate audio 128kbps
        tempOutputPath     // File output
      ])

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          resolve()
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`))
        }
      })
      ffmpegProcess.on('error', (err) => reject(err))
    })

    const audioBuffer = await fs.readFile(tempOutputPath)
    return audioBuffer
  } finally {
    // Selalu pastikan file sementara dihapus
    await fs.unlink(tempInputPath).catch(() => {})
    await fs.unlink(tempOutputPath).catch(() => {})
  }
}

export default {
  command: ['tomp3', 'toaudio'],
  description: 'Mengonversi video atau voice note menjadi audio MP3.',
  category: 'Tools',

  execute: async (ctx) => {
    // Tentukan pesan mana yang akan diproses (pesan yang di-reply atau pesan saat ini)
    const targetMessage = ctx.message.reply_to_message || ctx.message
    const media = targetMessage.video || targetMessage.audio || targetMessage.voice

    if (!media) {
      return ctx.reply('Balas video, audio, atau voice note yang ingin diubah ke MP3, atau kirim media dengan caption perintah ini.')
    }
    
    let processingMsg
    try {
      processingMsg = await ctx.reply('⏳ Sedang mengonversi ke MP3, mohon tunggu...')
      
      const fileId = media.file_id
      const mediaBuffer = await downloadFile(await ctx.telegram.getFileLink(fileId))
      
      const audioBuffer = await toAudio(mediaBuffer)
      
      await ctx.replyWithAudio(
        { source: audioBuffer },
        { 
          fileName: 'converted_audio.mp3',
          reply_to_message_id: ctx.message.message_id
        }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (error) {
      ctx.handleError(error, 'tomp3')
      const errorMessage = `Gagal mengonversi ke MP3.\n\nPenyebab: ${error.message}`
      if (processingMsg) {
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, errorMessage)
      } else {
        await ctx.reply(errorMessage)
      }
    }
  }
}
