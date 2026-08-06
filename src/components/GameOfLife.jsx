import { useCallback, useEffect, useRef, useState } from 'react'

const SIZE = 320
const PIXEL_RATIO = 2
const PRESETS = {
  Block: [[0, 0], [1, 0], [0, 1], [1, 1]],
  Blinker: [[-1, 0], [0, 0], [1, 0]],
  Glider: [[0, -1], [1, 0], [-1, 1], [0, 1], [1, 1]],
}

export default function GameOfLife() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const lastTimeRef = useRef(0)
  const gridRef = useRef(new Uint8Array(48 * 48))
  const birthsRef = useRef(new Uint8Array(48 * 48))
  const previousRef = useRef(null)
  const generationRef = useRef(0)
  const drawingRef = useRef(false)
  const paintValueRef = useRef(1)
  const lastPaintedRef = useRef(-1)
  const settingsRef = useRef({ gridSize: 48, speed: 8, density: 0.28 })

  const [gridSize, setGridSize] = useState(48)
  const [speed, setSpeed] = useState(8)
  const [density, setDensity] = useState(0.28)
  const [running, setRunning] = useState(false)
  const [generation, setGeneration] = useState(0)
  const [liveCount, setLiveCount] = useState(0)
  const [status, setStatus] = useState('Ready')

  settingsRef.current = { gridSize, speed, density }

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    lastTimeRef.current = 0
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    const size = settingsRef.current.gridSize
    const cell = SIZE / size
    context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0)
    context.fillStyle = '#FAFCFA'
    context.fillRect(0, 0, SIZE, SIZE)

    const grid = gridRef.current
    const births = birthsRef.current
    for (let index = 0; index < grid.length; index += 1) {
      if (!grid[index]) continue
      const x = index % size
      const y = Math.floor(index / size)
      context.fillStyle = births[index] ? '#C6842A' : '#14615C'
      context.fillRect(x * cell + 0.45, y * cell + 0.45, Math.max(1, cell - 0.9), Math.max(1, cell - 0.9))
    }

    if (cell >= 4) {
      context.strokeStyle = '#E2E9E4'
      context.lineWidth = 0.5
      for (let i = 0; i <= size; i += 1) {
        const position = i * cell
        context.beginPath(); context.moveTo(position, 0); context.lineTo(position, SIZE); context.stroke()
        context.beginPath(); context.moveTo(0, position); context.lineTo(SIZE, position); context.stroke()
      }
    }
  }, [])

  const clear = useCallback(() => {
    stop()
    setRunning(false)
    const size = settingsRef.current.gridSize
    gridRef.current = new Uint8Array(size * size)
    birthsRef.current = new Uint8Array(size * size)
    previousRef.current = null
    generationRef.current = 0
    setGeneration(0)
    setLiveCount(0)
    setStatus('Ready')
    requestAnimationFrame(draw)
  }, [draw, stop])

  const step = useCallback(() => {
    const size = settingsRef.current.gridSize
    const current = gridRef.current
    const next = new Uint8Array(current.length)
    const births = new Uint8Array(current.length)
    let alive = 0
    let changed = 0
    let matchesPrevious = Boolean(previousRef.current)

    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        let neighbors = 0
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dx = -1; dx <= 1; dx += 1) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) neighbors += current[ny * size + nx]
          }
        }
        const index = y * size + x
        const willLive = current[index] ? neighbors === 2 || neighbors === 3 : neighbors === 3
        next[index] = willLive ? 1 : 0
        births[index] = willLive && !current[index] ? 1 : 0
        if (willLive) alive += 1
        if (next[index] !== current[index]) changed += 1
        if (previousRef.current && next[index] !== previousRef.current[index]) matchesPrevious = false
      }
    }

    previousRef.current = current.slice()
    gridRef.current = next
    birthsRef.current = births
    generationRef.current += 1
    setGeneration(generationRef.current)
    setLiveCount(alive)
    if (alive === 0) setStatus('Extinct')
    else if (changed === 0) setStatus('Stable')
    else if (matchesPrevious) setStatus('Period-2 oscillator')
    else setStatus('Evolving')
    draw()
  }, [draw])

  const loadPreset = useCallback((name) => {
    clear()
    const size = settingsRef.current.gridSize
    const grid = new Uint8Array(size * size)
    const center = Math.floor(size / 2)
    PRESETS[name].forEach(([dx, dy]) => { grid[(center + dy) * size + center + dx] = 1 })
    gridRef.current = grid
    birthsRef.current = grid.slice()
    setLiveCount(PRESETS[name].length)
    setStatus(name)
    requestAnimationFrame(draw)
  }, [clear, draw])

  const randomize = useCallback(() => {
    clear()
    const size = settingsRef.current.gridSize
    const grid = new Uint8Array(size * size)
    let alive = 0
    for (let index = 0; index < grid.length; index += 1) {
      if (Math.random() < settingsRef.current.density) { grid[index] = 1; alive += 1 }
    }
    gridRef.current = grid
    birthsRef.current = grid.slice()
    setLiveCount(alive)
    setStatus('Random seed')
    requestAnimationFrame(draw)
  }, [clear, draw])

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = SIZE * PIXEL_RATIO
    canvas.height = SIZE * PIXEL_RATIO
    draw()
  }, [draw])

  useEffect(() => loadPreset('Glider'), [gridSize, loadPreset])

  useEffect(() => {
    stop()
    if (!running) return undefined
    const animate = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time
      if (time - lastTimeRef.current >= 1000 / settingsRef.current.speed) {
        lastTimeRef.current = time
        step()
      }
      frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return stop
  }, [running, step, stop])

  useEffect(() => () => stop(), [stop])

  function cellFromPointer(event) {
    const rect = canvasRef.current.getBoundingClientRect()
    const x = Math.floor((event.clientX - rect.left) / rect.width * gridSize)
    const y = Math.floor((event.clientY - rect.top) / rect.height * gridSize)
    if (x < 0 || x >= gridSize || y < 0 || y >= gridSize) return -1
    return y * gridSize + x
  }

  function paint(event, starting = false) {
    const index = cellFromPointer(event)
    if (index < 0 || index === lastPaintedRef.current) return
    if (starting) {
      setRunning(false)
      paintValueRef.current = gridRef.current[index] ? 0 : 1
    }
    gridRef.current[index] = paintValueRef.current
    birthsRef.current[index] = paintValueRef.current
    lastPaintedRef.current = index
    previousRef.current = null
    generationRef.current = 0
    setGeneration(0)
    const alive = gridRef.current.reduce((sum, value) => sum + value, 0)
    setLiveCount(alive)
    setStatus('Edited')
    draw()
  }

  return (
    <section>
      <p className="detail-sub">Cells live or die using only the eight cells around them. Paint your own seed or load a classic pattern, then watch still lifes, oscillators, and moving gliders emerge.</p>

      <div className="chart-card life-chart-card">
        <canvas ref={canvasRef} id="life-board" aria-label="Editable Conway's Game of Life grid" onPointerDown={(event) => { drawingRef.current = true; lastPaintedRef.current = -1; event.currentTarget.setPointerCapture(event.pointerId); paint(event, true) }} onPointerMove={(event) => { if (drawingRef.current) paint(event) }} onPointerUp={() => { drawingRef.current = false; lastPaintedRef.current = -1 }} onPointerCancel={() => { drawingRef.current = false; lastPaintedRef.current = -1 }} />
        <div className="stone-legend"><span><i className="legend-dot life-cell" />Surviving cell</span><span><i className="legend-dot life-birth" />New birth</span></div>
      </div>

      <div className="life-rules">
        <div><strong>2–3</strong><span>Survive</span></div>
        <div><strong>0–1, 4+</strong><span>Die</span></div>
        <div><strong>3</strong><span>Birth</span></div>
      </div>

      <div className="readout stone-readout">
        <div className="cell"><div className="label">Generation</div><div className="value">{generation}</div></div>
        <div className="cell"><div className="label">Living cells</div><div className="value">{liveCount}</div></div>
        <div className="cell"><div className="label">State</div><div className="value life-status">{status}</div></div>
      </div>

      <div className="run-row ant-run-row">
        <button className="btn primary" onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : 'Start'}</button>
        <button className="btn ghost" onClick={step} disabled={running}>Step</button>
        <button className="btn ghost" onClick={clear}>Clear</button>
      </div>

      <p className="section-label">Classic patterns</p>
      <div className="preset-row">
        {Object.keys(PRESETS).map((name) => <button className="preset-button" key={name} onClick={() => loadPreset(name)}>{name}</button>)}
        <button className="preset-button random" onClick={randomize}>Random</button>
      </div>

      <p className="section-label life-settings-label">Simulation parameters</p>
      <Control symbol="λ" name="Generations / sec" value={speed} min="1" max="30" step="1" onChange={(value) => setSpeed(Number(value))} />
      <Control symbol="ρ" name="Random fill density" value={`${Math.round(density * 100)}%`} sliderValue={density} min="0.05" max="0.6" step="0.01" onChange={(value) => setDensity(Number(value))} />
      <Control symbol="G" name="Grid size" value={`${gridSize} × ${gridSize}`} sliderValue={gridSize} min="24" max="80" step="8" onChange={(value) => setGridSize(Number(value))} />

      <p className="footnote">Drag across the grid to paint or erase cells. Conway’s three rules are sufficient for stable blocks, repeating clocks, moving spaceships, and even universal computation.</p>
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
