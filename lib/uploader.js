import FD from 'form-data'
import axios from 'axios'
import fs from 'fs'

/**
 * Mengunggah file dari path lokal ke Uguu.se
 * @param {string} filePath - Path ke file yang akan diunggah
 * @returns {Promise<string>} URL file yang sudah diunggah
 */
export async function uploader(filePath) {
  return new Promise(async (resolve, reject) => {
    const form = new FD();
    form.append("files[]", fs.createReadStream(filePath))

    try {
      const response = await axios({
        url: "https://uguu.se/upload.php",
        method: "POST",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.212 Safari/537.36",
          ...form.getHeaders()
        },
        data: form
      })
      
      // Uguu.se mengembalikan URL di dalam object files[0].url
      resolve(response.data.files[0].url)

    } catch (err) {
      reject(err)
    }
  })
}

