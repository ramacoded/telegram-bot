// plugins/owner-dashboard.js

import os from 'os'
import config from '../config.js'
import { runtime, format } from '../lib/functions.js' // Impor fungsi helper

export default {
  command: ['dashboard', 'stats'],
  description: 'Menampilkan dashboard statistik bot.',
  category: 'Owner',

  execute: async (ctx) => {
    // Cek otorisasi owner
    if (!config.ownerIds.includes(ctx.from.id)) {
      return ctx.reply('Perintah ini hanya untuk Owner Bot.')
    }
    
    // Pastikan database sudah siap
    if (!global.db || !global.db.data) {
      return ctx.reply('Database belum siap atau kosong.')
    }

    const users = global.db.data.users || {}
    const chats = global.db.data.chats || {}

    // --- Mengumpulkan Data ---

    // Statistik Umum
    const totalUsers = Object.keys(users).length
    const totalCommandsUsed = Object.values(chats).reduce((a, b) => a + b, 0)
    const totalPlugins = new Set(ctx.botCommands.values()).size // Menghitung plugin unik

    // Top 5 Perintah
    const topCommands = Object.entries(chats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([cmd, count], i) => `*${i + 1}.* \`/${cmd}\` - ${count}x`)
      .join('\n') || 'Belum ada perintah yang digunakan.'

    // Top 5 Pengguna
    const topUsers = Object.entries(users)
      .sort(([, a], [, b]) => b.totalCommand - a.totalCommand)
      .slice(0, 5)
      .map(([id, data], i) => `*${i + 1}.* ${data.name} - ${data.totalCommand}x`)
      .join('\n') || 'Belum ada pengguna aktif.'
      
    // Status Sistem
    const ramUsage = `${format(os.totalmem() - os.freemem())} / ${format(os.totalmem())}`
    const botUptime = runtime(process.uptime())
    const serverUptime = runtime(os.uptime())

    // --- Membangun Tampilan Dashboard ---
    const dashboardText = `
📊 *BOT DASHBOARD*
🗓️ ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}
━━━━━━━━━━━━━━━━━━━━
📈 *Statistik Perintah*
• *Total Perintah Digunakan:* ${totalCommandsUsed}
• *Total Pengguna Aktif:* ${totalUsers}
• *Total Plugin Terdaftar:* ${totalPlugins}

🏆 *Top 5 Perintah Teratas*
${topCommands}

🥇 *Top 5 Pengguna Teratas*
${topUsers}
━━━━━━━━━━━━━━━━━━━━
⚙️ *Status Sistem*
• *RAM:* ${ramUsage}
• *Bot Aktif:* ${botUptime}
• *Server Aktif:* ${serverUptime}
`.trim()

    await ctx.reply(dashboardText, { parse_mode: 'Markdown' })
  }
}
