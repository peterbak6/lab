import { useCallback, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const SIZE = 320
const LINE_SPACING = 64
const LINE_POSITIONS = d3.range(0, SIZE + 1, LINE_SPACING)

export default function BuffonNeedles() {
  const svgRef = useRef(null)
  const timerRef = useRef(null)
  const totalRef = useRef(0)
  const crossingsRef = useRef(0)
  const settingsRef = useRef({ ratio: 0.8, speed: 60, target: 1000 })

  const [ratio, setRatio] = useState(0.8)
  const [speed, setSpeed] = useState(60)
  const [target, setTarget] = useState(1000)
  const [running, setRunning] = useState(false)
  const [total, setTotal] = useState(0)
  const [crossings, setCrossings] = useState(0)

  settingsRef.current = { ratio, speed, target }

  const stop = useCallback(() => {
    timerRef.current?.stop()
    timerRef.current = null
  }, [])

  const reset = useCallback(() => {
    stop()
    setRunning(false)
    totalRef.current = 0
    crossingsRef.current = 0
    setTotal(0)
    setCrossings(0)
    d3.select(svgRef.current).select('.needle-layer').selectAll('*').remove()
  }, [stop])

  const dropNeedle = useCallback(() => {
    if (totalRef.current >= settingsRef.current.target) {
      stop()
      setRunning(false)
      return
    }

    const length = settingsRef.current.ratio * LINE_SPACING
    const angle = Math.random() * Math.PI
    const centerX = length / 2 + Math.random() * (SIZE - length)
    const centerY = Math.random() * SIZE
    const halfX = Math.cos(angle) * length / 2
    const halfY = Math.sin(angle) * length / 2
    const y1 = centerY - halfY
    const y2 = centerY + halfY
    const crossed = LINE_POSITIONS.some((lineY) => Math.min(y1, y2) <= lineY && Math.max(y1, y2) >= lineY)

    totalRef.current += 1
    if (crossed) crossingsRef.current += 1

    d3.select(svgRef.current).select('.needle-layer').append('line')
      .attr('class', crossed ? 'needle crossing' : 'needle safe')
      .attr('x1', centerX - halfX).attr('y1', y1)
      .attr('x2', centerX + halfX).attr('y2', y2)
      .attr('opacity', 0)
      .transition().duration(110).attr('opacity', totalRef.current > 1500 ? 0.42 : 0.72)

    setTotal(totalRef.current)
    setCrossings(crossingsRef.current)

    if (totalRef.current >= settingsRef.current.target) {
      stop()
      setRunning(false)
    }
  }, [stop])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.append('rect').attr('class', 'floor').attr('width', SIZE).attr('height', SIZE)
    svg.append('g').attr('class', 'floor-lines').selectAll('line').data(LINE_POSITIONS).join('line')
      .attr('x1', 0).attr('x2', SIZE).attr('y1', (d) => d).attr('y2', (d) => d)
    svg.append('g').attr('class', 'needle-layer')
  }, [])

  useEffect(() => {
    stop()
    if (running) timerRef.current = d3.interval(dropNeedle, 1000 / speed)
    return stop
  }, [dropNeedle, running, speed, stop])

  useEffect(() => reset(), [ratio, reset])

  useEffect(() => {
    if (total >= target) setRunning(false)
  }, [target, total])

  useEffect(() => () => {
    stop()
    d3.select(svgRef.current).selectAll('*').interrupt()
  }, [stop])

  const safe = total - crossings
  const probability = 2 * ratio / Math.PI
  const observedProbability = total ? crossings / total : null
  const piEstimate = crossings ? 2 * ratio * total / crossings : null
  const error = piEstimate === null ? null : Math.abs(piEstimate - Math.PI)

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Buffon%27s_needle_problem">Buffon’s needle is one of the earliest problems in geometric probability. A needle is dropped with random position and orientation across equally spaced parallel lines. Its chance of crossing a line depends on both its length and the circular geometry of its angle. Repeating the experiment turns that crossing frequency into a Monte Carlo estimate of π.</DemoIntro>

      <div className="demo-stage">
      <div className="chart-card needle-chart-card">
        <svg ref={svgRef} id="needle-board" viewBox="0 0 320 320" preserveAspectRatio="xMidYMid meet" aria-label="Buffon's needle simulation with randomly dropped needles and parallel lines" />
        <div className="stone-legend">
          <span><i className="legend-needle safe" />Between lines</span>
          <span><i className="legend-needle crossing" />Crosses a line</span>
        </div>
      </div>

      <div className="stone-formulas">
        <div><span className="formula-kicker">Crossing probability</span><span className="stone-formula">P = <span className="frac"><span className="num">2L</span><span className="den">πD</span></span></span></div>
        <div><span className="formula-kicker">Estimate</span><span className="stone-formula">π ≈ <span className="frac"><span className="num">2L × drops</span><span className="den">D × crossings</span></span></span></div>
      </div>

      <div className="readout stone-readout">
        <div className="cell"><div className="label">Needles dropped</div><div className="value">{total}</div></div>
        <div className="cell"><div className="label">Cross / safe</div><div className="value">{crossings} <span className="theo">/ {safe}</span></div></div>
        <div className="cell"><div className="label">π estimate</div><div className="value">{piEstimate === null ? '–' : piEstimate.toFixed(5)}</div></div>
      </div>

      <div className="run-row">
        <button className="btn primary" onClick={() => setRunning((value) => !value)} disabled={total >= target}>{running ? 'Pause' : total >= target ? 'Complete' : 'Start'}</button>
        <button className="btn ghost" onClick={reset}>Reset</button>
      </div>
      </div>

      <p className="section-label">Experiment parameters</p>
      <Control symbol="L/D" name="Needle length / line spacing" value={ratio.toFixed(2)} sliderValue={ratio} min="0.2" max="1" step="0.05" onChange={(value) => setRatio(Number(value))} />
      <Control symbol="λ" name="Drop speed (needles / sec)" value={speed} min="10" max="150" step="10" onChange={(value) => setSpeed(Number(value))} />
      <Control symbol="N" name="Target drops" value={target} min="100" max="5000" step="100" onChange={(value) => setTarget(Number(value))} />

      <ControlGuide items={[
        { name: 'Needle length / spacing', text: 'Longer needles cross more often; changing this ratio also changes the theoretical probability.' },
        { name: 'Drop speed', text: 'Changes how quickly trials accumulate but leaves the random geometry unchanged.' },
        { name: 'Target drops', text: 'Sets the sample size used by the crossing-rate estimate of π.' },
      ]} />

      <p className="footnote">For L ≤ D, the theoretical crossing probability is {probability.toFixed(4)} at the current length ratio. The observed rate is {observedProbability === null ? 'not available yet' : observedProbability.toFixed(4)}. More drops generally move the estimate toward π.{error === null ? '' : ` Current absolute error: ${error.toFixed(5)}.`}</p>
    </section>
  )
}

function Control({ symbol, name, value, sliderValue = value, min, max, step, onChange }) {
  return (
    <label className="control">
      <span className="control-head">
        <span className="name"><span className="sym">{symbol}</span>{name}</span>
        <span className="val">{value}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={sliderValue} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
