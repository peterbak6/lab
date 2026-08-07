import { useCallback, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const SIZE = 320
const PIXEL_RATIO = 2
const SHAPE_NAMES = { 3: 'Triangle', 4: 'Square', 5: 'Pentagon', 6: 'Hexagon', 7: 'Heptagon', 8: 'Octagon' }

function makeVertices(count) {
  const radius = 138
  const angleOffset = count === 4 ? -3 * Math.PI / 4 : -Math.PI / 2
  const colors = d3.quantize(d3.interpolateHcl('#14615C', '#C6842A'), count)
  return d3.range(count).map((index) => {
    const angle = angleOffset + index * Math.PI * 2 / count
    return {
      x: SIZE / 2 + Math.cos(angle) * radius,
      y: SIZE / 2 + Math.sin(angle) * radius,
      label: String.fromCharCode(65 + index),
      color: colors[index],
    }
  })
}

function phaseFor(points, vertexCount, jumpFactor, restrictRepeat) {
  if (points < 100) return 'Random sketch'
  if (points < 2000) return 'Structure emerging'
  if (vertexCount === 3 && Math.abs(jumpFactor - 0.5) < 0.002 && !restrictRepeat) return 'Sierpiński triangle'
  return restrictRepeat ? 'Restricted attractor' : 'Polygon attractor'
}

export default function ChaosGame() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const lastTimeRef = useRef(0)
  const accumulatorRef = useRef(0)
  const pointRef = useRef({ x: Math.random() * SIZE, y: Math.random() * SIZE })
  const totalRef = useRef(0)
  const countsRef = useRef([0, 0, 0])
  const previousVertexRef = useRef(-1)
  const settingsRef = useRef({ speed: 12000, target: 100000, vertexCount: 3, jumpFactor: 0.5, restrictRepeat: false })

  const [speed, setSpeed] = useState(12000)
  const [target, setTarget] = useState(100000)
  const [vertexCount, setVertexCount] = useState(3)
  const [jumpFactor, setJumpFactor] = useState(0.5)
  const [restrictRepeat, setRestrictRepeat] = useState(false)
  const [running, setRunning] = useState(false)
  const [total, setTotal] = useState(0)
  const [counts, setCounts] = useState([0, 0, 0])

  settingsRef.current = { speed, target, vertexCount, jumpFactor, restrictRepeat }

  const stop = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    frameRef.current = null
    lastTimeRef.current = 0
    accumulatorRef.current = 0
  }, [])

  const drawGuide = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0)
    context.globalAlpha = 1
    context.strokeStyle = '#C3CFC7'
    context.lineWidth = 1
    context.beginPath()
    const vertices = makeVertices(settingsRef.current.vertexCount)
    context.moveTo(vertices[0].x, vertices[0].y)
    vertices.slice(1).forEach((vertex) => context.lineTo(vertex.x, vertex.y))
    context.closePath()
    context.stroke()
    vertices.forEach((vertex) => {
      context.beginPath()
      context.arc(vertex.x, vertex.y, 3.4, 0, Math.PI * 2)
      context.fillStyle = vertex.color
      context.fill()
      context.font = '600 9px IBM Plex Mono, monospace'
      context.textAlign = vertex.x < SIZE / 2 - 8 ? 'right' : vertex.x > SIZE / 2 + 8 ? 'left' : 'center'
      context.textBaseline = vertex.y < SIZE / 2 ? 'bottom' : 'top'
      context.fillText(vertex.label, vertex.x + (vertex.x < SIZE / 2 - 8 ? -6 : vertex.x > SIZE / 2 + 8 ? 6 : 0), vertex.y + (vertex.y < SIZE / 2 ? -5 : 5))
    })
  }, [])

  const reset = useCallback(() => {
    stop()
    setRunning(false)
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0)
    context.fillStyle = '#FAFCFA'
    context.fillRect(0, 0, SIZE, SIZE)
    pointRef.current = { x: 16 + Math.random() * (SIZE - 32), y: 16 + Math.random() * (SIZE - 32) }
    totalRef.current = 0
    countsRef.current = new Array(settingsRef.current.vertexCount).fill(0)
    previousVertexRef.current = -1
    setTotal(0)
    setCounts([...countsRef.current])
    drawGuide()
  }, [drawGuide, stop])

  const advance = useCallback((iterations) => {
    const remaining = settingsRef.current.target - totalRef.current
    const amount = Math.max(0, Math.min(iterations, remaining))
    if (!amount) {
      setRunning(false)
      return
    }
    const context = canvasRef.current.getContext('2d')
    context.setTransform(PIXEL_RATIO, 0, 0, PIXEL_RATIO, 0, 0)
    context.globalAlpha = totalRef.current > 30000 ? 0.42 : 0.62
    const point = pointRef.current
    const nextCounts = [...countsRef.current]
    const vertices = makeVertices(settingsRef.current.vertexCount)
    for (let index = 0; index < amount; index += 1) {
      let chosen = Math.floor(Math.random() * vertices.length)
      if (settingsRef.current.restrictRepeat && chosen === previousVertexRef.current) {
        chosen = (chosen + 1 + Math.floor(Math.random() * (vertices.length - 1))) % vertices.length
      }
      previousVertexRef.current = chosen
      const vertex = vertices[chosen]
      point.x += (vertex.x - point.x) * settingsRef.current.jumpFactor
      point.y += (vertex.y - point.y) * settingsRef.current.jumpFactor
      nextCounts[chosen] += 1
      context.fillStyle = vertex.color
      context.fillRect(point.x - 0.55, point.y - 0.55, 1.1, 1.1)
    }
    totalRef.current += amount
    countsRef.current = nextCounts
    setTotal(totalRef.current)
    setCounts(nextCounts)
    drawGuide()
    if (totalRef.current >= settingsRef.current.target) setRunning(false)
  }, [drawGuide])

  useEffect(() => {
    const canvas = canvasRef.current
    canvas.width = SIZE * PIXEL_RATIO
    canvas.height = SIZE * PIXEL_RATIO
    reset()
  }, [reset])

  useEffect(() => reset(), [jumpFactor, reset, restrictRepeat, vertexCount])

  useEffect(() => {
    stop()
    if (!running) return undefined
    const animate = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time
      const elapsed = Math.min(100, time - lastTimeRef.current)
      lastTimeRef.current = time
      accumulatorRef.current += elapsed * settingsRef.current.speed / 1000
      const iterations = Math.min(8000, Math.floor(accumulatorRef.current))
      if (iterations > 0) {
        accumulatorRef.current -= iterations
        advance(iterations)
      }
      if (totalRef.current < settingsRef.current.target) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return stop
  }, [advance, running, stop])

  useEffect(() => {
    if (total >= target) setRunning(false)
  }, [target, total])

  useEffect(() => () => stop(), [stop])

  const phase = phaseFor(total, vertexCount, jumpFactor, restrictRepeat)
  const vertices = makeVertices(vertexCount)

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Chaos_game">The chaos game generates fractals by repeatedly applying a randomly selected geometric contraction. A point chooses a polygon vertex, moves a fixed fraction toward it, and becomes the starting point for the next iteration. Although every choice is random, the sequence converges onto a sharply defined mathematical attractor. Changing the polygon, contraction, or vertex restriction reveals different hidden families of self-similar patterns.</DemoIntro>

      <div className="demo-stage">
      <div className="chart-card chaos-chart-card">
        <canvas ref={canvasRef} id="chaos-board" aria-label="Chaos Game simulation drawing a Sierpiński triangle from random vertex choices" />
        <div className="chaos-legend">{vertices.map((vertex, index) => <span key={vertex.label}><i style={{ background: vertex.color }} />{vertex.label}: {(counts[index] || 0).toLocaleString()}</span>)}</div>
      </div>

      <div className="stone-formulas">
        <div><span className="formula-kicker">Random choice</span><span className="stone-formula">{restrictRepeat ? <>P(V<span className="exp">i</span> | V<span className="exp">i</span> ≠ V<span className="exp">n−1</span>) = 1 / {vertexCount - 1}</> : <>P(V<span className="exp">i</span>) = 1 / {vertexCount}</>}</span></div>
        <div><span className="formula-kicker">Jump rule</span><span className="stone-formula">P<span className="exp">n+1</span> = (1−j)P<span className="exp">n</span> + jV<span className="exp">i</span></span></div>
      </div>

      <div className="readout stone-readout">
        <div className="cell"><div className="label">Points drawn</div><div className="value">{total.toLocaleString()}</div></div>
        <div className="cell"><div className="label">Target</div><div className="value">{target.toLocaleString()}</div></div>
        <div className="cell"><div className="label">Pattern</div><div className="value chaos-status">{phase}</div></div>
      </div>

      <div className="run-row ant-run-row">
        <button className="btn primary" onClick={() => setRunning((value) => !value)} disabled={total >= target}>{running ? 'Pause' : total >= target ? 'Complete' : 'Start'}</button>
        <button className="btn ghost" onClick={() => advance(100)} disabled={running || total >= target}>+100</button>
        <button className="btn ghost" onClick={reset}>Reset</button>
      </div>
      </div>

      <p className="section-label">Drawing parameters</p>
      <Control symbol="V" name="Vertex count" value={`${SHAPE_NAMES[vertexCount]} (${vertexCount})`} sliderValue={vertexCount} min="3" max="8" step="1" onChange={(value) => setVertexCount(Number(value))} />
      <Control symbol="j" name="Jump toward vertex" value={`${(jumpFactor * 100).toFixed(1)}%`} sliderValue={jumpFactor} min="0.1" max="0.9" step="0.001" onChange={(value) => setJumpFactor(Number(value))} />
      <label className="toggle-control">
        <span><span className="sym">≠</span><span><strong>Ban consecutive corners</strong><small>Never choose the same vertex twice in a row</small></span></span>
        <input type="checkbox" checked={restrictRepeat} onChange={(event) => setRestrictRepeat(event.target.checked)} />
        <i aria-hidden="true" />
      </label>
      <Control symbol="λ" name="Points / sec" value={speed.toLocaleString()} sliderValue={speed} min="1000" max="100000" step="1000" onChange={(value) => setSpeed(Number(value))} />
      <Control symbol="N" name="Target points" value={target.toLocaleString()} sliderValue={target} min="1000" max="500000" step="1000" onChange={(value) => setTarget(Number(value))} />

      <ControlGuide items={[
        { name: 'Vertex count', text: 'Changes the regular polygon and therefore the family of possible attractors.' },
        { name: 'Jump factor', text: 'Controls the contraction toward each chosen corner; overlap or separation determines whether a clean fractal appears.' },
        { name: 'Corner restriction', text: 'Removing consecutive repeats changes the symbolic sequence and exposes new internal structure.' },
        { name: 'Speed and target', text: 'Control how quickly and how densely the attractor is sampled without changing its geometry.' },
      ]} />

      <p className="footnote">With three vertices and a 50% jump, the classic Sierpiński triangle has dimension log(3) / log(2) ≈ 1.585. Other polygons can overlap into a blur at that same jump; changing the contraction or banning repeated corners exposes hidden self-similar structures.</p>
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
