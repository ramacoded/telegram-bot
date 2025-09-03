// plugins/tools-uploader.js

import fs from 'fs/promises'
import path from 'path'
import { randomBytes } from 'crypto'
import { downloadFile } from '../lib/functions.js'
import { uploader } from '../lib/uploader.js'
/**
 * Helper function untuk mengekstrak file_id dan nama file dari berbagai jenis media.
 * @param {object} message - Objek pesan Telegraf.
 * @returns {{fileId: string, fileName: string}|null}
 */
function getFileInfoFromMessage(message) {
    if (!message) return null;
    if (message.document) {
        return { fileId: message.document.file_id, fileName: message.document.file_name };
    }
    if (message.photo) {
        const photo = message.photo[message.photo.length - 1]; // Kualitas terbaik
        return { fileId: photo.file_id, fileName: `${photo.file_unique_id}.jpg` };
    }
    if (message.video) {
        return { fileId: message.video.file_id, fileName: message.video.file_name || `${message.video.file_unique_id}.mp4` };
    }
    if (message.audio) {
        return { fileId: message.audio.file_id, fileName: message.audio.file_name || `${message.audio.file_unique_id}.mp3` };
    }
    if (message.voice) {
        return { fileId: message.voice.file_id, fileName: `voice-${message.voice.file_unique_id}.ogg` };
    }
    if (message.sticker) {
        return { fileId: message.sticker.file_id, fileName: `${message.sticker.file_unique_id}.webp` };
    }
    return null;
}


export default {
  command: ['tourl', 'upload'],
  description: 'Mengunggah file yang di-reply ke uguu.se.',
  category: 'Tools',

    execute: async (ctx) => {
    let tempFilePath;
    try {
        const replied = ctx.message.reply_to_message;
        if (!replied) {
            return ctx.reply('Perintah ini hanya berfungsi jika Anda me-reply sebuah file (gambar, video, dokumen, dll).');
        }

        const fileInfo = getFileInfoFromMessage(replied);
        if (!fileInfo) {
            return ctx.reply('Tidak ada file yang bisa diunggah dari pesan yang Anda reply.');
        }

        const processingMsg = await ctx.reply('⏳ Mengunduh file dan mengunggah ke server...', { reply_to_message_id: ctx.message.message_id });

        // 1. Download file dari Telegram
        const link = await ctx.telegram.getFileLink(fileInfo.fileId);
        const fileBuffer = await downloadFile(link.href);

        // 2. Simpan file ke direktori sementara
        // Menggunakan nama file asli jika ada, atau nama acak jika tidak
        const tempFileName = fileInfo.fileName || `${randomBytes(6).toString('hex')}`;
        tempFilePath = path.join('tmp', tempFileName);
        await fs.writeFile(tempFilePath, fileBuffer);

        // 3. Panggil uploader global yang sudah kita siapkan
        const uploadedUrl = await uploader(tempFilePath);
        if (!uploadedUrl || !uploadedUrl.startsWith('http')) {
            throw new Error('Gagal mengunggah file atau respons dari server tidak valid.');
        }

        // 4. Kirim hasilnya
        await ctx.telegram.editMessageText(
            ctx.chat.id,
            processingMsg.message_id,
            null,
            `✅ Berhasil diunggah!\n\n*URL:* ${uploadedUrl}`,
            { parse_mode: 'Markdown' }
        );

    } catch (error) {
        // Gunakan handleError global
        ctx.handleError(error, 'tourl')
    } finally {
        // 5. Selalu hapus file sementara setelah selesai
        if (tempFilePath) {
            await fs.unlink(tempFilePath).catch(() => {});
        }
    }
  }
}
