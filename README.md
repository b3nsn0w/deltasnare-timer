Synchronizable, stable timer for the Deltasnare engine

# Usage

```javascript
const timer = require('@deltasnare/timer')

const t = timer(128) // 128 ticks per second

t.on('tick', tick => console.log(`reached tick ${tick}`))

timer.start(0) // start from tick 0

console.log(`timer is at tick ${t.tick} and has a tickrate of ${t.tickrate}`)

// advanced stuff

t.sync({
  tick: 42.369, // server was at this tick at the moment of synchronization
  length: 52.2 // retrieving the tick took this long (milliseconds)
})

t.getSync() // get fractions of a tick from a running timer

t.stop()
t.resume()

t.on('sync', ({tick, tickrate}) => console.log('syncing clients'))

t.on('start', (tick) => console.log(`timer started on tick ${tick}`))
t.on('stop', () => console.log('timer stopped'))
```

Deltasnare's timer offers a few advantages over the default `setInterval()`. It can be stable on tick intervals that aren't integer milliseconds, it works based on events (with the timer itself being an event emitter), and it has tools for synchronizing timers between multiple clients.

The exported function constructs a timer with one argument:

### `timer(tickrate = 128)`

 - `tickrate`: specifies the number of ticks per second

From there, it has the following methods:

 - `timer.start(tick = 0)`: starts the timer on the given tick
 - `timer.stop()`: stops the timer
 - `timer.resume()`: resumes the timer from the tick it was stopped on
 - `timer.tick`: getter for the current tick
 - `timer.tickrate`: getter for the current tickrate
 - `timer.running`: getter, returns `true` if the timer is currently running
 - `timer.sync({tick, length = 0, tickrate?})`: synchronizes the timer, [see below](#synchronization)
 - `timer.getSync()`: returns the current tick when the timer is running

## Events

The timer emits different kinds of events, which are the main way of interacting with it:

### `tick`

The tick event is emitted every time the timer reaches a new tick. It has one parameter, the new tick ID. As long as the timer isn't stopped, it is guaranteed that the tick event hits every consecutive tick exactly once.

### `sync`

The sync event is emitted when the timer is started manually. A listener to this event could be used to "push" a synchronization to clients or other peers. The parameter is an event in the `{tick, tickrate}` format.

### `start`

Emitted whenever the timer is initialized to a certain value, either by manually starting the timer or by synchronizing it. For this reason `start` events may occurr even when the timer is already running.

This event has a parameter in the `{tick, tickrate, sync}` format, where `tick` and `tickrate` are the same as the timer properties, and `sync` is a boolean, set to true if the event was emitted as part of a synchronization.

### `stop`

Emitted when the timer is stopped. This event has no properties.

## Synchronization

One of the main properties of Deltasnare's timer is the ability to synchronize it, which can be done with the `sync()` and `getSync()` methods. It follows this synchronization flow:

```
      Local       |      Remote
starts sync       |                      -
----------- sync request ------------>   |
                  | getSync() called     | sync length
<---------- sync response ------------   |
sync() called     |                      -
```

There are three parameters to a synchronization:

 - `tick`: the precise tick on the remote at the moment getSync() is called
 - `length`: the length the entire request-response pair took, in milliseconds
 - `tickrate`: optional, if the server switches tickrate

These three parameters can be passed to the `sync()` function to synchronize a timer. Obtaining a synchronization data works in two ways:

 - if the local peer initiates, `getSync()` returns the `tick` and `length` is measured by the local peer
 - if the remote initiates with a `sync` event, it has `{tick, tickrate}` as its parameters, and `length` can be safely omitted (it defaults to zero)