export const braceTypes = [
  { bias: 1, name: '偏左' },
  { bias: 0, name: '均托' },
  { bias: -1, name: '偏右' },
] as const

export type Bias = (typeof braceTypes)[number]['bias']
export type TimberLayout = (Bias | null)[]

export type TimberLevel = {
  title: string
  weights: readonly number[]
  limits: readonly number[]
  stock: Record<Bias, number>
  instruction: string
}

export const timberLevels = [
  { title: '入门', weights: [4, 4], limits: [3, 2, 3], stock: { 1: 1, 0: 0, '-1': 1 }, instruction: '中间这根柱子只能承受 2 份。试试把重量分给两边。' },
  { title: '标准', weights: [4, 4, 4, 4], limits: [2, 5, 2, 5, 2], stock: { 1: 1, 0: 2, '-1': 1 }, instruction: '先看哪几根柱子的上限最低，再选择支座。' },
  { title: '进阶', weights: [4, 6, 4, 6], limits: [3, 3, 6, 5, 3], stock: { 1: 1, 0: 2, '-1': 1 }, instruction: '梁位的重量不同了，选中后可以查看左右各分多少。' },
  { title: '挑战', weights: [6, 4, 6, 4], limits: [4, 4, 4, 7, 1], stock: { 1: 2, 0: 1, '-1': 1 }, instruction: '最右边的柱子只能撑 1 份，想想该怎么让它卸力。' },
] satisfies TimberLevel[]

export function braceName(bias: Bias) {
  return braceTypes.find((item) => item.bias === bias)!.name
}

export function shareWeight(weight: number, bias: Bias) {
  const half = weight / 2
  return [half + bias, half - bias] as const
}

export function timberLoads(level: TimberLevel, layout: TimberLayout) {
  const loads = level.limits.map(() => 0)
  layout.forEach((bias, index) => {
    if (bias === null) return
    const [left, right] = shareWeight(level.weights[index], bias)
    loads[index] += left
    loads[index + 1] += right
  })
  return loads
}

export function freeBraces(level: TimberLevel, layout: TimberLayout, bias: Bias) {
  return level.stock[bias] - layout.filter((placed) => placed === bias).length
}

export function timberSolutions(level: TimberLevel): Bias[][] {
  const results: Bias[][] = []

  function place(layout: Bias[]) {
    if (layout.length === level.weights.length) {
      if (timberLoads(level, layout).every((weight, index) => weight <= level.limits[index])) {
        results.push(layout)
      }
      return
    }
    for (const { bias } of braceTypes) {
      if (freeBraces(level, layout, bias) > 0) place([...layout, bias])
    }
  }

  place([])
  return results
}
