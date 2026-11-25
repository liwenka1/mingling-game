import { useEffect, useLayoutEffect, useRef } from 'react'
import type { CSSProperties, ReactNode, Ref } from 'react'

export type GameProps = {
  active: boolean
  onClear: () => void
}

export type Notice = {
  text: string
  kind?: 'hint' | 'wrong'
}

export type GameStyle = CSSProperties & Record<`--${string}`, string | number>

type StageProps = {
  background: string
  label: string
  location: string
  descriptionId: string
  legend?: string
  variant?: string
  style?: GameStyle
  finished?: boolean
  stageRef: Ref<HTMLDivElement>
  children: ReactNode
}

export function Stage({
  background, label, location, descriptionId, legend, variant, style, finished, stageRef, children,
}: StageProps) {
  return (
    <div
      className={['stage', variant, finished && 'is-complete'].filter(Boolean).join(' ')}
      role="region" aria-label={label}
      aria-describedby={descriptionId}
      ref={stageRef}
      style={{ ...style, '--scene-image': `url("${background}")` } as GameStyle}
    >
      <div className="scene" aria-hidden="true" />
      <div className="stage-shade" aria-hidden="true" />
      <div className="stage-top" aria-hidden="true">
        <span className="stage-tag">{location}</span>
        {legend && <span className="stage-key">{legend}</span>}
      </div>
      {children}
    </div>
  )
}

type GameLayoutProps = {
  title: string
  descriptionId: string
  description: string
  status: ReactNode
  stage: ReactNode
  levels: readonly { title: string }[]
  level: number
  wins: readonly number[]
  onLevel: (index: number) => void
  children: ReactNode
}

export function GameLayout({
  title, descriptionId, description, status, stage, levels, level, wins, onLevel, children,
}: GameLayoutProps) {
  return (
    <div className="play-grid">
      {stage}
      <section className="panel" aria-labelledby={descriptionId + '-title'}>
        <div className="goal">
          <div className="craft-title">
            <h2 id={descriptionId + '-title'}>{title}</h2>
            {status}
          </div>
          <div className="level-picker" role="group" aria-label="选择关卡">
            {levels.map(({ title: levelTitle }, index) => (
              <button
                key={levelTitle}
                type="button"
                aria-pressed={level === index}
                aria-label={levelTitle + (wins.includes(index) ? '，已通关' : '')}
                onClick={() => onLevel(index)}
              >
                {levelTitle}{wins.includes(index) && <span aria-hidden="true"> ✓</span>}
              </button>
            ))}
          </div>
          <p className="instructions" id={descriptionId}>{description}</p>
        </div>
        {children}
      </section>
    </div>
  )
}

export function Feedback({ notice }: { notice: Notice }) {
  return <p className="feedback" role="status" aria-atomic="true" data-kind={notice.kind}>{notice.text}</p>
}

type OutcomeProps = {
  title: string
  summary?: string
  observation: { title: string; detail: string; link: string; linkText: string }
  action: string
  onNext: () => void
}

export function Outcome({ title, summary, observation, action, onNext }: OutcomeProps) {
  const outcome = useRef<HTMLElement>(null)
  useEffect(() => {
    outcome.current?.focus({ preventScroll: true })
    if (window.matchMedia('(max-width: 760px)').matches) {
      outcome.current?.scrollIntoView({ block: 'nearest' })
    }
  }, [])

  return (
    <section className="completion" ref={outcome} tabIndex={-1} aria-label={title}>
      <div className="done-title"><span className="done-glyph" aria-hidden="true">✓</span><h3>{title}</h3></div>
      {summary && <p className="result">{summary}</p>}
      <div className="visit-card">
        <h4>{observation.title}</h4>
        <p>{observation.detail}</p>
        <a href={observation.link} target="_blank" rel="noopener noreferrer">{observation.linkText}</a>
      </div>
      <button className="button accent" type="button" onClick={onNext}>{action}</button>
    </section>
  )
}

type PaintArea = { context: CanvasRenderingContext2D; width: number; height: number }

export function useCanvas<T extends HTMLElement>(active: boolean, paint: (area: PaintArea) => void) {
  const areaRef = useRef<T>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const area = areaRef.current
    const canvas = canvasRef.current
    if (!active || !area || !canvas) return

    const context = canvas.getContext('2d')
    if (!context) return

    const redraw = () => {
      const { clientWidth: width, clientHeight: height } = area
      if (!width || !height) return
      const scale = Math.min(window.devicePixelRatio || 1, 2)
      const pixelWidth = Math.round(width * scale)
      const pixelHeight = Math.round(height * scale)
      if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
        canvas.width = pixelWidth
        canvas.height = pixelHeight
      }
      context.setTransform(scale, 0, 0, scale, 0, 0)
      context.clearRect(0, 0, width, height)
      context.lineCap = 'round'
      paint({ context, width, height })
    }

    redraw()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', redraw)
      return () => window.removeEventListener('resize', redraw)
    }
    const observer = new ResizeObserver(redraw)
    observer.observe(area)
    return () => observer.disconnect()
  }, [active, paint])

  return { areaRef, canvasRef }
}
