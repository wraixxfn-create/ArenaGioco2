import { useEffect, useReducer, useRef, useState } from 'react'
import {
  CREW,
  FACTIONS,
  NODES,
  RESOURCES,
  ROUTES,
  TAB_META,
  UPGRADES,
} from './game/content'
import {
  cargoCount,
  getCargoCapacity,
  getMarketPrice,
  getMaxHull,
  getTravelFuelCost,
  getWeather,
  isRouteBetween,
  loadState,
  reducer,
} from './game/logic'
import './styles.css'

const nf = new Intl.NumberFormat('en-US')
const formatCredits = (value) => `${nf.format(Math.round(value))} cr`
const pad = (value) => String(value).padStart(2, '0')

const ICON_PATHS = {
  map: 'M3 5.8 8.4 3l7.2 3 6.4-3v15.2l-6.4 3-7.2-3-5.4 3V5.8Z M8.4 3v15.2 M15.6 6v15.2',
  trend: 'M3 17.5 8.1 12l3.4 3.5L20.5 6.5 M16 6.5h4.5V11',
  contract: 'M6 3.5h9.5L19 7v13.5H6z M15.5 3.5V7H19 M9 11h7 M9 15h5',
  ship: 'M3 16.5c3.8 0 4.5 3 9 3s5.2-3 9-3 M5 14V8.7L12 5l7 3.7V14 M8 11h8 M10 19.5l-1.4 2 M14 19.5l1.4 2',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z M4 5.5v16 M8.5 7h7 M8.5 11h7',
  compass: 'M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Zm3.2 5.6-2.2 4.2-4.2 2.2 2.2-4.2 4.2-2.2Z',
  route: 'M5 18.5c0-6 3.5-6.8 7-6.8s7-.8 7-6.2 M5 18.5h4 M5 18.5l2.8-2.8 M19 5.5h-4 M19 5.5l-2.8 2.8',
  signal: 'M4 9.3a11.2 11.2 0 0 1 16 0 M7.2 12.5a6.8 6.8 0 0 1 9.6 0 M10.4 15.7a2.4 2.4 0 0 1 3.2 0 M12 19.5h.01',
  shield: 'M12 3 20 6v5.8c0 4.8-3.3 7.9-8 9.2-4.7-1.3-8-4.4-8-9.2V6l8-3Z M8.5 12l2.2 2.2 4.8-5',
  box: 'M4 7.2 12 3l8 4.2v9.6L12 21l-8-4.2z M4 7.2l8 4.3 8-4.3 M12 11.5V21',
  grain: 'M7.5 20c4.8-1.8 7.7-6 6.4-12.3C10.2 8.4 7 12.2 7.5 20Zm0 0c-.9-2.2-2.6-3.8-4.7-4.8 M12.5 10c2.4-2.5 5.4-3.4 8.5-3.1-1 4.5-3.5 7.7-8.2 8.8',
  alloy: 'M5 5h14v14H5z M8 8h8v8H8z M5 12h14 M12 5v14',
  relic: 'M8 4h8l2 4-6 12L6 8z M6 8h12 M12 4v4',
  lumen: 'M12 3.5a5.3 5.3 0 0 0-3.1 9.6c.7.5 1.1 1.3 1.1 2.2h4c0-.9.4-1.7 1.1-2.2A5.3 5.3 0 0 0 12 3.5ZM9.8 18h4.4M10.3 21h3.4',
  plus: 'M12 5v14M5 12h14',
  arrow: 'M4 12h15 M14 6l6 6-6 6',
  chevron: 'm9 5 7 7-7 7',
  pin: 'M12 21s6-5.3 6-11a6 6 0 1 0-12 0c0 5.7 6 11 6 11Z M12 12.5a2.2 2.2 0 1 0 0-.01',
  lock: 'M6 10V7.6a6 6 0 0 1 12 0V10 M5 10h14v10H5z M12 14v2',
  check: 'm5 12 4.2 4.2L19.5 6',
  refresh: 'M20 11a8.1 8.1 0 0 0-14.7-3L3 11 M3 5v6h6 M4 13a8.1 8.1 0 0 0 14.7 3L21 13 M21 19v-6h-6',
  volume: 'M4 10v4h4l5 4V6l-5 4H4 M17 9.5a4 4 0 0 1 0 5 M19.5 7a7.5 7.5 0 0 1 0 10',
  mute: 'M4 10v4h4l5 4V6l-5 4H4 M18 10l4 4 M22 10l-4 4',
  spark: 'm12 3 1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4z',
  warning: 'M12 3 22 20H2L12 3Zm0 6v5m0 3h.01',
  clock: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17ZM12 7v5l3.5 2',
  credit: 'M3 7h18v12H3z M3 10h18 M7 15h3',
  target: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17Zm0 4a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z',
}

function Icon({ name, size = 18, strokeWidth = 1.7, className = '' }) {
  return (
    <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICON_PATHS[name] || ICON_PATHS.spark} />
    </svg>
  )
}

function App() {
  const [state, rawDispatch] = useReducer(reducer, undefined, loadState)
  const [tradeQty, setTradeQty] = useState(1)
  const [showReset, setShowReset] = useState(false)
  const audioRef = useRef(null)
  const activeTab = state.activeTab || 'chart'

  useEffect(() => {
    try {
      localStorage.setItem('meridian-drift-save-v1', JSON.stringify(state))
    } catch {
      // The game remains playable if private browsing blocks persistence.
    }
  }, [state])

  useEffect(() => {
    if (!state.toast) return undefined
    const timeout = window.setTimeout(() => rawDispatch({ type: 'CLEAR_TOAST' }), 5200)
    return () => window.clearTimeout(timeout)
  }, [state.toast?.id])

  const playTone = (type) => {
    if (state.audioOn === false) return
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext
      if (!AudioContext) return
      const context = audioRef.current || new AudioContext()
      audioRef.current = context
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const notes = type === 'BUY' || type === 'SELL' ? [380, 540] : type === 'TRAVEL' ? [260, 420] : type === 'COMPLETE_CONTRACT' ? [360, 560, 760] : [300, 440]
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(notes[0], context.currentTime)
      notes.slice(1).forEach((note, index) => oscillator.frequency.setValueAtTime(note, context.currentTime + (index + 1) * 0.06))
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.035, context.currentTime + 0.012)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.22)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + 0.24)
    } catch {
      // Audio is an enhancement; a locked browser audio context never blocks input.
    }
  }

  const dispatch = (action) => {
    playTone(action.type)
    rawDispatch(action)
  }

  useEffect(() => {
    const onKeyDown = (event) => {
      const tagName = document.activeElement?.tagName
      if (event.key.toLowerCase() === 'e' && !event.metaKey && !event.ctrlKey && tagName !== 'INPUT' && tagName !== 'TEXTAREA') {
        event.preventDefault()
        playTone('END_CYCLE')
        rawDispatch({ type: 'END_CYCLE' })
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [state.audioOn, state.actionPoints])

  const selectedNode = NODES[state.selectedNodeId] || NODES[state.currentNodeId]
  const currentNode = NODES[state.currentNodeId]
  const weather = getWeather(state)

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} dispatch={dispatch} state={state} onReset={() => setShowReset(true)} />
      <main className="main-screen">
        <TopBar state={state} weather={weather} dispatch={dispatch} />
        <div className="ticker-line">
          <span className="ticker-label"><span className="live-dot" /> MERIDIAN BROADCAST</span>
          <span className="ticker-copy">{weather.description}</span>
          <span className="ticker-separator">/</span>
          <span className="ticker-copy ticker-muted">{state.stats.travels ? `${state.stats.travels} route${state.stats.travels === 1 ? '' : 's'} survived` : 'Your license is provisional'}</span>
          <span className="ticker-spacer" />
          <span className="save-status"><span className="save-dot" /> AUTO-SAVED</span>
        </div>
        <section className="page-content">
          {activeTab === 'chart' && <ChartView state={state} dispatch={dispatch} selectedNode={selectedNode} currentNode={currentNode} weather={weather} />}
          {activeTab === 'market' && <MarketView state={state} dispatch={dispatch} currentNode={currentNode} weather={weather} tradeQty={tradeQty} setTradeQty={setTradeQty} />}
          {activeTab === 'contracts' && <ContractsView state={state} dispatch={dispatch} />}
          {activeTab === 'ship' && <ShipView state={state} dispatch={dispatch} />}
          {activeTab === 'codex' && <CodexView state={state} dispatch={dispatch} />}
        </section>
      </main>
      {state.toast && <Toast toast={state.toast} onClose={() => dispatch({ type: 'CLEAR_TOAST' })} />}
      {showReset && <ResetDialog onCancel={() => setShowReset(false)} onConfirm={() => { dispatch({ type: 'RESET' }); setShowReset(false) }} />}
    </div>
  )
}

function Sidebar({ activeTab, dispatch, state, onReset }) {
  return (
    <aside className="side-rail">
      <div className="brand-mark" aria-label="Meridian Drift">
        <span className="brand-orbit orbit-one" />
        <span className="brand-orbit orbit-two" />
        <span className="brand-core">M</span>
      </div>
      <div className="rail-caption">WAYFINDER<br />NETWORK</div>
      <nav className="nav-list" aria-label="Game navigation">
        {Object.entries(TAB_META).map(([id, tab]) => (
          <button key={id} className={`nav-item ${activeTab === id ? 'active' : ''}`} onClick={() => dispatch({ type: 'SELECT_TAB', tab: id })}>
            <Icon name={tab.icon} size={19} />
            <span>{tab.label}</span>
            {id === 'contracts' && state.contracts.some((contract) => contract.status === 'active') && <span className="nav-alert">{state.contracts.filter((contract) => contract.status === 'active').length}</span>}
          </button>
        ))}
      </nav>
      <div className="rail-bottom">
        <div className="rail-divider" />
        <button className="nav-item subtle" onClick={() => dispatch({ type: 'TOGGLE_AUDIO' })}>
          <Icon name={state.audioOn === false ? 'mute' : 'volume'} size={18} />
          <span>{state.audioOn === false ? 'Sound off' : 'Sound on'}</span>
        </button>
        <button className="pilot-chip" onClick={() => dispatch({ type: 'SELECT_TAB', tab: 'ship' })}>
          <span className="pilot-avatar">MV</span>
          <span className="pilot-copy"><strong>Mara Venn</strong><small>Provisional pilot</small></span>
          <Icon name="chevron" size={15} />
        </button>
        <button className="reset-link" onClick={onReset}><Icon name="refresh" size={13} /> Reset voyage</button>
      </div>
    </aside>
  )
}

function TopBar({ state, weather, dispatch }) {
  const node = NODES[state.currentNodeId]
  const capacity = getCargoCapacity(state)
  return (
    <header className="top-bar">
      <div className="top-context">
        <span className="top-context-mark"><Icon name="pin" size={14} /></span>
        <span><strong>{node.name}</strong><em>{node.code}</em></span>
        <Icon name="chevron" size={14} className="context-chevron" />
        <span className="top-context-muted">Wayfarer / 09</span>
      </div>
      <div className="top-stats">
        <TopStat icon="credit" value={formatCredits(state.credits)} label="LIQUID" tone="gold" />
        <TopStat icon="lumen" value={`${state.fuel} / ${state.maxFuel}`} label="FUEL" tone="coral" />
        <TopStat icon="box" value={`${cargoCount(state.inventory)} / ${capacity}`} label="HOLD" tone="violet" />
        <TopStat icon="target" value={state.renown} label="RENOWN" tone="teal" />
        <div className="watch-chip"><span className="watch-label">WATCH</span><strong>{pad(state.day)}</strong><span className="watch-cycle">CYCLE {pad(state.cycle)}</span></div>
        <button className="weather-chip" onClick={() => dispatch({ type: 'SELECT_TAB', tab: 'codex' })} style={{ '--weather-color': weather.tone }} title="Open the Codex for event notes">
          <span className="weather-spark"><Icon name="spark" size={13} /></span><span><strong>{weather.name}</strong><small>{weather.code} / LIVE</small></span>
        </button>
      </div>
    </header>
  )
}

function TopStat({ icon, value, label, tone }) {
  return <div className={`top-stat tone-${tone}`}><Icon name={icon} size={15} /><span><strong>{value}</strong><small>{label}</small></span></div>
}

function PageHeading({ eyebrow, title, children, description }) {
  return (
    <div className="page-heading">
      <div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>
      <div className="heading-actions">{children}</div>
    </div>
  )
}

function EndWatchButton({ dispatch, compact = false }) {
  return <button className={`button button-primary end-watch ${compact ? 'compact' : ''}`} onClick={() => dispatch({ type: 'END_CYCLE' })}><Icon name="clock" size={15} /> End watch <span className="button-key">E</span></button>
}

function ActionSlots({ state }) {
  return <div className="action-slots"><span className="slot-label">COMMAND SLOTS</span><span className="slot-pips">{Array.from({ length: state.maxActionPoints }).map((_, index) => <i key={index} className={index < state.actionPoints ? 'filled' : ''} />)}</span><strong>{state.actionPoints}/{state.maxActionPoints}</strong></div>
}

function ChartView({ state, dispatch, selectedNode, currentNode, weather }) {
  const selectedIsDiscovered = state.discoveredNodes.includes(selectedNode.id)
  const canTravel = selectedIsDiscovered && selectedNode.id !== state.currentNodeId
  const canSurvey = !selectedIsDiscovered && isRouteBetween(state.currentNodeId, selectedNode.id)
  const travelCost = canTravel ? getTravelFuelCost(state, selectedNode.id) : 0
  const selectedActiveContracts = state.contracts.filter((contract) => contract.status === 'active' && contract.destination === selectedNode.id)
  return (
    <>
      <PageHeading eyebrow="LIVE ROUTES / 01" title="The Meridian" description="A moving trade network. Every purchase shifts the next price; every route leaves a mark.">
        <ActionSlots state={state} />
        <EndWatchButton dispatch={dispatch} />
      </PageHeading>
      <div className="chart-layout">
        <section className="panel map-panel">
          <div className="panel-heading map-heading"><div><span className="eyebrow">NAVIGATION LAYER</span><h2>Known sky <span className="heading-slash">/</span> <em>{state.discoveredNodes.length} ports resolved</em></h2></div><span className="live-tag"><span className="live-dot" /> MAP LIVE</span></div>
          <MapCanvas state={state} dispatch={dispatch} />
          <div className="map-footer"><span><i className="legend-dot current" /> CURRENT BERTH</span><span><i className="legend-dot open" /> RESOLVED PORT</span><span><i className="legend-dot signal" /> UNRESOLVED SIGNAL</span><span className="map-scale">1 grid ≈ 12 nautical miles</span></div>
        </section>
        <aside className="command-column">
          <section className="panel node-card">
            <div className="node-card-top"><span className="node-kicker"><Icon name={selectedIsDiscovered ? 'pin' : 'signal'} size={13} /> {selectedIsDiscovered ? 'PORT PROFILE' : 'UNRESOLVED SIGNAL'}</span><span className="node-code">{selectedNode.code}</span></div>
            <div className="node-title-row"><span className="node-glyph" style={{ '--node-color': selectedNode.color }}>{selectedIsDiscovered ? FACTIONS[selectedNode.factionId].mark : '?'}</span><div><h2>{selectedIsDiscovered ? selectedNode.name : 'Unknown station'}</h2><p>{selectedIsDiscovered ? selectedNode.specialty : 'Survey the signal to resolve the route.'}</p></div></div>
            <p className="node-blurb">{selectedIsDiscovered ? selectedNode.blurb : 'The receiver has a lock, but the station is hiding behind a fold in the meridian.'}</p>
            <div className="node-faction"><span className="faction-mark" style={{ color: selectedNode.color }}>{selectedIsDiscovered ? FACTIONS[selectedNode.factionId].mark : '◌'}</span><span>{selectedIsDiscovered ? FACTIONS[selectedNode.factionId].name : 'Unregistered presence'}</span><span className="node-divider" /><span className="hazard-readout">HAZARD <b>{selectedNode.hazard}/5</b></span></div>
            <div className="node-action-area">
              {canSurvey && <button className="button button-violet button-wide" onClick={() => dispatch({ type: 'SURVEY', nodeId: selectedNode.id })}><Icon name="signal" size={16} /> Resolve signal <span className="action-cost">1 slot · 1 fuel</span></button>}
              {canTravel && <button className="button button-primary button-wide" disabled={state.actionPoints < 1 || state.fuel < travelCost || state.hull <= selectedNode.hazard} onClick={() => dispatch({ type: 'TRAVEL', nodeId: selectedNode.id })}><Icon name="route" size={16} /> Set course <span className="action-cost">{travelCost} fuel · 1 slot</span></button>}
              {selectedNode.id === state.currentNodeId && <button className="button button-teal button-wide" onClick={() => dispatch({ type: 'SELECT_TAB', tab: 'market' })}><Icon name="trend" size={16} /> Open local market <span className="action-cost">{currentNode.specialty}</span></button>}
              {!canSurvey && !canTravel && selectedNode.id !== state.currentNodeId && <div className="locked-route"><Icon name="lock" size={15} /> No direct route from {currentNode.name}</div>}
            </div>
          </section>
          <section className="panel route-brief">
            <div className="panel-heading compact-heading"><div><span className="eyebrow">ROUTE BRIEF</span><h3>Working manifest</h3></div><ActionSlots state={state} /></div>
            {selectedActiveContracts.length ? selectedActiveContracts.map((contract) => <ContractMini key={contract.id} contract={contract} state={state} dispatch={dispatch} />) : <div className="empty-brief"><span className="empty-icon"><Icon name="contract" size={18} /></span><div><strong>No delivery due here</strong><p>Open the Noticeboard for work that makes a route matter.</p></div></div>}
          </section>
        </aside>
      </div>
      <div className="under-chart-grid">
        <CargoPanel state={state} dispatch={dispatch} />
        <LogPanel state={state} />
      </div>
    </>
  )
}

function MapCanvas({ state, dispatch }) {
  const discovered = new Set(state.discoveredNodes)
  return (
    <div className="map-canvas">
      <div className="map-coordinates top-left">M 03° 44' / SKY LAYER 07</div>
      <div className="map-coordinates top-right">LIVE FEED <span className="live-dot" /></div>
      <svg viewBox="0 0 100 100" role="img" aria-label="Interactive map of the Meridian trade routes" className="route-map">
        <defs>
          <pattern id="map-grid" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M 5 0 L 0 0 0 5" fill="none" stroke="rgba(157,179,180,.08)" strokeWidth=".18" /></pattern>
          <radialGradient id="map-glow"><stop offset="0" stopColor="#8bd4bd" stopOpacity=".22" /><stop offset="1" stopColor="#8bd4bd" stopOpacity="0" /></radialGradient>
          <filter id="soft-glow"><feGaussianBlur stdDeviation="1.2" result="blur" /><feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <rect width="100" height="100" fill="url(#map-grid)" />
        <circle cx="14" cy="51" r="21" fill="url(#map-glow)" />
        <circle cx="80" cy="22" r="18" fill="url(#map-glow)" opacity=".35" />
        {Array.from({ length: 22 }).map((_, index) => <circle key={`star-${index}`} cx={(index * 37 + 11) % 94 + 3} cy={(index * 19 + 7) % 86 + 7} r={index % 3 === 0 ? '.32' : '.18'} fill={index % 4 === 0 ? '#e9bb67' : '#b7c8c4'} opacity={index % 3 === 0 ? '.6' : '.28'} />)}
        {ROUTES.map(([fromId, toId]) => {
          const from = NODES[fromId]
          const to = NODES[toId]
          const known = discovered.has(fromId) && discovered.has(toId)
          return <line key={`${fromId}-${toId}`} className={`route-line ${known ? 'known' : 'unknown'}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />
        })}
        {Object.values(NODES).map((node) => {
          const known = discovered.has(node.id)
          const isCurrent = state.currentNodeId === node.id
          const isSelected = state.selectedNodeId === node.id
          return (
            <g key={node.id} className={`map-node ${known ? 'known' : 'unknown'} ${isCurrent ? 'current' : ''} ${isSelected ? 'selected' : ''}`} onClick={() => dispatch({ type: 'SELECT_NODE', nodeId: node.id })} role="button" tabIndex="0" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') dispatch({ type: 'SELECT_NODE', nodeId: node.id }) }}>
              {isSelected && <circle className="selected-ring" cx={node.x} cy={node.y} r="5.8" />}
              {isCurrent && <circle className="current-ring" cx={node.x} cy={node.y} r="5.1" />}
              <circle className="node-halo" cx={node.x} cy={node.y} r={known ? '3.7' : '3.1'} fill={known ? node.color : '#52646a'} />
              <circle className="node-core" cx={node.x} cy={node.y} r={known ? '1.5' : '1.1'} />
              {isCurrent && <path className="current-chevron" d={`M ${node.x - 1.3} ${node.y - 7.2} l 1.3 -1.5 1.3 1.5`} />}
              <text x={node.x + 5} y={node.y + 1} className="node-label">{known ? node.name.toUpperCase() : 'SIGNAL // ?'}</text>
              <text x={node.x + 5} y={node.y + 4.7} className="node-sub-label">{known ? node.code : 'UNRESOLVED'}</text>
            </g>
          )
        })}
        <g className="map-compass" transform="translate(91 84)"><circle r="5.5" /><path d="M0-4 1.5 0 0 4-1.5 0Z" /><text x="-1.2" y="-6.8">N</text></g>
      </svg>
      <div className="map-stamp"><span>WAYFINDER NETWORK</span><strong>MERIDIAN / 09</strong><small>CHART REV. {pad(state.day)}.{pad(state.stats.surveys + 1)}</small></div>
    </div>
  )
}

function ContractMini({ contract, state, dispatch }) {
  const resource = RESOURCES[contract.cargo]
  const node = NODES[contract.destination]
  const amount = state.inventory[contract.cargo] ?? 0
  const ready = state.currentNodeId === contract.destination && amount >= contract.amount
  return <div className="contract-mini"><div className="mini-icon" style={{ color: resource.tone }}><Icon name={resource.icon} size={17} /></div><div className="mini-copy"><strong>{contract.title}</strong><span>{amount}/{contract.amount} {resource.name} → {node.name}</span></div>{ready ? <button className="icon-button success" onClick={() => dispatch({ type: 'COMPLETE_CONTRACT', contractId: contract.id })}><Icon name="check" size={15} /></button> : <span className="mini-reward">+{contract.reward}</span>}</div>
}

function CargoPanel({ state, dispatch }) {
  const capacity = getCargoCapacity(state)
  return <section className="panel cargo-panel"><div className="panel-heading compact-heading"><div><span className="eyebrow">ONBOARD</span><h3>Hold manifest</h3></div><button className="text-button" onClick={() => dispatch({ type: 'SELECT_TAB', tab: 'market' })}>Trade cargo <Icon name="arrow" size={14} /></button></div><div className="cargo-capacity"><div><span>CAPACITY</span><strong>{cargoCount(state.inventory)} <em>/ {capacity}</em></strong></div><div className="capacity-bar"><i style={{ width: `${Math.min(100, (cargoCount(state.inventory) / capacity) * 100)}%` }} /></div></div><div className="cargo-list">{Object.values(RESOURCES).map((resource) => <div className="cargo-row" key={resource.id}><span className="cargo-icon" style={{ color: resource.tone }}><Icon name={resource.icon} size={16} /></span><span className="cargo-name">{resource.name}<small>{resource.short}</small></span><span className="cargo-amount">{state.inventory[resource.id]} <small>{resource.unit}</small></span><span className="cargo-value">{formatCredits(getMarketPrice(state, state.currentNodeId, resource.id, 'sell'))}<small>/ unit</small></span></div>)}</div></section>
}

function LogPanel({ state }) {
  return <section className="panel log-panel"><div className="panel-heading compact-heading"><div><span className="eyebrow">SHIP LOG / RECENT</span><h3>Field notes</h3></div><span className="record-count">{state.log.length} records</span></div><div className="log-list">{state.log.slice(0, 4).map((entry) => <div className="log-row" key={entry.id}><span className={`log-mark ${entry.kind}`}><Icon name={entry.kind === 'travel' ? 'route' : entry.kind === 'trade' ? 'trend' : entry.kind === 'warning' ? 'warning' : entry.kind === 'contract' ? 'contract' : 'spark'} size={13} /></span><div><strong>{entry.title}</strong><p>{entry.detail}</p></div><time>D{pad(entry.day)}</time></div>)}</div></section>
}

function MarketView({ state, dispatch, currentNode, weather, tradeQty, setTradeQty }) {
  const totalValue = Object.entries(state.inventory).reduce((sum, [resourceId, amount]) => sum + amount * getMarketPrice(state, state.currentNodeId, resourceId, 'sell'), 0)
  return <>
    <PageHeading eyebrow="OPEN EXCHANGE / 02" title="Price Currents" description={`Live rates at ${currentNode.name}. Buy low, move the lane, and decide what your cargo is worth.`}><button className="button button-quiet" onClick={() => dispatch({ type: 'SELECT_TAB', tab: 'chart' })}><Icon name="map" size={15} /> Return to chart</button><EndWatchButton dispatch={dispatch} /></PageHeading>
    <div className="market-summary-row"><section className="panel market-location"><div className="market-location-icon" style={{ '--node-color': currentNode.color }}>{FACTIONS[currentNode.factionId].mark}</div><div><span className="eyebrow">DOCKSIDE EXCHANGE</span><h2>{currentNode.name}</h2><p>{currentNode.specialty} <span>/</span> {FACTIONS[currentNode.factionId].name}</p></div><div className="market-location-meta"><span><small>WEATHER</small><strong style={{ color: weather.tone }}>{weather.name}</strong></span><span><small>HOLD VALUE</small><strong>{formatCredits(totalValue)}</strong></span><span><small>ORDERS THIS VOYAGE</small><strong>{state.stats.trades}</strong></span></div></section><section className="panel trade-control"><span className="eyebrow">ORDER SIZE</span><div className="qty-stepper"><button onClick={() => setTradeQty(Math.max(1, tradeQty - 1))}>−</button><strong>{tradeQty}</strong><button onClick={() => setTradeQty(Math.min(9, tradeQty + 1))}>+</button></div><div className="qty-presets"><button className={tradeQty === 1 ? 'active' : ''} onClick={() => setTradeQty(1)}>1</button><button className={tradeQty === 5 ? 'active' : ''} onClick={() => setTradeQty(5)}>5</button><button className={tradeQty === 9 ? 'active' : ''} onClick={() => setTradeQty(9)}>9</button></div><small>Every order nudges local supply.</small></section></div>
    <div className="market-layout"><section className="panel price-board"><div className="panel-heading board-heading"><div><span className="eyebrow">LIVE QUOTES / {currentNode.code}</span><h2>What moves here</h2></div><span className="market-live"><span className="live-dot" /> STREAMING</span></div><div className="price-table-head"><span>COMMODITY</span><span>LOCAL READ</span><span>BUY / UNIT</span><span>SELL / UNIT</span><span>POSITION</span><span /></div><div className="price-rows">{Object.values(RESOURCES).map((resource) => <PriceRow key={resource.id} resource={resource} state={state} dispatch={dispatch} qty={tradeQty} />)}</div><div className="price-board-foot"><Icon name="spark" size={14} /> <span>Prices include the current watch’s weather effect and port pressure. A Broker on crew improves the sell spread.</span></div></section><aside className="market-aside"><section className="panel pulse-panel"><div className="panel-heading compact-heading"><div><span className="eyebrow">MARKET PULSE</span><h3>Port pressure</h3></div><Icon name="trend" size={17} /></div><div className="pulse-bars">{Object.values(RESOURCES).map((resource) => { const pressure = state.marketPressure[state.currentNodeId][resource.id]; return <div className="pulse-row" key={resource.id}><span style={{ color: resource.tone }}>{resource.short}</span><div className="pressure-track"><i className={pressure > 0 ? 'positive' : pressure < 0 ? 'negative' : ''} style={{ width: `${Math.min(100, Math.abs(pressure) * 28 + (pressure === 0 ? 5 : 0))}%`, marginLeft: pressure < 0 ? `${50 - Math.abs(pressure) * 8}%` : pressure === 0 ? '48%' : '50%' }} /></div><b>{pressure > 0 ? 'demand' : pressure < 0 ? 'supply' : 'steady'}</b></div> })}</div><p className="aside-note">Buying makes a port hungry. Selling makes it breathe. Pressure relaxes at the end of each watch.</p></section><section className="panel exchange-note"><span className="eyebrow">BROKER'S NOTE</span><h3>Every port has a tell.</h3><p>{currentNode.blurb}</p><div className="note-rule" /><div className="note-foot"><Icon name="compass" size={15} /><span>Specialty: <strong>{currentNode.specialty}</strong></span></div></section></aside></div>
  </>
}

function PriceRow({ resource, state, dispatch, qty }) {
  const buy = getMarketPrice(state, state.currentNodeId, resource.id, 'buy')
  const sell = getMarketPrice(state, state.currentNodeId, resource.id, 'sell')
  const held = state.inventory[resource.id]
  const pressure = state.marketPressure[state.currentNodeId][resource.id]
  return <div className="price-row"><div className="commodity-cell"><span className="resource-glyph" style={{ color: resource.tone }}><Icon name={resource.icon} size={18} /></span><span><strong>{resource.name}</strong><small>{resource.blurb}</small></span></div><div className="local-read"><span className={`read-pill ${pressure > 0 ? 'hot' : pressure < 0 ? 'cool' : ''}`}>{pressure > 0 ? 'BUYING' : pressure < 0 ? 'SATURATED' : 'BALANCED'}</span><small>{pressure > 0 ? 'demand rising' : pressure < 0 ? 'supply high' : 'clean lane'}</small></div><div className="quote buy"><strong>{formatCredits(buy)}</strong><small>per {resource.unit.slice(0, -1)}</small></div><div className="quote sell"><strong>{formatCredits(sell)}</strong><small>your spread</small></div><div className="position-cell"><strong>{held}</strong><div className="mini-progress"><i style={{ width: `${Math.min(100, held * 15)}%`, background: resource.tone }} /></div></div><div className="trade-buttons"><button className="trade-buy" disabled={state.actionPoints < 0} onClick={() => dispatch({ type: 'BUY', resourceId: resource.id, qty })}>Buy <span>+{qty}</span></button><button className="trade-sell" disabled={held < 1} onClick={() => dispatch({ type: 'SELL', resourceId: resource.id, qty })}>Sell <span>−{Math.min(qty, held)}</span></button></div></div>
}

function ContractsView({ state, dispatch }) {
  const active = state.contracts.filter((contract) => contract.status === 'active')
  const open = state.contracts.filter((contract) => contract.status === 'open')
  const complete = state.contracts.filter((contract) => contract.status === 'complete')
  return <>
    <PageHeading eyebrow="ACTIVE WORK / 03" title="The Noticeboard" description="A good contract is a route with a reason. Take only the jobs you can carry before the board turns over."><div className="notice-stats"><span><b>{active.length}</b><small>ACTIVE</small></span><span><b>{complete.length}</b><small>CLEARED</small></span><span><b>{state.renown}</b><small>RENOWN</small></span></div><EndWatchButton dispatch={dispatch} /></PageHeading>
    <div className="contract-banner panel"><div className="contract-banner-icon"><Icon name="contract" size={21} /></div><div><span className="eyebrow">THE NETWORK NEEDS MOVEMENT</span><h2>Work the gaps between factions.</h2><p>Contracts pay in credits and trust. Trust opens doors later; credits keep the Wayfarer in the air now.</p></div><div className="banner-route"><span className="route-dot" /><span /><span className="route-dot end" /><small>DELIVER / RETURN / REPEAT</small></div></div>
    <div className="contracts-layout"><section className="contract-board"><div className="section-label"><span>OPEN NOTICES</span><em>{open.length} available</em></div>{open.length ? <div className="contract-grid">{open.map((contract) => <ContractCard key={contract.id} contract={contract} state={state} dispatch={dispatch} />)}</div> : <EmptyState title="No open notices" detail="End the watch. The board will refresh as the Meridian shifts." />}</section><aside className="active-contracts"><div className="section-label"><span>YOUR MANIFEST</span><em>{active.length}/2 slots</em></div>{active.length ? active.map((contract) => <ContractCard key={contract.id} contract={contract} state={state} dispatch={dispatch} compact />) : <div className="panel empty-active"><Icon name="route" size={21} /><h3>No active work</h3><p>Accept a notice to turn a market price into a plan.</p></div>}<div className="panel contract-principles"><span className="eyebrow">FIELD DOCTRINE</span><div className="principle"><span>01</span><p><strong>Read the weather.</strong> The same commodity can make or break a different watch.</p></div><div className="principle"><span>02</span><p><strong>Do not over-accept.</strong> Expired work costs reputation with the faction that posted it.</p></div><div className="principle"><span>03</span><p><strong>Bring options.</strong> A full hold is safety until it becomes a locked route.</p></div></div></aside></div>
  </>
}

function ContractCard({ contract, state, dispatch, compact = false }) {
  const resource = RESOURCES[contract.cargo]
  const faction = FACTIONS[contract.factionId]
  const destination = NODES[contract.destination]
  const held = state.inventory[contract.cargo] ?? 0
  const isActive = contract.status === 'active'
  const ready = isActive && state.currentNodeId === contract.destination && held >= contract.amount
  const canAccept = !isActive && state.contracts.filter((item) => item.status === 'active').length < 2
  return <article className={`contract-card ${compact ? 'compact' : ''} ${isActive ? 'is-active' : ''}`} style={{ '--faction-color': faction.color }}><div className="contract-card-top"><span className="contract-faction"><b style={{ color: faction.color }}>{faction.mark}</b> {faction.short}</span><span className={`contract-status ${isActive ? 'active' : 'open'}`}>{isActive ? 'IN MANIFEST' : 'OPEN'}</span></div><h3>{contract.title}</h3><p className="contract-brief">{contract.brief}</p><div className="contract-route"><div><span className="route-label">CARGO</span><strong style={{ color: resource.tone }}><Icon name={resource.icon} size={14} /> {contract.amount} {resource.name}</strong></div><Icon name="arrow" size={16} className="route-arrow" /><div><span className="route-label">DESTINATION</span><strong><Icon name="pin" size={14} /> {destination.name}</strong></div></div><div className="contract-bottom"><div className="contract-reward"><span>REWARD</span><strong>{formatCredits(contract.reward)}</strong><small>+{contract.renown} renown</small></div>{isActive && <div className="contract-progress"><span>{held} / {contract.amount} held</span><div><i style={{ width: `${Math.min(100, (held / contract.amount) * 100)}%`, background: resource.tone }} /></div><small>{state.currentNodeId === contract.destination ? (ready ? 'Ready to clear' : 'At destination') : `Expires watch ${pad(contract.expiresAt)}`}</small></div>}{!isActive && <div className="contract-deadline"><Icon name="clock" size={13} /> {contract.expiresAt - state.day} watches left</div>}<button className={`button ${ready ? 'button-teal' : isActive ? 'button-quiet' : 'button-primary'} contract-button`} disabled={isActive ? !ready : !canAccept} onClick={() => dispatch({ type: isActive ? 'COMPLETE_CONTRACT' : 'ACCEPT_CONTRACT', contractId: contract.id })}>{isActive ? <><Icon name={ready ? 'check' : 'lock'} size={14} /> {ready ? 'Clear manifest' : 'Not ready'}</> : <><Icon name="plus" size={14} /> Accept notice</>}</button></div></article>
}

function ShipView({ state, dispatch }) {
  const maxHull = getMaxHull(state)
  const hullPercent = (state.hull / maxHull) * 100
  return <>
    <PageHeading eyebrow="THE VESSEL / 04" title="Wayfarer / 09" description="A small ship for a large, unfinished sky. Upgrade the hull, hire the right instincts, and make the route yours."><div className="ship-id"><span className="ship-id-dot" /> LICENSE <strong>PROV-09-A</strong></div><EndWatchButton dispatch={dispatch} /></PageHeading>
    <div className="ship-overview"><section className="panel ship-portrait"><div className="ship-portrait-grid" /><div className="ship-orbit"><span /><span /><span /></div><svg viewBox="0 0 300 150" className="ship-svg" aria-label="The Wayfarer ship"><path className="ship-shadow" d="M45 103c37 12 170 18 220-4l-30 24H78Z" /><path className="ship-hull" d="M41 95h202l-29 27H72Z" /><path className="ship-top" d="M56 83h127l29 12H41Z" /><path className="ship-cabin" d="m120 83 12-30h31l19 30Z" /><path className="ship-window" d="m139 62 8-4 9 4-2 11h-18Z" /><path className="ship-mast" d="M151 53V22m0 4 32 15h-32" /><path className="ship-light" d="M151 22v-6" /><circle cx="151" cy="14" r="2" className="ship-light-dot" /><path className="ship-detail" d="M67 96h130m-99 13 21-1m11 1 21-1m15-1 19-1" /></svg><div className="ship-portrait-label"><span>VESSEL CLASS</span><strong>PATCHWORK COURIER</strong><small>Last registered at Asterfall / D01</small></div></section><section className="panel ship-stats"><div className="panel-heading compact-heading"><div><span className="eyebrow">SYSTEMS CHECK</span><h3>Readiness</h3></div><span className="status-stamp"><span className="live-dot" /> ONLINE</span></div><ShipStat icon="shield" label="Hull integrity" value={`${state.hull} / ${maxHull}`} percent={hullPercent} tone="blue" /><ShipStat icon="lumen" label="Fuel reserves" value={`${state.fuel} / ${state.maxFuel}`} percent={(state.fuel / state.maxFuel) * 100} tone="coral" /><ShipStat icon="box" label="Cargo lattice" value={`${cargoCount(state.inventory)} / ${getCargoCapacity(state)}`} percent={(cargoCount(state.inventory) / getCargoCapacity(state)) * 100} tone="gold" /><ShipStat icon="spark" label="Crew morale" value={`${state.morale}%`} percent={state.morale} tone="teal" /><div className="repair-row"><span><strong>Dockyard services</strong><small>One command slot · 3 credits per missing hull</small></span><button className="button button-quiet" disabled={state.hull >= maxHull || state.actionPoints < 1} onClick={() => dispatch({ type: 'REPAIR' })}><Icon name="shield" size={14} /> Patch hull</button></div></section></div>
    <div className="ship-lower-grid"><section><div className="section-label"><span>CREW BERTHS</span><em>{state.crewIds.length} / 4 hands aboard</em></div><div className="crew-grid">{CREW.map((crew) => <CrewCard key={crew.id} crew={crew} state={state} dispatch={dispatch} />)}</div></section><section><div className="section-label"><span>YARD FITTINGS</span><em>{state.upgrades.length} / {UPGRADES.length} installed</em></div><div className="upgrade-list">{UPGRADES.map((upgrade) => <UpgradeCard key={upgrade.id} upgrade={upgrade} state={state} dispatch={dispatch} />)}</div></section></div>
  </>
}

function ShipStat({ icon, label, value, percent, tone }) {
  return <div className="ship-stat"><span className={`ship-stat-icon tone-${tone}`}><Icon name={icon} size={15} /></span><span className="ship-stat-copy"><small>{label}</small><strong>{value}</strong></span><div className="ship-stat-bar"><i className={`bar-${tone}`} style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} /></div></div>
}

function CrewCard({ crew, state, dispatch }) {
  const aboard = state.crewIds.includes(crew.id)
  return <article className={`crew-card ${aboard ? 'aboard' : ''}`} style={{ '--crew-color': crew.color }}><div className="crew-card-top"><span className="crew-icon"><Icon name={crew.icon} size={18} /></span><span className={aboard ? 'aboard-tag' : 'available-tag'}>{aboard ? 'ABOARD' : 'AVAILABLE'}</span></div><h3>{crew.name}</h3><span className="crew-role">{crew.role} <i>/</i> {crew.specialty}</span><p>{crew.description}</p><div className="crew-effect"><Icon name="spark" size={12} /><span>{crew.effect}</span></div>{!aboard && <button className="button button-quiet hire-button" disabled={state.credits < crew.cost} onClick={() => dispatch({ type: 'HIRE_CREW', crewId: crew.id })}>Hire for {formatCredits(crew.cost)}</button>}</article>
}

function UpgradeCard({ upgrade, state, dispatch }) {
  const owned = state.upgrades.includes(upgrade.id)
  return <article className={`upgrade-card ${owned ? 'installed' : ''}`} style={{ '--upgrade-color': upgrade.color }}><span className="upgrade-icon"><Icon name={upgrade.icon} size={16} /></span><div className="upgrade-copy"><h3>{upgrade.name}</h3><p>{upgrade.description}</p><strong>{upgrade.effect}</strong></div>{owned ? <span className="installed-badge"><Icon name="check" size={13} /> INSTALLED</span> : <button className="button button-quiet upgrade-button" disabled={state.credits < upgrade.cost} onClick={() => dispatch({ type: 'BUY_UPGRADE', upgradeId: upgrade.id })}>{formatCredits(upgrade.cost)} <Icon name="arrow" size={13} /></button>}</article>
}

function CodexView({ state, dispatch }) {
  const milestones = [
    { title: 'First exchange', detail: 'Complete a trade order.', done: state.stats.trades > 0, icon: 'trend' },
    { title: 'Eyes open', detail: 'Resolve an uncharted signal.', done: state.stats.surveys > 0, icon: 'signal' },
    { title: 'A real route', detail: 'Survive three passages.', done: state.stats.travels >= 3, icon: 'route' },
    { title: 'Trusted hand', detail: 'Clear a faction contract.', done: state.stats.contractsCompleted > 0, icon: 'contract' },
    { title: 'The long game', detail: 'Earn ten renown.', done: state.renown >= 10, icon: 'target' },
    { title: 'Built to last', detail: 'Install a yard fitting.', done: state.upgrades.length > 0, icon: 'shield' },
  ]
  return <>
    <PageHeading eyebrow="FIELD NOTES / 05" title="The Living Ledger" description="The Meridian is not lore in a book. It is the record of what you chose to move, miss, and remember."><button className="button button-quiet" onClick={() => dispatch({ type: 'SELECT_TAB', tab: 'chart' })}><Icon name="map" size={15} /> Open chart</button><EndWatchButton dispatch={dispatch} /></PageHeading>
    <div className="codex-top-grid"><section className="panel ledger-summary"><div className="ledger-sigil"><Icon name="book" size={28} /></div><div><span className="eyebrow">WAYFINDER RECORD</span><h2>Provisional license / <em>active</em></h2><p>Every route leaves behind data. Every deal changes the next person’s odds.</p></div><div className="ledger-numbers"><span><strong>{state.day}</strong><small>WATCHES</small></span><span><strong>{state.stats.travels}</strong><small>PASSAGES</small></span><span><strong>{state.stats.creditsEarned}</strong><small>CR EARNED</small></span></div></section><section className="panel current-rhythm"><div className="panel-heading compact-heading"><div><span className="eyebrow">WORLD RHYTHM</span><h3>What is moving</h3></div><span className="rhythm-code" style={{ color: getWeather(state).tone }}>{getWeather(state).code}</span></div><div className="rhythm-weather"><span className="rhythm-orb" style={{ background: getWeather(state).tone }} /><div><strong>{getWeather(state).name}</strong><p>{getWeather(state).effect}</p></div></div><div className="weather-sequence">{[0, 1, 2, 3, 4].map((index) => { const weatherIndex = (state.weatherIndex + index) % 5; const item = ['CLR', 'GLS', 'POL', 'MAG', 'NGT'][weatherIndex]; return <span className={index === 0 ? 'current' : ''} key={item}>{item}</span> })}</div></section></div>
    <div className="codex-layout"><section><div className="section-label"><span>FACTION LEDGER</span><em>reputation changes the welcome</em></div><div className="faction-grid">{Object.values(FACTIONS).map((faction) => <FactionCard key={faction.id} faction={faction} value={state.reputation[faction.id]} />)}</div><div className="section-label milestones-label"><span>WAYPOINTS</span><em>{milestones.filter((item) => item.done).length} / {milestones.length} recorded</em></div><div className="milestone-grid">{milestones.map((milestone) => <div className={`milestone ${milestone.done ? 'done' : ''}`} key={milestone.title}><span className="milestone-icon"><Icon name={milestone.icon} size={15} /></span><div><strong>{milestone.title}</strong><p>{milestone.detail}</p></div>{milestone.done && <Icon name="check" size={14} className="milestone-check" />}</div>)}</div></section><aside className="panel full-log"><div className="panel-heading compact-heading"><div><span className="eyebrow">COMPLETE RECORD</span><h3>Ship log</h3></div><span className="record-count">{state.log.length} entries</span></div><div className="full-log-list">{state.log.map((entry) => <div className="full-log-row" key={entry.id}><time>D{pad(entry.day)}</time><span className={`full-log-mark ${entry.kind}`}><Icon name={entry.kind === 'travel' ? 'route' : entry.kind === 'trade' ? 'trend' : entry.kind === 'warning' ? 'warning' : entry.kind === 'contract' ? 'contract' : entry.kind === 'intel' ? 'signal' : 'spark'} size={13} /></span><div><strong>{entry.title}</strong><p>{entry.detail}</p></div></div>)}</div></aside></div>
  </>
}

function FactionCard({ faction, value }) {
  const level = value >= 10 ? 'ALLIED' : value >= 5 ? 'WARM' : value > 0 ? 'KNOWN' : value < 0 ? 'WARY' : 'UNTESTED'
  return <article className="faction-card" style={{ '--faction-color': faction.color }}><div className="faction-card-top"><span className="faction-big-mark">{faction.mark}</span><span className="faction-level">{level}</span></div><h3>{faction.name}</h3><p>{faction.description}</p><div className="faction-meter"><i style={{ width: `${Math.min(100, Math.max(5, value * 5 + 12))}%` }} /></div><div className="faction-score"><span>REPUTATION</span><strong>{value > 0 ? '+' : ''}{value}</strong></div></article>
}

function EmptyState({ title, detail }) { return <div className="panel empty-state"><Icon name="contract" size={23} /><h3>{title}</h3><p>{detail}</p></div> }

function Toast({ toast, onClose }) {
  return <div className={`toast toast-${toast.tone || 'teal'}`} role="status"><span className="toast-icon"><Icon name={toast.tone === 'coral' ? 'warning' : toast.tone === 'violet' ? 'signal' : 'check'} size={16} /></span><div><strong>{toast.title}</strong><p>{toast.detail}</p></div><button onClick={onClose} aria-label="Dismiss notification">×</button></div>
}

function ResetDialog({ onCancel, onConfirm }) {
  return <div className="dialog-backdrop"><div className="reset-dialog panel"><span className="dialog-icon"><Icon name="refresh" size={21} /></span><span className="eyebrow">RESET VOYAGE</span><h2>Clear the Wayfarer’s ledger?</h2><p>This removes the local save and returns you to Asterfall with a new provisional license.</p><div className="dialog-actions"><button className="button button-quiet" onClick={onCancel}>Keep sailing</button><button className="button button-danger" onClick={onConfirm}>Reset voyage</button></div></div></div>
}

export default App
