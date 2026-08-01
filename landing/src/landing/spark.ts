export interface SparkGeometry {
  readonly line: string
  readonly area: string
  readonly viewBox: string
}

interface SparkPoint {
  readonly x: number
  readonly y: number
}

const HEAD_ROOM = 0.12

export function sparkGeometry(
  points: readonly number[],
  width = 1000,
  height = 170
): SparkGeometry {
  const viewBox = `0 0 ${width} ${height}`
  if (points.length < 2) return { line: "", area: "", viewBox }

  const low = Math.min(...points)
  const high = Math.max(...points)
  const span = high - low || 1
  const pad = span * HEAD_ROOM
  const step = width / (points.length - 1)
  const coords: SparkPoint[] = points.map((value, index) => ({
    x: round(index * step),
    y: round(height - ((value - low + pad) / (span + pad * 2)) * height),
  }))

  const at = (index: number): SparkPoint =>
    coords[Math.min(Math.max(index, 0), coords.length - 1)] as SparkPoint

  let line = `M${at(0).x},${at(0).y}`
  for (let index = 0; index < coords.length - 1; index += 1) {
    const previous = at(index - 1)
    const from = at(index)
    const to = at(index + 1)
    const next = at(index + 2)
    const c1x = round(from.x + (to.x - previous.x) / 6)
    const c1y = round(from.y + (to.y - previous.y) / 6)
    const c2x = round(to.x - (next.x - from.x) / 6)
    const c2y = round(to.y - (next.y - from.y) / 6)
    line += ` C${c1x},${c1y} ${c2x},${c2y} ${to.x},${to.y}`
  }

  return { line, area: `${line} L${width},${height} L0,${height} Z`, viewBox }
}

function round(value: number): number {
  return Math.round(value * 10) / 10
}
