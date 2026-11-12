var Projection = require('./projection')
var Config = require('./config')

function MapEngine(options) {
  options = options || {}
  this.zoom = Projection.clamp(options.zoom === undefined ? Config.INITIAL_ZOOM : options.zoom, Config.MIN_ZOOM, Config.MAX_ZOOM)
  this.center = {
    latitude: options.latitude === undefined ? Config.INITIAL_CENTER.latitude : options.latitude,
    longitude: options.longitude === undefined ? Config.INITIAL_CENTER.longitude : options.longitude
  }
  this.sourceId = options.sourceId || Config.TILE_SOURCE_ID
  this.tilePlan = null
  this.planBounds = null
  this.markerCache = null
  this.width = 0
  this.height = 0
  this.tileSize = Config.TILE_RASTER_SIZE
  this.setCenter(this.center.latitude, this.center.longitude)
}

MapEngine.prototype.setViewport = function (width, height, tileSize) {
  this.width = Math.max(0, Number(width) || 0)
  this.height = Math.max(0, Number(height) || 0)
  this.tileSize = Math.max(1, Number(tileSize) || Config.TILE_RASTER_SIZE)
}

MapEngine.prototype.setCenter = function (latitude, longitude) {
  if (!isFinite(latitude) || !isFinite(longitude)) return false
  this.center.latitude = Projection.clampLatitude(latitude)
  this.center.longitude = Projection.normalizeLongitude(longitude)
  return true
}

MapEngine.prototype.setZoom = function (zoom) {
  if (!isFinite(zoom)) return false
  this.zoom = Projection.clamp(Math.round(zoom), Config.MIN_ZOOM, Config.MAX_ZOOM)
  return true
}

MapEngine.prototype.centerWorld = function () {
  return Projection.lonLatToWorld(this.center.longitude, this.center.latitude, this.zoom, this.tileSize)
}

MapEngine.prototype.worldAtScreen = function (x, y, centerWorld) {
  var center = centerWorld || this.centerWorld()
  return {
    x: center.x + (Number(x) - this.width / 2),
    y: center.y + (Number(y) - this.height / 2)
  }
}

MapEngine.prototype.screenToLonLat = function (x, y, centerWorld) {
  var point = this.worldAtScreen(x, y, centerWorld)
  return Projection.worldToLonLat(point.x, point.y, this.zoom, this.tileSize)
}

MapEngine.prototype.panCenterWorld = function (startWorld, deltaX, deltaY) {
  var size = Projection.worldSize(this.zoom, this.tileSize)
  return {
    x: startWorld.x - deltaX,
    y: Projection.clamp(startWorld.y - deltaY, 0, size)
  }
}

MapEngine.prototype.commitWorldCenter = function (point) {
  var center = Projection.worldToLonLat(point.x, point.y, this.zoom, this.tileSize)
  this.setCenter(center.latitude, center.longitude)
}

MapEngine.prototype.zoomAround = function (nextZoom, screenX, screenY) {
  var target = Projection.clamp(Math.round(nextZoom), Config.MIN_ZOOM, Config.MAX_ZOOM)
  if (target === this.zoom) return false
  var anchor = this.worldAtScreen(screenX, screenY)
  var scale = Math.pow(2, target - this.zoom)
  var nextCenterWorld = {
    x: anchor.x * scale - (screenX - this.width / 2),
    y: anchor.y * scale - (screenY - this.height / 2)
  }
  this.zoom = target
  var center = Projection.worldToLonLat(nextCenterWorld.x, nextCenterWorld.y, target, this.tileSize)
  this.setCenter(center.latitude, center.longitude)
  return true
}

MapEngine.prototype.planVisibleTiles = function (centerWorld, edgeBuffer) {
  if (!this.width || !this.height) return []
  var center = centerWorld || this.centerWorld()
  var size = Projection.worldSize(this.zoom, this.tileSize)
  var buffer = Math.max(0, Number(edgeBuffer) || 0)
  var minX = Math.floor((center.x - this.width / 2 - buffer) / this.tileSize)
  var maxX = Math.floor((center.x + this.width / 2 + buffer - 0.0001) / this.tileSize)
  var minY = Math.max(0, Math.floor((center.y - this.height / 2 - buffer) / this.tileSize))
  var maxY = Math.min(Math.pow(2, this.zoom) - 1, Math.floor((center.y + this.height / 2 + buffer - 0.0001) / this.tileSize))
  var count = Math.pow(2, this.zoom)
  var cached = this.planBounds
  if (cached && cached.zoom === this.zoom && cached.sourceId === this.sourceId && cached.size === this.tileSize &&
      cached.minX === minX && cached.maxX === maxX && cached.minY === minY && cached.maxY === maxY) {
    for (var c = 0; c < this.tilePlan.length; c += 1) {
      var tile = this.tilePlan[c]
      tile.left = tile.unwrappedX * this.tileSize - center.x + this.width / 2
      tile.top = tile.y * this.tileSize - center.y + this.height / 2
    }
    return this.tilePlan
  }
  var tiles = []
  var x
  var y
  for (y = minY; y <= maxY; y += 1) {
    for (x = minX; x <= maxX; x += 1) {
      var wrappedX = Projection.mod(x, count)
      tiles.push({
        key: this.sourceId + ':' + this.zoom + ':' + wrappedX + ':' + y,
        z: this.zoom,
        x: wrappedX,
        unwrappedX: x,
        y: y,
        left: x * this.tileSize - center.x + this.width / 2,
        top: y * this.tileSize - center.y + this.height / 2,
        size: this.tileSize
      })
    }
  }
  this.tilePlan = tiles
  this.planBounds = { zoom: this.zoom, sourceId: this.sourceId, size: this.tileSize,
    minX: minX, maxX: maxX, minY: minY, maxY: maxY }
  return tiles
}

MapEngine.prototype.markerScreenPoint = function (latitude, longitude, centerWorld) {
  if (!isFinite(latitude) || !isFinite(longitude) || !this.width || !this.height) return null
  var center = centerWorld || this.centerWorld()
  var marker = this.markerCache
  if (!marker || marker.longitude !== longitude || marker.latitude !== latitude || marker.zoom !== this.zoom || marker.tileSize !== this.tileSize) {
    var projected = Projection.lonLatToWorld(longitude, latitude, this.zoom, this.tileSize)
    marker = { longitude: longitude, latitude: latitude, zoom: this.zoom, tileSize: this.tileSize,
      x: projected.x, y: projected.y, worldSize: Projection.worldSize(this.zoom, this.tileSize) }
    this.markerCache = marker
  }
  var size = marker.worldSize
  var dx = marker.x - center.x
  if (dx > size / 2) dx -= size
  if (dx < -size / 2) dx += size
  return { x: this.width / 2 + dx, y: this.height / 2 + marker.y - center.y }
}

module.exports = MapEngine
