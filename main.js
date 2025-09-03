// main.js
import { Telegraf } from 'telegraf'
import config from './config.js'
import path, { join } from 'path'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import { readdirSync, readFileSync, watch, existsSync } from 'fs'
import syntaxerror from 'syntax-error'
import cron from 'node-cron'
import { delay } from './lib/functions.js'
import { initializeDatabase } from './lib/database.js'
import { updateStats } from './lib/statistics.js'
import { checkGempa, Backup, clearTmp, clearMemory } from './lib/schedule.js'
import { handleAiChat } from './plugins/ai-autoai.js'
import { handleAiChat2 } from './plugins/ai-codeassistant.js'
import { executeExec } from './plugins/owner-exec2.js'
import { sticker } from './lib/sticker.js'
import * as handler from './lib/handler.js' 

Object.assign(global, {
  ...handler
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const bot = new Telegraf(config.token)
bot.commands = new Map()
const pluginFiles = new Map()
const pluginFolder = join(__dirname, 'plugins')
const pluginFilter = (filename) => /\.js$/.test(filename)

async function loadPlugin(filePath) {
  const filename = path.basename(filePath)
  const err = syntaxerror(readFileSync(filePath, 'utf8'), filename, { sourceType: 'module', allowAwaitOutsideFunction: true })
  if (err) return console.error(chalk.red(`❌ Syntax error di ${filename}:\n${err}`))

  try {
    const fileUrl = `file://${filePath.replace(/\\/g, '/')}?v=${Date.now()}`
    const { default: plugin } = await import(fileUrl)

    if (!plugin || !plugin.command || !plugin.execute) return

    pluginFiles.set(filePath, plugin)
    const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
    commands.forEach(cmd => bot.commands.set(cmd, plugin))
  } catch (e) {
    console.error(chalk.red(`❌ Gagal mengimpor plugin ${filename}:\n${e}`))
  }
}

function unloadPlugin(filePath) {
  const plugin = pluginFiles.get(filePath)
  if (!plugin) return

  const commands = Array.isArray(plugin.command) ? plugin.command : [plugin.command]
  commands.forEach(cmd => bot.commands.delete(cmd))
  pluginFiles.delete(filePath)
}

async function startBot() {
  await initializeDatabase()
  
   console.log(chalk.cyan.bold('\n-------- Assistant Bot --------'))
   console.log(chalk.white.bold(`  - Pembuat : Didik R.`))
   console.log(chalk.white.bold(`  - Versi   : 1.0.0 (Modular)`))
   console.log(chalk.white.bold(`  - Library : Telegraf.js`))
   console.log(chalk.white.bold(`  - Tanggal : ${new Date().toLocaleDateString('id-ID')}`))
   console.log(chalk.cyan.bold('-------- Memuat Plugin --------'))
   
  const files = readdirSync(pluginFolder).filter(pluginFilter)
  for (const filename of files) {
    const filePath = join(pluginFolder, filename)
    await loadPlugin(filePath)
  }
  console.log(chalk.bgGreen.black(`[✓] ${pluginFiles.size} plugin berhasil dimuat.`))

  watch(pluginFolder, async (eventType, filename) => {
    if (!filename || !pluginFilter(filename)) return

    const filePath = join(pluginFolder, filename)
    const fileExists = existsSync(filePath)
    const isLoaded = pluginFiles.has(filePath)

    if (fileExists && !isLoaded) {
      console.log(chalk.bgGreen.black(`[+] ${filename} Added`))
      await loadPlugin(filePath)
    } else if (!fileExists && isLoaded) {
      console.log(chalk.bgRed.black(`[-] ${filename} Deleted`))
      unloadPlugin(filePath)
    } else if (fileExists && isLoaded) {
      console.log(chalk.bgYellow.black(`[~] ${filename} Changed`))
      unloadPlugin(filePath)
      await loadPlugin(filePath)
    }
  })
  
  cron.schedule('*/5 * * * *', () => {
    console.log(chalk.bgGreen.black('[!] Mengecek info gempa...'))
    checkGempa(bot, config)
  }, {
    scheduled: true,
    timezone: "Asia/Jakarta"
  })
    cron.schedule('0 */6 * * *', async () => {
    await Backup(bot, config)
    await clearTmp()
    await clearMemory()
  }, {
    scheduled: true,
    timezone: "Asia/Jakarta"
  })
  
  bot.on(['text', 'photo'], (ctx) => {
  ctx.handleError = (error, commandName) => {
    // 'bot' dan 'ctx' sudah otomatis tersedia di sini
    handleError(bot, ctx, commandName || ctx.command?.command, error)
  }
    const userId = ctx.from.id
    const messageText = ctx.message.text || ctx.message.caption || ''

    // 1. Cek apakah pesan adalah perintah exec ($)
    if (messageText && messageText.startsWith('$ ')) {
        const commandString = messageText.substring(2) // Ambil semua teks setelah '$ '
        return executeExec(ctx, commandString)
    }

    // 2. Jika bukan, cek apakah pesan adalah perintah biasa (/)
    if (messageText && messageText.startsWith('/')) {
        const commandName = messageText.split(' ')[0].substring(1)
        const command = bot.commands.get(commandName)

        // Jika perintahnya valid, jalankan
        if (command) {
            updateStats(ctx, commandName)
            ctx.command = { name: commandName, command: command }
            const chatType = ctx.chat.type
            const from = ctx.from
            const chat = ctx.chat
            if (chatType === 'private') {
                console.log(chalk.bgGreen.black('\n[PRIVATE CHAT]'))
                console.log(chalk.white.bold(`Name    : ${ctx.from.first_name}`))
                console.log(chalk.white.bold(`Id      : ${ctx.from.id}`))
                console.log(chalk.white.bold(`Command : /${commandName}`))
            } else if (chatType === 'group' || chatType === 'supergroup') {
                console.log(chalk.bgGreen.black('\n[GROUP CHAT]'))
                console.log(chalk.white.bold(`Name    : ${ctx.chat.title}`))
                console.log(chalk.white.bold(`Id      : ${ctx.chat.id}`))
                console.log(chalk.white.bold(`From    : ${from.first_name} (${from.id})`))
                console.log(chalk.white.bold(`Command : /${commandName}`))
            }

            try {
                ctx.botCommands = bot.commands
                command.execute(ctx, { __dirname, bot })
            } catch (error) {
                ctx.handleError(error, commandName)
            }
            return // Hentikan proses di sini setelah perintah dieksekusi
        }
    }

    // 3. Jika bukan keduanya, baru cek mode Auto AI
  if (global.db?.data?.users?.[userId]?.autoAiActive) {
    // Jika AI error, ia akan ditangkap di dalam fungsinya sendiri
    handleAiChat(ctx).catch(err => ctx.handleError(err, 'autoai'))
    return
  }
    if (global.db?.data?.users?.[userId]?.codeassistantActive) {
    // Jika AI error, ia akan ditangkap di dalam fungsinya sendiri
    handleAiChat2(ctx).catch(err => ctx.handleError(err, 'codeassistant'))
    return
  }
})

  delay(5000)
  bot.launch()

  process.once('SIGINT', () => bot.stop('SIGINT'))
  process.once('SIGTERM', () => bot.stop('SIGTERM'))
}

startBot()