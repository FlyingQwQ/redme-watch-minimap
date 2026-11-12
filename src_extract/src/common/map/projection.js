var MAX_MERCATOR_LAT = 85.0511287798066
var DEG_TO_RAD = Math.PI / 180
var RAD_TO_DEG = 180 / Math.PI

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function wrapLongitude(longitude) {
  if (!isFinite(longitude)) return NaN
  var wrapped = ((longitude + 180) % 360 + 360) % 360 - 180
  return wrapped === -180 && longitude > 0 ? 180 : wrapped
}

function normalizeLongitude(longitude) {
  var wrapped = wrapLongitude(longitude)
  if (!isFinite(wrapped)) return NaN
  return wrapped === 180 ? -180 : wrapped
}

function clampLatitude(latitude) {
  return clamp(latitude, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT)
}

function worldSize(zoom, tileSize) {
  return tileSize * Math.pow(2, zoom)
}

function lonLatToWorld(longitude, latitude, zoom, tileSize) {
  if (!isFinite(longitude) || !isFinite(latitude) || !isFinite(zoom) || !isFinite(tileSize)) {
    return { x: NaN, y: NaN }
  }
  var size = worldSize(zoom, tileSize)
  var lon = normalizeLongitude(longitude)
  var lat = clampLatitude(latitude) * DEG_TO_RAD
  var x = ((lon + 180) / 360) * size
  var sinLatitude = Math.sin(lat)
  var y = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * size
  return { x: x, y: clamp(y, 0, size) }
}

function worldToLonLat(x, y, zoom, tileSize) {
  if (!isFinite(x) || !isFinite(y) || !isFinite(zoom) || !isFinite(tileSize)) {
    return { longitude: NaN, latitude: NaN }
  }
  var size = worldSize(zoom, tileSize)
  var wrappedX = ((x % size) + size) % size
  var safeY = clamp(y, 0, size)
  var longitude = wrappedX / size * 360 - 180
  var n = Math.PI - 2 * Math.PI * safeY / size
  var latitude = RAD_TO_DEG * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
  return { longitude: normalizeLongitude(longitude), latitude: clampLatitude(latitude) }
}

function geoToTile(longitude, latitude, zoom) {
  var n = Math.pow(2, zoom)
  var point = lonLatToWorld(longitude, latitude, zoom, 256)
  return {
    x: Math.floor(point.x / 256),
    y: clamp(Math.floor(point.y / 256), 0, n - 1),
    z: zoom
  }
}

function tileToLonLat(x, y, zoom, tileSize) {
  return worldToLonLat(x * tileSize, y * tileSize, zoom, tileSize)
}

function tileParent(tile) {
  if (!tile || tile.z <= 0) return null
  return { x: Math.floor(tile.x / 2), y: Math.floor(tile.y / 2), z: tile.z - 1 }
}

function tileChildren(tile) {
  if (!tile || tile.z < 0) return []
  var z = tile.z + 1
  var x = tile.x * 2
  var y = tile.y * 2
  return [
    { x: x, y: y, z: z },
    { x: x + 1, y: y, z: z },
    { x: x, y: y + 1, z: z },
    { x: x + 1, y: y + 1, z: z }
  ]
}

function tileBounds(tile) {
  if (!tile || !isFinite(tile.x) || !isFinite(tile.y) || !isFinite(tile.z)) return null
  var count = Math.pow(2, tile.z)
  var north = tileToLonLat(0, tile.y, tile.z, 256).latitude
  var south = tileToLonLat(0, tile.y + 1, tile.z, 256).latitude
  return [tile.x / count * 360 - 180, south, (tile.x + 1) / count * 360 - 180, north]
}

function mod(value, divisor) {
  return ((value % divisor) + divisor) % divisor
}

module.exports = {
  MAX_MERCATOR_LAT: MAX_MERCATOR_LAT,
  clamp: clamp,
  wrapLongitude: wrapLongitude,
  normalizeLongitude: normalizeLongitude,
  clampLatitude: clampLatitude,
  worldSize: worldSize,
  lonLatToWorld: lonLatToWorld,
  worldToLonLat: worldToLonLat,
  geoToTile: geoToTile,
  tileToLonLat: tileToLonLat,
  tileParent: tileParent,
  tileChildren: tileChildren,
  tileBounds: tileBounds,
  mod: mod
}
