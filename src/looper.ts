// https://github.com/dominictarr/looper

export default function<T extends Function>(fn: T) {
  let firstOrAsync = true
  let syncCalled = false

  return function() {
    syncCalled = true

    // exit if it's a synced re-entering
    if (firstOrAsync) {
      firstOrAsync = false
      while (syncCalled) {
        syncCalled = false
        // syncCalled would be true if we got here synchronously
        fn()
      }
      firstOrAsync = true
    }
  }
}

// Usage
// import looper from 'looper'

// let l = 100000
// const next = looper(function () {
//   if(--l) probablySync(next)
// })
// next()
