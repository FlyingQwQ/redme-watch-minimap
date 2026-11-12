// Small overlays only; no image buffers or per-tile timers.
function build(plans, tiles, ready, errors, manager, width, height) {
  var sources = {}
  var decoding = null
  for (var i = 0; i < tiles.length; i += 1) sources[tiles[i].id] = tiles[i].src
  for (var j = 0; j < plans.length; j += 1) {
    var plan = plans[j]
    var src = sources[plan.key]
    if (errors[plan.key]) continue
    if (src && ready[plan.key] === src) continue
    var x1 = Math.max(0, plan.left)
    var y1 = Math.max(0, plan.top)
    var x2 = Math.min(width, plan.left + plan.size)
    var y2 = Math.min(height, plan.top + plan.size)
    if (x2 <= x1 || y2 <= y1) continue
    var state = src ? 'decoding' : manager ? manager.getTileState(plan.key) : 'queued'
    if (src && errors[plan.key] === src) state = 'failed'
    if (state !== 'loading' && state !== 'decoding') continue
    var indicator = {
      id: plan.key,
      left: (x1 + x2) / 2 - 16,
      top: (y1 + y2) / 2 - 16,
      angle: 0,
      active: true,
      color: '#a8d6df',
      label: '加载'
    }
    if (state === 'loading') return [indicator]
    if (!decoding) decoding = indicator
  }
  return decoding ? [decoding] : []
}
module.exports = { build: build }
