import * as pull from 'pull-stream'
import through from '../src'

describe('simple', () => {
  const values = [1, 2, 3]
  it('emit error', done => {
    const err = new Error('expected error')
    pull(
      pull.values([1, 2, 3]),
      through(function(data) {
        this.emit('error', err)
      }),
      pull.collect(function(_err) {
        expect(_err).toBe(err)
        done()
      })
    )
  })

  it('through', done => {
    pull(
      pull.values(values),
      through(function(data: number) {
        this.queue(data * 10)
      }),
      pull.collect(function(err, ary) {
        expect(err).toBeFalsy()
        expect(ary).toEqual(values.map(x => x * 10))
        done()
      })
    )
  })

  it('through + default writer', done => {
    pull(
      pull.values(values),
      through(),
      pull.collect(function(err, ary) {
        expect(err).toBeFalsy()
        expect(ary).toEqual(values)
        done()
      })
    )
  })

  it('through + end', done => {
    pull(
      pull.values(values),
      through(
        function(data: number) {
          this.queue(data * 10)
        },
        function() {
          this.queue(40)
          this.queue(null)
        }
      ),
      pull.collect(function(err, ary) {
        expect(err).toBeFalsy()
        expect(ary).toEqual([...values.map(x => x * 10), 40])
        done()
      })
    )
  })

  it('through + end, falsy values', done => {
    pull(
      pull.values([0, 1, 2, 3]),
      through(
        function(data: number) {
          this.queue(data * 10)
        },
        function() {
          this.queue(40)
          this.queue(null)
        }
      ),
      pull.collect(function(err, ary) {
        expect(err).toBeFalsy()
        expect(ary).toEqual([0, ...values.map(x => x * 10), 40])
        done()
      })
    )
  })

  it('range error', done => {
    let n = 0
    pull(
      pull.count(1000000),
      through(function(data: number) {
        n += data
      }),
      pull.collect(function(_, res) {
        expect(n).toBe(500000500000)
        done()
      })
    )
  })

  it('pass error through', done => {
    const err = new Error('testing errors')

    pull(
      pull.error(err),
      through(console.log),
      pull.collect(function(_err, _) {
        expect(_err).toBe(err)
        done()
      })
    )
  })

  it('pass abort back to source', done => {
    pull(
      pull.values(values, function() {
        done()
      }),
      through(function(data) {
        this.queue(data)
      }),
      pull.take(1),
      pull.collect(function(_, ary) {
        expect(ary).toEqual([1])
      })
    )
  })

  it('pass abort back to source in stalled stream', done => {
    let upstreamCbed = false
    const read = pull(
      pull.values(values, () => {
        upstreamCbed = true
      }),
      pull.asyncMap(function(d, cb) {
        setImmediate(() => cb(null, d))
      }),
      through(_ => {
        // Do nothing. This will make through read ahead some more.
      })
    )

    let previousCbed = false

    read(null, function(_, data) {
      expect(upstreamCbed).toBeTruthy()
      previousCbed = true
    })

    read(true, function(_) {
      expect(previousCbed).toBeTruthy()
      done()
    })
  })

  it('abort source on error', done => {
    const err = new Error('intentional')

    pull(
      pull.values(values, function(_err) {
        expect(_err).toBe(err)
      }),
      through(function(data) {
        // Do nothing. This will make through read ahead some more.
        this.emit('error', err)
      }),
      pull.collect(function(_err) {
        expect(_err).toBe(err)
        done()
      })
    )
  })

  it('abort source on end within writer', done => {
    const err = new Error('intentional')

    pull(
      pull.values(values),
      through(function(data) {
        // Do nothing. This will make through read ahead some more.
        this.emit('end', err)
      }),
      pull.collect(function(_err) {
        expect(_err).toBeFalsy()
        done()
      })
    )
  })

  it('emit data', done => {
    const err = new Error('intentional')

    pull(
      pull.values(values),
      through(function(data: number) {
        this.emit('data', data * 10)
      }),
      pull.collect(function(_err, ary) {
        expect(_err).toBeFalsy()
        expect(ary).toEqual(values.map(x => x * 10))
        done()
      })
    )
  })
})
