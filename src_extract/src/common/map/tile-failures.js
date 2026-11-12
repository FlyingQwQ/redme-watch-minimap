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
    if (plan.left + plan.size <= 0 || plan.top + plan.size <= 0 || plan.left >= width || plan.top >= height) continue
    var rect = TileLayout.snappedRect(plan.left, plan.top, plan.size, scale)
    result.push({ id: plan.key, key: plan.key, src: 'failure',
      left: rect.left, top: rect.top, width: rect.width, height: rect.height,
      size: plan.size, z: plan.z, x: plan.x, y: plan.y, unwrappedX: plan.unwrappedX })
  }
  return result
}
module.exports = { build: build }
