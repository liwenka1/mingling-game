export const wireColumns = 6
export const wireRows = 5

export type WireLevel = {
  title: string
  start: number
  end: number
  anchors: readonly number[]
  blocked: readonly number[]
  budget: number
}

export const wireLevels = [
  { title: '入门', start: 24, end: 28, anchors: [19, 21], blocked: [20, 26], budget: 8 },
  { title: '标准', start: 24, end: 29, anchors: [9, 20], blocked: [4, 5, 8, 13, 14], budget: 15 },
  { title: '进阶', start: 24, end: 29, anchors: [10, 19], blocked: [4, 5, 6, 8, 17], budget: 17 },
  { title: '挑战', start: 0, end: 29, anchors: [16, 14], blocked: [13, 15, 19, 25, 26, 27], budget: 17 },
] satisfies WireLevel[]

export function wirePosition(index: number) {
  return { column: index % wireColumns, row: Math.floor(index / wireColumns) }
}

export const wireNeighbors = Array.from({ length: wireColumns * wireRows }, (_, cell) => {
  const { column, row } = wirePosition(cell)
  return [
    row > 0 ? cell - wireColumns : -1,
    column < wireColumns - 1 ? cell + 1 : -1,
    row < wireRows - 1 ? cell + wireColumns : -1,
    column > 0 ? cell - 1 : -1,
  ].filter((index) => index >= 0)
})

export function wireAnchorsPassed(level: WireLevel, route: readonly number[]) {
  return level.anchors.filter((cell) => route.includes(cell)).length
}

function gridDistance(a: number, b: number) {
  const first = wirePosition(a)
  const second = wirePosition(b)
  return Math.abs(first.column - second.column) + Math.abs(first.row - second.row)
}

export function wireSolution(level: WireLevel, prefix: readonly number[]): number[] | null {
  // The 30 grid positions fit in a bit mask, which makes the visited path cheap to compare.
  const visited = prefix.reduce((mask, cell) => mask | (1 << cell), 0)
  const failed = new Map<string, number>()

  function step(cell: number, anchor: number, mask: number, left: number): number[] | null {
    if (cell === level.end) return anchor === level.anchors.length ? [] : null
    const milestones = [cell, ...level.anchors.slice(anchor), level.end]
    let minimum = 0
    for (let i = 1; i < milestones.length; i += 1) {
      minimum += gridDistance(milestones[i - 1], milestones[i])
    }
    if (minimum > left) return null

    const key = [mask, cell, anchor].join(':')
    if ((failed.get(key) ?? -1) >= left) return null
    for (const next of wireNeighbors[cell]) {
      if ((mask & (1 << next)) || level.blocked.includes(next)) continue
      if (level.anchors.includes(next) && level.anchors[anchor] !== next) continue
      if (next === level.end && anchor < level.anchors.length) continue
      const count = anchor + Number(level.anchors[anchor] === next)
      const rest = step(next, count, mask | (1 << next), left - 1)
      if (rest) return [next, ...rest]
    }
    failed.set(key, left)
    return null
  }

  return step(prefix[prefix.length - 1], wireAnchorsPassed(level, prefix), visited, level.budget - prefix.length + 1)
}
