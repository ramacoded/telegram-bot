import { GoogleGenerativeAI } from '@google/generative-ai'
import config from '../config.js'
import { downloadFile } from '../lib/functions.js'

// Inisialisasi Klien AI
const genAI = new GoogleGenerativeAI(config.googleAiApiKey)

// Menggunakan model dan konfigurasi persis seperti yang Anda inginkan
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp-image-generation",
  generationConfig: {
    responseModalities: ["Text", "Image"]
  }
})

export default {
  command: ['botakin', 'tobotak'],
  description: 'Mendesain ulang gambar dengan menambahkan hijab menggunakan AI.',
  category: 'AI',

  execute: async (ctx) => {
    let targetPhoto = null
    let promptFromCaption = ""

    // --- PERUBAHAN UTAMA DIMULAI DI SINI ---
    // Logika untuk mendeteksi foto dari pesan saat ini ATAU pesan yang di-reply
    if (ctx.message.photo) {
      // Jika pengguna mengirim foto langsung dengan caption
      targetPhoto = ctx.message.photo[ctx.message.photo.length - 1]
      promptFromCaption = ctx.message.caption || ""
      // Hapus perintah dari prompt agar tidak ikut diproses AI
      const commandRegex = /^\/(botakin|tobotak)\s*/
      promptFromCaption = promptFromCaption.replace(commandRegex, '').trim()

    } else if (ctx.message.reply_to_message && ctx.message.reply_to_message.photo) {
      // Jika pengguna me-reply sebuah foto
      targetPhoto = ctx.message.reply_to_message.photo[ctx.message.reply_to_message.photo.length - 1]
      // Ambil prompt dari teks perintah
      promptFromCaption = ctx.message.text.split(' ').slice(1).join(' ').trim() || ""
    }

    // Jika tidak ada foto yang ditemukan sama sekali
    if (!targetPhoto) {
      return ctx.reply('Mohon kirimkan foto langsung dengan caption /botakin atau reply foto dengan perintah ini.', { reply_to_message_id: ctx.message.message_id })
    }
    // --- AKHIR DARI PERUBAHAN ---

    let processingMsg
    try {
      processingMsg = await ctx.reply('⏳ AI sedang mendesain ulang gambar...', { reply_to_message_id: ctx.message.message_id })
      
      const promptText = promptFromCaption || "Desain ulang karakter pada gambar tersebut dengan membuat rambut menjadi botak dan tidak memiliki rambut. Pastikan botak tersebut menghilangkan seluruh rambut karakter, sehingga tidak terlihat sama sekali. Botak harus dirancang dengan cara yang natural dan realistis, sehingga terlihat seperti botak yang dikenakan dalam kehidupan sehari-hari. Perhatikan detail dan tekstur botak agar terlihat autentik dan sesuai dengan karakter aslinya."
      
      const fileId = targetPhoto.file_id
      const link = await ctx.telegram.getFileLink(fileId)
      const imageBuffer = await downloadFile(link.href)
      const base64Image = imageBuffer.toString("base64")
      
      const contents = [{
        role: "user",
        parts: [
          { text: promptText },
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image
            }
          }
        ]
      }]
      
      const result = await model.generateContent({ contents })
      
      let resultImage
      let resultText = ""
      for (const part of result.response.candidates[0].content.parts) {
        if (part.text) {
          resultText += part.text
        } else if (part.inlineData) {
          resultImage = Buffer.from(part.inlineData.data, "base64")
        }
      }

      if (!resultImage) {
        throw new Error(`AI tidak mengembalikan gambar. Respons teks: ${resultText || 'Tidak ada respons'}`)
      }

      await ctx.replyWithPhoto(
        { source: resultImage },
        { 
          caption: '✅ Gambar berhasil didesain ulang oleh AI!', // Caption diubah sesuai permintaan
          reply_to_message_id: ctx.message.message_id
        }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (error) {
      if (processingMsg) {
        await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
      }
      ctx.handleError(error, 'botakin')
    }
  }
}
