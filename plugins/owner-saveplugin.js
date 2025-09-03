// plugins/owner-saveplugin.js

import fs from 'fs'
import path from 'path'
import config from '../config.js'
import { downloadFile } from '../lib/functions.js' // Mengimpor fungsi download

/**
 * Helper function untuk mendapatkan info file dari berbagai jenis media.
 * @param {import('telegraf').Context['message']['reply_to_message']} repliedMessage 
 * @returns {{fileId: string, fileName: string} | null}
 */
function getFileInfo(repliedMessage) {
  const msg = repliedMessage
  if (!msg) return null

  if (msg.document) return { fileId: msg.document.file_id, fileName: msg.document.file_name }
  if (msg.photo) {
    const photo = msg.photo[msg.photo.length - 1]
    return { fileId: photo.file_id, fileName: `${photo.file_unique_id}.jpg` }
  }
  if (msg.video) return { fileId: msg.video.file_id, fileName: msg.video.file_name || `${msg.video.file_unique_id}.mp4` }
  return null
}

export default {
  command: ['saveplugin', 'sp'],
  description: 'Menyimpan pesan yang di-reply sebagai file plugin.',
  category: 'Owner',

  execute: async (ctx, { __dirname }) => {
    // 1. Cek Otorisasi Owner
    if (!config.ownerIds.includes(ctx.from.id)) {
      return ctx.reply('❌ Perintah ini hanya untuk Owner Bot.')
    }
    
    const replied = ctx.message.reply_to_message
    const parts = ctx.message.text.split(' ')
    const newFileName = parts[1]

    // 2. Validasi Input
    if (!newFileName) {
      return ctx.reply(`📝 Masukkan nama untuk file plugin baru.\n\nContoh:\n/sp test-command`)
    }
    if (!replied) {
      return ctx.reply('💬 Reply sebuah pesan (teks atau file) yang ingin Anda simpan.')
    }

    const pluginsPath = path.join(__dirname, 'plugins')
    const fileNameWithExt = newFileName.endsWith('.js') ? newFileName : `${newFileName}.js`
    const filePath = path.join(pluginsPath, fileNameWithExt)

    try {
      let fileContent

      // 3. Cek apakah yang di-reply adalah teks atau file media
      if (replied.text) {
        fileContent = replied.text
      } else {
        const fileInfo = getFileInfo(replied)
        if (!fileInfo) {
          return ctx.reply('❌ Tidak ada konten yang bisa disimpan dari pesan yang di-reply.')
        }
        
        const link = await ctx.telegram.getFileLink(fileInfo.fileId)
        fileContent = await downloadFile(link.href)
      }

      // 4. Tulis konten ke file
      fs.writeFileSync(filePath, fileContent)
      
      ctx.reply(`✅ Berhasil menyimpan file sebagai *plugins/${fileNameWithExt}*!`, { parse_mode: 'Markdown' })
      
    } catch (error) {
      ctx.handleError(error, 'saveplugin')
    }
  }
}
