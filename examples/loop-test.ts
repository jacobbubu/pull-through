import looper from '../src/looper'

let l = 0
const next = looper(function() {
  if (++l <= 1000000) {
    console.log('in next', l)
    probablyAsync(next)
  } else {
    console.log('done')
  }
})

next()

function probablySync(cb: () => void) {
  cb()
}

function probablyAsync(cb: () => void) {
  setImmediate(cb, 0)
}
