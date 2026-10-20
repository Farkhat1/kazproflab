import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(new URL('../../content-assets/brand/kazproflab-original.png', import.meta.url))
const publicPath = (name) => fileURLToPath(new URL(`../public/${name}`, import.meta.url))

// Keep the original emblem intact; omit only the small wordmark beneath it.
// A white field keeps the original blue and gold readable in either browser theme.
const emblem = await sharp(source)
  .extract({ left: 40, top: 50, width: 560, height: 420 })
  .png()
  .toBuffer()

async function makeIcon(size, inset = 0) {
  const innerSize = size - inset * 2
  const artwork = await sharp(emblem)
    .resize(innerSize, innerSize, { fit: 'contain', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .png()
    .toBuffer()
  return sharp({
    create: { width: size, height: size, channels: 4, background: '#ffffff' },
  })
    .composite([{ input: artwork, left: inset, top: inset }])
    .png()
    .toBuffer()
}

// BMP-backed ICO entries work in older icon readers as well as modern browsers.
async function makeIcoEntry(png, size) {
  const rgba = await sharp(png).ensureAlpha().raw().toBuffer()
  const maskRowBytes = Math.ceil(size / 32) * 4
  const pixelBytes = size * size * 4
  const dib = Buffer.alloc(40 + pixelBytes + maskRowBytes * size)
  dib.writeUInt32LE(40, 0)
  dib.writeInt32LE(size, 4)
  dib.writeInt32LE(size * 2, 8)
  dib.writeUInt16LE(1, 12)
  dib.writeUInt16LE(32, 14)
  dib.writeUInt32LE(pixelBytes + maskRowBytes * size, 20)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const src = (y * size + x) * 4
      const dst = 40 + ((size - 1 - y) * size + x) * 4
      dib[dst] = rgba[src + 2]
      dib[dst + 1] = rgba[src + 1]
      dib[dst + 2] = rgba[src]
      dib[dst + 3] = 255
    }
  }
  return dib
}

const sizes = [16, 32, 48]
const icons = await Promise.all(sizes.map((size) => makeIcon(size)))
const entries = await Promise.all(icons.map((png, index) => makeIcoEntry(png, sizes[index])))
const header = Buffer.alloc(6 + entries.length * 16)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(entries.length, 4)
let offset = header.length
entries.forEach((entry, index) => {
  const position = 6 + index * 16
  header[position] = sizes[index]
  header[position + 1] = sizes[index]
  header.writeUInt16LE(1, position + 4)
  header.writeUInt16LE(32, position + 6)
  header.writeUInt32LE(entry.length, position + 8)
  header.writeUInt32LE(offset, position + 12)
  offset += entry.length
})

await Promise.all([
  writeFile(publicPath('favicon.ico'), Buffer.concat([header, ...entries])),
  writeFile(publicPath('favicon-16x16.png'), icons[0]),
  writeFile(publicPath('favicon-32x32.png'), icons[1]),
  makeIcon(180, 14).then((png) => writeFile(publicPath('apple-touch-icon.png'), png)),
])
console.log('Prepared original-brand ICO (16/32/48), PNG favicons, and Apple touch icon.')
