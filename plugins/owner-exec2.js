// plugins/owner-exec2.js

import cp, { exec as _exec } from 'child_process'
import { promisify } from 'util'
import config from '../config.js'
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'

const exec = promisify(_exec)
const TELEGRAM_MSG_LIMIT = 4096

const dangerousCommands = [
  'rm -rf', 'rm --no-preserve-root', 'mkfs', 'dd if=', 
  'shutdown', 'reboot', 'poweroff', 'halt', 'kill', 'pkill',
  '>:(){ :|: & };:', // Fork Bomb
]

export async function executeExec(ctx, commandString) {
  if (!config.ownerIds.includes(ctx.from.id)) {
    return ctx.reply('Akses ditolak. Perintah ini khusus untuk owner.')
  }
  
  const isDangerous = dangerousCommands.some(cmd => commandString.trim().startsWith(cmd))
  if (isDangerous) {
    console.warn(chalk.bgRed.black(`[DANGEROUS COMMAND BLOCKED] User ${ctx.from.id} tried to execute: ${commandString}`))
    return ctx.replyWithMarkdown('⚠️ *Peringatan!*\nPerintah yang Anda coba jalankan terdeteksi berbahaya dan telah diblokir.')
  }

  const tempFilePath = path.join('tmp', `exec-output-${Date.now()}.json`)
  let processingMsg
  try {
    processingMsg = await ctx.reply('⏳ Mengeksekusi perintah...', { reply_to_message_id: ctx.message.message_id })
    
    const { stdout, stderr } = await exec(commandString)
    
    await ctx.deleteMessage(processingMsg.message_id)

    const fullOutputText = (stdout || '') + (stderr || '')
    if (fullOutputText.length > TELEGRAM_MSG_LIMIT) {
      const jsonOutput = { command: commandString, stdout: stdout?.trim() || null, stderr: stderr?.trim() || null }
      await fs.writeFile(tempFilePath, JSON.stringify(jsonOutput, null, 2))
      await ctx.replyWithDocument(
        { source: tempFilePath, filename: 'exec-output.json' },
        { caption: `Output untuk perintah \`${commandString}\` terlalu panjang, dikirim sebagai file JSON.` , parse_mode: 'Markdown' }
      )
    } else {
      let replyText = ''
      if (stdout?.trim()) replyText += `--- STDOUT ---\n${stdout.trim()}`
      if (stderr?.trim()) replyText += `\n\n--- STDERR ---\n${stderr.trim()}`
      if (!replyText) replyText = 'Perintah berhasil dieksekusi tanpa output.'
      await ctx.replyWithMarkdown(`\`\`\`\n${replyText}\n\`\`\``)
    }

  } catch (error) {
    // --- PERBAIKAN DI SINI ---
    // Hanya coba hapus pesan jika 'processingMsg' benar-benar ada.
    if (processingMsg) {
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {}) // Abaikan error jika pesan sudah terhapus
    }

    const { stdout, stderr } = error
    const fullErrorText = (stdout || '') + (stderr || '') + (error.message || '')

    if (fullErrorText.length > TELEGRAM_MSG_LIMIT) {
        const jsonErrorOutput = { command: commandString, error: true, stdout: stdout?.trim() || null, stderr: stderr?.trim() || null, errorMessage: error.message || null }
        await fs.writeFile(tempFilePath, JSON.stringify(jsonErrorOutput, null, 2))
        await ctx.replyWithDocument(
            { source: tempFilePath, filename: 'exec-error-output.json' },
            { caption: `Error output untuk perintah \`${commandString}\` terlalu panjang, dikirim sebagai file JSON.`, parse_mode: 'Markdown' }
        )
    } else {
        let errorReply = ''
        if (stdout?.trim()) errorReply += `--- STDOUT ---\n${stdout.trim()}`
        if (stderr?.trim()) errorReply += `\n\n--- STDERR ---\n${stderr.trim()}`
        if (!errorReply) errorReply = error.message
        await ctx.replyWithMarkdown(`*Error:*\n\`\`\`\n${errorReply}\n\`\`\``)
    }
  } finally {
    await fs.unlink(tempFilePath).catch(() => {})
  }
}
