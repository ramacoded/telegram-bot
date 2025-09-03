// lib/statistics.js

/**
 * Memperbarui statistik penggunaan perintah untuk user dan command.
 * @param {import('telegraf').Context} ctx - Objek context dari Telegraf.
 * @param {string} commandName - Nama perintah yang dieksekusi.
 */
export function updateStats(ctx, commandName) {
  if (!global.db || !global.db.data) return

  // --- KODE PENGAMAN DITAMBAHKAN DI SINI ---
  // Pastikan objek 'users' dan 'chats' ada di database, jika tidak, buat baru.
  if (!global.db.data.users) {
    global.db.data.users = {}
  }
  if (!global.db.data.chats) {
    global.db.data.chats = {}
  }
  // --- AKHIR DARI KODE PENGAMAN ---

  const userId = ctx.from.id
  const userName = ctx.from.first_name

  // Memperbarui data 'users'
  if (global.db.data.users[userId]) {
    global.db.data.users[userId].totalCommand += 1
    global.db.data.users[userId].name = userName
  } else {
    global.db.data.users[userId] = {
      name: userName,
      totalCommand: 1
    }
  }

  // Memperbarui data 'chats'
  if (global.db.data.chats[commandName]) {
    global.db.data.chats[commandName] += 1
  } else {
    global.db.data.chats[commandName] = 1
  }

  global.db.write()
}
