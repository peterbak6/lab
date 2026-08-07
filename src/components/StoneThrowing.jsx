import { useCallback, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const SIZE = 320
const MARGIN = 16
const PLOT_SIZE = SIZE - MARGIN * 2
const CENTER = SIZE / 2
const RADIUS = PLOT_SIZE / 2

export default function StoneThrowing() {
  const svgRef = useRef(null)
  const timerRef = useRef(null)
  const totalRef = useRef(0)
  const insideRef = useRef(0)
  const settingsRef = useRef({ speed: 80, target: 1000 })

  const [running, setRunning] = useState(false)
  const [speed, setSpeed] = useState(80)
  const [target, setTarget] = useState(1000)
  const [total, setTotal] = useState(0)
  const [inside, setInside] = useState(0)

  settingsRef.current = { speed, target }

  const stop = useCallback(() => {
    timerRef.current?.stop()
    timerRef.current = null
  }, [])

  const reset = useCallback(() => {
    stop()
    setRunning(false)
    totalRef.current = 0
    insideRef.current = 0
    setTotal(0)
    setInside(0)
    d3.select(svgRef.current).select('.stone-layer').selectAll('*').remove()
  }, [stop])

  const throwStone = useCallback(() => {
    if (totalRef.current >= settingsRef.current.target) {
      stop()
      setRunning(false)
      return
    }

    const normalizedX = Math.random() * 2 - 1
    const normalizedY = Math.random() * 2 - 1
    const isInside = normalizedX ** 2 + normalizedY ** 2 <= 1
    totalRef.current += 1
    if (isInside) insideRef.current += 1

    d3.select(svgRef.current).select('.stone-layer').append('circle')
      .attr('class', isInside ? 'stone inside' : 'stone outside')
      .attr('cx', CENTER + normalizedX * RADIUS)
      .attr('cy', CENTER - normalizedY * RADIUS)
      .attr('r', totalRef.current > 2000 ? 1.35 : 1.8)
      .attr('opacity', 0)
      .transition().duration(90).attr('opacity', 0.78)

    setTotal(totalRef.current)
    setInside(insideRef.current)

    if (totalRef.current >= settingsRef.current.target) {
      stop()
      setRunning(false)
    }
  }, [stop])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.append('rect').attr('class', 'throw-square')
      .attr('x', MARGIN).attr('y', MARGIN).attr('width', PLOT_SIZE).attr('height', PLOT_SIZE)
    svg.append('line').attr('class', 'throw-axis').attr('x1', CENTER).attr('x2', CENTER).attr('y1', MARGIN).attr('y2', SIZE - MARGIN)
    svg.append('line').attr('class', 'throw-axis').attr('x1', MARGIN).attr('x2', SIZE - MARGIN).attr('y1', CENTER).attr('y2', CENTER)
    svg.append('circle').attr('class', 'throw-circle').attr('cx', CENTER).attr('cy', CENTER).attr('r', RADIUS)
    svg.append('g').attr('class', 'stone-layer')
  }, [])

  useEffect(() => {
    stop()
    if (running) timerRef.current = d3.interval(throwStone, 1000 / speed)
    return stop
  }, [running, speed, stop, throwStone])

  useEffect(() => {
    if (total >= target) setRunning(false)
  }, [target, total])

  useEffect(() => () => {
    stop()
    d3.select(svgRef.current).selectAll('*').interrupt()
  }, [stop])

  const outside = total - inside
  const piEstimate = total ? 4 * inside / total : null
  const error = piEstimate === null ? null : Math.abs(piEstimate - Math.PI)

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Monte_Carlo_method">Monte Carlo methods use repeated random samples to estimate quantities that may be difficult to compute directly. Here, uniformly thrown points cover a square containing an inscribed circle. The fraction inside the circle estimates the ratio of their areas, π/4. As the sample grows, random fluctuations shrink and the estimate tends to settle near π.</DemoIntro>

      <div className="demo-stage">
      <div className="chart-card stone-chart-card">
        <svg ref={svgRef} id="stone-board" viewBox="0 0 320 320" preserveAspectRatio="xMidYMid meet" aria-label="Monte Carlo simulation of random stones landing inside and outside a circle" />
        <div className="stone-legend">
          <span><i className="legend-dot inside" />Inside circle</span>
          <span><i className="legend-dot outside" />Outside circle</span>
        </div>
      </div>

      <div className="stone-formulas">
        <div><span className="formula-kicker">Area ratio</span><span className="stone-formula">P(inside) = <span className="frac"><span className="num">πr²</span><span className="den">4r²</span></span> = <span className="frac"><span className="num">π</span><span className="den">4</span></span></span></div>
        <div><span className="formula-kicker">Estimate</span><span className="stone-formula">π ≈ 4 × <span className="frac"><span className="num">inside</span><span className="den">total</span></span></span></div>
      </div>

      <div className="readout stone-readout">
        <div className="cell"><div className="label">Stones thrown</div><div className="value">{total}</div></div>
        <div className="cell"><div className="label">Inside / outside</div><div className="value">{inside} <span className="theo">/ {outside}</span></div></div>
        <div className="cell"><div className="label">π estimate</div><div className="value">{piEstimate === null ? '–' : piEstimate.toFixed(5)}</div></div>
      </div>

      <div className="run-row">
        <button className="btn primary" onClick={() => setRunning((value) => !value)} disabled={total >= target}>{running ? 'Pause' : total >= target ? 'Complete' : 'Start'}</button>
        <button className="btn ghost" onClick={reset}>Reset</button>
      </div>
      </div>

      <p className="section-label">Simulation parameters</p>
      <Control symbol="λ" name="Throw speed (stones / sec)" value={speed} min="10" max="200" step="10" onChange={(value) => setSpeed(Number(value))} />
      <Control symbol="N" name="Target stones" value={target} min="100" max="5000" step="100" onChange={(value) => setTarget(Number(value))} />

      <ControlGuide items={[
        { name: 'Throw speed', text: 'Controls how quickly new random points appear without changing their spatial probability.' },
        { name: 'Target stones', text: 'Sets the sample size; larger samples usually reduce the visible error in the π estimate.' },
      ]} />

      <p className="footnote">The square has area 4r² and the circle has area πr², so a uniformly random stone lands inside with probability π/4. The estimate converges toward π as the number of throws grows.{error === null ? '' : ` Current absolute error: ${error.toFixed(5)}.`}</p>
    </section>
  )
}

function Control({ symbol, name, value, min, max, step, onChange }) {
  return (
    <label className="control">
      <span className="control-head">
        <span className="name"><span className="sym">{symbol}</span>{name}</span>
        <span className="val">{value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
