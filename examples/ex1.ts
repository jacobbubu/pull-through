import * as pull from 'pull-stream'
import through from '../src'

pull(
  pull.values([1, 2, 3]),
  through(function(data: number) {
    this.queue(data * 10)
  }),
  pull.collect(function(err, ary) {
    if (err) throw err
    console.log(ary)
  })
)
