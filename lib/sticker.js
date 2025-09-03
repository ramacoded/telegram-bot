// lib/sticker.js
import pkg from 'node-webpmux'
const { Image } = pkg

/**
 * Mengubah buffer gambar menjadi stiker WebP
 * @param {Buffer} img - Buffer gambar
 * @param {object} [metadata] - Metadata stiker
 * @returns {Promise<Buffer>} Buffer stiker WebP
 */
export async function sticker(img, metadata = {}) {
  const sticker = new Image()
  const defaultMetadata = {
    "sticker-pack-id": "https://github.com/ramacoded",
    "sticker-pack-name": "Telegram Bot",
    "sticker-pack-publisher": "ramacoded",
    ...metadata
  }
  await sticker.load(img)
  return await sticker.save({ exifData: defaultMetadata })
}
