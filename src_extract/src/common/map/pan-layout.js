// The steady pan path creates no lookup table, output list, or image node.
var NO_ERRORS = {}
function update(tiles, previous, center, zoom, size, width, height, scale, errors) {
  if (!tiles.length) return previous.length ? [] : previous
  errors = errors || NO_ERRORS
  var worldSize = Math.pow(2, zoom) * size
  var halfWorld = worldSize / 2
  var halfWidth = width / 2
  var baseY = height / 2 - center.y
  var next = null
  var visibleCount = 0
  for (var j = 0; j < tiles.length; j += 1) {
    var tile = tiles[j]
    if (tile.z !== zoom || errors[tile.id] === tile.src) continue
    var dx = tile.x * size - center.x
    if (dx > halfWorld || dx <= -halfWorld) dx += Math.round(-dx / worldSize) * worldSize
    var left = Math.round((dx + halfWidth) * scale) / scale
    var top = Math.round((tile.y * size + baseY) * scale) / scale
    if (left + size <= 0 || top + size <= 0 || left >= width || top >= height) continue
    var node = previous[visibleCount]
    if (!node || node.id !== tile.id || node.src !== tile.src) {
      node = null
      for (var i = 0; i < previous.length; i += 1) {
        if (previous[i].id === tile.id && previous[i].src === tile.src) { node = previous[i]; break }
      }
      if (!node) node = { id: tile.id, src: tile.src, left: left, top: top, width: size, height: size, drawWidth: size + 1, drawHeight: size + 1 }
      if (!next) next = previous.slice(0, visibleCount)
    }
    if (node.left !== left) node.left = left
    if (node.top !== top) node.top = top
    if (next) next.push(node)
    visibleCount += 1
  }
  if (next) return next
  return visibleCount === previous.length ? previous : previous.slice(0, visibleCount)
}
module.exports = { update: update }
