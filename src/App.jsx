import { useState } from 'react'
import GaltonBoard from './components/GaltonBoard.jsx'

const EXAMPLES = [
  {
    id: 'galton',
    title: 'Galton Board',
    blurb: 'Drop balls through a peg triangle and watch pure chance build the normal curve, bin by bin.',
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

function CardGlyph({ ready }) {
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
            <CardGlyph ready={ready} />
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

  return (
    <main className="app">
      <header className="masthead">
        <div>
          <p className="eyebrow">Lab</p>
          <h1>{activeExample === 'galton' ? 'Galton Board' : 'Examples'}</h1>
        </div>
        <div className="index">01 / {String(EXAMPLES.length).padStart(2, '0')}</div>
      </header>

      {activeExample === 'galton' ? (
        <GaltonBoard onBack={() => setActiveExample(null)} />
      ) : (
        <Examples onOpen={setActiveExample} />
      )}
    </main>
  )
}
