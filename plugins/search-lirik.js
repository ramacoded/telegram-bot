// plugins/search-lirik.js

import { Markup } from 'telegraf'

// Cache untuk menyimpan hasil pencarian sementara
const lyricsCache = new Map()

export default {
  command: ['lirik', 'lyrics'],
  description: 'Mencari lirik lagu.',
  category: 'Search',

  execute: async (ctx) => {
    const query = ctx.message.text.split(' ').slice(1).join(' ').trim()

    if (!query) {
      return ctx.reply('Format salah.\n\nContoh: /lirik evaluasi hindia')
    }

    let processingMsg
    try {
      processingMsg = await ctx.reply(`🔎 Mencari lirik untuk "${query}"...`)
      
      const apiUrl = `https://api.ryzumi.vip/api/search/lyrics?query=${encodeURIComponent(query)}`
      const response = await fetch(apiUrl)
      const results = await response.json()

      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('Lirik tidak ditemukan.')
      }

      // Jika hanya ada 1 hasil, langsung tampilkan
      if (results.length === 1) {
        const song = results[0]
        const lyricsText = `
*${song.trackName}*
*Artis:* ${song.artistName}
*Album:* ${song.albumName}
━━━━━━━━━━━━━━━━━━━━
${song.plainLyrics || '_Lirik tidak tersedia._'}
        `.trim()
        
        return await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, lyricsText, { parse_mode: 'Markdown' })
      }
      
      // Jika ada banyak hasil, tampilkan tombol pilihan
      const searchId = `${ctx.from.id}_${Date.now()}`
      lyricsCache.set(searchId, results)
      setTimeout(() => lyricsCache.delete(searchId), 5 * 60 * 1000)

      const buttons = results.slice(0, 5).map((song, index) => {
        return [Markup.button.callback(`${song.trackName} - ${song.artistName}`, `lirik_${index}_${searchId}`)]
      })
      
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        processingMsg.message_id,
        null,
        `Ditemukan beberapa hasil untuk "${query}". Silakan pilih salah satu:`,
        Markup.inlineKeyboard(buttons)
      )

    } catch (error) {
      if (processingMsg) {
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
      }
      ctx.handleError(error, 'lirik')
    }
  }
}
