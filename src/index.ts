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
      ended = ended ?? end
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
        // if it's an error
        if (!_cb) return
        cb = _cb
        if (error) {
          _cb = null
          cb(error)
        } else if (queue.length > 0) {
          const data = queue.shift()
          _cb = null
          cb(data === null, data ?? undefined)
        } else {
          read(ended, function(end, data) {
            // null has no special meaning for pull-stream
            if (end && end !== true) {
              error = end
              return next()
            }
            ended = ended ?? end
            if (ended) {
              ender!.call(emitter, ended)
            } else if (data !== undefined && data !== null) {
              writer!.call(emitter, data)

              if (error || ended) {
                return read(error || ended, function() {
                  _cb = null

                  cb(error || ended)
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
