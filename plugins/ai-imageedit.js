// plugins/ai-imageedit.js

import { GoogleGenerativeAI } from '@google/generative-ai'
import config from '../config.js'
import { downloadFile } from '../lib/functions.js'

// --- Inisialisasi Klien AI ---
const genAI = new GoogleGenerativeAI(config.googleAiApiKey)

// --- MENGGUNAKAN MODEL PERSIS SEPERTI YANG ANDA MINTA ---
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp-image-generation",
  generationConfig: {
    responseModalities: ["Text", "Image"]
  }
})

export default {
  command: ['imageedit', 'imgedit', 'edit'],
  description: 'Mengedit gambar berdasarkan perintah teks menggunakan AI.',
  category: 'AI',

  execute: async (ctx) => {
    // TODO: Implementasikan sistem limit premium di sini jika diperlukan.
    
    let targetPhoto = null
    let promptFromCaption = ""

    // --- Logika untuk mendeteksi foto dari pesan saat ini ATAU pesan yang di-reply ---
    if (ctx.message.photo) {
      targetPhoto = ctx.message.photo[ctx.message.photo.length - 1]
      promptFromCaption = ctx.message.caption || ""
      const commandRegex = /^\/(imageedit|imgedit|edit)\s*/
      promptFromCaption = promptFromCaption.replace(commandRegex, '').trim()
    } else if (ctx.message.reply_to_message?.photo) {
      targetPhoto = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1]
      promptFromCaption = ctx.message.text.split(' ').slice(1).join(' ').trim() || ""
    }

    if (!targetPhoto) {
      return ctx.reply('Mohon kirimkan foto dengan caption perintah, atau reply sebuah foto dengan perintah ini.', { reply_to_message_id: ctx.message.message_id })
    }
    
    if (!promptFromCaption) {
        return ctx.reply('Prompt atau perintah edit tidak boleh kosong.\n\nContoh:\n/edit ubah warna rambutnya menjadi biru', { reply_to_message_id: ctx.message.message_id })
    }
    // --- AKHIR LOGIKA DETEKSI ---

    let processingMsg
    try {
      processingMsg = await ctx.reply('⏳ AI sedang memproses permintaan edit gambar Anda...', { reply_to_message_id: ctx.message.message_id })
      
      const fileId = targetPhoto.file_id
      const link = await ctx.telegram.getFileLink(fileId)
      const imageBuffer = await downloadFile(link.href)
      
      const parts = [
        { text: promptFromCaption },
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBuffer.toString("base64")
          }
        }
      ]
      
      const result = await model.generateContent({ contents: [{ parts }] })
      const response = result.response

      let resultImageBuffer = null
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          resultImageBuffer = Buffer.from(part.inlineData.data, "base64")
          break
        }
      }

      if (!resultImageBuffer) {
        const textResponse = response.candidates[0].content.parts[0].text
        throw new Error(`AI tidak mengembalikan gambar. Respons: ${textResponse}`)
      }

      await ctx.replyWithPhoto(
        { source: resultImageBuffer },
        { 
          caption: `✅ Gambar berhasil diedit sesuai perintah:\n\n_"${promptFromCaption}"_`,
          parse_mode: 'Markdown',
          reply_to_message_id: ctx.message.message_id
        }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (error) {
      if (processingMsg) {
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
      }
      ctx.handleError(error, 'imageedit')
    }
  }
}
