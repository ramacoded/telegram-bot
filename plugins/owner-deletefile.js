// plugins/owner-deletefile.js

import { join } from 'path'
import { unlinkSync, existsSync, readdirSync } from 'fs'
import config from '../config.js'

export default {
  command: ['deletefile', 'df'],
  description: 'Menghapus file plugin dari sistem.',
  category: 'Owner',
  
  /**
   * @param {import('telegraf').Context} ctx
   * @param {Object} args
   * @param {string} args.__dirname
   */
  execute: (ctx, { __dirname }) => {
    // 1. Cek Otorisasi Owner
    const senderId = ctx.from.id
    if (!config.ownerIds.includes(senderId)) {
      return ctx.reply('Akses ditolak. Perintah ini khusus untuk owner.')
    }
    
    // 2. Parsing Argumen
    const parts = ctx.message.text.split(' ')
    const pluginNameToDelete = parts[1]

    // 3. Validasi Input
    if (!pluginNameToDelete) {
      return ctx.replyWithMarkdown('Nama file tidak boleh kosong.\n\n*Contoh Penggunaan:*\n`/deletefile main-menu`')
    }
    
    const pluginsPath = join(__dirname, 'plugins')
    const fileName = pluginNameToDelete.endsWith('.js') ? pluginNameToDelete : `${pluginNameToDelete}.js`
    const filePath = join(pluginsPath, fileName)

    // 4. Cek apakah file ada
    if (!existsSync(filePath)) {
      const allPlugins = readdirSync(pluginsPath)
        .filter(file => file.endsWith('.js'))
        .map(file => `• \`${file.replace('.js', '')}\``)
        .join('\n')
      
      return ctx.replyWithMarkdown(`Plugin tidak ditemukan: \`${pluginNameToDelete}\`\n\n*Plugin yang tersedia:*\n${allPlugins}`)
    }

    // 5. Hapus File
    try {
      unlinkSync(filePath)
      ctx.replyWithMarkdown(`File plugin \`${fileName}\` telah berhasil dihapus.\n\nPerintah terkait telah dinonaktifkan dari memori secara otomatis oleh watcher.`)
    } catch (error) {
      ctx.handleError(error, 'deletefile')
    }
  }
}
