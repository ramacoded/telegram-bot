// lib/database.js

import { JSONFilePreset } from 'lowdb/node'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const filePath = path.join(__dirname, '..', 'database.json')

const defaultData = {
  users: {},
  chats: {},
  stats: {
    gempaDateTime: ''
  },
  settings: {},
  bots: {}
}

export async function initializeDatabase() {
  const db = await JSONFilePreset(filePath, defaultData)
  
  global.db = db
  
  global.loadDatabase = async function loadDatabase() {
    await db.read()
  }
  
  await global.loadDatabase()
}
