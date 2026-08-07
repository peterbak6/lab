import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const WIDTH = 320
const HEIGHT = 270
const MARGIN = { top: 14, right: 14, bottom: 38, left: 42 }
const EASY_COLOR = '#14615C'
const HARD_COLOR = '#C6842A'
const DEFAULTS = { easyN: 90, easyP: 0.9, hardN: 10, hardP: 0.2, difficultyRatio: 0.9 }

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

function regression(points) {
  if (points.length < 2) return { slope: 0, intercept: 0 }
  const meanX = d3.mean(points, (point) => point.x)
  const meanY = d3.mean(points, (point) => point.y)
  const numerator = d3.sum(points, (point) => (point.x - meanX) * (point.y - meanY))
  const denominator = d3.sum(points, (point) => (point.x - meanX) ** 2)
  const slope = denominator ? numerator / denominator : 0
  return { slope, intercept: meanY - slope * meanX }
}

function makeGroup(count, probability, group, difficulty) {
  return d3.range(count).map((index) => {
    const passed = Math.random() <= probability
    const studyOffset = difficulty * 10
    const x = passed
      ? randomBetween(studyOffset + 2, Math.min(20, studyOffset + 10))
      : randomBetween(studyOffset, Math.min(20, studyOffset + 6))
    const baseline = 82 - 64 * difficulty
    const y = Math.max(0, Math.min(100, baseline + 2.5 * x + randomBetween(-5, 5)))
    return { id: `${group}-${index}`, x, y, group, passed }
  })
}

function generateParadox(settings) {
  let candidate
  const firstDifficulty = 1 - settings.difficultyRatio
  const secondDifficulty = settings.difficultyRatio
  const reversalExpected = Math.abs(settings.difficultyRatio - 0.5) >= 0.15
  for (let attempt = 0; attempt < 240; attempt += 1) {
    const easy = makeGroup(settings.easyN, settings.easyP, 'easy', firstDifficulty)
    const hard = makeGroup(settings.hardN, settings.hardP, 'hard', secondDifficulty)
    const easyLine = regression(easy)
    const hardLine = regression(hard)
    const combinedLine = regression([...easy, ...hard])
    candidate = { easy, hard, easyLine, hardLine, combinedLine }
    if (easyLine.slope > 0 && hardLine.slope > 0 && (!reversalExpected || combinedLine.slope < 0)) break
  }
  return candidate
}

export default function SimpsonsParadox() {
  const svgRef = useRef(null)
  const [easyN, setEasyN] = useState(DEFAULTS.easyN)
  const [easyP, setEasyP] = useState(DEFAULTS.easyP)
  const [hardN, setHardN] = useState(DEFAULTS.hardN)
  const [hardP, setHardP] = useState(DEFAULTS.hardP)
  const [difficultyRatio, setDifficultyRatio] = useState(DEFAULTS.difficultyRatio)
  const [mode, setMode] = useState('separate')
  const [dataset, setDataset] = useState(() => generateParadox(DEFAULTS))

  const settings = useMemo(() => ({ easyN, easyP, hardN, hardP, difficultyRatio }), [difficultyRatio, easyN, easyP, hardN, hardP])
  const regenerate = useCallback(() => setDataset(generateParadox(settings)), [settings])

  useEffect(() => regenerate(), [regenerate])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const xScale = d3.scaleLinear().domain([0, 20]).range([MARGIN.left, WIDTH - MARGIN.right])
    const yScale = d3.scaleLinear().domain([0, 100]).range([HEIGHT - MARGIN.bottom, MARGIN.top])

    svg.append('defs').append('clipPath').attr('id', 'simpson-clip')
      .append('rect').attr('x', MARGIN.left).attr('y', MARGIN.top)
      .attr('width', WIDTH - MARGIN.left - MARGIN.right).attr('height', HEIGHT - MARGIN.top - MARGIN.bottom)

    const grid = svg.append('g').attr('class', 'simpson-grid')
    grid.selectAll('line.horizontal').data(yScale.ticks(5)).join('line')
      .attr('x1', MARGIN.left).attr('x2', WIDTH - MARGIN.right).attr('y1', (value) => yScale(value)).attr('y2', (value) => yScale(value))
    grid.selectAll('line.vertical').data(xScale.ticks(5)).join('line')
      .attr('y1', MARGIN.top).attr('y2', HEIGHT - MARGIN.bottom).attr('x1', (value) => xScale(value)).attr('x2', (value) => xScale(value))

    svg.append('g').attr('class', 'simpson-axis').attr('transform', `translate(0,${HEIGHT - MARGIN.bottom})`).call(d3.axisBottom(xScale).ticks(5))
    svg.append('g').attr('class', 'simpson-axis').attr('transform', `translate(${MARGIN.left},0)`).call(d3.axisLeft(yScale).ticks(5))
    svg.append('text').attr('class', 'axis-label').attr('x', (MARGIN.left + WIDTH - MARGIN.right) / 2).attr('y', HEIGHT - 4).attr('text-anchor', 'middle').text('Study hours')
    svg.append('text').attr('class', 'axis-label').attr('transform', `translate(10,${(MARGIN.top + HEIGHT - MARGIN.bottom) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Exam score')

    const plot = svg.append('g').attr('clip-path', 'url(#simpson-clip)')
    const points = [...dataset.easy, ...dataset.hard]
    plot.selectAll('circle').data(points).join('circle')
      .attr('cx', (point) => xScale(point.x)).attr('cy', (point) => yScale(point.y))
      .attr('r', points.length > 250 ? 1.7 : 2.25)
      .attr('fill', (point) => mode === 'separate' ? (point.group === 'easy' ? EASY_COLOR : HARD_COLOR) : '#7C8982')
      .attr('opacity', mode === 'separate' ? 0.72 : 0.5)
      .attr('stroke', (point) => point.passed ? 'none' : '#fff').attr('stroke-width', 0.7)

    const combinedTrend = { ...dataset.combinedLine, color: '#888', combined: true }
    const lines = mode === 'separate'
      ? [combinedTrend, { ...dataset.easyLine, color: EASY_COLOR }, { ...dataset.hardLine, color: HARD_COLOR }]
      : [combinedTrend]
    plot.selectAll('line.trend').data(lines).join('line')
      .attr('class', (line) => `trend${line.combined ? ' combined-trend' : ''}`).attr('x1', xScale(0)).attr('x2', xScale(20))
      .attr('y1', (line) => yScale(line.intercept)).attr('y2', (line) => yScale(line.intercept + line.slope * 20))
      .attr('stroke', (line) => line.color)
  }, [dataset, mode])

  const paradoxActive = dataset.easyLine.slope > 0 && dataset.hardLine.slope > 0 && dataset.combinedLine.slope < 0

  function restoreDefaults() {
    const alreadyDefault = easyN === DEFAULTS.easyN && easyP === DEFAULTS.easyP && hardN === DEFAULTS.hardN && hardP === DEFAULTS.hardP && difficultyRatio === DEFAULTS.difficultyRatio
    setEasyN(DEFAULTS.easyN); setEasyP(DEFAULTS.easyP); setHardN(DEFAULTS.hardN); setHardP(DEFAULTS.hardP)
    setDifficultyRatio(DEFAULTS.difficultyRatio)
    setMode('separate')
    if (alreadyDefault) setDataset(generateParadox(DEFAULTS))
  }

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Simpson%27s_paradox">Simpson’s paradox occurs when a trend visible inside several groups disappears or reverses after those groups are combined. In this simulation, study time raises scores within both easy and hard exams. Exam difficulty is the hidden confounder: students taking the harder exam study more but still tend to score lower. Hiding that variable creates a misleading downward global correlation even though both conditional relationships point upward.</DemoIntro>

      <div className="demo-stage">
        <div className="automaton-tabs simpson-tabs" role="group" aria-label="Correlation view">
          <button className={mode === 'separate' ? 'active' : ''} onClick={() => setMode('separate')}>View separately</button>
          <button className={mode === 'combined' ? 'active' : ''} onClick={() => setMode('combined')}>Combine groups</button>
        </div>
        <div className="chart-card simpson-chart-card">
          <svg ref={svgRef} id="simpson-board" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-label="Scatter plot showing Simpson's paradox in easy and hard exam groups" />
          <div className="stone-legend">{mode === 'separate' ? <><span><i className="legend-dot simpson-easy" />Exam 1</span><span><i className="legend-dot simpson-hard" />Exam 2</span><span><i className="legend-line simpson-combined" />All students</span></> : <span><i className="legend-line simpson-combined" />All students · difficulty hidden</span>}</div>
        </div>

        <div className="stone-formulas">
          <div><span className="formula-kicker">Regression</span><span className="stone-formula">ŷ = mx + b</span></div>
          <div><span className="formula-kicker">Slope</span><span className="stone-formula">m = <span className="frac"><span className="num">Σ(x−x̄)(y−ȳ)</span><span className="den">Σ(x−x̄)²</span></span></span></div>
        </div>

        <div className="readout stone-readout">
          <div className="cell"><div className="label">Exam 1 slope</div><div className="value positive">↗ {dataset.easyLine.slope.toFixed(2)}</div></div>
          <div className="cell"><div className="label">Exam 2 slope</div><div className="value positive">↗ {dataset.hardLine.slope.toFixed(2)}</div></div>
          <div className="cell"><div className="label">Combined slope</div><div className={`value ${dataset.combinedLine.slope < 0 ? 'negative' : 'positive'}`}>{dataset.combinedLine.slope < 0 ? '↘' : '↗'} {dataset.combinedLine.slope.toFixed(2)}</div></div>
        </div>

        <div className="run-row">
          <button className="btn primary" onClick={regenerate}>Run new sample</button>
          <button className="btn ghost" onClick={restoreDefaults}>Reset defaults</button>
        </div>
        <p className={`paradox-status ${paradoxActive ? 'active' : ''}`}>{paradoxActive ? 'Paradox active: both group trends rise while the combined trend falls.' : 'These settings did not produce a reversal in this sample—adjust the group balance or reset the defaults.'}</p>
      </div>

      <p className="section-label">Difficulty relationship</p>
      <Control symbol="D₂" name="Exam difficulty ratio" value={difficultyRatio.toFixed(2)} sliderValue={difficultyRatio} min="0" max="1" step="0.01" onChange={(value) => setDifficultyRatio(Number(value))} />

      <p className="section-label group-label easy">Exam 1 group</p>
      <Control symbol="N₁" name="Students" value={easyN} min="10" max="200" step="1" onChange={(value) => setEasyN(Number(value))} />
      <Control symbol="P₁" name="Pass probability" value={`${(easyP * 100).toFixed(0)}%`} sliderValue={easyP} min="0.05" max="1" step="0.01" onChange={(value) => setEasyP(Number(value))} />

      <p className="section-label group-label hard">Exam 2 group</p>
      <Control symbol="N₂" name="Students" value={hardN} min="10" max="200" step="1" onChange={(value) => setHardN(Number(value))} />
      <Control symbol="P₂" name="Pass probability" value={`${(hardP * 100).toFixed(0)}%`} sliderValue={hardP} min="0.05" max="1" step="0.01" onChange={(value) => setHardP(Number(value))} />

      <ControlGuide items={[
        { name: 'Difficulty ratio', text: 'At 0.50 both exams are equal. Moving toward 1 makes Exam 2 harder; moving toward 0 makes Exam 1 harder.' },
        { name: 'Population sizes', text: 'Change how strongly each difficulty group influences the combined regression.' },
        { name: 'Pass probabilities', text: 'Shift students between the lower and higher study-hour bands inside each exam.' },
        { name: 'View separately', text: 'Preserves the confounder and fits one positive trendline within each difficulty level.' },
        { name: 'Combine groups', text: 'Hides exam difficulty and fits one global line, exposing the possible sign reversal.' },
      ]} />

      <p className="footnote">The corrected generator deliberately associates easier exams with fewer study hours and higher score baselines, while harder exams require more study but retain lower baselines. This negative between-group relationship can dominate the positive within-group relationships when difficulty is omitted.</p>
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
