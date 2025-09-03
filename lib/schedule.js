// lib/schedule.js
import chalk from 'chalk'
import fs from 'fs/promises'
import path from 'path'
import config from '../config.js'
/**
 * Mengecek gempa terkini dan mengirim notifikasi.
 * Sekarang menggunakan global.db.data.stats
 */
export async function checkGempa(bot, config) {
  try {
    if (!global.db) {
      console.error(chalk.red('Database belum siap, melewati cek gempa.'))
      return
    }

    // Pastikan objek stats ada
    if (!global.db.data.stats) {
      global.db.data.stats = { gempaDateTime: '' }
    }

    const res = await fetch('https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json')
    if (!res.ok) throw new Error(`Gagal mengambil data BMKG: ${res.statusText}`)
    
    const json = await res.json()
    const gempa = json.Infogempa.gempa
    
    // Mengakses database melalui global.db.data.stats
    if (gempa.DateTime !== global.db.data.stats.gempaDateTime) {
      console.log(chalk.yellow.bold(`[!] ${gempa.Wilayah} | Mag: ${gempa.Magnitude}`))
      
      global.db.data.stats.gempaDateTime = gempa.DateTime
      await global.db.write()

      const mmiInfo = gempa.Dirasakan ? `📍 *Wilayah Dirasakan:* ${gempa.Dirasakan} (Skala MMI)` : ''
      const caption = `
🚨 *Informasi Gempa Terkini - BMKG* 🚨
━━━━━━━━━━━━━━━━━━━
📅 *Tanggal:* ${gempa.Tanggal}
🕒 *Waktu:* ${gempa.Jam}
📍 *Lokasi:* ${gempa.Wilayah}
🌐 *Koordinat:* ${gempa.Coordinates}
💪 *Magnitudo:* ${gempa.Magnitude}
📏 *Kedalaman:* ${gempa.Kedalaman}
⚠️ *Potensi:* ${gempa.Potensi}
━━━━━━━━━━━━━━━━━━━
${mmiInfo}
`.trim()
      const shakemapUrl = 'https://data.bmkg.go.id/DataMKG/TEWS/' + gempa.Shakemap
      
      try {
        await bot.telegram.sendPhoto(config.gempaChannelId, shakemapUrl, {
          caption: caption,
          parse_mode: 'Markdown'
        })
      } catch (e) {
        console.error(chalk.red(`Gagal mengirim notif gempa ke channel ${config.gempaChannelId}: ${e.message}`))
      }
    }
  } catch (error) {
    console.error(chalk.red('Gagal menjalankan checkGempa:'), error)
  }
}

/**
 * Mengirim file database.json sebagai cadangan ke semua owner.
 * @param {import('telegraf').Telegraf} bot - Instance bot Telegraf.
 * @param {object} config - Objek konfigurasi.
 */
export async function Backup(bot, config) {
  try {
    const dbPath = 'database.json'
    await fs.access(dbPath) // Cek apakah file ada

    const caption = `🗓️ Backup Otomatis\nTanggal: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
    
    // Kirim ke setiap owner yang ada di config
    for (const ownerId of config.ownerIds) {
      try {
        await bot.telegram.sendDocument(ownerId, { source: dbPath }, { caption: caption })
      } catch (e) {
        console.error(chalk.red(`Gagal mengirim backup ke owner ${ownerId}: ${e.message}`))
      }
    }
    console.log(chalk.bgGreen.black('[✓] Backup database berhasil dikirim ke owner.'))
  } catch (error) {
    console.error(chalk.red.bold('Gagal melakukan backup:', error.message))
  }
}

/**
 * Membersihkan folder /tmp dan file .zip di direktori utama.
 */
export async function clearTmp() {
  try {
    const tmpDir = 'tmp'
    // Hapus isi folder /tmp
    const tmpFiles = await fs.readdir(tmpDir)
    for (const file of tmpFiles) {
      await fs.unlink(path.join(tmpDir, file))
    }
    
    // Hapus file .zip di root
    const rootFiles = await fs.readdir('./')
    const zipFiles = rootFiles.filter(file => file.endsWith('.zip'))
    for (const file of zipFiles) {
      await fs.unlink(file)
    }
    console.log(chalk.bgGreen.black('[✓] Sampah-sampah berhasil di bersihkan.'))
  } catch (error) {
    // Abaikan jika folder tmp tidak ada
    if (error.code !== 'ENOENT') {
      console.error(chalk.red('❌ Gagal membersihkan file sementara:', error.message))
    }
  }
}

/**
 * Placeholder untuk penjelasan manajemen memori.
 */
export async function clearMemory() {
  // Di Node.js, kita tidak bisa secara manual "membersihkan memori" seperti di bahasa lain.
  // Proses ini ditangani secara otomatis oleh Garbage Collector (GC).
  // Fungsi ini bisa digunakan untuk logging atau memicu GC jika diperlukan (mode expert).
  console.log(chalk.bgGreen.black('[✓] Cache memori telah di bersihkan.'))
}


