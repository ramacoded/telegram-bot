import { ucapanWaktu } from '../lib/functions.js'
export default {
  command: 'start',
  description: 'Memulai interaksi dengan bot',
  category: 'Main', // <-- TAMBAHKAN INI
  
  execute: (ctx) => {
    const firstName = ctx.from.first_name
    ctx.reply(`👋 Halo, ${firstName}! ${ucapanWaktu()}\n\n/menu - Info List Menu Bot\n/ping - Info Perangkat & Jaringan Bot`)
  }
}
