import { useCallback, useEffect, useRef, useState } from 'react'

const SIZE = 320
const PIXEL_RATIO = 2
const COLORS = ['#FAFCFA', '#DCEBE7', '#69A097', '#14615C']

function avalancheLabel(size) {
  if (size === 0) return 'Quiet drop'
  if (size < 20) return 'Small cascade'
  if (size < 500) return 'Avalanche'
  return 'Critical avalanche'
}

export default function Sandpile() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const lastTimeRef = useRef(0)
  const accumulatorRef = useRef(0)
  const gridRef = useRef(new Uint8Array(201 * 201))
  const dropsRef = useRef(0)
  const topplesRef = useRef(0)
  const storedRef = useRef(0)
  const lostRef = useRef(0)
  const settingsRef = useRef({ gridSize: 201, speed: 300, target: 30000 })

  const [gridSize, setGridSize] = useState(201)
  const [speed, setSpeed] = useState(300)
  const [target, setTarget] = useState(30000)
  const [running, setRunning] = useState(false)
  const [drops, setDrops] = useState(0)
  const [topples, setTopples] = useState(0)
  const [stored, setStored] = useState(0)
  const [lost, setLost] = useState(0)
  const [lastAvalanche, setLastAvalanche] = useState(0)

  settingsRef.current = { gridSize, speed, target }

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
    const size = settingsRef.current.gridSize
    const cellSize = SIZE / size
    context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0)
    context.fillStyle = COLORS[0]
    context.fillRect(0, 0, SIZE, SIZE)
    const grid = gridRef.current
    for (let index = 0; index < grid.length; index += 1) {
      const height = grid[index]
      if (!height) continue
      const x = index % size
      const y = Math.floor(index / size)
      context.fillStyle = COLORS[height]
      context.fillRect(x * cellSize, y * cellSize, Math.max(0.8, cellSize + 0.08), Math.max(0.8, cellSize + 0.08))
    }
    const center = Math.floor(size / 2)
    context.strokeStyle = '#C6842A'
    context.lineWidth = Math.max(0.8, Math.min(1.5, cellSize))
    context.strokeRect(center * cellSize - 1, center * cellSize - 1, cellSize + 2, cellSize + 2)
  }, [])

  const reset = useCallback(() => {
    stop()
    setRunning(false)
    const size = settingsRef.current.gridSize
    gridRef.current = new Uint8Array(size * size)
    dropsRef.current = 0
    topplesRef.current = 0
    storedRef.current = 0
    lostRef.current = 0
    setDrops(0)
    setTopples(0)
    setStored(0)
    setLost(0)
    setLastAvalanche(0)
    requestAnimationFrame(draw)
  }, [draw, stop])

  const dropOne = useCallback(() => {
    const size = settingsRef.current.gridSize
    const grid = gridRef.current
    const center = Math.floor(size / 2)
    const centerIndex = center * size + center
    const queue = []
    let head = 0
    let avalanche = 0
    grid[centerIndex] += 1
    storedRef.current += 1
    if (grid[centerIndex] >= 4) queue.push(centerIndex)

    while (head < queue.length) {
      const index = queue[head]
      head += 1
      if (grid[index] < 4) continue
      grid[index] -= 4
      avalanche += 1
      const x = index % size
      const y = Math.floor(index / size)
      const neighbors = [[x, y - 1], [x + 1, y], [x, y + 1], [x - 1, y]]
      neighbors.forEach(([nx, ny]) => {
        if (nx < 0 || nx >= size || ny < 0 || ny >= size) {
          lostRef.current += 1
          storedRef.current -= 1
          return
        }
        const neighborIndex = ny * size + nx
        grid[neighborIndex] += 1
        if (grid[neighborIndex] === 4) queue.push(neighborIndex)
      })
      if (grid[index] >= 4) queue.push(index)
    }
    dropsRef.current += 1
    topplesRef.current += avalanche
    return avalanche
  }, [])

  const advance = useCallback((amount) => {
    const remaining = settingsRef.current.target - dropsRef.current
    const count = Math.max(0, Math.min(amount, remaining))
    if (!count) { setRunning(false); return }
    let avalanche = 0
    for (let index = 0; index < count; index += 1) avalanche = dropOne()
    setDrops(dropsRef.current)
    setTopples(topplesRef.current)
    setStored(storedRef.current)
    setLost(lostRef.current)
    setLastAvalanche(avalanche)
    draw()
    if (dropsRef.current >= settingsRef.current.target) setRunning(false)
  }, [draw, dropOne])

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = SIZE * PIXEL_RATIO
    canvas.height = SIZE * PIXEL_RATIO
    reset()
  }, [reset])

  useEffect(() => reset(), [gridSize, reset])

  useEffect(() => {
    stop()
    if (!running) return undefined
    const animate = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time
      const elapsed = Math.min(100, time - lastTimeRef.current)
      lastTimeRef.current = time
      accumulatorRef.current += elapsed * settingsRef.current.speed / 1000
      const amount = Math.min(100, Math.floor(accumulatorRef.current))
      if (amount > 0) {
        accumulatorRef.current -= amount
        advance(amount)
      }
      if (dropsRef.current < settingsRef.current.target) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return stop
  }, [advance, running, stop])

  useEffect(() => {
    if (drops >= target) setRunning(false)
  }, [drops, target])

  useEffect(() => () => stop(), [stop])

  return (
    <section>
      <p className="detail-sub">Drop grains one by one onto the center cell. Every fourth grain triggers local topplings that cascade outward and self-organize into a sharply symmetric critical pattern.</p>

      <div className="chart-card sand-chart-card">
        <canvas ref={canvasRef} id="sand-board" aria-label="Abelian sandpile fractal generated by center drops and cardinal topplings" />
        <div className="sand-legend">{COLORS.map((color, height) => <span key={height}><i style={{ background: color }} />{height} grain{height === 1 ? '' : 's'}</span>)}</div>
      </div>

      <div className="stone-formulas">
        <div><span className="formula-kicker">Stable cell</span><span className="stone-formula">h ∈ {'{0, 1, 2, 3}'}</span></div>
        <div><span className="formula-kicker">Toppling rule</span><span className="stone-formula">h ≥ 4 ⇒ h − 4, neighbors + 1</span></div>
      </div>

      <div className="readout stone-readout">
        <div className="cell"><div className="label">Grains dropped</div><div className="value">{drops.toLocaleString()}</div></div>
        <div className="cell"><div className="label">Total topplings</div><div className="value">{topples.toLocaleString()}</div></div>
        <div className="cell"><div className="label">Last event</div><div className="value sand-status">{avalancheLabel(lastAvalanche)}</div></div>
      </div>

      <div className="run-row ant-run-row">
        <button className="btn primary" onClick={() => setRunning((value) => !value)} disabled={drops >= target}>{running ? 'Pause' : drops >= target ? 'Complete' : 'Start'}</button>
        <button className="btn ghost" onClick={() => advance(100)} disabled={running || drops >= target}>+100</button>
        <button className="btn ghost" onClick={reset}>Reset</button>
      </div>

      <p className="section-label">Pile parameters</p>
      <Control symbol="λ" name="Grains / sec" value={speed.toLocaleString()} sliderValue={speed} min="10" max="2000" step="10" onChange={(value) => setSpeed(Number(value))} />
      <Control symbol="N" name="Target grains" value={target.toLocaleString()} sliderValue={target} min="1000" max="100000" step="1000" onChange={(value) => setTarget(Number(value))} />
      <Control symbol="G" name="Grid size" value={`${gridSize} × ${gridSize}`} sliderValue={gridSize} min="81" max="321" step="40" onChange={(value) => setGridSize(Number(value))} />

      <p className="footnote">The pile currently stores {stored.toLocaleString()} grains and has lost {lost.toLocaleString()} through the open boundary. Because the model is Abelian, changing the order of legal topplings changes the path of an avalanche but not its final stable configuration.</p>
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
