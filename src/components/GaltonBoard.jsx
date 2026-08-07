import { useCallback, useEffect, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const ROW_DURATION = 150
const BIN_DROP_DURATION = 180
const DOT_LIMIT = 26
const MAX_BALLS = 4000
const W = 320
const H = 390

function geometry(rows) {
  const marginX = 16
  const topY = 14
  const pegAreaBottom = H * 0.56
  const binAreaTop = pegAreaBottom + 10
  const binAreaBottom = H - 8
  const usableW = W - marginX * 2
  return {
    marginX,
    topY,
    pegAreaBottom,
    binAreaTop,
    binAreaBottom,
    spacing: usableW / (rows + 2),
    centerX: W / 2,
    rowSpacing: (pegAreaBottom - topY) / rows,
    binAreaHeight: binAreaBottom - binAreaTop,
  }
}

function normalPDF(x, mean, std) {
  return (1 / (std * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * ((x - mean) / std) ** 2)
}

export default function GaltonBoard() {
  const svgRef = useRef(null)
  const spawnTimer = useRef(null)
  const activeCount = useRef(0)
  const binsRef = useRef([])
  const countRef = useRef(0)
  const settingsRef = useRef({ rows: 12, probability: 0.5, speed: 10 })

  const [rows, setRows] = useState(12)
  const [probability, setProbability] = useState(0.5)
  const [speed, setSpeed] = useState(10)
  const [running, setRunning] = useState(false)
  const [count, setCount] = useState(0)
  const [bins, setBins] = useState(() => new Array(13).fill(0))

  settingsRef.current = { rows, probability, speed }
  binsRef.current = bins
  countRef.current = count

  const stopSpawning = useCallback(() => {
    spawnTimer.current?.stop()
    spawnTimer.current = null
  }, [])

  const reset = useCallback(() => {
    stopSpawning()
    setRunning(false)
    activeCount.current = 0
    countRef.current = 0
    const nextBins = new Array(settingsRef.current.rows + 1).fill(0)
    binsRef.current = nextBins
    setBins(nextBins)
    setCount(0)
    d3.select(svgRef.current).select('.ball-layer').selectAll('*').interrupt().remove()
  }, [stopSpawning])

  const spawnBall = useCallback(() => {
    const { rows: currentRows, probability: p } = settingsRef.current
    if (countRef.current + activeCount.current >= MAX_BALLS) return

    activeCount.current += 1
    const geo = geometry(currentRows)
    const xAtLevel = (k, level) => geo.centerX + (k - level / 2) * geo.spacing
    const yAtLevel = (level) => geo.topY + level * geo.rowSpacing
    let k = 0
    const path = [0]
    for (let row = 1; row <= currentRows; row += 1) {
      if (Math.random() < p) k += 1
      path.push(k)
    }

    const ball = d3.select(svgRef.current).select('.ball-layer').append('circle')
      .attr('class', 'ball').attr('r', 3.4)
      .attr('cx', xAtLevel(0, 0)).attr('cy', yAtLevel(0))

    let transition = ball.transition().ease(d3.easeLinear).duration(ROW_DURATION)
      .attr('cx', xAtLevel(path[1], 1)).attr('cy', yAtLevel(1))

    for (let level = 2; level <= currentRows; level += 1) {
      transition = transition.transition().ease(d3.easeLinear).duration(ROW_DURATION)
        .attr('cx', xAtLevel(path[level], level)).attr('cy', yAtLevel(level))
    }

    const finalBin = path[currentRows]
    transition.transition().ease(d3.easeQuadIn).duration(BIN_DROP_DURATION)
      .attr('cy', geo.binAreaTop)
      .on('end', function finishDrop() {
        d3.select(this).remove()
        activeCount.current -= 1
        const nextBins = [...binsRef.current]
        nextBins[finalBin] += 1
        binsRef.current = nextBins
        countRef.current += 1
        setBins(nextBins)
        setCount(countRef.current)
      })
  }, [])

  const startSpawning = useCallback(() => {
    stopSpawning()
    spawnTimer.current = d3.interval(spawnBall, 1000 / settingsRef.current.speed)
  }, [spawnBall, stopSpawning])

  useEffect(() => {
    if (running) startSpawning()
    else stopSpawning()
    return stopSpawning
  }, [running, speed, startSpawning, stopSpawning])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    svg.append('g').attr('class', 'peg-layer')
    svg.append('g').attr('class', 'divider-layer')
    svg.append('line').attr('class', 'baseline')
    svg.append('g').attr('class', 'bin-layer')
    svg.append('path').attr('class', 'curve')
    svg.append('g').attr('class', 'ball-layer')
  }, [])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    const geo = geometry(rows)
    const xAtLevel = (k, level) => geo.centerX + (k - level / 2) * geo.spacing
    const pegs = []
    for (let row = 1; row <= rows; row += 1) {
      const y = geo.topY + (row - 0.5) * geo.rowSpacing
      for (let k = 0; k < row; k += 1) {
        pegs.push({ x: geo.centerX + (k - (row - 1) / 2) * geo.spacing, y, id: `${row}-${k}` })
      }
    }

    svg.select('.peg-layer').selectAll('circle').data(pegs, (d) => d.id).join('circle')
      .attr('class', 'peg').attr('cx', (d) => d.x).attr('cy', (d) => d.y).attr('r', 2.1)

    const dividers = d3.range(0, rows + 2).map((k) => geo.centerX + (k - (rows + 1) / 2) * geo.spacing)
    svg.select('.divider-layer').selectAll('line').data(dividers).join('line')
      .attr('class', 'divider').attr('x1', (d) => d).attr('x2', (d) => d)
      .attr('y1', geo.binAreaTop).attr('y2', geo.binAreaBottom)

    svg.select('.baseline').attr('x1', geo.marginX).attr('x2', W - geo.marginX)
      .attr('y1', geo.binAreaBottom).attr('y2', geo.binAreaBottom)

    const maxCount = Math.max(1, ...bins)
    const useDots = maxCount <= DOT_LIMIT
    const dotStep = geo.binAreaHeight / (DOT_LIMIT + 1)
    const barW = Math.max(2, geo.spacing * 0.7)
    const binGroups = svg.select('.bin-layer').selectAll('g.bin').data(d3.range(rows + 1)).join('g')
      .attr('class', 'bin').attr('transform', (k) => `translate(${xAtLevel(k, rows)},0)`)

    binGroups.each(function drawBin(k) {
      const group = d3.select(this)
      const binCount = bins[k] || 0
      if (useDots) {
        group.selectAll('rect.bin-bar').remove()
        group.selectAll('circle.bin-dot').data(d3.range(binCount)).join('circle')
          .attr('class', 'bin-dot').attr('cx', 0)
          .attr('cy', (i) => geo.binAreaBottom - (i + 0.6) * dotStep)
          .attr('r', Math.min(3.4, geo.spacing * 0.28))
      } else {
        group.selectAll('circle.bin-dot').remove()
        const height = (binCount / maxCount) * geo.binAreaHeight * 0.94
        group.selectAll('rect.bin-bar').data(binCount > 0 ? [binCount] : []).join('rect')
          .attr('class', 'bin-bar').attr('x', -barW / 2).attr('width', barW)
          .attr('y', geo.binAreaBottom - height).attr('height', height)
      }
    })

    if (count === 0) {
      svg.select('.curve').attr('d', null)
    } else {
      const mean = rows * probability
      const std = Math.sqrt(rows * probability * (1 - probability)) || 0.0001
      const scale = useDots ? dotStep : (geo.binAreaHeight * 0.94) / maxCount
      const normalLine = d3.line().x((d) => xAtLevel(d, rows))
        .y((d) => geo.binAreaBottom - count * normalPDF(d, mean, std) * scale)
      svg.select('.curve').attr('d', normalLine(d3.range(0, rows + 0.001, rows / 80)))
    }
  }, [bins, count, probability, rows])

  useEffect(() => reset(), [rows, probability, reset])

  useEffect(() => () => {
    stopSpawning()
    d3.select(svgRef.current).selectAll('*').interrupt()
  }, [stopSpawning])

  const theoreticalMean = rows * probability
  const theoreticalStd = Math.sqrt(rows * probability * (1 - probability))
  const observedMean = count ? bins.reduce((sum, value, k) => sum + k * value, 0) / count : null
  const observedStd = count
    ? Math.sqrt(bins.reduce((sum, value, k) => sum + value * (k - observedMean) ** 2, 0) / count)
    : null

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Galton_board">A Galton board turns a sequence of left-or-right collisions into a visible probability distribution. Each ball follows an unpredictable path, yet the collection of many paths settles into stable bin frequencies. With equal bounce probability those frequencies form a symmetric binomial distribution that approaches a normal curve as the number of rows grows. Biasing the probability shifts and skews the emerging pattern.</DemoIntro>

      <div className="demo-stage">
      <div className="chart-card">
        <svg ref={svgRef} id="board" viewBox="0 0 320 390" preserveAspectRatio="xMidYMid meet" aria-label="Animated Galton board simulation" />
      </div>

      <div className="formula-wrap" aria-label="Normal distribution probability density function">
        <div className="formula">f(x) = <span className="frac"><span className="num">1</span><span className="den">σ√2π</span></span> e<span className="exp">−<span className="frac"><span className="num">(x−μ)²</span><span className="den">2σ²</span></span></span></div>
      </div>

      <div className="readout">
        <div className="cell"><div className="label">Balls dropped</div><div className="value">{count}</div></div>
        <div className="cell"><div className="label">Mean x̄ / μ</div><div className="value">{observedMean === null ? '–' : observedMean.toFixed(2)} <span className="theo">/ {theoreticalMean.toFixed(2)}</span></div></div>
        <div className="cell"><div className="label">Std dev s / σ</div><div className="value">{observedStd === null ? '–' : observedStd.toFixed(2)} <span className="theo">/ {theoreticalStd.toFixed(2)}</span></div></div>
      </div>

      <div className="run-row">
        <button className="btn primary" onClick={() => setRunning((value) => !value)}>{running ? 'Pause' : 'Start'}</button>
        <button className="btn ghost" onClick={reset}>Reset</button>
      </div>
      </div>

      <p className="section-label">Board parameters</p>
      <Control symbol="R" name="Peg rows" value={rows} min="4" max="16" step="1" onChange={(value) => setRows(Number(value))} />
      <Control symbol="p" name="Right-bounce probability" value={probability.toFixed(2)} sliderValue={probability} min="0.1" max="0.9" step="0.05" onChange={(value) => setProbability(Number(value))} />
      <Control symbol="λ" name="Drop speed (balls / sec)" value={speed} min="1" max="40" step="1" onChange={(value) => setSpeed(Number(value))} />

      <ControlGuide items={[
        { name: 'Peg rows', text: 'Adds more binary decisions, increasing the number of bins and making the distribution smoother.' },
        { name: 'Bounce probability', text: 'Moves probability toward the left or right, shifting the mean and introducing skew.' },
        { name: 'Drop speed', text: 'Changes only the animation rate; it does not change the underlying distribution.' },
      ]} />

      <p className="footnote">Changing peg rows or the bounce probability resets the board, since they change the shape of the distribution. Drop speed can be adjusted at any time. With p = 0.5 the result approximates a normal curve centered at R/2; skew p away from 0.5 to shift the mean and watch the curve tilt.</p>
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
