import config from '../config.js'
import chalk from 'chalk'

export async function handleError(bot, ctx, commandName, error) {
  console.error(chalk.red(`[ERROR] Terjadi kesalahan saat menjalankan perintah '${commandName}':`), error)
  
  // Kirim pesan "maaf" ke pengguna
  try {
    await ctx.reply(`Maaf, terjadi kesalahan internal saat menjalankan perintah \`/${commandName}\`. Laporan telah dikirim ke developer.`, { parse_mode: 'Markdown' })
  } catch (e) {
    console.error(chalk.red('Gagal mengirim pesan error ke pengguna:'), e)
  }

  // Format pesan laporan error untuk owner
  const from = ctx.from
  const errorMessage = `
*🚨 Laporan Error Bot 🚨*

Terjadi kesalahan saat pengguna mencoba menjalankan perintah.

*Informasi Pengguna:*
- *Nama:* ${from.first_name} ${from.last_name || ''}
- *Username:* @${from.username || 'tidak ada'}
- *ID:* \`${from.id}\`

*Informasi Perintah:*
- *Perintah:* \`/${commandName}\`
- *Pesan Lengkap:* \`${ctx.message.text || ctx.message.caption || 'N/A'}\`

*Detail Error (Stack Trace):*
\`\`\`
${error.stack || error.toString()}
\`\`\`
  `.trim()

  // Kirim laporan ke setiap owner
  for (const ownerId of config.ownerIds) {
    try {
      await bot.telegram.sendMessage(ownerId, errorMessage, { parse_mode: 'Markdown' })
    } catch (e) {
      console.error(chalk.red(`Gagal mengirim laporan error ke owner ${ownerId}:`), e)
    }
  }
}