// plugins/tools-bratvideo.js

import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { downloadFile } from '../lib/functions.js'

export default {
  command: ['bratvideo', 'bratvid'],
  description: 'Membuat stiker video dari teks.',
  category: 'Tools',

  execute: async (ctx, { bot }) => {
    const args = ctx.message.text.split(' ').slice(1)
    const text = args.join(' ')

    if (!text) {
      return ctx.reply('Format salah. Masukkan teks setelah perintah.\n\nContoh:\n/bratvideo halo semua')
    }
    if (text.length > 50) {
      return ctx.reply('Teks terlalu panjang. Maksimal 50 karakter.')
    }

    let processingMsg, tempDir
    try {
      processingMsg = await ctx.reply('⏳ Memulai proses pembuatan video...', { reply_to_message_id: ctx.message.message_id })

      const words = text.split(" ")
      tempDir = path.join('tmp', `bratvid-${Date.now()}`)
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true })
      
      const framePaths = []
      
      for (let i = 0; i < words.length; i++) {
        const currentText = words.slice(0, i + 1).join(" ")
        await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, `⏳ Mengunduh frame ${i + 1}/${words.length}...`)
        
        try {
          const imageBuffer = await downloadFile(`https://aqul-brat.hf.space/?text=${encodeURIComponent(currentText)}`)
          
          // --- PERBAIKAN PATH DI SINI ---
          const frameName = `frame${i}.png`
          const framePath = path.join(tempDir, frameName)
          fs.writeFileSync(framePath, imageBuffer)
          framePaths.push(frameName) // <-- Simpan nama filenya saja, bukan path lengkap
          // --- AKHIR PERBAIKAN ---

        } catch (error) {
          console.error(`Gagal mengambil frame untuk teks: "${currentText}"`, error)
          continue
        }
      }

      if (framePaths.length === 0) throw new Error("Semua frame gagal diunduh dari API.")

      await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, `🎞️ Menggabungkan frame...`)
      const fileListPath = path.join(tempDir, "filelist.txt")
      
      // --- PERBAIKAN KONTEN FILELIST.TXT ---
      // Gunakan nama file relatif yang sudah kita simpan
      const fileListContent = framePaths.map(frame => `file '${frame}'\nduration 0.5`).join('\n') + `\nfile '${framePaths[framePaths.length - 1]}'\nduration 3`
      fs.writeFileSync(fileListPath, fileListContent)

      const outputVideoPath = path.join(tempDir, "output.mp4")
      // Eksekusi FFmpeg dari dalam direktori sementara untuk path yang lebih simpel
      execSync(
        `ffmpeg -y -f concat -safe 0 -i "filelist.txt" -vf "fps=30,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black" -c:v libx264 -preset veryfast -pix_fmt yuv420p -t 15 "output.mp4"`,
        { cwd: tempDir } // <-- Menjalankan perintah dari dalam folder 'tmp/bratvid-...'
      )

      await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, `✨ Mengirim hasil...`)
      
      await ctx.replyWithVideo(
        { source: outputVideoPath }, 
        { 
          caption: `✅ Video dari teks berhasil dibuat!`,
          reply_to_message_id: ctx.message.message_id
        }
      )
      
      await ctx.deleteMessage(processingMsg.message_id)

    } catch (error) {
      if (processingMsg) await ctx.deleteMessage(processingMsg.message_id).catch(() => {})
      handleError(bot, ctx, 'bratvideo', error)
    } finally {
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    }
  }
}
