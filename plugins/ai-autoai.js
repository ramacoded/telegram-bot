// plugins/ai-autoai.js

import { GoogleGenerativeAI } from '@google/generative-ai'
import config from '../config.js'
import { downloadFile } from '../lib/functions.js'
import chalk from 'chalk'

const genAI = new GoogleGenerativeAI(config.googleAiApiKey)
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
const HISTORY_LIMIT = 6 
const TELEGRAM_MSG_LIMIT = 4096

/**
 * Helper function baru yang lebih cerdas untuk memecah teks panjang.
 * Fungsi ini sadar akan blok kode Markdown.
 */
function splitMessage(str, len) {
    const parts = [];
    let currentPart = '';
    const codeBlockRegex = /```[\s\S]*?```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(str)) !== null) {
        const textBefore = str.substring(lastIndex, match.index);
        if (textBefore) {
            if ((currentPart + textBefore).length > len) { parts.push(currentPart); currentPart = ''; }
            currentPart += textBefore;
        }
        const codeBlock = match[0];
        if (codeBlock.length > len) {
            if (currentPart) { parts.push(currentPart); currentPart = ''; }
            parts.push(codeBlock);
        } else {
            if ((currentPart + codeBlock).length > len) { parts.push(currentPart); currentPart = ''; }
            currentPart += codeBlock;
        }
        lastIndex = codeBlockRegex.lastIndex;
    }
    const textAfter = str.substring(lastIndex);
    if (textAfter) {
        if ((currentPart + textAfter).length > len) { parts.push(currentPart); currentPart = ''; }
        currentPart += textAfter;
    }
    if (currentPart) parts.push(currentPart);
    return parts;
}

async function replyWithMarkdownFallback(ctx, text, replyTo = null) {
  try {
    const options = { parse_mode: 'Markdown' }; if (replyTo) options.reply_to_message_id = replyTo
    await ctx.reply(text, options)
  } catch (e) {
    if (e.description?.includes("can't parse entities")) {
      console.warn('Markdown Gagal, mengirim sebagai teks biasa.'); const options = {}; if (replyTo) options.reply_to_message_id = replyTo
      await ctx.reply(text, options)
    } else { throw e }
  }
}

function startTypingAnimation(ctx, message, baseText) {
  let dotCount = 1
  return setInterval(() => {
    const dots = '.'.repeat(dotCount)
    ctx.telegram.editMessageText(ctx.chat.id, message.message_id, null, `${baseText}${dots}`).catch(() => {})
    dotCount = (dotCount % 3) + 1
  }, 700)
}

export async function handleAiChat(ctx) {
  const userId = ctx.from.id
  const userMessage = ctx.message.text || ctx.message.caption || ''
  
  const userDb = global.db.data.users[userId]
  const history = userDb.autoAiHistory || []
  const trimmedHistory = history.slice(-HISTORY_LIMIT)

  let sentMsg;
  let anim1, anim2, anim3;

  try {
    await ctx.replyWithChatAction('typing')
    sentMsg = await ctx.reply('Analisis', { reply_to_message_id: ctx.message.message_id })
    anim1 = startTypingAnimation(ctx, sentMsg, 'Analisis')

    const parts = [{ text: userMessage }]
    if (ctx.message.photo) {
      const fileId = ctx.message.photo[ctx.message.photo.length - 1].file_id; const link = await ctx.telegram.getFileLink(fileId)
      const buffer = await downloadFile(link.href); parts.unshift({ inlineData: { data: buffer.toString("base64"), mimeType: "image/jpeg" } })
    }

    const chat = model.startChat({ history: trimmedHistory })
    const result = await chat.sendMessageStream(parts)
    
    let fullResponse = '';
    let isFirstChunk = true

    for await (const chunk of result.stream) {
      if (isFirstChunk) {
        clearInterval(anim1); anim1 = null
        anim2 = startTypingAnimation(ctx, sentMsg, 'Menyusun Jawaban')
        isFirstChunk = false
      }
      fullResponse += chunk.text()
    }
    
    clearInterval(anim2); anim2 = null
    anim3 = startTypingAnimation(ctx, sentMsg, 'Mengirim Jawaban')

    const finalResponse = fullResponse.replace(/```(\w+)?\n/g, '```$1\n').trim()
    await new Promise(resolve => setTimeout(resolve, 2000)) 

    clearInterval(anim3); anim3 = null
    await ctx.deleteMessage(sentMsg.message_id)

    if (finalResponse.length > TELEGRAM_MSG_LIMIT) {
      const messageParts = splitMessage(finalResponse, TELEGRAM_MSG_LIMIT)
      for (const part of messageParts) {
        await replyWithMarkdownFallback(ctx, part); await new Promise(resolve => setTimeout(resolve, 500))
      }
    } else {
      await replyWithMarkdownFallback(ctx, finalResponse, ctx.message.message_id)
    }

    const newHistory = [ ...history, { role: "user", parts }, { role: "model", parts: [{ text: finalResponse }] } ];
    userDb.autoAiHistory = newHistory.slice(-HISTORY_LIMIT); await global.db.write()

  } catch (error) {
    ctx.handleError(error, 'autoai')
    if (sentMsg) { await ctx.deleteMessage(sentMsg.message_id).catch(() => {}) }
    await ctx.reply(`Terjadi kesalahan saat AI memproses permintaan: ${error.message}`)
  } finally {
    if (anim1) clearInterval(anim1)
    if (anim2) clearInterval(anim2)
    if (anim3) clearInterval(anim3)
  }
}

export default {
    command: ['autoai'],
    description: 'Mengaktifkan/menonaktifkan mode chat AI (on/off/clear).',
    category: 'AI',
    execute: async (ctx) => {
      const userId = ctx.from.id; const action = ctx.message.text.split(' ')[1]?.toLowerCase()
      global.db.data.users[userId] = global.db.data.users[userId] || {}
      const userDb = global.db.data.users[userId]
      if (action === 'on') { userDb.autoAiActive = true; await ctx.reply('✅ Mode Auto AI telah diaktifkan.') }
      else if (action === 'off') { userDb.autoAiActive = false; await ctx.reply('❌ Mode Auto AI telah dinonaktifkan.') }
      else if (action === 'clear') { userDb.autoAiHistory = []; await ctx.reply('🧹 Riwayat percakapan AI telah dibersihkan.') }
      else { const status = userDb.autoAiActive ? '🟢 Aktif' : '🔴 Nonaktif'; await ctx.replyWithMarkdown(`*Mode Auto AI saat ini:* ${status}\n\nGunakan:\n• \`/autoai on\`\n• \`/autoai off\`\n• \`/autoai clear\``) }
      await global.db.write()
    }
}
