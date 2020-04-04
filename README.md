# @jacobbubu/pull-through

[![Build Status](https://travis-ci.org/jacobbubu/pull-through.svg)](https://travis-ci.org/jacobbubu/pull-through)
[![Coverage Status](https://coveralls.io/repos/github/jacobbubu/pull-through/badge.svg)](https://coveralls.io/github/jacobbubu/pull-through)
[![npm](https://img.shields.io/npm/v/@jacobbubu/pull-through.svg)](https://www.npmjs.com/package/@jacobbubu/pull-through/)

> Rewritten [through](https://github.com/dominictarr/through) in TypeScript.

## Example

Same Good Old Api, Brand New Underlying Mechanism.

``` js
import through from '@jacobbubu/pull-through'

const ts = through(function (data) {
  this.queue(data)
}, function (end) {
  this.queue(null)
})
```

Please see the test-cases for the detail.
