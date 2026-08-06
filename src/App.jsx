import { useState } from 'react'
import GaltonBoard from './components/GaltonBoard.jsx'
import StoneThrowing from './components/StoneThrowing.jsx'
import BuffonNeedles from './components/BuffonNeedles.jsx'
import DrunkardsWalk from './components/DrunkardsWalk.jsx'
import LangtonsAnt from './components/LangtonsAnt.jsx'
import GameOfLife from './components/GameOfLife.jsx'

const EXAMPLES = [
  {
    id: 'galton',
    title: 'Galton Board',
    blurb: 'Drop balls through a peg triangle and watch pure chance build the normal curve, bin by bin.',
    status: 'ready',
  },
  {
    id: 'stone',
    title: 'Monte Carlo Method',
    blurb: 'Throw random points into a circle and estimate π from the ratio that land inside.',
    status: 'ready',
  },
  {
    id: 'buffon',
    title: 'Buffon’s Needles',
    blurb: 'Drop randomly rotated needles across parallel lines and recover π from how often they cross.',
    status: 'ready',
  },
  {
    id: 'walk',
    title: 'The Drunkard’s Walk',
    blurb: 'Send thousands of walkers from one lamppost and watch chaotic paths form a normal cloud.',
    status: 'ready',
  },
  {
    id: 'langton',
    title: 'Langton’s Ant',
    blurb: 'Give ants tiny turning rules and watch symmetry collapse into chaos, highways, and shared structures.',
    status: 'ready',
  },
  {
    id: 'life',
    title: 'Conway’s Game of Life',
    blurb: 'Paint living cells and watch three neighbor rules create still lifes, oscillators, and tiny spaceships.',
    status: 'ready',
  },
  {
    id: 'binomial',
    title: 'Binomial Distribution',
    blurb: 'Coin flips and success counts. Coming soon.',
    status: 'soon',
  },
  {
    id: 'clt',
    title: 'Central Limit Theorem',
    blurb: 'Watch sample means converge to normal. Coming soon.',
    status: 'soon',
  },
]

function CardGlyph({ ready, id }) {
  if (ready && id === 'stone') return <span className="glyph stone-glyph" aria-hidden="true">π</span>
  if (ready && id === 'buffon') return <span className="glyph needle-glyph" aria-hidden="true">╱</span>
  if (ready && id === 'walk') return <span className="glyph walk-glyph" aria-hidden="true">⌁</span>
  if (ready && id === 'langton') return <span className="glyph ant-glyph" aria-hidden="true">⌗</span>
  if (ready && id === 'life') return <span className="glyph life-glyph" aria-hidden="true">▦</span>
  return ready ? (
    <svg className="glyph" viewBox="0 0 40 30" fill="none" stroke="#14615C" strokeWidth="2" aria-hidden="true">
      <circle cx="20" cy="6" r="1.6" fill="#14615C" stroke="none" />
      <circle cx="14" cy="13" r="1.6" fill="#14615C" stroke="none" />
      <circle cx="26" cy="13" r="1.6" fill="#14615C" stroke="none" />
      <path d="M6 26 C 12 26, 14 8, 20 8 S 28 26, 34 26" strokeLinecap="round" opacity="0.55" />
    </svg>
  ) : (
    <svg className="glyph" viewBox="0 0 40 30" fill="none" aria-hidden="true">
      <circle cx="20" cy="15" r="3" fill="#93A29A" />
    </svg>
  )
}

function Examples({ onOpen }) {
  return (
    <div className="grid">
      {EXAMPLES.map((example) => {
        const ready = example.status === 'ready'
        return (
          <button
            className={`card${ready ? '' : ' disabled'}`}
            key={example.id}
            onClick={() => ready && onOpen(example.id)}
            disabled={!ready}
          >
            <CardGlyph ready={ready} id={example.id} />
            <span className="tag">{ready ? 'Interactive' : 'Soon'}</span>
            <h3>{example.title}</h3>
            <p>{example.blurb}</p>
          </button>
        )
      })}
    </div>
  )
}

export default function App() {
  const [activeExample, setActiveExample] = useState(null)
  const activeIndex = EXAMPLES.findIndex((example) => example.id === activeExample)
  const previousExample = activeIndex > 0 ? EXAMPLES[activeIndex - 1] : null
  const nextExample = activeIndex >= 0 && activeIndex < EXAMPLES.length - 1 ? EXAMPLES[activeIndex + 1] : null

  const openIfReady = (example) => {
    if (example?.status === 'ready') setActiveExample(example.id)
  }

  return (
    <main className="app">
      {activeExample ? (
        <header className="masthead detail-masthead">
          <div className="detail-meta">
            <button className="home-button" onClick={() => setActiveExample(null)} aria-label="Back to all examples">
              <span aria-hidden="true">⌂</span>
            </button>
            <p className="eyebrow">Lab</p>
            <div className="index">{String(activeIndex + 1).padStart(2, '0')} / {String(EXAMPLES.length).padStart(2, '0')}</div>
          </div>
          <div className="example-nav">
            <button className="example-step previous" aria-label={`Previous example${previousExample ? `: ${previousExample.title}` : ''}`} disabled={previousExample?.status !== 'ready'} onClick={() => openIfReady(previousExample)}>
              <span className="nav-icon" aria-hidden="true">←</span>
              <strong>{previousExample?.title || 'None'}</strong>
            </button>
            <h1>{EXAMPLES[activeIndex]?.title}</h1>
            <button className="example-step next" aria-label={`Next example${nextExample ? `: ${nextExample.title}` : ''}`} disabled={nextExample?.status !== 'ready'} onClick={() => openIfReady(nextExample)}>
              <span className="nav-icon" aria-hidden="true">→</span>
              <strong>{nextExample?.title || 'None'}</strong>
            </button>
          </div>
        </header>
      ) : (
        <header className="masthead">
          <div>
            <p className="eyebrow">Lab</p>
            <h1>Examples</h1>
          </div>
          <div className="index">01 / {String(EXAMPLES.length).padStart(2, '0')}</div>
        </header>
      )}

      {activeExample === 'galton' ? (
        <GaltonBoard />
      ) : activeExample === 'stone' ? (
        <StoneThrowing />
      ) : activeExample === 'buffon' ? (
        <BuffonNeedles />
      ) : activeExample === 'walk' ? (
        <DrunkardsWalk />
      ) : activeExample === 'langton' ? (
        <LangtonsAnt />
      ) : activeExample === 'life' ? (
        <GameOfLife />
      ) : (
        <Examples onOpen={setActiveExample} />
      )}
    </main>
  )
}
