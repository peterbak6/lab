import { useCallback, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const SIZE = 320
const MARGIN = 16

function makeScales(steps) {
  const extent = Math.max(6, 3 * Math.sqrt(steps))
  return {
    x: d3.scaleLinear().domain([-extent, extent]).range([MARGIN, SIZE - MARGIN]),
    y: d3.scaleLinear().domain([-extent, extent]).range([SIZE - MARGIN, MARGIN]),
    extent,
  }
}

export default function DrunkardsWalk() {
  const svgRef = useRef(null)
  const timerRef = useRef(null)
  const walkersRef = useRef(0)
  const distanceSumRef = useRef(0)
  const squaredDistanceSumRef = useRef(0)
  const settingsRef = useRef({ steps: 100, speed: 40, target: 2000 })

  const [steps, setSteps] = useState(100)
  const [speed, setSpeed] = useState(40)
  const [target, setTarget] = useState(2000)
  const [running, setRunning] = useState(false)
  const [walkers, setWalkers] = useState(0)
  const [distanceSum, setDistanceSum] = useState(0)
  const [squaredDistanceSum, setSquaredDistanceSum] = useState(0)

  settingsRef.current = { steps, speed, target }

  const stop = useCallback(() => {
    timerRef.current?.stop()
    timerRef.current = null
  }, [])

  const reset = useCallback(() => {
    stop()
    setRunning(false)
    walkersRef.current = 0
    distanceSumRef.current = 0
    squaredDistanceSumRef.current = 0
    setWalkers(0)
    setDistanceSum(0)
    setSquaredDistanceSum(0)
    const svg = d3.select(svgRef.current)
    svg.select('.endpoint-layer').selectAll('*').remove()
    svg.select('.latest-path').attr('d', null)
    svg.select('.latest-end').attr('display', 'none')
  }, [stop])

  const simulateWalker = useCallback(() => {
    const { steps: currentSteps, target: currentTarget } = settingsRef.current
    if (walkersRef.current >= currentTarget) {
      stop()
      setRunning(false)
      return
    }

    let x = 0
    let y = 0
    const path = [{ x, y }]
    for (let step = 0; step < currentSteps; step += 1) {
      const direction = Math.floor(Math.random() * 4)
      if (direction === 0) x += 1
      else if (direction === 1) x -= 1
      else if (direction === 2) y += 1
      else y -= 1
      path.push({ x, y })
    }

    const distance = Math.hypot(x, y)
    walkersRef.current += 1
    distanceSumRef.current += distance
    squaredDistanceSumRef.current += distance ** 2

    const scales = makeScales(currentSteps)
    const svg = d3.select(svgRef.current)
    const line = d3.line().x((d) => scales.x(d.x)).y((d) => scales.y(d.y))
    svg.select('.latest-path').attr('d', line(path))
    svg.select('.latest-end').attr('display', null).attr('cx', scales.x(x)).attr('cy', scales.y(y))
    svg.select('.endpoint-layer').append('circle')
      .attr('class', 'walk-endpoint').attr('cx', scales.x(x)).attr('cy', scales.y(y))
      .attr('r', walkersRef.current > 3000 ? 1.15 : 1.65).attr('opacity', 0)
      .transition().duration(100).attr('opacity', walkersRef.current > 2000 ? 0.26 : 0.42)

    setWalkers(walkersRef.current)
    setDistanceSum(distanceSumRef.current)
    setSquaredDistanceSum(squaredDistanceSumRef.current)

    if (walkersRef.current >= currentTarget) {
      stop()
      setRunning(false)
    }
  }, [stop])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.append('rect').attr('class', 'walk-field').attr('width', SIZE).attr('height', SIZE)
    svg.append('g').attr('class', 'walk-grid')
    svg.append('circle').attr('class', 'rms-ring')
    svg.append('g').attr('class', 'endpoint-layer')
    svg.append('path').attr('class', 'latest-path')
    svg.append('circle').attr('class', 'walk-origin').attr('r', 3.2)
    svg.append('circle').attr('class', 'latest-end').attr('r', 3.2).attr('display', 'none')
  }, [])

  useEffect(() => {
    const scales = makeScales(steps)
    const svg = d3.select(svgRef.current)
    const ticks = d3.range(-2, 3).map((value) => value * scales.extent / 3)
    const grid = []
    ticks.forEach((value) => {
      grid.push({ x1: scales.x(value), x2: scales.x(value), y1: MARGIN, y2: SIZE - MARGIN, axis: value === 0 })
      grid.push({ x1: MARGIN, x2: SIZE - MARGIN, y1: scales.y(value), y2: scales.y(value), axis: value === 0 })
    })
    svg.select('.walk-grid').selectAll('line').data(grid).join('line')
      .attr('class', (d) => d.axis ? 'axis' : null)
      .attr('x1', (d) => d.x1).attr('x2', (d) => d.x2).attr('y1', (d) => d.y1).attr('y2', (d) => d.y2)
    svg.select('.walk-origin').attr('cx', scales.x(0)).attr('cy', scales.y(0))
    svg.select('.rms-ring').attr('cx', scales.x(0)).attr('cy', scales.y(0))
      .attr('r', scales.x(Math.sqrt(steps)) - scales.x(0))
    reset()
  }, [reset, steps])

  useEffect(() => {
    stop()
    if (running) timerRef.current = d3.interval(simulateWalker, 1000 / speed)
    return stop
  }, [running, simulateWalker, speed, stop])

  useEffect(() => {
    if (walkers >= target) setRunning(false)
  }, [target, walkers])

  useEffect(() => () => {
    stop()
    d3.select(svgRef.current).selectAll('*').interrupt()
  }, [stop])

  const meanDistance = walkers ? distanceSum / walkers : null
  const rmsDistance = walkers ? Math.sqrt(squaredDistanceSum / walkers) : null
  const theoreticalRms = Math.sqrt(steps)
  const theoreticalMean = Math.sqrt(Math.PI * steps) / 2

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Random_walk">A random walk builds a path from independent steps chosen from a probability rule. Every walker here starts at the same origin and moves north, south, east, or west with equal likelihood. One trajectory looks irregular and unpredictable, while thousands of endpoints form an increasingly smooth normal cloud. The characteristic displacement grows with the square root of the number of steps rather than in direct proportion to it.</DemoIntro>

      <div className="demo-stage">
      <div className="chart-card walk-chart-card">
        <svg ref={svgRef} id="walk-board" viewBox="0 0 320 320" preserveAspectRatio="xMidYMid meet" aria-label="Random walk paths and endpoint distribution around the origin" />
        <div className="stone-legend">
          <span><i className="legend-dot walk-cloud" />All endpoints</span>
          <span><i className="legend-path" />Latest path</span>
          <span><i className="legend-ring" />√N radius</span>
        </div>
      </div>

      <div className="stone-formulas">
        <div><span className="formula-kicker">RMS distance</span><span className="stone-formula">√⟨r²⟩ = √N</span></div>
        <div><span className="formula-kicker">Endpoint coordinates</span><span className="stone-formula">X, Y ≈ 𝒩(0, N/2)</span></div>
      </div>

      <div className="readout stone-readout">
        <div className="cell"><div className="label">Walkers</div><div className="value">{walkers}</div></div>
        <div className="cell"><div className="label">Mean r / asymptotic</div><div className="value">{meanDistance === null ? '–' : meanDistance.toFixed(2)} <span className="theo">/ {theoreticalMean.toFixed(2)}</span></div></div>
        <div className="cell"><div className="label">RMS r / √N</div><div className="value">{rmsDistance === null ? '–' : rmsDistance.toFixed(2)} <span className="theo">/ {theoreticalRms.toFixed(2)}</span></div></div>
      </div>

      <div className="run-row">
        <button className="btn primary" onClick={() => setRunning((value) => !value)} disabled={walkers >= target}>{running ? 'Pause' : walkers >= target ? 'Complete' : 'Start'}</button>
        <button className="btn ghost" onClick={reset}>Reset</button>
      </div>
      </div>

      <p className="section-label">Walk parameters</p>
      <Control symbol="N" name="Steps per walker" value={steps} min="10" max="500" step="10" onChange={(value) => setSteps(Number(value))} />
      <Control symbol="λ" name="Walkers simulated / sec" value={speed} min="5" max="100" step="5" onChange={(value) => setSpeed(Number(value))} />
      <Control symbol="W" name="Target walkers" value={target} min="100" max="10000" step="100" onChange={(value) => setTarget(Number(value))} />

      <ControlGuide items={[
        { name: 'Steps per walker', text: 'Lengthens every path and expands the endpoint cloud with a characteristic radius proportional to √N.' },
        { name: 'Simulation speed', text: 'Controls how quickly independent walkers are added to the cloud.' },
        { name: 'Target walkers', text: 'Sets the ensemble size; more endpoints make the underlying normal distribution easier to see.' },
      ]} />

      <p className="footnote">The dashed ring marks the exact root-mean-square distance √N. The ordinary mean straight-line distance approaches √(πN)/2 ≈ 0.886√N for large N. Each coordinate independently approaches a bell curve as the number of steps grows.</p>
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
