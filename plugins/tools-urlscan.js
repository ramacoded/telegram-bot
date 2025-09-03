// plugins/tools-urlscan.js

import fetch from 'node-fetch'
import config from '../config.js'

// Helper untuk mengekstrak URL dari teks
const getUrl = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const match = text.match(urlRegex)
    return match ? match[0] : null
}

export default {
  command: ['scan', 'checkurl', 'virustotal'],
  description: 'Memeriksa keamanan sebuah URL menggunakan VirusTotal.',
  category: 'Tools',

  execute: async (ctx) => {
    try {
      if (!config.virusTotalApiKey) {
        return ctx.reply('API Key untuk VirusTotal belum diatur di file config.js.')
      }

      const args = ctx.message.text.split(' ')
      let urlToCheck = args[1]
      const replied = ctx.message.reply_to_message

      if (!urlToCheck && replied && replied.text) {
        urlToCheck = getUrl(replied.text)
      } else if (urlToCheck) {
        urlToCheck = getUrl(urlToCheck)
      }
      
      if (!urlToCheck) {
        return ctx.reply('Format salah. Kirim perintah dengan URL atau reply pesan yang berisi URL.\n\nContoh: /scan https://google.com')
      }

      const processingMsg = await ctx.reply(`🔍 Menganalisis URL...\n\`${urlToCheck}\``, { parse_mode: 'Markdown' })

      // Step 1: Kirim URL untuk dianalisis
      const scanResponse = await fetch('https://www.virustotal.com/api/v3/urls', {
        method: 'POST',
        headers: { 'x-apikey': config.virusTotalApiKey, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `url=${encodeURIComponent(urlToCheck)}`
      })
      
      if (!scanResponse.ok) {
        const errorData = await scanResponse.json().catch(() => null)
        throw new Error(`VirusTotal API Error (Scan): ${errorData?.error?.message || scanResponse.statusText}`)
      }
      
      const scanData = await scanResponse.json()
      const analysisId = scanData.data.id

      // Step 2: Tunggu dan ambil hasil analisis
      await new Promise(resolve => setTimeout(resolve, 8000)) // Jeda ditambah sedikit untuk analisis lebih dalam

      const reportResponse = await fetch(`https://www.virustotal.com/api/v3/analyses/${analysisId}`, {
        headers: { 'x-apikey': config.virusTotalApiKey }
      })

      if (!reportResponse.ok) {
        const errorData = await reportResponse.json().catch(() => null)
        throw new Error(`VirusTotal API Error (Report): ${errorData?.error?.message || reportResponse.statusText}`)
      }

      const reportData = await reportResponse.json()
      const stats = reportData.data.attributes.stats
      const results = reportData.data.attributes.results

      // --- FORMAT HASIL YANG LEBIH LENGKAP ---
      let verdict = '⚪️ Tidak Diketahui'
      if (stats.malicious > 0) verdict = '🔴 BERBAHAYA'
      else if (stats.suspicious > 0) verdict = '🟡 MENCURIGAKAN'
      else if (stats.harmless > 5) verdict = '🟢 AMAN'

      // Fungsi untuk membuat daftar deteksi
      const createDetectionList = (category) => {
        const vendors = Object.entries(results)
            .filter(([, result]) => result.category === category)
            .map(([vendor]) => `• \`${vendor}\``)
        return vendors.length > 0 ? vendors.join('\n') : '_Tidak ada_'
      }

      const maliciousList = createDetectionList('malicious')
      const suspiciousList = createDetectionList('suspicious')
      const harmlessList = createDetectionList('harmless')

      const resultText = `
*📊 Hasil Scan VirusTotal*

*URL:* \`${urlToCheck}\`
*Status Final:* *${verdict}*
━━━━━━━━━━━━━━━━━━━━
*📈 Ringkasan Deteksi*
\`\`\`
- Aman (Harmless)     : ${stats.harmless || 0}
- Tidak Terdeteksi    : ${stats.undetected || 0}
- Mencurigakan        : ${stats.suspicious || 0}
- Berbahaya (Malicious) : ${stats.malicious || 0}
\`\`\`
━━━━━━━━━━━━━━━━━━━━
*🔴 Deteksi Berbahaya*
${maliciousList}

*🟡 Deteksi Mencurigakan*
${suspiciousList}

*🟢 Deteksi Aman (Contoh)*
${harmlessList.split('\n').slice(0, 5).join('\n')}
      `.trim()
      
      await ctx.telegram.editMessageText(ctx.chat.id, processingMsg.message_id, null, resultText, { parse_mode: 'Markdown' })

    } catch (e) {
      if(processingMsg) await ctx.deleteMessage(processingMsg.message_id).catch(()=>{})
      ctx.handleError(e, 'scan')
    }
  }
}
