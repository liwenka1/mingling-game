import { useCallback, useMemo, useState } from 'react'
import timberScene from '../assets/timber.webp'
import { braceName, braceTypes, freeBraces, shareWeight, timberLevels, timberLoads, timberSolutions } from './timber-rules'
import type { Bias, TimberLayout } from './timber-rules'
import { Feedback, GameLayout, Outcome, Stage, useCanvas } from './shared'
import type { GameProps, GameStyle, Notice } from './shared'

const observation = {
  title: '到长陵抬头看',
  detail: '祾恩殿使用金丝楠木制作梁柱和斗拱。到现场找找柱顶那些层层叠起的木构件。',
  link: 'https://www.mingshisanling.com/spot/100.html',
  linkText: '祾恩殿资料',
}

function TimberBoard({ levelIndex, onLevel, active, wins, onWin }: Pick<GameProps, 'active'> & {
  levelIndex: number
  onLevel: (index: number) => void
  wins: readonly number[]
  onWin: (index: number) => void
}) {
  const level = timberLevels[levelIndex]
  const [layout, setLayout] = useState<TimberLayout>(() => level.weights.map(() => null))
  const [selected, setSelected] = useState(0)
  const [hint, setHint] = useState<{ bay: number; bias?: Bias } | null>(null)
  const [notice, setNotice] = useState<Notice>({ text: level.instruction })
  const [testCount, setTestCount] = useState(0)
  const [finished, setFinished] = useState(false)

  const loads = useMemo(() => timberLoads(level, layout), [level, layout])
  const spacing = 80 / level.weights.length
  const posts = useMemo(() => level.limits.map((_, index) => 10 + spacing * index), [level, spacing])
  const bays = useMemo(() => level.weights.map((_, index) => 10 + spacing * (index + 0.5)), [level, spacing])
  const underLoad = loads.every((load, index) => load <= level.limits[index])

  const drawLoads = useCallback(({ context, width, height }: { context: CanvasRenderingContext2D; width: number; height: number }) => {
    bays.forEach((x, index) => {
      const xPos = x * width / 100
      const bias = layout[index]
      const splits = bias === null ? [0, 0] : shareWeight(level.weights[index], bias)
      context.setLineDash([])
      context.strokeStyle = '#bd925c97'
      context.lineWidth = 2
      context.beginPath()
      context.moveTo(xPos, height * 0.34)
      context.lineTo(xPos, height * 0.47)
      context.stroke()

      for (const [side, amount] of splits.entries()) {
        const post = index + side
        const over = loads[post] > level.limits[post]
        context.setLineDash(amount ? [] : [4, 5])
        context.lineWidth = amount ? 1.7 + amount * 0.8 : 1
        context.strokeStyle = !amount ? '#b7885e78' : over ? '#fa8d76' : finished ? '#ffda93' : '#eab474'
        context.beginPath()
        context.moveTo(xPos, height * 0.50)
        context.lineTo(posts[post] * width / 100, height * 0.65)
        context.stroke()
      }
    })
  }, [bays, posts, layout, level, loads, finished])
  const { areaRef, canvasRef } = useCanvas<HTMLDivElement>(active, drawLoads)

  function chooseBay(index: number) {
    setSelected(index)
    setHint(null)
    setNotice({ text: `已选梁位 ${index + 1}，请选择支座。` })
  }

  function place(bias: Bias) {
    if (finished || layout[selected] === bias || !freeBraces(level, layout, bias)) return
    const next = [...layout]
    next[selected] = bias
    setLayout(next)
    if (next.includes(null)) setSelected(next.indexOf(null))
    setHint(null)
    setTestCount(0)
    setNotice({ text: next.includes(null) ? `梁位 ${selected + 1} 已装上${braceName(bias)}。` : '梁位都搭好了，可以试压。' })
  }

  function remove() {
    const next = [...layout]
    next[selected] = null
    setLayout(next)
    setHint(null)
    setTestCount(0)
    setNotice({ text: `梁位 ${selected + 1} 的支座已放回库存。` })
  }

  function testLoad() {
    if (layout.includes(null)) {
      setNotice({ text: '搭好全部梁位，再试压。', kind: 'hint' })
      return
    }
    setTestCount((count) => count + 1)
    const over = loads.findIndex((load, index) => load > level.limits[index])
    if (over !== -1) {
      setNotice({
        text: `柱 ${over + 1} 扛了 ${loads[over]} 份，上限 ${level.limits[over]} 份。看看通往它的红线，找到要调整的支座。`,
        kind: 'wrong',
      })
      return
    }
    setFinished(true)
    setHint(null)
    onWin(levelIndex)
  }

  function showHint() {
    const mismatchCount = (candidate: Bias[]) => candidate.filter((bias, index) => bias !== layout[index]).length
    const solution = timberSolutions(level).sort((a, b) => mismatchCount(a) - mismatchCount(b))[0]
    if (!solution) return
    const needsWork = solution.map((bias, bay) => ({ bay, bias })).filter(({ bay, bias }) => layout[bay] !== bias)
    if (!needsWork.length) {
      setNotice({ text: '每根柱子都在上限以内。点「试压」完成。', kind: 'hint' })
      return
    }
    const available = needsWork.find(({ bias }) => freeBraces(level, layout, bias) > 0)
    if (available) {
      setSelected(available.bay)
      setHint(available)
      setNotice({ text: `试试在梁位 ${available.bay + 1} 装一块${braceName(available.bias)}。`, kind: 'hint' })
      return
    }
    const occupied = needsWork.find(({ bay }) => layout[bay] !== null)
    if (!occupied) return
    setSelected(occupied.bay)
    setHint({ bay: occupied.bay })
    setNotice({ text: `先拆下梁位 ${occupied.bay + 1} 的支座，给另一处腾出库存。`, kind: 'hint' })
  }

  function reset() {
    setLayout(level.weights.map(() => null))
    setSelected(0)
    setHint(null)
    setNotice({ text: level.instruction })
    setTestCount(0)
  }

  const stage = (
    <Stage
      background={timberScene} label="木构承重棋盘" location="长陵 · 祾恩殿"
      descriptionId="timber-rule" legend={finished ? undefined : '柱上数字为载重 / 上限'}
      variant="craft-stage beam-stage" finished={finished} stageRef={areaRef}
    >
      <div className="beam-frame" aria-hidden="true">
        <div key={testCount} className={'beam-roof' + (testCount && !underLoad ? ' is-strained' : '')} />
        <canvas className="beam-lines" ref={canvasRef} />
        <div className="beam-base" />
      </div>
      <div className="beam-foundation">
        {posts.map((x, index) => {
          const amount = loads[index]
          const capacity = level.limits[index]
          return (
            <div
              key={index} className="beam-post" data-over={amount > capacity} data-test={testCount > 0 && amount > capacity}
              role="group" aria-label={`柱 ${index + 1} 承受 ${amount} 份，上限 ${capacity} 份`}
              style={{ '--x': x + '%', '--load': Math.min(100, amount * 100 / capacity) + '%' } as GameStyle}
            >
              <span className="post-meter" aria-hidden="true" />
              <span className="post-name">柱 {index + 1}</span><strong>{amount} / {capacity}</strong>
            </div>
          )
        })}
      </div>
      <div className="beam-board" role="group" aria-label="选择梁位">
        {bays.map((x, index) => {
          const bias = layout[index]
          const title = bias === null ? '待搭' : braceName(bias)
          return (
            <button
              key={index} className={'beam-node' + (hint?.bay === index ? ' is-hint' : '')}
              type="button" style={{ '--x': x + '%' } as GameStyle} data-filled={bias !== null}
              aria-label={`梁位 ${index + 1}，${level.weights[index]} 份重量，${title}`}
              aria-pressed={!finished && selected === index} disabled={finished} onClick={() => chooseBay(index)}
            >
              <span className="beam-weight">{level.weights[index]} 份重量</span><span className="beam-choice">{title}</span>
            </button>
          )
        })}
      </div>
    </Stage>
  )

  return (
    <GameLayout
      title="斗拱承檐" descriptionId="timber-rule"
      description="选择梁位，再选支座。重量会分给两边的柱子，每根柱子都要撑得住。"
      status={<p className="craft-status">{layout.filter((bias) => bias !== null).length} / {bays.length} 已搭</p>}
      stage={stage} levels={timberLevels} level={levelIndex} wins={wins} onLevel={onLevel}
    >
      {finished ? (
        <Outcome
          title="承檐成功" observation={observation} action={levelIndex < timberLevels.length - 1 ? '下一关' : '再玩一轮'}
          onNext={() => onLevel((levelIndex + 1) % timberLevels.length)}
        />
      ) : (
        <div className="controls">
          <div className="craft-tools">
            <h3>可用支座</h3>
            <div className="beam-inventory" role="group" aria-label="为选中的梁位放支座">
              {braceTypes.map(({ bias, name }) => {
                const [left, right] = shareWeight(level.weights[selected], bias)
                const free = freeBraces(level, layout, bias)
                return (
                  <button
                    key={name} type="button" disabled={free === 0}
                    className={'craft-tool' + (hint?.bias === bias ? ' is-hint' : '')}
                    aria-label={`${name}，左 ${left} 份，右 ${right} 份，余 ${free} 块`} onClick={() => place(bias)}
                  >
                    <span>{name}</span><small>左 {left} · 右 {right}</small><small>余 {free} 块</small>
                  </button>
                )
              })}
            </div>
            <div className="craft-selection">
              <p>梁位 {selected + 1} · {level.weights[selected]} 份重量</p>
              <button className="text-button" type="button" disabled={layout[selected] === null} onClick={remove}>拆下支座</button>
            </div>
          </div>
          <Feedback notice={notice} />
          <div className="craft-actions">
            <button className="button accent" type="button" onClick={testLoad}>试压</button>
            <button className="button" type="button" onClick={showHint}>提示一步</button>
            <button className="button plain" type="button" onClick={reset}>重开</button>
          </div>
        </div>
      )}
    </GameLayout>
  )
}

export default function TimberGame({ active, onClear }: GameProps) {
  const [level, setLevel] = useState(0)
  const [wins, setWins] = useState<number[]>([])

  function win(index: number) {
    setWins((previous) => previous.includes(index) ? previous : [...previous, index])
    onClear()
  }

  return <TimberBoard key={level} active={active} wins={wins} levelIndex={level} onLevel={setLevel} onWin={win} />
}
