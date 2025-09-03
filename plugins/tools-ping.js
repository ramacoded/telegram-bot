// plugins/tools-ping.js

import os from 'os'
import { execSync } from 'child_process'
import { performance } from 'perf_hooks'

/**
 * Helper function untuk memformat detik menjadi string waktu (hari, jam, menit, detik).
 * @param {number} seconds - Jumlah detik.
 * @returns {string}
 */
function runtime(seconds) {
  seconds = Number(seconds)
  if (isNaN(seconds)) return '0 detik'

  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor(seconds % (3600 * 24) / 3600)
  const m = Math.floor(seconds % 3600 / 60)
  const s = Math.floor(seconds % 60)

  let result = ''
  if (d > 0) result += `${d} hari, `
  if (h > 0) result += `${h} jam, `
  if (m > 0) result += `${m} menit, `
  if (s > 0) result += `${s} detik`
  
  return result.replace(/, $/, '') || '0 detik'
}

/**
 * Helper function untuk memformat byte menjadi unit yang lebih besar (KB, MB, GB).
 * @param {number} bytes - Ukuran dalam byte.
 * @returns {string}
 */
function format(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Helper function untuk mendapatkan informasi disk.
 * Pengganti untuk `nou.drive.info()` menggunakan `child_process`.
 * Catatan: Ini hanya berfungsi di sistem berbasis Linux/Unix.
 * @returns {object}
 */
function getDriveInfo() {
  try {
    const output = execSync('df -h /').toString()
    const lines = output.split('\n')
    const data = lines[1].split(/\s+/)
    return {
      totalGb: data[1],
      usedGb: data[2],
      usedPercentage: data[4].replace('%', '')
    }
  } catch (e) {
    console.error('Gagal mendapatkan info disk:', e)
    return { totalGb: 'N/A', usedGb: 'N/A', usedPercentage: 'N/A' }
  }
}

export default {
  command: ['ping', 'speed'],
  description: 'Mengecek kecepatan respon dan status server.',
  category: 'Tools',

  execute: async (ctx) => {
    // Kirim pesan awal sebagai placeholder
    const sentMsg = await ctx.reply('⚡ Menganalisis kecepatan dan status server...')

    // 1. Latensi API Telegram
    const apiLatency = new Date().getTime() - sentMsg.date * 1000

    // 2. Kode laporan server Anda
    const start = performance.now()
    await new Promise(resolve => setTimeout(resolve, 10))
    const end = performance.now()
    const localPing = (end - start).toFixed(2)
    
    // Informasi Sistem & Server
    const kernel = execSync('uname -r').toString().trim()
    const software = `${os.type()} ${os.release()}` // Pengganti nou.os.oos()
    const drive = getDriveInfo()
    const uptimeBot = runtime(process.uptime())
    const uptimeServer = runtime(os.uptime())
    const load = os.loadavg().map(avg => avg.toFixed(2)).join(' | ')
    const npmVersion = execSync('npm -v').toString().trim()
    
    // Informasi CPU
    const cpus = os.cpus()

    // Membangun teks respons
    const respon = `
🗂️ *LAPORAN SERVER*
*Respon Lokal:* ${localPing} ms
*Respon API:* ${apiLatency} ms
*Bot Aktif:* ${uptimeBot}
*VPS Aktif:* ${uptimeServer}
━━━━━━━━━━━━━━━━━━━━
💻 *INFORMASI SERVER*
*Node.js:* ${process.version}
*NPM:* ${npmVersion}
*OS:* ${software}
*Platform:* ${os.platform()} (${os.arch()})
*Kernel:* ${kernel}
*CPU:* ${cpus[0].model.trim()} (${cpus.length} Core)
*Load Avg:* ${load}
━━━━━━━━━━━━━━━━━━━━
📁 *PEMAKAIAN RESOURCE*
*RAM:* ${format(os.totalmem() - os.freemem())} / ${format(os.totalmem())}
*Disk:* ${drive.usedGb} / ${drive.totalGb} (${drive.usedPercentage}% digunakan)
`.trim()

    // Edit pesan awal dengan laporan lengkap
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      sentMsg.message_id,
      null, // inline_message_id
      respon,
      { parse_mode: 'Markdown' }
    )
  }
}
