import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const WIDTH = 320
const HEIGHT = 270
const MARGIN = { top: 14, right: 14, bottom: 38, left: 42 }
const DEFAULTS = { auditions: 600, threshold: 120 }

function makePopulation(count) {
  return d3.range(count).map((id) => ({ id, talent: Math.random() * 100, charisma: Math.random() * 100 }))
}

function statistics(points) {
  if (points.length < 2) return { slope: 0, intercept: 0, correlation: 0 }
  const meanX = d3.mean(points, (point) => point.talent)
  const meanY = d3.mean(points, (point) => point.charisma)
  const covariance = d3.sum(points, (point) => (point.talent - meanX) * (point.charisma - meanY))
  const sumXX = d3.sum(points, (point) => (point.talent - meanX) ** 2)
  const sumYY = d3.sum(points, (point) => (point.charisma - meanY) ** 2)
  const slope = sumXX ? covariance / sumXX : 0
  const correlation = sumXX && sumYY ? covariance / Math.sqrt(sumXX * sumYY) : 0
  return { slope, intercept: meanY - slope * meanX, correlation }
}

export default function BerksonsParadox() {
  const svgRef = useRef(null)
  const [auditions, setAuditions] = useState(DEFAULTS.auditions)
  const [threshold, setThreshold] = useState(DEFAULTS.threshold)
  const [mode, setMode] = useState('population')
  const [population, setPopulation] = useState(() => makePopulation(DEFAULTS.auditions))

  useEffect(() => setPopulation(makePopulation(auditions)), [auditions])

  const selected = useMemo(
    () => population.filter((actor) => actor.talent + actor.charisma >= threshold),
    [population, threshold],
  )
  const populationStats = useMemo(() => statistics(population), [population])
  const selectedStats = useMemo(() => statistics(selected), [selected])

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const x = d3.scaleLinear().domain([0, 100]).range([MARGIN.left, WIDTH - MARGIN.right])
    const y = d3.scaleLinear().domain([0, 100]).range([HEIGHT - MARGIN.bottom, MARGIN.top])

    svg.append('defs').append('clipPath').attr('id', 'berkson-clip')
      .append('rect').attr('x', MARGIN.left).attr('y', MARGIN.top)
      .attr('width', WIDTH - MARGIN.left - MARGIN.right).attr('height', HEIGHT - MARGIN.top - MARGIN.bottom)

    const grid = svg.append('g').attr('class', 'simpson-grid')
    grid.selectAll('line.horizontal').data(y.ticks(5)).join('line')
      .attr('x1', MARGIN.left).attr('x2', WIDTH - MARGIN.right).attr('y1', (value) => y(value)).attr('y2', (value) => y(value))
    grid.selectAll('line.vertical').data(x.ticks(5)).join('line')
      .attr('y1', MARGIN.top).attr('y2', HEIGHT - MARGIN.bottom).attr('x1', (value) => x(value)).attr('x2', (value) => x(value))
    svg.append('g').attr('class', 'simpson-axis').attr('transform', `translate(0,${HEIGHT - MARGIN.bottom})`).call(d3.axisBottom(x).ticks(5))
    svg.append('g').attr('class', 'simpson-axis').attr('transform', `translate(${MARGIN.left},0)`).call(d3.axisLeft(y).ticks(5))
    svg.append('text').attr('class', 'axis-label').attr('x', (MARGIN.left + WIDTH - MARGIN.right) / 2).attr('y', HEIGHT - 4).attr('text-anchor', 'middle').text('Acting talent')
    svg.append('text').attr('class', 'axis-label').attr('transform', `translate(10,${(MARGIN.top + HEIGHT - MARGIN.bottom) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('Charisma')

    const plot = svg.append('g').attr('clip-path', 'url(#berkson-clip)')
    plot.selectAll('circle').data(population).join('circle')
      .attr('cx', (actor) => x(actor.talent)).attr('cy', (actor) => y(actor.charisma))
      .attr('r', population.length > 1200 ? 1.25 : population.length > 700 ? 1.55 : 1.9)
      .attr('fill', (actor) => mode === 'population' ? '#14615C' : actor.talent + actor.charisma >= threshold ? '#C6842A' : '#93A29A')
      .attr('opacity', (actor) => mode === 'population' ? 0.48 : actor.talent + actor.charisma >= threshold ? 0.72 : 0.08)

    const lines = mode === 'population'
      ? [{ ...populationStats, kind: 'population', color: '#888' }]
      : [{ ...populationStats, kind: 'population', color: '#888' }, { ...selectedStats, kind: 'selected', color: '#C6842A' }]
    plot.selectAll('line.trend').data(lines).join('line')
      .attr('class', (line) => `trend berkson-trend ${line.kind}`)
      .attr('x1', x(0)).attr('x2', x(100))
      .attr('y1', (line) => y(line.intercept)).attr('y2', (line) => y(line.intercept + line.slope * 100))
      .attr('stroke', (line) => line.color)

    if (mode === 'selected') {
      const x1 = Math.max(0, threshold - 100)
      const x2 = Math.min(100, threshold)
      plot.append('line').attr('class', 'selection-cutoff')
        .attr('x1', x(x1)).attr('y1', y(threshold - x1))
        .attr('x2', x(x2)).attr('y2', y(threshold - x2))
    }
  }, [mode, population, populationStats, selectedStats, threshold])

  function newPopulation() {
    setPopulation(makePopulation(auditions))
    setMode('population')
  }

  const selectionRate = population.length ? selected.length / population.length : 0

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Berkson%27s_paradox">Berkson’s paradox is a form of selection bias caused by conditioning on a common outcome, also called a collider. Acting talent and charisma are generated independently in the full audition pool, so neither trait predicts the other. Casting selects actors whose combined score clears a threshold. Inside that selected group, strength in one trait can compensate for weakness in the other, creating a negative relationship that does not exist in the population.</DemoIntro>

      <div className="demo-stage">
        <div className="chart-card simpson-chart-card">
          <svg ref={svgRef} id="berkson-board" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-label="Scatter plot demonstrating Berkson's paradox through audition selection" />
          <div className="stone-legend">{mode === 'population' ? <><span><i className="legend-dot berkson-population" />All auditions</span><span><i className="legend-line berkson-global" />Population regression</span></> : <><span><i className="legend-dot berkson-selected" />Selected</span><span><i className="legend-dot berkson-rejected" />Rejected</span><span><i className="legend-line berkson-cutoff" />Hiring cutoff</span></>}</div>
        </div>

        <div className="stone-formulas">
          <div><span className="formula-kicker">Independent population</span><span className="stone-formula">X ⫫ Y</span></div>
          <div><span className="formula-kicker">Selection collider</span><span className="stone-formula">S = 1 ⇔ X + Y ≥ T</span></div>
        </div>

        <div className="readout stone-readout">
          <div className="cell"><div className="label">Selected / total</div><div className="value">{selected.length} <span className="theo">/ {population.length}</span></div></div>
          <div className="cell"><div className="label">Population r / m</div><div className="value">{populationStats.correlation.toFixed(2)} <span className="theo">/ {populationStats.slope.toFixed(2)}</span></div></div>
          <div className="cell"><div className="label">Selected r / m</div><div className="value negative">{selectedStats.correlation.toFixed(2)} <span className="theo">/ {selectedStats.slope.toFixed(2)}</span></div></div>
        </div>

        <div className="run-row">
          <button className="btn primary" onClick={() => setMode('selected')} disabled={mode === 'selected'}>{mode === 'selected' ? 'Selection applied' : 'Apply selection'}</button>
          <button className="btn ghost" onClick={newPopulation}>New audition pool</button>
        </div>
        <p className={`paradox-status ${mode === 'selected' && selectedStats.correlation < 0 ? 'active' : ''}`}>{mode === 'population' ? 'The traits are sampled independently; the small observed correlation is finite-sample noise.' : `Conditioning on selection reveals the collider: ${(selectionRate * 100).toFixed(1)}% survive and their observed correlation is ${selectedStats.correlation.toFixed(2)}.`}</p>
      </div>

      <p className="section-label">Selection parameters</p>
      <Control symbol="N" name="Total auditions" value={auditions.toLocaleString()} sliderValue={auditions} min="100" max="2000" step="50" onChange={(value) => setAuditions(Number(value))} />
      <Control symbol="T" name="Hiring threshold (talent + charisma)" value={threshold} sliderValue={threshold} min="40" max="180" step="1" onChange={(value) => setThreshold(Number(value))} />

      <ControlGuide items={[
        { name: 'Total auditions', text: 'Changes the number of independent talent–charisma pairs in the population.' },
        { name: 'Hiring threshold', text: 'Raises or lowers the diagonal collider; stricter selection strengthens the trade-off among survivors.' },
        { name: 'Apply selection', text: 'Keeps the same population, fades rejected actors, and fits a new regression only to survivors.' },
        { name: 'New audition pool', text: 'Draws a fresh independent population and returns to the unfiltered global view.' },
      ]} />

      <p className="footnote">Talent and charisma are drawn from independent uniform distributions. Selection does not change those original variables; it changes which observations enter the analysis. The orange regression and Pearson correlation are recalculated only from actors satisfying X + Y ≥ T.</p>
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
