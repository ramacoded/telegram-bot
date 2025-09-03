// plugins/owner-backup.js

import { promisify } from 'util'
import { exec as _exec } from 'child_process'
import fs from 'fs/promises'
import path from 'path'
import config from '../config.js'

const exec = promisify(_exec)

export default {
  command: ['backup', 'bk'],
  description: 'Membuat dan mengirim file cadangan (backup) seluruh skrip bot.',
  category: 'Owner',

  execute: async (ctx) => {
    if (!config.ownerIds.includes(ctx.from.id)) {
      return ctx.reply('❌ Perintah ini hanya untuk Owner Bot.')
    }

    await ctx.reply('⏳ Sedang membuat file cadangan, mohon tunggu...')

    const backupDir = 'tmp'
    const backupPath = path.join(backupDir, 'backup.zip')

    try {
      await fs.mkdir(backupDir, { recursive: true })

      // --- PERINTAH ZIP DIPERBARUI DENGAN PETIK TUNGGAL ---
      await exec(`zip -r ${backupPath} . -x 'node_modules/*' -x '${backupDir}/*' -x '.npm/*' -x '*.zip' -x 'package-lock.json'`)

      await ctx.replyWithDocument(
        { 
          source: backupPath,
          filename: `backup-${new Date().toISOString().split('T')[0]}.zip`
        },
        { 
          caption: '✅ Berhasil membuat cadangan skrip.',
          reply_to_message_id: ctx.message.message_id
        }
      )

    } catch (error) {
      console.error('Gagal membuat backup:', error)
      await ctx.reply(`❌ Gagal membuat cadangan:\n\n\`\`\`${error.message}\`\`\``, { parse_mode: 'Markdown' })
    } finally {
      try {
        await fs.unlink(backupPath)
      } catch (e) {
        ctx.handleError(e, 'backup')
      }
    }
  }
}
