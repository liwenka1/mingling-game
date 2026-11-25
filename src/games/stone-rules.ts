export const emptyStone = '-'
export const stoneGoal = 'aabbccdd-'
export const sparePosition = stoneGoal.length - 1

export type PathEdge = readonly [number, number]

export const stonePaths: readonly PathEdge[] = [
  [0, 1], [2, 3], [4, 5], [6, 7],
  [0, 2], [2, 4], [4, 6], [1, 3], [3, 5], [5, 7],
  [0, 8], [1, 8],
]

export const stoneLevels = [
  { title: '入门', start: 'babaccdd-', par: 5, instruction: '点一尊金边石兽。石兽挪过去，灯就会照到新空位。' },
  { title: '标准', start: 'aabcbdcd-', par: 10, instruction: '想调整后排，就得先把唯一的空位借过去。' },
  { title: '挑战', start: 'abbcdadc-', par: 14, closed: [4, 5], instruction: '第三排的横道暂时封住了，找一条绕过去的路线。' },
] satisfies { title: string; start: string; par: number; closed?: PathEdge; instruction: string }[]

export type StoneLevel = (typeof stoneLevels)[number]

export function openStonePaths(level: StoneLevel) {
  const closed = level.closed
  return closed ? stonePaths.filter(([from, to]) => from !== closed[0] || to !== closed[1]) : stonePaths
}

export function makeStoneNeighbors(paths: readonly PathEdge[]) {
  const neighbors = Array.from({ length: stoneGoal.length }, () => [] as number[])
  for (const [from, to] of paths) {
    neighbors[from].push(to)
    neighbors[to].push(from)
  }
  return neighbors
}

export function swapStones(layout: string, source: number, target: number) {
  const pieces = [...layout]
  const tile = pieces[source]
  pieces[source] = pieces[target]
  pieces[target] = tile
  return pieces.join('')
}

const distancesByLevel = new Map<StoneLevel, Map<string, number>>()

export function stoneDistances(level: StoneLevel) {
  const saved = distancesByLevel.get(level)
  if (saved) return saved

  const neighbors = makeStoneNeighbors(openStonePaths(level))
  const distance = new Map([[stoneGoal, 0]])
  const queue = [stoneGoal]
  // Legal moves are reversible, so a search from the goal gives exact remaining steps.
  for (let head = 0; head < queue.length; head += 1) {
    const layout = queue[head]
    const empty = layout.indexOf(emptyStone)
    const nextDistance = distance.get(layout)! + 1
    for (const source of neighbors[empty]) {
      const moved = swapStones(layout, source, empty)
      if (distance.has(moved)) continue
      distance.set(moved, nextDistance)
      queue.push(moved)
    }
  }

  distancesByLevel.set(level, distance)
  return distance
}
