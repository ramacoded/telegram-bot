// plugins/owner-savefile.js

import fs from 'fs'
import path from 'path'
import config from '../config.js'
import { downloadFile } from '../lib/functions.js'

/**
 * Helper function untuk mendapatkan file_id dan file_name dari berbagai jenis media.
 * @param {import('telegraf').Context['message']['reply_to_message']} repliedMessage 
 * @returns {{fileId: string, fileName: string} | null}
 */
function getFileInfo(repliedMessage) {
  const msg = repliedMessage
  if (!msg) return null

  if (msg.document) {
    return { fileId: msg.document.file_id, fileName: msg.document.file_name }
  }
  if (msg.photo) {
    const photo = msg.photo[msg.photo.length - 1]
    return { fileId: photo.file_id, fileName: `${photo.file_unique_id}.jpg` }
  }
  if (msg.video) {
    return { fileId: msg.video.file_id, fileName: msg.video.file_name || `${msg.video.file_unique_id}.mp4` }
  }
  if (msg.audio) {
    return { fileId: msg.audio.file_id, fileName: msg.audio.file_name || `${msg.audio.file_unique_id}.mp3` }
  }
  if (msg.voice) {
    return { fileId: msg.voice.file_id, fileName: `${msg.voice.file_unique_id}.ogg` }
  }
  return null
}

export default {
  command: ['savefile', 'sf'],
  description: 'Menyimpan file yang di-reply ke direktori server.',
  category: 'Owner',

  execute: async (ctx) => {
    // 1. Cek Otorisasi Owner
    if (!config.ownerIds.includes(ctx.from.id)) {
      return ctx.reply('Perintah ini hanya untuk Owner Bot.')
    }

    const replied = ctx.message.reply_to_message
    const parts = ctx.message.text.split(' ')
    const dest = parts[1] || ''

    // 2. Jika tidak ada pesan yang di-reply
    if (!replied) {
      if (!dest) {
        const rootDir = path.resolve('./')
        const list = fs.readdirSync(rootDir)
          .map(name => {
            const stats = fs.statSync(path.join(rootDir, name))
            return { name, isDir: stats.isDirectory() }
          })
          .sort((a, b) => {
            if (a.isDir && !b.isDir) return -1
            if (!a.isDir && b.isDir) return 1
            return a.name.localeCompare(b.name)
          })
          // Mengganti emoji dengan indikator teks
          .map(item => item.isDir ? `[D] */${item.name}/*` : `[F] *${item.name}*`)
          .join('\n')

        // Menghapus emoji dari pesan
        return ctx.replyWithMarkdown(
`*Contoh Penggunaan:*\n`.concat(
`*/sf* (reply file) -> simpan di root\n`,
`*/sf plugins* (reply file) -> simpan di folder plugins\n\n`,
`*Root Directory:*\n${list}`
        ))
      }
      return ctx.reply('Reply file yang akan disimpan.')
    }

    // 3. Jika ada pesan yang di-reply, proses filenya
    const fileInfo = getFileInfo(replied)
    if (!fileInfo) {
      return ctx.reply('Tidak ada file yang bisa diunduh dari pesan yang di-reply.')
    }
    
    try {
      const link = await ctx.telegram.getFileLink(fileInfo.fileId)
      const buffer = await downloadFile(link.href)
      
      const folder = dest.startsWith('/') ? dest.slice(1) : dest || ''
      const fullpath = path.join(folder, fileInfo.fileName)
      
      fs.mkdirSync(path.dirname(fullpath), { recursive: true })
      fs.writeFileSync(fullpath, buffer)
      
      // DIUBAH: Menggunakan replyWithMarkdown untuk memformat path file
      await ctx.replyWithMarkdown(`Berhasil disimpan sebagai:\n*${fullpath}*`)

    } catch (error) {
      ctx.handleError(error, 'savefile')
    }
  }
}
