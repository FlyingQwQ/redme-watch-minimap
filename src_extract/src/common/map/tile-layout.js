// 432x514 can intersect 3 columns x 4 rows at a tile boundary.
var MAX_RETAINED_TILES = 12

function physicalScreenWidth(deviceInfo, designWidth) {
  var info = deviceInfo || {}
  var width = Number(info.screenWidth)
  var density = Number(info.screenDensity)
  var design = Number(designWidth) || 432
  if (!(width > 0)) return design

  // Vela releases expose screenWidth as either physical width or logical width.
  // Watch 6 is 432 physical pixels wide; use DPR when the reported width is DP.
  if (width < design * 0.75) return width * (density > 1 ? density : 2)
  return width
}

function pixelScale(viewWidth, physicalWidth) {
  var width = Number(viewWidth)
  var physical = Number(physicalWidth)
  if (!(width > 0) || !(physical > 0)) return 1
  return physical / width
}

function styleTileSize(rasterSize, scale) {
  var raster = Number(rasterSize) || 256
  var ratio = Number(scale)
  if (!(ratio > 0)) ratio = 1
  return raster / ratio
}

function snap(value, scale) {
  var ratio = Number(scale)
  if (!(ratio > 0)) return value
  return Math.round(value * ratio) / ratio
}

function snappedRect(left, top, size, scale) {
  var x1 = snap(left, scale)
  var y1 = snap(top, scale)
  var x2 = snap(left + size, scale)
  var y2 = snap(top + size, scale)
  return { left: x1, top: y1, width: Math.max(0, x2 - x1), height: Math.max(0, y2 - y1) }
}

function nearestTileX(tile, centerWorld, tileSize) {
  var count = Math.pow(2, tile.z)
  var centerTileX = centerWorld.x / tileSize
  return tile.x + Math.round((centerTileX - tile.x) / count) * count
}

function layoutTile(tile, centerWorld, tileSize, width, height, scale) {
  var tileX = nearestTileX(tile, centerWorld, tileSize)
  var left = tileX * tileSize - centerWorld.x + width / 2
  var top = tile.y * tileSize - centerWorld.y + height / 2
  var rect = snappedRect(left, top, tileSize, scale)
  return {
    id: tile.id,
    key: tile.key || tile.id,
    src: tile.src,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    size: rect.width,
    z: tile.z,
    x: tile.x,
    unwrappedX: tileX,
    y: tile.y,
    stale: tile.stale
  }
}

function mergeVisibleTiles(targetTiles, previousTiles, centerWorld, zoom, tileSize, width, height, scale) {
  var seen = {}
  var result = []
  var current = targetTiles || []
  var previous = previousTiles || []
  var i

  for (i = 0; i < current.length && result.length < MAX_RETAINED_TILES; i += 1) {
    var loaded = layoutTile(current[i], centerWorld, tileSize, width, height, scale)
    if (loaded.left + loaded.width <= 0 || loaded.top + loaded.height <= 0 || loaded.left >= width || loaded.top >= height) continue
    if (seen[loaded.id]) continue
    seen[loaded.id] = true
    result.push(loaded)
  }

  for (i = 0; i < previous.length && result.length < MAX_RETAINED_TILES; i += 1) {
    var old = previous[i]
    var key = old.key || old.id
    if (!old.src || old.z !== zoom) continue
    if (seen[key]) continue
    var copy = layoutTile(old, centerWorld, tileSize, width, height, scale)
    if (copy.left + copy.size <= 0 || copy.top + copy.size <= 0 || copy.left >= width || copy.top >= height) continue
    seen[key] = true
    result.push(copy)
  }
  return result
}

module.exports = {
  MAX_RETAINED_TILES: MAX_RETAINED_TILES,
  physicalScreenWidth: physicalScreenWidth,
  pixelScale: pixelScale,
  styleTileSize: styleTileSize,
  snap: snap,
  snappedRect: snappedRect,
  nearestTileX: nearestTileX,
  layoutTile: layoutTile,
  mergeVisibleTiles: mergeVisibleTiles
}
