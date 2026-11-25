import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import scene from '../assets/scene.webp'
import camelRest from '../assets/camel-rest.webp'
import camelStand from '../assets/camel-stand.webp'
import elephantRest from '../assets/elephant-rest.webp'
import elephantStand from '../assets/elephant-stand.webp'
import { emptyStone, makeStoneNeighbors, openStonePaths, sparePosition, stoneDistances, stoneGoal, stoneLevels, swapStones } from './stone-rules'
import type { StoneLevel } from './stone-rules'
import { Feedback, GameLayout, Outcome, Stage, useCanvas } from './shared'
import type { GameProps, GameStyle, Notice } from './shared'

const animals = {
  a: { name: '卧驼', image: camelRest },
  b: { name: '立驼', image: camelStand },
  c: { name: '卧象', image: elephantRest },
  d: { name: '立象', image: elephantStand },
}
type AnimalCode = keyof typeof animals

const positions = [
  { x: 17, y: 82, depth: 1 },
  { x: 24, y: 68, depth: 0.9 },
  { x: 31, y: 55, depth: 0.78 },
  { x: 37, y: 43, depth: 0.66 },
].flatMap((row, index) => [
  { ...row, facing: 1, layer: 8 - index, label: `第 ${index + 1} 排左侧` },
  { ...row, x: 100 - row.x, facing: -1, layer: 8 - index, label: `第 ${index + 1} 排右侧` },
])
positions.push({ x: 50, y: 93, depth: 0.9, facing: 1, layer: 9, label: '周转位' })

type Motion = { from: number; to: number }
type StoneRound = {
  layout: string
  history: string[]
  hint: number | null
  rejected: number | null
  motion: Motion | null
  notice: Notice
}

const observation = {
  title: '到神道找一找',
  detail: '看看哪一对石象立着、哪一对卧着，再回头找它们前面的石驼。',
  link: 'https://www.mingshisanling.com/spot/98.html',
  linkText: '景区资料',
}

function opening(level: StoneLevel): StoneRound {
  return { layout: level.start, history: [], hint: null, rejected: null, motion: null, notice: { text: level.instruction } }
}

function StoneBoard({ levelIndex, onLevel, active, wins, onWin }: Pick<GameProps, 'active'> & {
  levelIndex: number
  onLevel: (index: number) => void
  wins: readonly number[]
  onWin: (index: number) => void
}) {
  const level = stoneLevels[levelIndex]
  const paths = useMemo(() => openStonePaths(level), [level])
  const neighbors = useMemo(() => makeStoneNeighbors(paths), [paths])
  const [round, setRound] = useState(() => opening(level))
  const slotNodes = useRef<(HTMLButtonElement | null)[]>([])
  const cleared = useRef(false)
  const playedMotion = useRef<Motion | null>(null)
  const empty = round.layout.indexOf(emptyStone)
  const finished = round.layout === stoneGoal
  const covered = round.layout.slice(0, sparePosition).split('').filter((value, index) => value === stoneGoal[index]).length

  useEffect(() => {
    if (finished && !cleared.current) onWin(levelIndex)
    cleared.current = finished
  }, [finished, levelIndex, onWin])

  function move(index: number) {
    setRound((previous) => {
      const blank = previous.layout.indexOf(emptyStone)
      if (previous.layout === stoneGoal) return previous
      if (index === blank) {
        return { ...previous, notice: { text: '灯亮的是空位。点一尊与它相连的金边石兽。' } }
      }
      if (!neighbors[blank].includes(index)) {
        return { ...previous, rejected: index, notice: { text: '先点一尊与空位相连的金边石兽。', kind: 'wrong' } }
      }
      const name = animals[previous.layout[index] as AnimalCode].name
      return {
        layout: swapStones(previous.layout, index, blank),
        history: [...previous.history, previous.layout],
        hint: null,
        rejected: null,
        motion: { from: index, to: blank },
        notice: { text: `${name}移入空位。灯照到${positions[index].label}了。` },
      }
    })
  }

  function undo() {
    setRound((previous) => {
      const before = previous.history.at(-1)
      if (!before) return previous
      return {
        layout: before,
        history: previous.history.slice(0, -1),
        hint: null,
        rejected: null,
        motion: { from: before.indexOf(emptyStone), to: previous.layout.indexOf(emptyStone) },
        notice: { text: '已撤回一步。继续从金边石兽里选。' },
      }
    })
  }

  function showHint() {
    const distances = stoneDistances(level)
    const remaining = distances.get(round.layout)
    if (!remaining) return
    const index = neighbors[empty].find((candidate) => distances.get(swapStones(round.layout, candidate, empty)) === remaining - 1)
    if (index === undefined) return
    const animal = animals[round.layout[index] as AnimalCode]
    setRound({ ...round, hint: index, rejected: null, notice: { text: `试试移动${positions[index].label}的${animal.name}。当前最少还需 ${remaining} 步。`, kind: 'hint' } })
  }

  const drawPaths = useCallback(({ context, width, height }: { context: CanvasRenderingContext2D; width: number; height: number }) => {
    const dots = positions.map((position, index) => [
      position.x * width / 100,
      position.y * height / 100 - (slotNodes.current[index]?.offsetHeight ?? 0) * 0.145,
    ] as const)

    for (const [from, to] of paths) {
      const eligible = !finished && (from === empty || to === empty)
      const hinted = eligible && (from === round.hint || to === round.hint)
      context.strokeStyle = hinted ? '#ffe19d' : eligible ? '#e4bd7baf' : '#d0b68742'
      context.lineWidth = hinted ? 2.5 : eligible ? 1.55 : 1
      context.setLineDash(eligible ? [] : [3, 4])
      context.beginPath()
      context.moveTo(...dots[from])
      context.lineTo(...dots[to])
      context.stroke()
    }

    if (!level.closed) return
    const [[x0, y0], [x1, y1]] = level.closed.map((position) => dots[position])
    context.setLineDash([4, 6])
    context.strokeStyle = '#df937a99'
    context.beginPath()
    context.moveTo(x0, y0)
    context.lineTo(x1, y1)
    context.stroke()
    context.setLineDash([])
    context.lineWidth = 2
    const x = (x0 + x1) / 2
    const y = (y0 + y1) / 2
    context.beginPath()
    context.moveTo(x - 5, y - 5)
    context.lineTo(x + 5, y + 5)
    context.moveTo(x + 5, y - 5)
    context.lineTo(x - 5, y + 5)
    context.stroke()
  }, [empty, finished, level, paths, round.hint])

  const { areaRef, canvasRef } = useCanvas<HTMLDivElement>(active, drawPaths)

  useLayoutEffect(() => {
    const motion = round.motion
    if (!motion || motion === playedMotion.current || !active || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const origin = slotNodes.current[motion.from]?.getBoundingClientRect()
    const target = slotNodes.current[motion.to]
    const art = target?.querySelector('img')
    if (!origin || !target || !art?.animate) return
    playedMotion.current = motion
    const destination = target.getBoundingClientRect()
    const dx = origin.left + origin.width / 2 - destination.left - destination.width / 2
    const dy = origin.bottom - destination.bottom
    const zoom = origin.width / destination.width
    const animation = art.animate([
      { transform: `translate(${dx}px, ${dy}px) scale(${zoom}) scaleX(${positions[motion.from].facing})` },
      { transform: `translate(0, 0) scale(1) scaleX(${positions[motion.to].facing})` },
    ], { duration: 235, easing: 'cubic-bezier(.23,.65,.27,1)' })
    return () => animation.cancel()
  }, [round.motion, active])

  const stage = (
    <Stage
      background={scene} label="石兽移位棋盘" location="总神道" descriptionId="stone-rule"
      legend={finished ? undefined : level.closed ? '金边可移 · 红叉绕行' : '金边石兽可以移动'}
      variant="stone-stage" stageRef={areaRef} finished={finished}
      style={{ '--lamp-x': positions[empty].x + '%', '--lamp-y': positions[empty].y - 1.5 + '%' }}
    >
      <div className="stage-glow" aria-hidden="true" />
      <canvas className="paths" ref={canvasRef} aria-hidden="true" />
      <div className="stone-field">
        {positions.map(({ x, y, depth, facing, layer, label }, index) => {
          const tile = round.layout[index]
          const isEmpty = tile === emptyStone
          const movable = !finished && neighbors[empty].includes(index)
          const animal = isEmpty ? null : animals[tile as AnimalCode]
          const name = animal ? animal.name + (movable ? '，可移动' : '') : '空位'
          const classes = [
            'stone',
            index === round.hint && 'is-hint',
            index === round.rejected && 'is-wrong',
            round.motion && isEmpty && 'has-arrived',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={index} className={classes} type="button" data-position={index}
              ref={(button) => { slotNodes.current[index] = button }}
              style={{ '--x': x + '%', '--y': y + '%', '--depth': depth, '--facing': facing, '--layer': layer } as GameStyle}
              data-state={isEmpty ? 'empty' : movable ? 'movable' : 'locked'}
              aria-label={label + '，' + name} onClick={() => move(index)}
            >
              <span className="platform" aria-hidden="true" />
              {animal && <img className="stone-art" src={animal.image} alt="" draggable={false} />}
              {(isEmpty || index === round.hint) && (
                <span className="platform-label" aria-hidden="true">
                  {isEmpty ? index === sparePosition ? '周转空位' : '空位' : animal?.name}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </Stage>
  )

  return (
    <GameLayout title="借位归阵" descriptionId="stone-rule"
      description="点一尊与空位相连的石兽。它移过去，原来的位置就空了。"
      status={<p className="count"><strong>{round.history.length}</strong> <span>步</span></p>}
      stage={stage} levels={stoneLevels} level={levelIndex} wins={wins} onLevel={onLevel}
    >
      {finished ? (
        <Outcome
          title="石影归位"
          summary={round.history.length === level.par ? `用 ${level.par} 步完成，走到了最短解。` : `用 ${round.history.length} 步完成。本局最短 ${level.par} 步。`}
          observation={observation} action={levelIndex < stoneLevels.length - 1 ? '下一关' : '再玩一轮'}
          onNext={() => onLevel((levelIndex + 1) % stoneLevels.length)}
        />
      ) : (
        <div className="controls">
          <section className="target" aria-label="归位图">
            <div className="target-heading"><h3>归位图</h3><span>已归位 {covered} / 8</span></div>
            <div className="target-rows">
              {Object.entries(animals).map(([code, animal], index) => (
                <div key={code} className="target-row">
                  <span className={'target-cell' + (round.layout[index * 2] === code ? ' matched' : '')}><img src={animal.image} alt="" /></span>
                  <span>{animal.name}</span>
                  <span className={'target-cell' + (round.layout[index * 2 + 1] === code ? ' matched' : '')}><img src={animal.image} alt="" /></span>
                </div>
              ))}
            </div>
            <p className="target-note">从近到远排列，底部周转位留空。</p>
          </section>
          <Feedback notice={round.notice} />
          <div className="actions">
            <button type="button" className="button" onClick={showHint}>提示一步</button>
            <button type="button" className="button plain" disabled={!round.history.length} onClick={undo}>撤一步</button>
            <button type="button" className="button plain" onClick={() => setRound(opening(level))}>重开</button>
          </div>
          <p className="move-target">本局最少 {level.par} 步</p>
        </div>
      )}
    </GameLayout>
  )
}

export default function StoneGame({ active, onClear }: GameProps) {
  const [level, setLevel] = useState(0)
  const [wins, setWins] = useState<number[]>([])
  const onWin = useCallback((index: number) => {
    setWins((previous) => previous.includes(index) ? previous : [...previous, index])
    onClear()
  }, [onClear])

  return <StoneBoard key={level} active={active} levelIndex={level} onLevel={setLevel} wins={wins} onWin={onWin} />
}
