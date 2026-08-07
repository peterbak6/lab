import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const WIDTH = 320
const HEIGHT = 270
const MARGIN = { top: 14, right: 14, bottom: 38, left: 42 }
const HOUSE_COUNT = 500
const DEFAULTS = { goodRate: 0.15, goodDays: 7, badDays: 23, windowDays: 90 }

function exponential(mean) {
  return -mean * Math.log(1 - Math.random())
}

function makeMarket({ goodRate, goodDays, badDays, windowDays }) {
  return d3.range(HOUSE_COUNT).map((id) => {
    const good = Math.random() < goodRate
    const listingDay = Math.random() * windowDays
    const age = windowDays - listingDay
    const duration = exponential(good ? goodDays : badDays)
    return {
      id,
      good,
      quality: good ? 75 + Math.random() * 25 : 10 + Math.random() * 55,
      listingDay,
      age,
      duration,
      active: duration >= age,
    }
  })
}

function regression(houses) {
  if (houses.length < 2) return { slope: 0, intercept: 50 }
  const meanX = d3.mean(houses, (house) => house.age)
  const meanY = d3.mean(houses, (house) => house.quality)
  const numerator = d3.sum(houses, (house) => (house.age - meanX) * (house.quality - meanY))
  const denominator = d3.sum(houses, (house) => (house.age - meanX) ** 2)
  const slope = denominator ? numerator / denominator : 0
  return { slope, intercept: meanY - slope * meanX }
}

export default function SurvivorshipBias() {
  const svgRef = useRef(null)
  const [goodRate, setGoodRate] = useState(DEFAULTS.goodRate)
  const [goodDays, setGoodDays] = useState(DEFAULTS.goodDays)
  const [badDays, setBadDays] = useState(DEFAULTS.badDays)
  const [windowDays, setWindowDays] = useState(DEFAULTS.windowDays)
  const [view, setView] = useState('active')
  const settings = useMemo(() => ({ goodRate, goodDays, badDays, windowDays }), [badDays, goodDays, goodRate, windowDays])
  const [market, setMarket] = useState(() => makeMarket(DEFAULTS))

  useEffect(() => {
    setMarket(makeMarket(settings))
    setView('active')
  }, [settings])

  const active = useMemo(() => market.filter((house) => house.active), [market])
  const sold = useMemo(() => market.filter((house) => !house.active), [market])
  const activeLine = useMemo(() => regression(active), [active])
  const flowLine = useMemo(() => regression(market), [market])
  const visible = view === 'active' ? active : market
  const activeGood = active.filter((house) => house.good).length
  const totalGood = market.filter((house) => house.good).length
  const activeGoodRate = active.length ? activeGood / active.length : 0
  const observedFlowRate = market.length ? totalGood / market.length : 0

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const x = d3.scaleLinear().domain([0, windowDays]).range([MARGIN.left, WIDTH - MARGIN.right])
    const y = d3.scaleLinear().domain([0, 100]).range([HEIGHT - MARGIN.bottom, MARGIN.top])

    svg.append('defs').append('clipPath').attr('id', 'housing-clip')
      .append('rect').attr('x', MARGIN.left).attr('y', MARGIN.top)
      .attr('width', WIDTH - MARGIN.left - MARGIN.right).attr('height', HEIGHT - MARGIN.top - MARGIN.bottom)
    const grid = svg.append('g').attr('class', 'simpson-grid')
    grid.selectAll('line.horizontal').data(y.ticks(5)).join('line')
      .attr('x1', MARGIN.left).attr('x2', WIDTH - MARGIN.right).attr('y1', (value) => y(value)).attr('y2', (value) => y(value))
    grid.selectAll('line.vertical').data(x.ticks(5)).join('line')
      .attr('y1', MARGIN.top).attr('y2', HEIGHT - MARGIN.bottom).attr('x1', (value) => x(value)).attr('x2', (value) => x(value))
    svg.append('g').attr('class', 'simpson-axis').attr('transform', `translate(0,${HEIGHT - MARGIN.bottom})`).call(d3.axisBottom(x).ticks(5))
    svg.append('g').attr('class', 'simpson-axis').attr('transform', `translate(${MARGIN.left},0)`).call(d3.axisLeft(y).ticks(5))
    svg.append('text').attr('class', 'axis-label').attr('x', (MARGIN.left + WIDTH - MARGIN.right) / 2).attr('y', HEIGHT - 4).attr('text-anchor', 'middle').text('Days since listing')
    svg.append('text').attr('class', 'axis-label').attr('transform', `translate(10,${(MARGIN.top + HEIGHT - MARGIN.bottom) / 2}) rotate(-90)`).attr('text-anchor', 'middle').text('House quality')

    const plot = svg.append('g').attr('clip-path', 'url(#housing-clip)')
    plot.selectAll('path.house-point').data(visible).join('path')
      .attr('class', (house) => `house-point ${house.active ? 'active' : 'sold'} ${house.good ? 'good' : 'bad'}`)
      .attr('d', (house) => d3.symbol().type(house.good ? d3.symbolSquare : d3.symbolTriangle).size(market.length > 700 ? 10 : 15)())
      .attr('transform', (house) => `translate(${x(house.age)},${y(house.quality)})`)

    const line = view === 'active' ? activeLine : flowLine
    plot.append('line').attr('class', `housing-trend ${view}`)
      .attr('x1', x(0)).attr('x2', x(windowDays))
      .attr('y1', y(line.intercept)).attr('y2', y(line.intercept + line.slope * windowDays))
  }, [activeLine, flowLine, market.length, view, visible, windowDays])

  function rerun() {
    setMarket(makeMarket(settings))
    setView('active')
  }

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Survivorship_bias">Survivorship bias appears when the cases still visible after a filtering process are mistaken for the complete population. In a fast housing market, desirable homes leave the active listings quickly while less desirable homes accumulate. A buyer browsing today therefore sees the market’s leftovers rather than its true flow. Restoring sold listings reveals that good homes were not absent—they were disappearing faster.</DemoIntro>

      <div className="demo-stage">
        <div className="automaton-tabs survivor-tabs" role="group" aria-label="Housing market evidence view">
          <button className={view === 'active' ? 'active' : ''} onClick={() => setView('active')}>Active listings</button>
          <button className={view === 'flow' ? 'active' : ''} onClick={() => setView('flow')}>Market flow</button>
        </div>
        <div className="chart-card housing-chart-card">
          <svg ref={svgRef} id="housing-board" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-label="Housing listings scatter plot showing active listings or the full market flow" />
          <div className="stone-legend">{view === 'active' ? <><span><i className="legend-house active-good" />Active good</span><span><i className="legend-house active-bad" />Active lower-quality</span></> : <><span><i className="legend-house active-good" />Still active</span><span><i className="legend-house sold-good" />Sold ghost data</span></>}</div>
        </div>

        <div className="stone-formulas">
          <div><span className="formula-kicker">Time on market</span><span className="stone-formula">T ∼ Exp(λ), λ = 1 / μ</span></div>
          <div><span className="formula-kicker">Still active at age a</span><span className="stone-formula">P(T ≥ a) = e<span className="exp">−a/μ</span></span></div>
        </div>

        <div className="readout stone-readout">
          <div className="cell"><div className="label">Active / sold</div><div className="value">{active.length} <span className="theo">/ {sold.length}</span></div></div>
          <div className="cell"><div className="label">Good: active / flow</div><div className="value">{(activeGoodRate * 100).toFixed(1)}% <span className="theo">/ {(observedFlowRate * 100).toFixed(1)}%</span></div></div>
          <div className="cell"><div className="label">Trend slope</div><div className={`value ${((view === 'active' ? activeLine : flowLine).slope < 0) ? 'negative' : 'positive'}`}>{(view === 'active' ? activeLine : flowLine).slope.toFixed(2)}</div></div>
        </div>

        <div className="run-row">
          <button className="btn primary" onClick={rerun}>Simulate market</button>
        </div>
        <p className={`paradox-status ${view === 'flow' ? 'active' : ''}`}>{view === 'active' ? `The buyer sees only ${active.length} leftovers; good homes make up ${displayPercent(activeGoodRate)} of them.` : `Ghost listings restored: ${totalGood} good homes entered this market, producing an observed flow rate of ${displayPercent(observedFlowRate)}.`}</p>
      </div>

      <p className="section-label">Market parameters</p>
      <Control symbol="θ" name="True share of good houses listed" value={`${Math.round(goodRate * 100)}%`} sliderValue={goodRate} min="0.01" max="0.5" step="0.01" onChange={(value) => setGoodRate(Number(value))} />
      <Control symbol="μg" name="Average days a good house stays" value={`${goodDays} days`} sliderValue={goodDays} min="1" max="15" step="1" onChange={(value) => setGoodDays(Number(value))} />
      <Control symbol="μb" name="Average days a lower-quality house stays" value={`${badDays} days`} sliderValue={badDays} min="10" max="60" step="1" onChange={(value) => setBadDays(Number(value))} />
      <Control symbol="N" name="Market history window" value={`${windowDays} days`} sliderValue={windowDays} min="30" max="180" step="10" onChange={(value) => setWindowDays(Number(value))} />

      <ControlGuide items={[
        { name: 'Good-house share', text: 'Sets the Bernoulli probability that each of the 500 incoming listings is high quality.' },
        { name: 'Average market times', text: 'Set the means of the two exponential sale-time distributions; smaller means remove homes faster.' },
        { name: 'History window', text: 'Changes the period over which listing arrivals are sampled uniformly.' },
        { name: 'Evidence view', text: 'Active Listings conditions on survival until today; Market Flow restores every sold observation.' },
      ]} />

      <p className="footnote">Every listing receives an independent arrival time, type, quality, and exponentially distributed market duration. A home is active exactly when its sampled duration is at least its current age. Sold homes are plotted at their original age within the history window, allowing the Flow view to show what entered the market rather than only what remained.</p>
    </section>
  )
}

function displayPercent(value) {
  return `${(value * 100).toFixed(1)}%`
}

function Control({ symbol, name, value, sliderValue = value, min, max, step, onChange }) {
  return (
    <label className="control">
      <span className="control-head"><span className="name"><span className="sym">{symbol}</span>{name}</span><span className="val">{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={sliderValue} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}
