import { useCallback, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const SIZE = 320
const PIXEL_RATIO = 2
const CHECKPOINT_STEPS = 10000
const MAX_STEPS = 250000
const DIRECTIONS = [[0, -1], [1, 0], [0, 1], [-1, 0]]
const PALETTES = {
  Blues: d3.interpolateBlues,
  Greens: d3.interpolateGreens,
  Purples: d3.interpolatePurples,
  Viridis: d3.interpolateViridis,
  Inferno: d3.interpolateInferno,
  Spectral: (t) => d3.interpolateSpectral(1 - t),
}

function makeColors(name, count) {
  const interpolator = PALETTES[name] || d3.interpolateBlues
  if (count === 1) return ['#14615C']
  return d3.range(count).map((index) => interpolator(0.08 + 0.84 * index / (count - 1)))
}

function makeAnts(count) {
  return d3.range(count).map((index) => ({
    x: index === 0 ? 0 : Math.floor(Math.random() * 17) - 8,
    y: index === 0 ? 0 : Math.floor(Math.random() * 17) - 8,
    direction: index === 0 ? 0 : Math.floor(Math.random() * 4),
  }))
}

function phaseFor(rule, antCount, steps) {
  if (rule !== 'RL' || antCount !== 1) return antCount > 1 ? 'Shared-grid chaos' : 'Generalized turmite'
  if (steps < 500) return 'Symmetry'
  if (steps < 10000) return 'Chaos'
  return 'Highway'
}

export default function LangtonsAnt() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const lastTimeRef = useRef(0)
  const accumulatorRef = useRef(0)
  const gridRef = useRef(new Map())
  const antsRef = useRef(makeAnts(1))
  const stepsRef = useRef(0)
  const checkpointPausedRef = useRef(false)
  const checkpointPassedRef = useRef(false)
  const boundsRef = useRef({ minX: -10, maxX: 10, minY: -10, maxY: 10 })
  const settingsRef = useRef({ rule: 'RL', palette: 'Blues', antCount: 1, speed: 1000 })

  const [rule, setRule] = useState('RL')
  const [ruleDraft, setRuleDraft] = useState('RL')
  const [palette, setPalette] = useState('Blues')
  const [antCount, setAntCount] = useState(1)
  const [speed, setSpeed] = useState(1000)
  const [running, setRunning] = useState(false)
  const [steps, setSteps] = useState(0)
  const [painted, setPainted] = useState(0)
  const [checkpointPaused, setCheckpointPaused] = useState(false)
  const [inputError, setInputError] = useState('')

  settingsRef.current = { rule, palette, antCount, speed }

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    lastTimeRef.current = 0
    accumulatorRef.current = 0
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0)
    context.clearRect(0, 0, SIZE, SIZE)
    context.fillStyle = '#FAFCFA'
    context.fillRect(0, 0, SIZE, SIZE)

    const bounds = boundsRef.current
    const spanX = Math.max(22, bounds.maxX - bounds.minX + 10)
    const spanY = Math.max(22, bounds.maxY - bounds.minY + 10)
    const cellSize = Math.max(0.65, Math.min(10, 292 / Math.max(spanX, spanY)))
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2
    const screenX = (x) => SIZE / 2 + (x - centerX) * cellSize
    const screenY = (y) => SIZE / 2 + (y - centerY) * cellSize
    const colors = makeColors(settingsRef.current.palette, settingsRef.current.rule.length)

    if (cellSize >= 5) {
      context.strokeStyle = '#E5EBE7'
      context.lineWidth = 0.6
      for (let x = bounds.minX - 5; x <= bounds.maxX + 5; x += 1) {
        const sx = screenX(x) - cellSize / 2
        context.beginPath(); context.moveTo(sx, 0); context.lineTo(sx, SIZE); context.stroke()
      }
      for (let y = bounds.minY - 5; y <= bounds.maxY + 5; y += 1) {
        const sy = screenY(y) - cellSize / 2
        context.beginPath(); context.moveTo(0, sy); context.lineTo(SIZE, sy); context.stroke()
      }
    }

    gridRef.current.forEach((cell) => {
      context.fillStyle = colors[cell.state]
      const inset = cellSize >= 3 ? 0.35 : 0
      context.fillRect(screenX(cell.x) - cellSize / 2 + inset, screenY(cell.y) - cellSize / 2 + inset, Math.max(0.7, cellSize - inset * 2), Math.max(0.7, cellSize - inset * 2))
    })

    antsRef.current.forEach((ant, index) => {
      const x = screenX(ant.x)
      const y = screenY(ant.y)
      const marker = Math.max(2.4, Math.min(5, cellSize * 0.65))
      context.save()
      context.translate(x, y)
      context.rotate(ant.direction * Math.PI / 2)
      context.beginPath()
      context.moveTo(0, -marker)
      context.lineTo(marker * 0.7, marker)
      context.lineTo(-marker * 0.7, marker)
      context.closePath()
      context.fillStyle = index === 0 ? '#C6842A' : '#1B241F'
      context.fill()
      context.restore()
    })
  }, [])

  const advance = useCallback((generations) => {
    const currentRule = settingsRef.current.rule
    const checkpointRemaining = checkpointPassedRef.current ? generations : CHECKPOINT_STEPS - stepsRef.current
    const generationsToRun = Math.max(0, Math.min(generations, checkpointRemaining))
    for (let generation = 0; generation < generationsToRun && stepsRef.current < MAX_STEPS; generation += 1) {
      antsRef.current.forEach((ant) => {
        const key = `${ant.x},${ant.y}`
        const currentState = gridRef.current.get(key)?.state || 0
        ant.direction = (ant.direction + (currentRule[currentState] === 'R' ? 1 : 3)) % 4
        const nextState = (currentState + 1) % currentRule.length
        if (nextState === 0) gridRef.current.delete(key)
        else gridRef.current.set(key, { x: ant.x, y: ant.y, state: nextState })
        ant.x += DIRECTIONS[ant.direction][0]
        ant.y += DIRECTIONS[ant.direction][1]
        const bounds = boundsRef.current
        bounds.minX = Math.min(bounds.minX, ant.x); bounds.maxX = Math.max(bounds.maxX, ant.x)
        bounds.minY = Math.min(bounds.minY, ant.y); bounds.maxY = Math.max(bounds.maxY, ant.y)
      })
      stepsRef.current += 1
    }
    setSteps(stepsRef.current)
    setPainted(gridRef.current.size)
    draw()
    if (!checkpointPassedRef.current && stepsRef.current >= CHECKPOINT_STEPS) {
      checkpointPausedRef.current = true
      setCheckpointPaused(true)
      setRunning(false)
    }
    if (stepsRef.current >= MAX_STEPS) setRunning(false)
  }, [draw])

  const reset = useCallback(() => {
    stop()
    setRunning(false)
    gridRef.current = new Map()
    antsRef.current = makeAnts(settingsRef.current.antCount)
    stepsRef.current = 0
    checkpointPausedRef.current = false
    checkpointPassedRef.current = false
    boundsRef.current = { minX: -10, maxX: 10, minY: -10, maxY: 10 }
    setSteps(0)
    setPainted(0)
    setCheckpointPaused(false)
    requestAnimationFrame(draw)
  }, [draw, stop])

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = SIZE * PIXEL_RATIO
    canvas.height = SIZE * PIXEL_RATIO
    draw()
  }, [draw])

  useEffect(() => reset(), [antCount, reset, rule])
  useEffect(() => draw(), [draw, palette])

  useEffect(() => {
    stop()
    if (!running) return undefined
    const animate = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time
      const elapsed = Math.min(100, time - lastTimeRef.current)
      lastTimeRef.current = time
      accumulatorRef.current += elapsed * settingsRef.current.speed / 1000
      const generations = Math.min(2000, Math.floor(accumulatorRef.current))
      if (generations > 0) {
        accumulatorRef.current -= generations
        advance(generations)
      }
      if (stepsRef.current < MAX_STEPS && !checkpointPausedRef.current) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return stop
  }, [advance, running, stop])

  useEffect(() => () => stop(), [stop])

  const colors = makeColors(palette, rule.length)
  const phase = phaseFor(rule, antCount, steps)

  function updateRule(value) {
    const uppercase = value.toUpperCase()
    const clean = uppercase.replace(/[^RL]/g, '')
    setRuleDraft(clean)
    if (uppercase !== clean) setInputError('Only R and L are allowed.')
    else if (!clean) setInputError('Enter at least one R or L.')
    else {
      setInputError('')
      setRule(clean)
    }
  }

  function toggleRun() {
    if (checkpointPaused) {
      checkpointPausedRef.current = false
      checkpointPassedRef.current = true
      setCheckpointPaused(false)
      setRunning(true)
      return
    }
    setRunning((value) => !value)
  }

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Langton%27s_ant">Langton’s ant is a deterministic grid machine whose tiny local rule produces unexpectedly complex global behavior. The classic ant first draws small symmetric motifs, then wanders through a long chaotic phase. Around ten thousand steps it abruptly locks into a repeating 104-step diagonal highway. Longer cyclic rules and multiple ants transform the same mechanism into generalized turmites that paint very different structures.</DemoIntro>

      <div className="demo-stage">
      <div className="chart-card ant-chart-card">
        <canvas ref={canvasRef} id="ant-board" aria-label="Langton's Ant cellular automaton simulation" />
        <div className="ant-phase"><span>Current behavior</span><strong>{phase}</strong></div>
      </div>

      <div className="rule-strip" aria-label={`Color states for rule ${rule}`}>
        {rule.split('').map((turn, index) => <div key={`${index}-${turn}`}><i style={{ background: colors[index] }} /><span>{index}</span><strong>{turn === 'R' ? '↻' : '↺'}</strong></div>)}
      </div>

      <div className="readout stone-readout">
        <div className="cell"><div className="label">Generations</div><div className="value">{steps.toLocaleString()}</div></div>
        <div className="cell"><div className="label">Colored cells</div><div className="value">{painted.toLocaleString()}</div></div>
        <div className="cell"><div className="label">Ants / colors</div><div className="value">{antCount} <span className="theo">/ {rule.length}</span></div></div>
      </div>

      <div className="run-row ant-run-row">
        <button className="btn primary" onClick={toggleRun} disabled={steps >= MAX_STEPS}>{running ? 'Pause' : steps >= MAX_STEPS ? 'Complete' : checkpointPaused ? 'Continue' : 'Start'}</button>
        <button className="btn ghost" onClick={() => advance(1)} disabled={running || checkpointPaused || steps >= MAX_STEPS}>Step</button>
        <button className="btn ghost" onClick={reset}>Reset</button>
      </div>
      {checkpointPaused && <p className="checkpoint-note">10,000-generation checkpoint reached. Inspect the transition, then continue.</p>}
      </div>

      <p className="section-label">Automaton rules</p>
      <label className="text-control">
        <span className="control-head"><span className="name"><span className="sym">R/L</span>Rule string</span><span className="val">{rule.length} colors</span></span>
        <input value={ruleDraft} onChange={(event) => updateRule(event.target.value)} onBlur={() => { if (!ruleDraft) { setRuleDraft(rule); setInputError('') } }} spellCheck="false" aria-invalid={Boolean(inputError)} />
        {inputError && <span className="input-error">{inputError}</span>}
      </label>
      <label className="select-control">
        <span className="control-head"><span className="name"><span className="sym">C</span>Color scale</span></span>
        <select value={palette} onChange={(event) => setPalette(event.target.value)}>{Object.keys(PALETTES).map((name) => <option key={name}>{name}</option>)}</select>
      </label>
      <Control symbol="A" name="Ants" value={antCount} min="1" max="8" step="1" onChange={(value) => setAntCount(Number(value))} />
      <Control symbol="λ" name="Generations / sec" value={speed.toLocaleString()} sliderValue={speed} min="100" max="20000" step="100" onChange={(value) => setSpeed(Number(value))} />

      <ControlGuide items={[
        { name: 'Rule string', text: 'Assigns a left or right turn to each cyclic cell color; changing it creates a different turmite.' },
        { name: 'Color scale', text: 'Changes only how cell ages are encoded visually, not how the ant moves.' },
        { name: 'Ants', text: 'Adds independent processors that share and overwrite the same grid memory.' },
        { name: 'Generation speed', text: 'Controls computation rate so early symmetry or long-term structures can be inspected.' },
      ]} />

      <p className="footnote">With one ant and rule RL, the first few hundred generations are symmetric, the middle thousands are chaotic, and near generation 10,000 a repeating 104-step highway emerges. Longer rule strings create generalized “turmites”; multiple ants independently read and rewrite the same grid.</p>
    </section>
  )
}

function Control({ symbol, name, value, sliderValue = value, min, max, step, onChange }) {
  return (
    <label className="control">
      <span className="control-head"><span className="name"><span className="sym">{symbol}</span>{name}</span><span className="val">{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={sliderValue} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
