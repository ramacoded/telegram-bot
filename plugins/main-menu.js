// plugins/main-menu.js

import { Markup } from 'telegraf'
import { ucapanWaktu } from '../lib/functions.js'

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export default {
  command: ['menu', 'help'],
  description: 'Menampilkan semua menu fitur yang tersedia.',
  category: 'Main',
  
  execute: async (ctx) => {
    const commandList = ctx.botCommands
    if (!commandList) {
      return ctx.reply('Tidak bisa memuat daftar perintah saat ini.')
    }
    
    // Logika pengelompokan kategori (tidak berubah)
    const categories = {}
    const processedPlugins = new Set()
    for (const plugin of commandList.values()) {
      if (processedPlugins.has(plugin) || !plugin.category) continue
      processedPlugins.add(plugin)
      if (!categories[plugin.category]) categories[plugin.category] = []
      const commandName = Array.isArray(plugin.command) ? plugin.command[0] : plugin.command
      categories[plugin.category].push({ name: commandName })
    }

    // --- Membangun Tampilan Menu Teks ---
    const botInfo = await ctx.telegram.getMe()
    const botName = botInfo.first_name
    const totalCommands = processedPlugins.size

    let menuText = `*${ucapanWaktu()}*, ${ctx.from.first_name}!\n\n`
    menuText += `╭─「 *${botName}* 」\n`
    menuText += `│ Library : *Telegraf.js*\n`
    menuText += `│ Fitur: *${totalCommands}*\n`
    menuText += `╰──────────────\n\n`

    const sortedCategories = Object.keys(categories).sort()
    for (const category of sortedCategories) {
      menuText += `╭─「 *${capitalize(category)} Menu* 」\n`
      const commandNames = categories[category].map(cmd => `│ • /${cmd.name}`).join('\n')
      menuText += `${commandNames}\n`
      menuText += `╰──────────────\n\n`
    }
    
    // --- Membuat Tombol Inline ---
    const keyboard = Markup.inlineKeyboard([
      [ Markup.button.url('📢 Channel Info Gempa', 'https://t.me/notifikasi_gempa') ],
      [ 
        Markup.button.url('👤 Creator', 'https://t.me/ramacode'), 
        Markup.button.url('깃 Source Code', 'https://github.com/ramacode0') 
      ]
    ])

    // Kirim pesan teks beserta tombol
    await ctx.reply(menuText, {
      parse_mode: 'Markdown',
      ...keyboard
    })
  }
}
