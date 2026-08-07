import { useEffect, useMemo, useRef, useState } from 'react'
import * as d3 from 'd3'
import { ControlGuide, DemoIntro } from './DemoText.jsx'

const WIDTH = 320
const HEIGHT = 300
const FLEET_SIZE = 120
const DEFAULTS = { holes: 1800, engineFragility: 0.95, bodyFragility: 0.05 }
const OUTLINE = [[47, 5], [53, 5], [57, 34], [91, 47], [91, 56], [58, 55], [57, 76], [70, 85], [70, 92], [54, 88], [50, 98], [46, 88], [30, 92], [30, 85], [43, 76], [42, 55], [9, 56], [9, 47], [43, 34]]

function inEllipse(x, y, cx, cy, rx, ry) {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1
}

function zoneAt(x, y) {
  const cockpit = inEllipse(x, y, 50, 20, 5.5, 10)
  const leftEngine = inEllipse(x, y, 34, 51, 6.5, 10)
  const rightEngine = inEllipse(x, y, 66, 51, 6.5, 10)
  return cockpit || leftEngine || rightEngine ? 'critical' : 'body'
}

function randomPlanePoint() {
  let point
  do point = [9 + Math.random() * 82, 5 + Math.random() * 93]
  while (!d3.polygonContains(OUTLINE, point))
  return point
}

function simulateMission(holes, engineFragility, bodyFragility) {
  const planes = d3.range(FLEET_SIZE).map((id) => ({ id, crashed: false }))
  const hits = d3.range(holes).map((id) => {
    const [x, y] = randomPlanePoint()
    const zone = zoneAt(x, y)
    const plane = Math.floor(Math.random() * FLEET_SIZE)
    const fatal = Math.random() < (zone === 'critical' ? engineFragility : bodyFragility)
    if (fatal) planes[plane].crashed = true
    return { id, x, y, zone, plane, fatal }
  })
  return { planes, hits, settings: { holes, engineFragility, bodyFragility } }
}

export default function SurvivorshipBias() {
  const svgRef = useRef(null)
  const [holes, setHoles] = useState(DEFAULTS.holes)
  const [engineFragility, setEngineFragility] = useState(DEFAULTS.engineFragility)
  const [bodyFragility, setBodyFragility] = useState(DEFAULTS.bodyFragility)
  const [view, setView] = useState('survivors')
  const [mission, setMission] = useState(() => simulateMission(DEFAULTS.holes, DEFAULTS.engineFragility, DEFAULTS.bodyFragility))

  const crashedIds = useMemo(() => new Set(mission.planes.filter((plane) => plane.crashed).map((plane) => plane.id)), [mission])
  const visibleHits = useMemo(
    () => view === 'all' ? mission.hits : mission.hits.filter((hit) => !crashedIds.has(hit.plane)),
    [crashedIds, mission, view],
  )
  const survivors = mission.planes.length - crashedIds.size
  const survivorCriticalHits = mission.hits.filter((hit) => !crashedIds.has(hit.plane) && hit.zone === 'critical').length
  const survivorBodyHits = mission.hits.filter((hit) => !crashedIds.has(hit.plane) && hit.zone === 'body').length

  useEffect(() => {
    const svg = d3.select(svgRef.current)
    svg.selectAll('*').remove()
    const x = d3.scaleLinear().domain([0, 100]).range([18, WIDTH - 18])
    const y = d3.scaleLinear().domain([0, 100]).range([12, HEIGHT - 24])
    const line = d3.line().x((point) => x(point[0])).y((point) => y(point[1])).curve(d3.curveLinearClosed)

    svg.append('path').attr('class', 'aircraft-outline').attr('d', line(OUTLINE))
    const zones = svg.append('g').attr('class', 'aircraft-zones')
    zones.append('ellipse').attr('class', 'critical-zone cockpit').attr('cx', x(50)).attr('cy', y(20)).attr('rx', x(55.5) - x(50)).attr('ry', y(30) - y(20))
    ;[[34, 51], [66, 51]].forEach(([cx, cy]) => zones.append('ellipse').attr('class', 'critical-zone engine').attr('cx', x(cx)).attr('cy', y(cy)).attr('rx', x(cx + 6.5) - x(cx)).attr('ry', y(cy + 10) - y(cy)))

    svg.append('text').attr('class', 'aircraft-label').attr('x', x(50)).attr('y', y(20)).text('cockpit')
    svg.append('text').attr('class', 'aircraft-label').attr('x', x(34)).attr('y', y(51)).text('engine')
    svg.append('text').attr('class', 'aircraft-label').attr('x', x(66)).attr('y', y(51)).text('engine')

    svg.append('g').attr('class', 'aircraft-hit-layer').selectAll('circle').data(visibleHits).join('circle')
      .attr('class', (hit) => view === 'all' && crashedIds.has(hit.plane) ? `ghost-hit${hit.fatal ? ' fatal' : ''}` : 'survivor-hit')
      .attr('cx', (hit) => x(hit.x)).attr('cy', (hit) => y(hit.y))
      .attr('r', mission.hits.length > 3500 ? 1.15 : mission.hits.length > 1800 ? 1.35 : 1.65)
  }, [crashedIds, mission, view, visibleHits])

  function runMission() {
    setMission(simulateMission(holes, engineFragility, bodyFragility))
    setView('survivors')
  }

  return (
    <section className="demo-page">
      <DemoIntro wiki="https://en.wikipedia.org/wiki/Survivorship_bias">Survivorship bias occurs when analysis includes successful cases but omits failures that are no longer observable. During World War II, damage on returning aircraft seemed to show that wings and tails needed more armor. Abraham Wald recognized that these planes returned precisely because those areas could tolerate damage. The missing aircraft implied that apparently untouched engines and cockpits were the places where armor mattered most.</DemoIntro>

      <div className="demo-stage">
        <div className="automaton-tabs survivor-tabs" role="group" aria-label="Aircraft evidence view">
          <button className={view === 'survivors' ? 'active' : ''} onClick={() => setView('survivors')}>Survivors</button>
          <button className={view === 'all' ? 'active' : ''} onClick={() => setView('all')}>All planes</button>
        </div>
        <div className="chart-card aircraft-chart-card">
          <svg ref={svgRef} id="aircraft-board" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="xMidYMid meet" aria-label="Top-down aircraft showing bullet damage on surviving or all simulated planes" />
          <div className="stone-legend">{view === 'survivors' ? <span><i className="legend-dot aircraft-survivor" />Holes on returning planes</span> : <><span><i className="legend-dot aircraft-survivor" />Returning-plane holes</span><span><i className="legend-dot aircraft-ghost" />Lost-plane ghost data</span></>}</div>
        </div>

        <div className="stone-formulas">
          <div><span className="formula-kicker">Plane survival</span><span className="stone-formula">P(S | n<span className="exp">A</span>, n<span className="exp">B</span>) = (1−f<span className="exp">A</span>)<span className="exp">nA</span>(1−f<span className="exp">B</span>)<span className="exp">nB</span></span></div>
          <div><span className="formula-kicker">Observed evidence</span><span className="stone-formula">P(hit zone | S)</span></div>
        </div>

        <div className="readout stone-readout">
          <div className="cell"><div className="label">Returned / fleet</div><div className="value">{survivors} <span className="theo">/ {FLEET_SIZE}</span></div></div>
          <div className="cell"><div className="label">Visible holes</div><div className="value">{visibleHits.length.toLocaleString()}</div></div>
          <div className="cell"><div className="label">Body / critical</div><div className="value">{survivorBodyHits} <span className="theo">/ {survivorCriticalHits}</span></div></div>
        </div>

        <div className="run-row">
          <button className="btn primary" onClick={runMission}>Simulate mission</button>
        </div>
        <p className={`paradox-status ${view === 'all' ? 'active' : ''}`}>{view === 'survivors' ? 'Returning aircraft suggest armoring the visibly damaged wings and tail.' : 'Ghost data revealed: the clean-looking critical zones were removing aircraft from the observed sample.'}</p>
      </div>

      <p className="section-label">Mission parameters</p>
      <Control symbol="N" name="Flak / enemy-fire intensity" value={`${holes.toLocaleString()} holes`} sliderValue={holes} min="100" max="5000" step="100" onChange={(value) => setHoles(Number(value))} />
      <Control symbol="fₐ" name="Engine and cockpit fragility" value={`${Math.round(engineFragility * 100)}%`} sliderValue={engineFragility} min="0.5" max="1" step="0.01" onChange={(value) => setEngineFragility(Number(value))} />
      <Control symbol="fᵦ" name="Wing, tail, and fuselage fragility" value={`${Math.round(bodyFragility * 100)}%`} sliderValue={bodyFragility} min="0.01" max="0.2" step="0.01" onChange={(value) => setBodyFragility(Number(value))} />

      <ControlGuide items={[
        { name: 'Fire intensity', text: 'Sets the exact number of randomly positioned hits distributed across a 120-plane mission.' },
        { name: 'Critical fragility', text: 'Sets the independent fatality probability for every cockpit or engine hit.' },
        { name: 'Body fragility', text: 'Sets the independent fatality probability for every wing, tail, or fuselage hit.' },
        { name: 'Evidence view', text: 'Survivors hides every hit from crashed planes; All planes restores those missing observations in red.' },
      ]} />

      <p className="footnote">Each hole is assigned to one aircraft and sampled uniformly from the blueprint silhouette. A plane is lost if any of its hits produces a fatal outcome under that zone’s fragility. The survivor view therefore conditions the observed damage pattern on S = 1—the exact filtering mechanism that creates the bias.</p>
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
