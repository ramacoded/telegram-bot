// plugins/owner-restart.js
import { delay } from '../lib/functions.js'
import config from '../config.js'
export default {
  command: ['restart', 'res'],
  description: 'Me-restart bot (hanya berfungsi jika dijalankan dengan process manager seperti PM2).',
  category: 'Owner',

  execute: async (ctx) => {
    // Cek otorisasi owner
    if (!config.ownerIds.includes(ctx.from.id)) {
      return ctx.reply('Akses ditolak. Perintah ini khusus untuk owner.')
    }
    
    try {
      await ctx.reply('⏳ Merestart bot, mohon tunggu...')
      await delay(3000)
      process.exit("1")

    } catch (e) {
      ctx.handleError(e, 'restart')
    }
  }
}
