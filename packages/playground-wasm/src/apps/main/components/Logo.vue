<template>
  <Canvas :width="logoWidth" :height="logoHeight" :cells="logoCells" />
</template>

<script setup lang="ts">
import Canvas from '@buntui/extensions/canvas'
import type {CanvasCell} from '@buntui/extensions/canvas'

const LETTER_W = 5
const LETTER_H = 7
const LETTER_GAP = 1
const SHADOW_DX = 1
const SHADOW_DY = 1
const BLOCK = 0x2588

const FONT: Record<string, readonly string[]> = {
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
}

const GRADIENT = [
  0x67E8F9FF,
  0x50D5ECFF,
  0x39C2DFFF,
  0x22AFD2FF,
  0x0B9CC5FF,
  0x0089AFFF,
  0x0076900FF,
] as const

const SHADOW_RGBA = 0x1A2A3A99

const TEXT = 'BUNTUI'
const letters = TEXT.split('')

const logoWidth = letters.length * LETTER_W + (letters.length - 1) * LETTER_GAP
const logoHeight = LETTER_H + SHADOW_DY

function buildLogoCells(): CanvasCell[] {
  const cells: CanvasCell[] = Array.from(
    {length: logoWidth * logoHeight},
    (): CanvasCell => ({char: 0, fgRgba: 0, bgRgba: 0}),
  )

  for (let li = 0; li < letters.length; li++) {
    const bitmap = FONT[letters[li]!]
    if (!bitmap) {
      continue
    }

    const baseX = li * (LETTER_W + LETTER_GAP)

    for (let y = 0; y < LETTER_H; y++) {
      const row = bitmap[y]
      if (!row) {
        continue
      }

      for (let x = 0; x < LETTER_W; x++) {
        if (row[x] !== '1') {
          continue
        }

        const sx = baseX + x + SHADOW_DX
        const sy = y + SHADOW_DY
        if (sx >= 0 && sx < logoWidth && sy >= 0 && sy < logoHeight) {
          cells[sy * logoWidth + sx] = {char: BLOCK, fgRgba: SHADOW_RGBA, bgRgba: 0}
        }
      }
    }
  }

  for (let li = 0; li < letters.length; li++) {
    const bitmap = FONT[letters[li]!]
    if (!bitmap) {
      continue
    }

    const baseX = li * (LETTER_W + LETTER_GAP)

    for (let y = 0; y < LETTER_H; y++) {
      const row = bitmap[y]
      if (!row) {
        continue
      }

      for (let x = 0; x < LETTER_W; x++) {
        if (row[x] !== '1') {
          continue
        }

        cells[y * logoWidth + baseX + x] = {
          char: BLOCK,
          fgRgba: GRADIENT[y] ?? GRADIENT[GRADIENT.length - 1]!,
          bgRgba: 0,
        }
      }
    }
  }

  return cells
}

const logoCells = buildLogoCells()
</script>
