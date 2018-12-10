const { EventEmitter } = require('events')
const present = require('present')

const timer = (tickrate = 128) => {
  const state = {
    interval: 1000 / tickrate,
    startingPoint: 0,
    startingOffset: 0,
    current: 0,
    running: null
  }

  const emitter = new EventEmitter()

  const run = () => {
    state.running = null

    const { startingPoint, interval, startingOffset } = state
    const now = present()

    const getRemaining = () => startingPoint + interval * (state.current - startingOffset) - now
    if (getRemaining() <= 0) tick()

    state.running = setTimeout(() => {
      tick()
      run()
    }, Math.ceil(Math.max(getRemaining(), 0)))
  }

  const tick = () => {
    emitter.emit('tick', state.current)
    state.current += 1
  }

  const sync = ({ tick, length = 0, tickrate }) => {
    if (tick == null) throw new TypeError('tick required for synchronization')
    if (state.running) clearInterval(state.running)

    state.startingPoint = present() - length / 2 - state.interval * (tick % 1)
    state.startingOffset = Math.floor(tick)
    if (!state.running) state.current = state.startingOffset // if it is running, let it tick up from there
    if (tickrate) state.interval = 1000 / tickrate

    emitter.emit('start', { tick: state.current, tickrate: 1000 / state.interval, sync: true })
    run()
  }

  const getSync = () => {
    if (!state.running) return null

    const now = present()
    return (now - state.startingPoint) / state.interval + state.startingOffset
  }

  const start = (tick = 0) => {
    stop()

    state.startingPoint = present()
    state.current = state.startingOffset = tick

    emitter.emit('start', { tick: state.current, tickrate: 1000 / state.interval, sync: false })
    emitter.emit('sync', { tick: state.current, tickrate: 1000 / state.interval })
    run()
  }

  const stop = () => {
    if (!state.running) return

    clearInterval(state.running)
    state.running = null

    emitter.emit('stop')
  }

  const resume = () => {
    if (state.running) return

    start(state.current)
  }

  emitter.start = start
  emitter.stop = stop
  emitter.resume = resume
  emitter.sync = sync
  emitter.getSync = getSync
  Object.defineProperties(emitter, {
    tick: {
      get: () => state.current,
      enumerable: true,
      configurable: true
    },
    tickrate: {
      get: () => 1000 / state.interval,
      enumerable: true,
      configurable: true
    },
    running: {
      get: () => Boolean(state.running),
      enumerable: true,
      configurable: true
    }
  })

  return emitter
}

module.exports = timer
