// lib/functions.js

import chalk from 'chalk'
import config from '../config.js'
import axios from 'axios' // Menggunakan axios untuk konsistensi
import { randomBytes } from 'crypto' // <-- 1. Impor 'crypto'

/**
 * Mengunduh file dari URL menggunakan axios dengan header browser lengkap.
 * @param {string} url - URL file yang akan diunduh.
 * @returns {Promise<Buffer>} Buffer dari file yang diunduh.
 */
export async function downloadFile(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // Atur batas waktu 30 detik untuk setiap percobaan
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 detik

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
        }
      })
      
      clearTimeout(timeoutId) // Hapus timeout jika request berhasil

      if (!response.ok) {
        // Jika status error (spt 404, 415), langsung gagal tanpa retry
        throw new Error(`Gagal mengunduh, status code: ${response.status} ${response.statusText}`)
      }
      
      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer) // Jika berhasil, kembalikan buffer dan keluar dari loop

    } catch (error) {
      console.error(chalk.yellow(`[downloadFile] Percobaan ${i + 1} dari ${retries} gagal. Error: ${error.message}`))
      if (i === retries - 1) {
        // Jika ini adalah percobaan terakhir, lemparkan error
        console.error(chalk.red(`[downloadFile] Gagal total mengunduh setelah ${retries} percobaan.`))
        throw error
      }
      // Tunggu 1 detik sebelum mencoba lagi
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
}

/**
 * Memformat detik menjadi string waktu (hari, jam, menit, detik).
 */
export function runtime(seconds) {
  seconds = Number(seconds)
  if (isNaN(seconds)) return '0 detik'
  const d = Math.floor(seconds / (3600 * 24)); const h = Math.floor(seconds % (3600 * 24) / 3600); const m = Math.floor(seconds % 3600 / 60); const s = Math.floor(seconds % 60)
  let result = ''; if (d > 0) result += `${d} hari, `; if (h > 0) result += `${h} jam, `; if (m > 0) result += `${m} menit, `; if (s > 0) result += `${s} detik`
  return result.replace(/, $/, '') || '0 detik'
}

/**
 * Memformat byte menjadi unit yang lebih besar (KB, MB, GB).
 */
export function format(bytes) {
  if (bytes === 0) return '0 Bytes'; const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']; const i = Math.floor(Math.log(bytes) / Math.log(k)); return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Memberikan ucapan selamat berdasarkan waktu (WIB).
 */
export function ucapanWaktu() {
  const jam = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false });
  const waktu = parseInt(jam);
  if (waktu >= 4 && waktu < 11) { return 'Selamat Pagi ☀️' }
  else if (waktu >= 11 && waktu < 15) { return 'Selamat Siang 🌤️' }
  else if (waktu >= 15 && waktu < 19) { return 'Selamat Sore 🌇' }
  else { return 'Selamat Malam 🌙' }
}


export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Membuat ID acak berbasis heksadesimal.
 * @param {number} length - Panjang ID yang diinginkan.
 * @returns {string} ID acak.
 */
export function generateRandomId(length = 6) {
  return randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length)
}
