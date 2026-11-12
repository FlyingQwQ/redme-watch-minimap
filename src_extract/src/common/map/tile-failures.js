var TileLayout = require('./tile-layout')
// Geometry only: no image is created for a failed tile.
function build(plans, tiles, errors, manager, width, height, scale) {
  var sources = {}
  var result = []
  for (var i = 0; i < tiles.length; i += 1) sources[tiles[i].id] = tiles[i].src
  for (var j = 0; j < plans.length; j += 1) {
    var plan = plans[j]
    var src = sources[plan.key]
    var decodeFailed = src && errors[plan.key] === src
    var requestFailed = !src && manager && (manager.getTileState(plan.key) === 'failed' ||
      (manager.hasTileFailure && manager.hasTileFailure(plan.key)))
    if (!decodeFailed && !requestFailed) continue
    // Clip the border to the viewport: a partially visible failed tile must not
    // create a node or layout rect outside the screen.
    var left = Math.max(0, plan.left)
    var top = Math.max(0, plan.top)
    var right = Math.min(width, plan.left + plan.size)
    var bottom = Math.min(height, plan.top + plan.size)
    if (right <= left || bottom <= top) continue
    var rect = TileLayout.snappedRect(left, top, right - left, bottom - top, scale)
    result.push({ id: plan.key, key: plan.key, src: 'failure',
      left: rect.left, top: rect.top, width: rect.width, height: rect.height,
      size: plan.size, z: plan.z, x: plan.x, y: plan.y, unwrappedX: plan.unwrappedX })
  }
  return result
}
module.exports = { build: build }
