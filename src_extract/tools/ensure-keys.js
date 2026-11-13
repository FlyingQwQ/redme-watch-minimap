// Build/test helper: the Tianditu key lives in a git-ignored local file so the
// public repository never carries a private quota key. Copy the tracked example
// into place when the real file is missing, so fresh clones still build; the
// placeholder key simply fails requests until the developer pastes a real one.
var fs = require('fs')
var path = require('path')

var target = path.join(__dirname, '..', 'src', 'common', 'map', 'tianditu-key.js')
var example = path.join(__dirname, '..', 'src', 'common', 'map', 'tianditu-key.example.js')

if (!fs.existsSync(target)) {
  fs.copyFileSync(example, target)
  console.log('[ensure-keys] created tianditu-key.js from example (placeholder key)')
}
