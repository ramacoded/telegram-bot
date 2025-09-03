// plugins/owner-getfile.js

import { join } from 'path'
import { existsSync } from 'fs'
import config from '../config.js'

export default {
  command: ['getfile', 'getplugin', 'gf'],
  description: 'Mengambil dan mengirim file plugin dari server.',
  category: 'Owner',

  /**
   * @param {import('telegraf').Context} ctx
   * @param {Object} args
   * @param {string} args.__dirname
   */
  execute: async (ctx, { __dirname }) => {
    // 1. Cek Otorisasi Owner
    if (!config.ownerIds.includes(ctx.from.id)) {
      return ctx.reply('Akses ditolak. Perintah ini khusus untuk owner.')
    }
    
    // 2. Parsing Argumen
    const parts = ctx.message.text.split(' ')
    const pluginName = parts[1]

    if (!pluginName) {
      return ctx.replyWithMarkdown('Nama file tidak boleh kosong.\n\n*Contoh Penggunaan:*\n`/getfile main-menu`')
    }

    // 3. Tentukan path dan cek apakah file ada
    const filename = pluginName.trim() + '.js'
    const filepath = join(__dirname, 'plugins', filename)

    if (!existsSync(filepath)) {
      return ctx.reply(`File tidak ditemukan di direktori plugins: ${filename}`)
    }
    
    // 4. Kirim file sebagai dokumen
    try {
      await ctx.replyWithDocument(
        { source: filepath, filename: filename },
        {
          caption: `Berikut adalah file yang diminta: \`${filename}\``,
          parse_mode: 'MarkdownV2',
          reply_to_message_id: ctx.message.message_id 
        }
      )
    } catch (error) {
      ctx.handleError(error, 'getfile')
    }
  }
}
