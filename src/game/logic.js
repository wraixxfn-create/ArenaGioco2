import {
  CONTRACT_BLUEPRINTS,
  CREW,
  FACTIONS,
  INITIAL_LOG,
  NODES,
  RESOURCES,
  ROUTES,
  UPGRADES,
  WEATHER,
} from './content'

export const SAVE_KEY = 'meridian-drift-save-v1'
export const MAX_LOG = 42

const DEFAULT_PRESSURE = Object.fromEntries(
  Object.keys(NODES).map((nodeId) => [nodeId, Object.fromEntries(Object.keys(RESOURCES).map((id) => [id, 0]))]),
)

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const round = (value) => Math.round(value)

export function distanceBetween(fromId, toId) {
  const from = NODES[fromId]
  const to = NODES[toId]
  if (!from || !to) return 0
  return Math.sqrt((from.x - to.x) ** 2 + (from.y - to.y) ** 2)
}

export function isRouteBetween(fromId, toId) {
  return ROUTES.some(([a, b]) => (a === fromId && b === toId) || (a === toId && b === fromId))
}

export function cargoCount(inventory) {
  return Object.values(inventory).reduce((total, amount) => total + amount, 0)
}

export function getCargoCapacity(state) {
  return 8 + (state.upgrades.includes('lattice') ? 5 : 0)
}

export function getMaxHull(state) {
  return 100 + (state.upgrades.includes('keel') ? 20 : 0)
}

export function getTravelFuelCost(state, destinationId) {
  const distance = distanceBetween(state.currentNodeId, destinationId)
  const riggingDiscount = state.crewIds.includes('oren') ? 1 : 0
  return Math.max(1, Math.ceil(distance / 18) - riggingDiscount)
}

export function getWeather(state) {
  return WEATHER[state.weatherIndex % WEATHER.length]
}

function worldPriceModifier(state, resourceId) {
  const weather = getWeather(state)
  const weatherIndex = WEATHER.indexOf(weather)
  if (weatherIndex === 1 && resourceId === 'relic') return 1.1
  if (weatherIndex === 2 && resourceId === 'grain') return 0.9
  if (weatherIndex === 3 && resourceId === 'alloy') return 1.12
  if (weatherIndex === 4 && resourceId === 'lumen') return 1.15
  return 1
}

export function getMarketPrice(state, nodeId, resourceId, side = 'buy') {
  const node = NODES[nodeId]
  const resource = RESOURCES[resourceId]
  if (!node || !resource) return 0
  const pressure = state.marketPressure?.[nodeId]?.[resourceId] ?? 0
  const drift = state.marketShift?.[resourceId] ?? 0
  const raw = resource.basePrice * node.market[resourceId] * (1 + pressure * 0.065) * (1 + drift * 0.035) * worldPriceModifier(state, resourceId)
  if (side === 'sell') {
    const brokerBonus = state.crewIds.includes('sable') ? 0.06 : 0
    return Math.max(1, round(raw * (0.84 + brokerBonus)))
  }
  return Math.max(1, round(raw))
}

export function getAdjacentUndiscovered(state) {
  return Object.values(NODES).filter((node) => node.hidden && !state.discoveredNodes.includes(node.id) && isRouteBetween(state.currentNodeId, node.id))
}

function nextId(prefix, state) {
  return `${prefix}-${state.day}-${state.stats.events + state.log.length + 1}`
}

function addLog(state, entry) {
  const logEntry = {
    id: nextId('log', state),
    day: state.day,
    time: state.actionPoints === state.maxActionPoints ? '06:10' : '14:40',
    ...entry,
  }
  return { ...state, log: [logEntry, ...state.log].slice(0, MAX_LOG) }
}

function notify(state, title, detail, tone = 'teal') {
  return {
    ...state,
    toast: { id: (state.toast?.id ?? 0) + 1, title, detail, tone },
  }
}

function spendAction(state, amount = 1) {
  if (state.actionPoints < amount) return null
  return { ...state, actionPoints: state.actionPoints - amount }
}

function incrementStats(state, key, amount = 1) {
  return { ...state, stats: { ...state.stats, [key]: (state.stats[key] ?? 0) + amount } }
}

export function freshState() {
  const contracts = CONTRACT_BLUEPRINTS.map((contract, index) => ({
    ...contract,
    status: 'open',
    expiresAt: contract.expires,
    acceptedDay: null,
    completedDay: null,
    order: index,
  }))

  return {
    version: 1,
    day: 1,
    cycle: 1,
    actionPoints: 3,
    maxActionPoints: 3,
    currentNodeId: 'asterfall',
    selectedNodeId: 'asterfall',
    discoveredNodes: ['asterfall', 'caligo', 'veyra'],
    credits: 240,
    fuel: 13,
    maxFuel: 22,
    hull: 92,
    maxHull: 100,
    insight: 2,
    renown: 0,
    morale: 74,
    inventory: { grain: 2, alloy: 0, relic: 0, lumen: 0 },
    crewIds: ['mara'],
    upgrades: [],
    reputation: Object.fromEntries(Object.keys(FACTIONS).map((id) => [id, 0])),
    marketPressure: DEFAULT_PRESSURE,
    marketShift: { grain: 0, alloy: 0, relic: 0, lumen: 0 },
    weatherIndex: 0,
    contracts,
    log: INITIAL_LOG,
    toast: { id: 1, title: 'Chart loaded', detail: 'Choose a destination, or open the market to make your first run.', tone: 'teal' },
    audioOn: true,
    stats: { trades: 0, travels: 0, surveys: 0, contractsCompleted: 0, creditsEarned: 0, events: 0 },
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return freshState()
    const parsed = JSON.parse(raw)
    if (!parsed || parsed.version !== 1) return freshState()
    return { ...freshState(), ...parsed, toast: null }
  } catch {
    return freshState()
  }
}

export function reducer(state, action) {
  if (!action) return state
  if (action.type === 'RESET') return freshState()
  if (action.type === 'TOGGLE_AUDIO') return { ...state, audioOn: !state.audioOn }
  if (action.type === 'SELECT_TAB') return { ...state, activeTab: action.tab }
  if (action.type === 'SELECT_NODE') return { ...state, selectedNodeId: action.nodeId, activeTab: 'chart' }
  if (action.type === 'CLEAR_TOAST') return { ...state, toast: null }

  if (action.type === 'BUY') {
    const resource = RESOURCES[action.resourceId]
    const requested = Math.max(1, Math.floor(action.qty || 1))
    if (!resource) return state
    const availableCapacity = getCargoCapacity(state) - cargoCount(state.inventory)
    const unitPrice = getMarketPrice(state, state.currentNodeId, action.resourceId, 'buy')
    const affordable = Math.floor(state.credits / unitPrice)
    const qty = Math.min(requested, availableCapacity, affordable)
    if (qty < 1) {
      return notify(state, availableCapacity < 1 ? 'Hold is full' : 'Not enough credits', availableCapacity < 1 ? 'Sell or deliver cargo before buying more.' : `One ${resource.name} costs ${unitPrice} credits here.`, 'coral')
    }
    const next = {
      ...state,
      credits: state.credits - unitPrice * qty,
      inventory: { ...state.inventory, [action.resourceId]: state.inventory[action.resourceId] + qty },
      marketPressure: {
        ...state.marketPressure,
        [state.currentNodeId]: { ...state.marketPressure[state.currentNodeId], [action.resourceId]: clamp(state.marketPressure[state.currentNodeId][action.resourceId] + qty, -3, 3) },
      },
    }
    const logged = addLog(incrementStats(next, 'trades'), { kind: 'trade', title: `Bought ${qty} ${resource.name}`, detail: `${unitPrice * qty} credits from ${NODES[state.currentNodeId].name}.`, resourceId: action.resourceId })
    return notify(logged, 'Cargo secured', `${qty} ${resource.name} added to the hold.`, 'gold')
  }

  if (action.type === 'SELL') {
    const resource = RESOURCES[action.resourceId]
    const requested = Math.max(1, Math.floor(action.qty || 1))
    const held = state.inventory[action.resourceId] ?? 0
    const qty = Math.min(requested, held)
    if (!resource || qty < 1) return notify(state, 'Nothing to sell', `There is no ${resource?.name?.toLowerCase() ?? 'cargo'} in the hold.`, 'coral')
    const unitPrice = getMarketPrice(state, state.currentNodeId, action.resourceId, 'sell')
    const next = {
      ...state,
      credits: state.credits + unitPrice * qty,
      inventory: { ...state.inventory, [action.resourceId]: held - qty },
      marketPressure: {
        ...state.marketPressure,
        [state.currentNodeId]: { ...state.marketPressure[state.currentNodeId], [action.resourceId]: clamp(state.marketPressure[state.currentNodeId][action.resourceId] - qty, -3, 3) },
      },
    }
    const logged = addLog(incrementStats(incrementStats(next, 'trades'), 'creditsEarned', unitPrice * qty), { kind: 'trade', title: `Sold ${qty} ${resource.name}`, detail: `${unitPrice * qty} credits from ${NODES[state.currentNodeId].name}.`, resourceId: action.resourceId })
    return notify(logged, 'Deal closed', `+${unitPrice * qty} credits from ${qty} ${resource.name}.`, 'teal')
  }

  if (action.type === 'TRAVEL') {
    const destination = NODES[action.nodeId]
    if (!destination || destination.hidden && !state.discoveredNodes.includes(destination.id)) return notify(state, 'Route is uncharted', 'Survey the signal before committing the ship.', 'coral')
    if (destination.id === state.currentNodeId) return notify(state, 'Already docked', 'You are standing on this deck already.', 'muted')
    const nextActionState = spendAction(state)
    if (!nextActionState) return notify(state, 'No command slots left', 'End the watch to reset your command deck.', 'coral')
    const fuelCost = getTravelFuelCost(state, destination.id)
    if (state.fuel < fuelCost) return notify(state, 'Fuel reserve too low', `This route needs ${fuelCost} fuel. End the watch to resupply, or trade at a nearer port.`, 'coral')
    const weatherPenalty = getWeather(state).code === 'GLS' || getWeather(state).code === 'MAG' ? 1 : 0
    const damage = Math.max(0, Math.ceil(distanceBetween(state.currentNodeId, destination.id) / 32) + destination.hazard - 1 + weatherPenalty - (state.upgrades.includes('keel') ? 1 : 0))
    const hullAfter = state.hull - damage
    if (hullAfter <= 0) return notify(state, 'Hull integrity critical', 'A route this rough would break the Wayfarer. Repair before departure.', 'coral')
    const salvage = Math.random() < 0.25
    const salvageCredits = salvage ? 20 + destination.hazard * 5 : 0
    const next = {
      ...nextActionState,
      currentNodeId: destination.id,
      selectedNodeId: destination.id,
      fuel: state.fuel - fuelCost,
      hull: hullAfter,
      credits: state.credits + salvageCredits,
      morale: clamp(state.morale + (damage > 2 ? -4 : 2), 0, 100),
    }
    let travelled = incrementStats(next, 'travels')
    if (salvage) travelled = addLog(travelled, { kind: 'salvage', title: 'Drift salvage recovered', detail: `A sealed locker added ${salvageCredits} credits to the manifest.`, nodeId: destination.id })
    const logged = addLog(travelled, { kind: 'travel', title: `Arrived at ${destination.name}`, detail: `${fuelCost} fuel spent; ${damage} hull integrity lost.`, nodeId: destination.id })
    return notify(logged, 'Route complete', `${destination.name} is online. ${damage ? `${damage} hull lost in transit.` : 'The sky was kind.'}`, damage > 2 ? 'coral' : 'teal')
  }

  if (action.type === 'SURVEY') {
    const target = NODES[action.nodeId]
    if (!target || !target.hidden || state.discoveredNodes.includes(target.id)) return notify(state, 'Nothing new to chart', 'Select an uncharted signal connected to your current port.', 'muted')
    if (!isRouteBetween(state.currentNodeId, target.id)) return notify(state, 'Signal too distant', 'Survey only reaches signals connected to your current route.', 'coral')
    const nextActionState = spendAction(state)
    if (!nextActionState) return notify(state, 'No command slots left', 'End the watch to reset your command deck.', 'coral')
    const fuelCost = 1
    const insightCost = state.upgrades.includes('array') ? 0 : 1
    if (state.fuel < fuelCost) return notify(state, 'Signal fuel depleted', 'The longglass needs one fuel to hold a lock.', 'coral')
    if (state.insight < insightCost) return notify(state, 'Not enough Insight', 'Read more field notes, or hire a Listener to work the signal.', 'coral')
    const insightGain = 1 + (state.crewIds.includes('vesper') ? 1 : 0) + (getWeather(state).code === 'POL' ? 1 : 0)
    let next = {
      ...nextActionState,
      discoveredNodes: [...state.discoveredNodes, target.id],
      fuel: state.fuel - fuelCost,
      insight: state.insight - insightCost + insightGain,
      selectedNodeId: target.id,
    }
    next = incrementStats(next, 'surveys')
    const logged = addLog(next, { kind: 'intel', title: `Signal resolved: ${target.name}`, detail: target.scanText, nodeId: target.id })
    return notify(logged, 'New route charted', `${target.name} added to the Meridian. +${insightGain} Insight.`, 'violet')
  }

  if (action.type === 'ACCEPT_CONTRACT') {
    const contract = state.contracts.find((item) => item.id === action.contractId)
    const active = state.contracts.filter((item) => item.status === 'active').length
    if (!contract || contract.status !== 'open') return notify(state, 'Offer unavailable', 'That notice has already moved on.', 'coral')
    if (active >= 2) return notify(state, 'Two jobs is enough risk', 'Complete or abandon an active contract before taking another.', 'coral')
    const next = {
      ...state,
      contracts: state.contracts.map((item) => item.id === contract.id ? { ...item, status: 'active', acceptedDay: state.day } : item),
    }
    const logged = addLog(next, { kind: 'contract', title: `Contract accepted: ${contract.title}`, detail: `Deliver ${contract.amount} ${RESOURCES[contract.cargo].name} to ${NODES[contract.destination].name}.` })
    return notify(logged, 'Work on the board', `${contract.title} is now active.`, 'gold')
  }

  if (action.type === 'COMPLETE_CONTRACT') {
    const contract = state.contracts.find((item) => item.id === action.contractId)
    if (!contract || contract.status !== 'active') return state
    if (state.currentNodeId !== contract.destination) return notify(state, `Not at ${NODES[contract.destination].name}`, 'Travel to the destination before turning in this manifest.', 'coral')
    if ((state.inventory[contract.cargo] ?? 0) < contract.amount) return notify(state, 'Manifest incomplete', `You need ${contract.amount} ${RESOURCES[contract.cargo].name} in the hold.`, 'coral')
    const faction = FACTIONS[contract.factionId]
    const next = {
      ...state,
      credits: state.credits + contract.reward,
      renown: state.renown + contract.renown,
      reputation: { ...state.reputation, [contract.factionId]: state.reputation[contract.factionId] + contract.renown },
      inventory: { ...state.inventory, [contract.cargo]: state.inventory[contract.cargo] - contract.amount },
      contracts: state.contracts.map((item) => item.id === contract.id ? { ...item, status: 'complete', completedDay: state.day } : item),
    }
    const logged = addLog(incrementStats(incrementStats(next, 'contractsCompleted'), 'creditsEarned', contract.reward), { kind: 'contract', title: `${contract.title} delivered`, detail: `${contract.reward} credits and ${contract.renown} ${faction.name} renown earned.` })
    return notify(logged, 'Contract cleared', `+${contract.reward} credits · +${contract.renown} renown`, 'teal')
  }

  if (action.type === 'END_CYCLE') {
    const nextDay = state.day + 1
    const nextWeatherIndex = (state.weatherIndex + 1) % WEATHER.length
    const nextShift = Object.fromEntries(Object.keys(RESOURCES).map((resourceId) => [resourceId, clamp((state.marketShift[resourceId] ?? 0) + (Math.random() > 0.5 ? 1 : -1), -3, 3)]))
    const nextPressure = Object.fromEntries(Object.entries(state.marketPressure).map(([nodeId, resources]) => [nodeId, Object.fromEntries(Object.entries(resources).map(([resourceId, value]) => [resourceId, value > 0 ? value - 1 : value < 0 ? value + 1 : 0]))]))
    const expiredContracts = state.contracts.filter((item) => (item.status === 'open' || item.status === 'active') && item.expiresAt <= nextDay).map((item) => item.id)
    const event = getWorldEvent(nextDay, nextWeatherIndex)
    let next = {
      ...state,
      day: nextDay,
      cycle: Math.ceil(nextDay / 3),
      actionPoints: state.maxActionPoints,
      fuel: clamp(state.fuel + (getWeather(state).code === 'NGT' ? 2 : 3), 0, state.maxFuel),
      morale: clamp(state.morale + (state.currentNodeId === 'asterfall' ? 5 : 2), 0, 100),
      weatherIndex: nextWeatherIndex,
      marketShift: nextShift,
      marketPressure: nextPressure,
      contracts: state.contracts.map((item) => expiredContracts.includes(item.id) ? { ...item, status: 'expired' } : item),
      stats: { ...state.stats, events: state.stats.events + 1 },
    }
    next = addLog(next, { kind: 'system', title: event.title, detail: event.detail })
    if (expiredContracts.length) next = addLog(next, { kind: 'warning', title: `${expiredContracts.length} notice${expiredContracts.length > 1 ? 's' : ''} expired`, detail: 'The board rewards movement, not good intentions.' })
    return notify(next, `Watch ${String(nextDay).padStart(2, '0')} begins`, `${event.title} · ${getWeather(next).name}`, 'violet')
  }

  if (action.type === 'REPAIR') {
    const missing = getMaxHull(state) - state.hull
    if (missing <= 0) return notify(state, 'Hull is pristine', 'There is nothing for the dockhands to repair.', 'muted')
    const cost = missing * 3
    if (state.credits < cost) return notify(state, 'Repair credit denied', `The dock wants ${cost} credits for a full patch job.`, 'coral')
    const nextActionState = spendAction(state)
    if (!nextActionState) return notify(state, 'No command slots left', 'End the watch to reset your command deck.', 'coral')
    const next = { ...nextActionState, credits: state.credits - cost, hull: getMaxHull(state) }
    const logged = addLog(next, { kind: 'ship', title: 'Hull patches completed', detail: `${cost} credits paid at ${NODES[state.currentNodeId].name}.` })
    return notify(logged, 'Integrity restored', `Hull returned to ${getMaxHull(state)}.`, 'teal')
  }

  if (action.type === 'HIRE_CREW') {
    const crew = CREW.find((member) => member.id === action.crewId)
    if (!crew || state.crewIds.includes(crew.id)) return state
    if (state.credits < crew.cost) return notify(state, 'Contract declined', `${crew.name} needs ${crew.cost} credits up front.`, 'coral')
    const next = { ...state, credits: state.credits - crew.cost, crewIds: [...state.crewIds, crew.id], morale: clamp(state.morale + 5, 0, 100) }
    const logged = addLog(next, { kind: 'crew', title: `${crew.name} came aboard`, detail: `${crew.role} · ${crew.effect}` })
    return notify(logged, 'New hand aboard', `${crew.name} changes the way the Wayfarer works.`, 'teal')
  }

  if (action.type === 'BUY_UPGRADE') {
    const upgrade = UPGRADES.find((item) => item.id === action.upgradeId)
    if (!upgrade || state.upgrades.includes(upgrade.id)) return state
    if (state.credits < upgrade.cost) return notify(state, 'Yard bid rejected', `${upgrade.name} costs ${upgrade.cost} credits.`, 'coral')
    const previousMaxHull = getMaxHull(state)
    const next = { ...state, credits: state.credits - upgrade.cost, upgrades: [...state.upgrades, upgrade.id] }
    const nextMaxHull = getMaxHull(next)
    if (nextMaxHull > previousMaxHull) next.hull += nextMaxHull - previousMaxHull
    const logged = addLog(next, { kind: 'ship', title: `${upgrade.name} installed`, detail: upgrade.effect })
    return notify(logged, 'Yard work complete', `${upgrade.name} is now part of the Wayfarer.`, 'gold')
  }

  return state
}

function getWorldEvent(day, weatherIndex) {
  const events = [
    { title: 'A route went quiet', detail: 'One of the minor beacons has stopped answering. Traders are taking the long way around.' },
    { title: 'A price rumor catches', detail: 'Three ports received the same anonymous forecast. The market moved before the news did.' },
    { title: 'Someone is building', detail: 'Hammer noise carries across the cloud shelf. No faction has claimed the construction.' },
    { title: 'The sky remembers', detail: 'A pre-Collapse broadcast bleeds into every public channel for six minutes, then vanishes.' },
    { title: 'A new flag at the dock', detail: `The weather turns ${WEATHER[weatherIndex].name.toLowerCase()}. A stranger is asking about your route license.` },
  ]
  return events[(day + weatherIndex) % events.length]
}
