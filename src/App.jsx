import { useState } from 'react'
import GaltonBoard from './components/GaltonBoard.jsx'
import StoneThrowing from './components/StoneThrowing.jsx'
import BuffonNeedles from './components/BuffonNeedles.jsx'
import DrunkardsWalk from './components/DrunkardsWalk.jsx'
import LangtonsAnt from './components/LangtonsAnt.jsx'
import GameOfLife from './components/GameOfLife.jsx'
import ChaosGame from './components/ChaosGame.jsx'
import SimpsonsParadox from './components/SimpsonsParadox.jsx'
import BerksonsParadox from './components/BerksonsParadox.jsx'

const EXAMPLES = [
  {
    id: 'galton',
    title: 'Galton Board',
    blurb: 'This demonstration shows how repeated binary choices create a binomial distribution that gradually approaches a bell curve.',
    topics: ['Probability', 'Distribution', 'Statistics', 'Patterns'],
    status: 'ready',
  },
  {
    id: 'stone',
    title: 'Monte Carlo Method',
    blurb: 'This method shows how uniform random sampling estimates π from the proportion of points that land inside a circle.',
    topics: ['Probability', 'Pi', 'Simulation', 'Geometry'],
    status: 'ready',
  },
  {
    id: 'buffon',
    title: 'Buffon’s Needles',
    blurb: 'This experiment shows how random position and rotation connect geometric probability to an estimate of π.',
    topics: ['Probability', 'Pi', 'Geometry', 'Mechanics'],
    status: 'ready',
  },
  {
    id: 'walk',
    title: 'The Drunkard’s Walk',
    blurb: 'This model shows how many independent random steps produce diffusion, predictable distances, and a normal endpoint cloud.',
    topics: ['Probability', 'Distribution', 'Physics', 'Finance'],
    status: 'ready',
  },
  {
    id: 'langton',
    title: 'Langton’s Ant',
    blurb: 'This automaton shows how tiny deterministic rules can evolve from symmetry through chaos into a repeating geometric highway.',
    topics: ['Patterns', 'Emergence', 'Computation'],
    status: 'ready',
  },
  {
    id: 'life',
    title: 'Cellular Automata',
    blurb: 'These cellular automata show how local neighbor rules create still lifes, moving gliders, oscillators, and neural-like waves.',
    topics: ['Patterns', 'Emergence', 'Electronics', 'Computation'],
    status: 'ready',
  },
  {
    id: 'chaos',
    title: 'The Chaos Game',
    blurb: 'This method shows how random vertex choices and repeated contraction generate precise self-similar fractal attractors.',
    topics: ['Fractals', 'Probability', 'Patterns', 'Geometry'],
    status: 'ready',
  },
  {
    id: 'simpson',
    title: 'Simpson’s Paradox',
    blurb: 'This simulator shows how a hidden confounder can reverse a correlation when distinct groups are combined.',
    topics: ['Statistics', 'Correlation', 'Probability', 'Distribution'],
    status: 'ready',
  },
  {
    id: 'berkson',
    title: 'Berkson’s Paradox',
    blurb: 'This demonstration shows how selecting on a shared outcome creates a false negative correlation between independent traits.',
    topics: ['Statistics', 'Correlation', 'Bias', 'Probability'],
    status: 'ready',
  },
  {
    id: 'binomial',
    title: 'Binomial Distribution',
    blurb: 'Coin flips and success counts. Coming soon.',
    topics: ['Probability', 'Distribution'],
    status: 'soon',
  },
  {
    id: 'clt',
    title: 'Central Limit Theorem',
    blurb: 'Watch sample means converge to normal. Coming soon.',
    topics: ['Distribution', 'Statistics'],
    status: 'soon',
  },
]

function CardGlyph({ ready, id }) {
  if (ready && id !== 'galton') return <span className={`glyph pattern-glyph pattern-${id}`} aria-hidden="true"><i /><i /><i /><i /><i /></span>
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
            <span className="topic-list">{example.topics.map((topic) => <span className="tag" key={topic}>{topic}</span>)}</span>
            {!ready && <span className="availability">Coming soon</span>}
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
      ) : activeExample === 'chaos' ? (
        <ChaosGame />
      ) : activeExample === 'simpson' ? (
        <SimpsonsParadox />
      ) : activeExample === 'berkson' ? (
        <BerksonsParadox />
      ) : (
        <Examples onOpen={setActiveExample} />
      )}
    </main>
  )
}
