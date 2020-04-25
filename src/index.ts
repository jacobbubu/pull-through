import * as pull from 'pull-stream'
import looper from './looper'

export type Event = 'data' | 'end' | 'error'
export type QueueElem<Out> = Out | null
export interface Emitter<In, Out> {
  emit: (event: Event, data: In | pull.EndOrError) => void
  queue: (data: QueueElem<Out>) => void
}
export type Writer<In, Out> = (this: Emitter<In, Out>, data: In) => void
export type Ender<In, Out> = (this: Emitter<In, Out>, ended: pull.EndOrError) => void

export default function<In, Out>(writer?: Writer<In, Out>, ender?: Ender<In, Out>) {
  return function(read: pull.Source<In>) {
    const queue: QueueElem<Out>[] = []
    let ended: pull.EndOrError
    let error: pull.EndOrError

    function enqueue(data: QueueElem<Out>) {
      queue.push(data)
    }

    const emitter: Emitter<In, Out> = {
      emit: function(event, data) {
        if (event === 'data') {
          enqueue((data as any) as Out)
        }
        if (event === 'end') {
          ended = true
          enqueue(null)
        }
        if (event === 'error') {
          error = data as pull.EndOrError
        }
      },
      queue: enqueue
    }

    writer =
      writer ??
      function(data) {
        this.queue(data as any)
      }

    ender =
      ender ??
      function(_) {
        this.queue(null)
      }

    let _cb: pull.SourceCallback<Out> | null

    return function readForSink(end: pull.EndOrError, cb: pull.SourceCallback<Out>) {
      // downstream priority, first deal with downstream abortion needs
      ended = ended || end
      if (end) {
        return read(end, function() {
          // process previous cb first
          if (_cb) {
            const temp = _cb
            _cb = null
            temp(end)
          }
          cb(end)
        })
      }

      _cb = cb

      const next = looper(function() {
        if (!_cb) return
        const tempCb = _cb

        // if there is an error from upstream or emitted by writer
        if (error) {
          _cb = null
          tempCb(error)
        } else if (queue.length > 0) {
          const data = queue.shift()
          _cb = null
          // end the downstream if the data is null
          data === null ? tempCb(true) : tempCb(null, data)
        } else {
          read(ended, function(end, data) {
            if (end && end !== true) {
              // upstream returned an error
              // save it and wait for the next downstream read
              error = end
              return next()
            }
            // upstream has no more data to provide
            // or the emitter wants to end tis through stream
            ended = ended || end
            if (ended) {
              ender!.call(emitter, ended)
            } else if (data !== undefined && data !== null) {
              writer!.call(emitter, data)

              // both error and ended comes from emitter, so we need to notify upstream
              if (error || ended) {
                return read(error || ended, function() {
                  _cb = null
                  tempCb(error || ended)
                })
              }
            }
            next()
          })
        }
      })
      next()
    }
  }
}
