import { useCallback, useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent, PointerEvent } from 'react'
import crownScene from '../assets/crown.webp'
import { wireAnchorsPassed, wireColumns, wireLevels, wireNeighbors, wirePosition, wireRows, wireSolution } from './wire-rules'
import type { WireLevel } from './wire-rules'
import { Feedback, GameLayout, Outcome, Stage, useCanvas } from './shared'
import type { GameProps, Notice } from './shared'

const observation = {
  title: '看凤冠上的花丝',
  detail: '孝端皇后九龙九凤冠出土于昌平定陵。看国博的馆藏图，找一找九条花丝金龙。',
  link: 'https://www.chnmuseum.cn/zx/gbxw/202603/t20260306_278223.shtml',
  linkText: '国家博物馆馆藏资料',
}

type WireRound = {
  route: number[]
  hint: number | null
  rejected: number | null
  notice: Notice
}
type Point = { x: number; y: number }
type Gesture = { id: number; point: Point; last: number }

function beginning(level: WireLevel): WireRound {
  return {
    route: [level.start], hint: null, rejected: null,
    notice: { text: `你有 ${level.budget} 格金丝。先从「起」走到金环 1。` },
  }
}

function cellLabel(index: number) {
  const { row, column } = wirePosition(index)
  return `第 ${row + 1} 行第 ${column + 1} 列`
}

function WireBoard({ active, levelIndex, wins, onLevel, onWin }: Pick<GameProps, 'active'> & {
  levelIndex: number
  wins: readonly number[]
  onLevel: (index: number) => void
  onWin: (index: number) => void
}) {
  const level = wireLevels[levelIndex]
  const [round, updateRound] = useState(() => beginning(level))
  const [keyboardCell, setKeyboardCell] = useState(level.start)
  const latest = useRef(round)
  const gesture = useRef<Gesture | null>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const tail = round.route[round.route.length - 1]
  const finished = tail === level.end

  useEffect(() => {
    if (!active) gesture.current = null
  }, [active])

  function commit(next: WireRound) {
    // Pointer events can cross several cells before React paints the next frame.
    latest.current = next
    updateRound(next)
  }

  function reject(index: number, text: string) {
    commit({ ...latest.current, hint: null, rejected: index, notice: { text, kind: 'wrong' } })
  }

  function retract() {
    const route = latest.current.route
    if (route.length < 2 || route.at(-1) === level.end) return
    const next = route.slice(0, -1)
    setKeyboardCell(next[next.length - 1])
    commit({ route: next, hint: null, rejected: null, notice: { text: '收回一格。继续从亮着的线头出发。' } })
  }

  function step(index: number) {
    const route = latest.current.route
    const current = route[route.length - 1]
    if (current === level.end || index === current) return
    if (index === route.at(-2)) {
      retract()
      return
    }
    if (!wireNeighbors[current].includes(index)) {
      reject(index, '请沿格线走到线头旁边的一格。')
      return
    }
    if (level.blocked.includes(index)) {
      reject(index, '这里留给珍珠，试试从旁边绕过去。')
      return
    }
    if (route.includes(index)) {
      reject(index, '这个格点已经用过，往空着的格点走。')
      return
    }
    const passed = wireAnchorsPassed(level, route)
    if (level.anchors.includes(index) && index !== level.anchors[passed]) {
      reject(index, `先穿过金环 ${passed + 1}。`)
      return
    }
    if (index === level.end && passed < level.anchors.length) {
      reject(index, '穿过两枚金环后再收线。')
      return
    }
    if (route.length - 1 >= level.budget) {
      reject(index, '金丝已用完。收回几格，换一条短一点的路。')
      return
    }

    const next = [...route, index]
    const left = level.budget - (next.length - 1)
    const anchor = level.anchors.indexOf(index)
    let text = left ? `还有 ${left} 格金丝。` : '金丝已用完。可以收回几格调整线路。'
    if (anchor !== -1) {
      text = anchor + 1 < level.anchors.length
        ? `已穿过金环 ${anchor + 1}，继续到金环 ${anchor + 2}。`
        : '两枚金环均已穿过，向「收」继续。'
    }

    setKeyboardCell(index)
    commit({ route: next, hint: null, rejected: null, notice: { text, kind: anchor === -1 ? undefined : 'hint' } })
    if (index === level.end) onWin(levelIndex)
  }

  function showHint() {
    const state = latest.current
    const next = wireSolution(level, state.route)?.[0]
    commit({
      ...state,
      hint: next ?? null,
      rejected: null,
      notice: next === undefined
        ? { text: '当前路线走不通。试试收回一格，再改线。', kind: 'wrong' }
        : { text: `下一步可以走${cellLabel(next)}。`, kind: 'hint' },
    })
  }

  function reset() {
    gesture.current = null
    commit(beginning(level))
    setKeyboardCell(level.start)
  }

  const paint = useCallback(({ context, width, height }: { context: CanvasRenderingContext2D; width: number; height: number }) => {
    const point = (index: number) => {
      const { column, row } = wirePosition(index)
      return [(column + 0.5) * width / wireColumns, (row + 0.5) * height / wireRows] as const
    }

    context.strokeStyle = '#a375506d'
    context.lineWidth = 1
    context.setLineDash([2, 4])
    wireNeighbors.forEach((neighbors, index) => {
      if (level.blocked.includes(index)) return
      for (const next of neighbors) {
        if (next < index || level.blocked.includes(next)) continue
        context.beginPath()
        context.moveTo(...point(index))
        context.lineTo(...point(next))
        context.stroke()
      }
    })

    if (round.route.length > 1) {
      context.setLineDash([])
      context.lineWidth = finished ? 4 : 3
      context.strokeStyle = '#f8cf7f'
      context.shadowColor = '#edb26490'
      context.shadowBlur = 9
      context.beginPath()
      context.moveTo(...point(round.route[0]))
      for (const index of round.route.slice(1)) context.lineTo(...point(index))
      context.stroke()
      context.shadowBlur = 0
    }

    if (round.hint !== null) {
      context.setLineDash([4, 4])
      context.lineWidth = 2.3
      context.strokeStyle = '#ffdc9b'
      context.beginPath()
      context.moveTo(...point(tail))
      context.lineTo(...point(round.hint))
      context.stroke()
    }
  }, [level, round.route, round.hint, finished, tail])
  const { areaRef, canvasRef } = useCanvas<HTMLDivElement>(active, paint)

  function eventCell(target: EventTarget) {
    if (!(target instanceof HTMLElement)) return
    const button = target.closest<HTMLButtonElement>('.wire-cell')
    if (button) return Number(button.dataset.cell)
  }

  function pointerStart(event: PointerEvent<HTMLDivElement>) {
    const index = eventCell(event.target)
    if (index === undefined || finished || event.button !== 0 || !event.isPrimary) return
    gesture.current = { id: event.pointerId, point: { x: event.clientX, y: event.clientY }, last: index }
    event.currentTarget.setPointerCapture(event.pointerId)
    setKeyboardCell(index)
    step(index)
  }

  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const tracking = gesture.current
    if (event.pointerId !== tracking?.id || latest.current.route.at(-1) === level.end) return
    const rect = event.currentTarget.getBoundingClientRect()
    const width = rect.width / wireColumns
    const height = rect.height / wireRows
    if (!width || !height) return
    const point = { x: event.clientX, y: event.clientY }
    const dx = point.x - tracking.point.x
    const dy = point.y - tracking.point.y
    // Sample the pointer segment so a quick straight swipe can reach intermediate pins.
    const samples = Math.min(48, Math.max(1, Math.ceil(Math.hypot(dx, dy) / (Math.min(width, height) / 3))))
    for (let index = 1; index <= samples; index += 1) {
      const x = (tracking.point.x + dx * index / samples - rect.left) / width
      const y = (tracking.point.y + dy * index / samples - rect.top) / height
      const column = Math.floor(x)
      const row = Math.floor(y)
      if (column < 0 || column >= wireColumns || row < 0 || row >= wireRows) continue
      if (Math.hypot(x - column - 0.5, y - row - 0.5) > 0.40) continue
      const cell = row * wireColumns + column
      if (cell === tracking.last) continue
      tracking.last = cell
      const current = latest.current.route.at(-1)!
      if (wireNeighbors[current].includes(cell)) step(cell)
    }
    tracking.point = point
  }

  function endGesture(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerId === gesture.current?.id) gesture.current = null
  }

  function finishGesture(event: PointerEvent<HTMLDivElement>) {
    pointerMove(event)
    endGesture(event)
  }

  function keyboardMove(event: KeyboardEvent<HTMLDivElement>) {
    const index = eventCell(event.target)
    if (index === undefined) return
    const offsets: Record<string, number> = { ArrowUp: -wireColumns, ArrowRight: 1, ArrowDown: wireColumns, ArrowLeft: -1 }
    const offset = offsets[event.key]
    if (offset === undefined) return
    event.preventDefault()
    const next = index + offset
    if (!wireNeighbors[index].includes(next)) return
    setKeyboardCell(next)
    buttons.current[next]?.focus()
  }

  function keyboardClick(event: MouseEvent<HTMLDivElement>) {
    const cell = eventCell(event.target)
    if (cell !== undefined && event.detail === 0) step(cell)
  }

  const stage = (
    <Stage
      background={crownScene} label="凤冠走线棋盘" location="定陵 · 凤冠"
      descriptionId="wire-rule" variant="craft-stage wire-stage" finished={finished} stageRef={stageRef}
    >
      <div className="wire-rig">
        <canvas className="wire-lines" ref={canvasRef} aria-hidden="true" />
        <div className="wire-grid" ref={areaRef} role="group" aria-label="六列五行走线格点"
          onPointerDown={pointerStart} onPointerMove={pointerMove} onPointerUp={finishGesture}
          onPointerCancel={endGesture} onLostPointerCapture={endGesture} onClick={keyboardClick} onKeyDown={keyboardMove}
        >
          {wireNeighbors.map((_, index) => {
            const anchor = level.anchors.indexOf(index) + 1
            const kind = index === level.start ? 'start' : index === level.end ? 'end'
              : level.blocked.includes(index) ? 'pearl' : anchor ? 'anchor' : 'ordinary'
            const label = kind === 'start' ? '起点' : kind === 'end' ? '收线点'
              : kind === 'pearl' ? '珠位' : anchor ? `金环 ${anchor}` : '格点'
            const face = kind === 'start' ? '起' : kind === 'end' ? '收' : anchor || ''
            const style = [
              'wire-cell', round.route.includes(index) && 'is-thread', index === tail && 'is-tail',
              index === round.hint && 'is-hint', index === round.rejected && 'is-wrong',
            ].filter(Boolean).join(' ')
            return (
              <button key={index} type="button" className={style} data-cell={index} data-kind={kind}
                ref={(button) => { buttons.current[index] = button }}
                aria-label={`${cellLabel(index)}，${label}${index === tail ? '，当前线头' : ''}`}
                tabIndex={index === keyboardCell ? 0 : -1}
              >
                <span className="wire-dot" aria-hidden="true">{face}</span>
              </button>
            )
          })}
        </div>
      </div>
    </Stage>
  )

  return (
    <GameLayout
      title="一线盘金" descriptionId="wire-rule"
      description="沿格线按顺序穿过两枚金环，再到「收」。绕开珠位，每个格点只能用一次。"
      status={<p className="craft-status">{round.route.length - 1} / {level.budget} 格</p>}
      stage={stage} levels={wireLevels} level={levelIndex} wins={wins} onLevel={onLevel}
    >
      {finished ? (
        <Outcome
          title="金丝收线" summary={`用 ${round.route.length - 1} 格金丝穿过两枚金环。`}
          observation={observation} action={levelIndex < wireLevels.length - 1 ? '下一关' : '再玩一轮'}
          onNext={() => onLevel((levelIndex + 1) % wireLevels.length)}
        />
      ) : (
        <div className="controls">
          <div className="wire-legend" aria-label="图例">
            <span><b aria-hidden="true">起</b>起点</span><span><b aria-hidden="true">1</b>金环</span>
            <span><b className="pearl-key" aria-hidden="true" />珠位</span><span><b className="end-key" aria-hidden="true">收</b>终点</span>
          </div>
          <p className="small-note">点相邻格点，或按住线头沿格线拖。</p>
          <Feedback notice={round.notice} />
          <div className="craft-actions">
            <button className="button" type="button" onClick={showHint}>提示一步</button>
            <button className="button plain" type="button" disabled={round.route.length === 1} onClick={retract}>收回一格</button>
            <button className="button plain" type="button" onClick={reset}>重开</button>
          </div>
        </div>
      )}
    </GameLayout>
  )
}

export default function WireGame({ active, onClear }: GameProps) {
  const [level, setLevel] = useState(0)
  const [wins, setWins] = useState<number[]>([])

  function win(index: number) {
    setWins((previous) => previous.includes(index) ? previous : [...previous, index])
    onClear()
  }

  return <WireBoard key={level} active={active} levelIndex={level} wins={wins} onLevel={setLevel} onWin={win} />
}
