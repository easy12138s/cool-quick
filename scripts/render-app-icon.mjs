import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const svgPath = resolve('src-tauri/icons/icon.svg')
const outPngPath = resolve('app-icon.png')
const faviconPngPath = resolve('public/favicon.png')

const svg = readFileSync(svgPath)
const resvg1024 = new Resvg(svg, {
  background: 'rgba(0, 0, 0, 0)',
  fitTo: {
    mode: 'width',
    value: 1024,
  },
})

const png1024 = resvg1024.render()
writeFileSync(outPngPath, png1024.asPng())
console.log(`Wrote ${outPngPath} (${png1024.width}x${png1024.height})`)

const resvg64 = new Resvg(svg, {
  background: 'rgba(0, 0, 0, 0)',
  fitTo: {
    mode: 'width',
    value: 64,
  },
})

const png64 = resvg64.render()
writeFileSync(faviconPngPath, png64.asPng())
console.log(`Wrote ${faviconPngPath} (${png64.width}x${png64.height})`)
