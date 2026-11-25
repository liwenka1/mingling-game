import { lazy, Suspense, useRef, useState } from 'react'
import type { KeyboardEvent, MouseEvent } from 'react'
import StoneGame from './games/StoneGame'

const gameOrder = ['stone', 'timber', 'wire'] as const
type GameId = (typeof gameOrder)[number]

const games = {
  stone: {
    title: '神道石影',
    component: StoneGame,
    steps: [
      '点一尊有金边的石兽，它会移到和它相连的空位。',
      '石兽移走后，灯会照亮它原来的位置。可以借开已经归位的石兽，让后面的石兽通过。',
      '看归位图，从近到远排好卧驼、立驼、卧象、立象。最后把周转位腾空。',
    ],
  },
  timber: {
    title: '斗拱承檐',
    component: lazy(() => import('./games/TimberGame')),
    steps: [
      '点一处梁位，再选择一块支座。每放一块，库存会少一块。',
      '均托平分重量。偏左、偏右让相应一侧多承一份，另一侧少承一份。',
      '搭好全部梁位后点「试压」。五根柱子都在上限以内就能通过。入门关有三根柱子。',
    ],
  },
  wire: {
    title: '一线盘金',
    component: lazy(() => import('./games/WireGame')),
    steps: [
      '从「起」出发，点相邻格点，也可以按住线头拖动。',
      '先穿金环 1，再穿金环 2，绕开珠位和走过的格点。',
      '在用完金丝前到达「收」。往回拖到上一个格点，或点「收回一格」改线。',
    ],
  },
}

function closeOnBackdrop(event: MouseEvent<HTMLDialogElement>) {
  if (event.target !== event.currentTarget) return
  const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect()
  if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
    event.currentTarget.close()
  }
}

export default function App() {
  const [active, setActive] = useState<GameId>('stone')
  const [visited, setVisited] = useState<GameId[]>(['stone'])
  const [cleared, setCleared] = useState<GameId[]>([])
  const help = useRef<HTMLDialogElement>(null)
  const sources = useRef<HTMLDialogElement>(null)

  function switchTo(id: GameId) {
    setActive(id)
    setVisited((previous) => previous.includes(id) ? previous : [...previous, id])
  }

  function tabKeys(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const last = gameOrder.length - 1
    let next: number
    switch (event.key) {
      case 'ArrowLeft': next = (index + last) % gameOrder.length; break
      case 'ArrowRight': next = (index + 1) % gameOrder.length; break
      case 'Home': next = 0; break
      case 'End': next = last; break
      default: return
    }
    event.preventDefault()
    const id = gameOrder[next]
    switchTo(id)
    document.getElementById(id + '-tab')?.focus()
  }

  return (
    <div className="shell">
      <header className="masthead">
        <div className="brand">
          <span className="sigil" aria-hidden="true" />
          <div><p className="location">北京昌平 · 明十三陵</p><h1>明陵游艺</h1></div>
        </div>
        <button className="button plain" type="button" onClick={() => help.current?.showModal()}>
          <span className="help-icon" aria-hidden="true">?</span>玩法
        </button>
      </header>

      <nav className="game-tabs" role="tablist" aria-label="选择小游戏">
        {gameOrder.map((id, index) => (
          <button
            className="game-tab" id={id + '-tab'} key={id} type="button" role="tab"
            aria-controls={id + '-game'} aria-selected={active === id}
            aria-label={games[id].title + (cleared.includes(id) ? '，已通关' : '')}
            tabIndex={active === id ? 0 : -1} onClick={() => switchTo(id)} onKeyDown={(event) => tabKeys(event, index)}
          >
            {games[id].title}{cleared.includes(id) && <span className="tab-complete" aria-hidden="true">✓</span>}
          </button>
        ))}
      </nav>

      <main aria-label="明陵游艺小游戏">
        {gameOrder.map((id) => {
          const Game = games[id].component
          return (
            <section role="tabpanel" id={id + '-game'} aria-labelledby={id + '-tab'} key={id} hidden={active !== id}>
              {visited.includes(id) && (
                <Suspense fallback={<p className="game-loading" role="status">关卡载入中…</p>}>
                  <Game active={active === id} onClear={() => setCleared((previous) => previous.includes(id) ? previous : [...previous, id])} />
                </Suspense>
              )}
            </section>
          )
        })}
      </main>

      <footer className="footer">
        <span>明十三陵 · 互动示意</span>
        <button type="button" className="text-button" onClick={() => sources.current?.showModal()}>史料与美术</button>
      </footer>

      <dialog ref={help} aria-labelledby="help-title" onClick={closeOnBackdrop}>
        <h2 id="help-title">{games[active].title}怎么玩</h2>
        <ol>{games[active].steps.map((text) => <li key={text}>{text}</li>)}</ol>
        <form method="dialog"><button className="button accent">继续玩</button></form>
      </dialog>

      <dialog ref={sources} aria-labelledby="sources-title" onClick={closeOnBackdrop}>
        <h2 id="sources-title">史料与美术</h2>
        <p>三款游戏取材于总神道石兽、长陵祾恩殿木构和定陵出土凤冠。周转位、分力数值与金丝走法为游戏设定。</p>
        <ul>
          <li><a href="https://www.dpm.org.cn/court/system/236400.html" target="_blank" rel="noopener noreferrer">故宫博物院 · 明长陵</a></li>
          <li><a href="https://www.mingshisanling.com/spot/98.html" target="_blank" rel="noopener noreferrer">明十三陵景区 · 神路石象</a></li>
          <li><a href="https://www.mingshisanling.com/spot/100.html" target="_blank" rel="noopener noreferrer">明十三陵景区 · 长陵祾恩殿</a></li>
          <li><a href="https://www.chnmuseum.cn/zx/gbxw/202603/t20260306_278223.shtml" target="_blank" rel="noopener noreferrer">中国国家博物馆 · 孝端皇后九龙九凤冠</a></li>
        </ul>
        <p>场景和石兽插画使用 OpenAI 图像生成。</p>
        <form method="dialog"><button className="button accent">关闭</button></form>
      </dialog>
    </div>
  )
}
