var assert = require('assert')
var fs = require('fs')
var Projection = require('../src/common/map/projection')
var MapEngine = require('../src/common/map/engine')
var TileManager = require('../src/common/map/tile-manager')
var LocationManager = require('../src/common/map/location-manager')
var Gestures = require('../src/common/map/gesture-controller')
var Config = require('../src/common/map/config')
var TileLayout = require('../src/common/map/tile-layout')

function pngHeader() {
  var bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82])
  bytes[18] = 1
  bytes[22] = 1
  return bytes
}

function testRasterBounds() {
  var valid = require('../src/common/map/image-metadata')
  assert.strictEqual(valid(pngHeader()), true)
  var oversized = pngHeader()
  oversized[17] = 32
  assert.strictEqual(valid(oversized), false, 'oversized decoded rasters are rejected')
  assert.strictEqual(valid(new Uint8Array(140000)), false, 'oversized response payloads are rejected')
  assert.strictEqual(valid(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])), false, 'truncated headers are rejected')
}

function near(actual, expected, epsilon, message) {
  assert.ok(Math.abs(actual - expected) <= epsilon, (message || 'values differ') + ': ' + actual + ' vs ' + expected)
}

function testProjection() {
  var equator = Projection.lonLatToWorld(0, 0, 0, 256)
  near(equator.x, 128, 1e-9, 'equator world x')
  near(equator.y, 128, 1e-9, 'equator world y')
  var tile = Projection.geoToTile(0, 0, 1)
  assert.deepStrictEqual(tile, { x: 1, y: 1, z: 1 })

  var reference = [
    { longitude: 0, latitude: 0, zoom: 0 },
    { longitude: 116.4074, latitude: 39.9042, zoom: 15 },
    { longitude: -73.9857, latitude: 40.7484, zoom: 18 },
    { longitude: 179.9999, latitude: -30, zoom: 8 },
    { longitude: -179.9999, latitude: 30, zoom: 12 }
  ]
  reference.forEach(function (point) {
    var world = Projection.lonLatToWorld(point.longitude, point.latitude, point.zoom, 256)
    var back = Projection.worldToLonLat(world.x, world.y, point.zoom, 256)
    near(back.latitude, point.latitude, 1e-8, 'latitude round trip')
    var longitudeError = Math.abs(Projection.normalizeLongitude(back.longitude - point.longitude))
    near(longitudeError, 0, 1e-8, 'longitude round trip')
  })

  var polarNorth = Projection.lonLatToWorld(0, 90, 12, 256)
  var polarSouth = Projection.lonLatToWorld(0, -90, 12, 256)
  near(polarNorth.y, 0, 1e-6, 'north Web Mercator limit')
  near(polarSouth.y, Projection.worldSize(12, 256), 1e-6, 'south Web Mercator limit')

  var edge = Projection.geoToTile(180, 0, 8)
  assert.strictEqual(edge.x, 0, '180 degree longitude wraps to first tile')
  var dateLine = Projection.worldToLonLat(Projection.worldSize(8, 256) - 1, 128 * Math.pow(2, 8), 8, 256)
  assert.ok(dateLine.longitude > 179.9 || dateLine.longitude < -179.9)

  var parent = Projection.tileParent({ x: 5, y: 7, z: 4 })
  assert.deepStrictEqual(parent, { x: 2, y: 3, z: 3 })
  assert.deepStrictEqual(Projection.tileChildren(parent), [
    { x: 4, y: 6, z: 4 }, { x: 5, y: 6, z: 4 },
    { x: 4, y: 7, z: 4 }, { x: 5, y: 7, z: 4 }
  ])
  var bounds = Projection.tileBounds({ x: 0, y: 0, z: 0 })
  near(bounds[0], -180, 1e-8)
  near(bounds[1], -Projection.MAX_MERCATOR_LAT, 1e-8)
  near(bounds[2], 180, 1e-8)
  near(bounds[3], Projection.MAX_MERCATOR_LAT, 1e-8)
}

function testEngine() {
  var engine = new MapEngine({ zoom: 15, latitude: 39.9042, longitude: 116.4074 })
  engine.setViewport(432, 514, 256)
  var center = engine.screenToLonLat(216, 257)
  near(center.latitude, 39.9042, 1e-8, 'viewport center latitude')
  near(center.longitude, 116.4074, 1e-8, 'viewport center longitude')

  var plans = engine.planVisibleTiles()
  assert.ok(plans.length >= 4 && plans.length <= 12, 'viewport tile count follows its dimensions')
  plans.forEach(function (item) {
    near(item.left + engine.centerWorld().x - 216, item.unwrappedX * 256, 1e-8, 'tile screen x')
    near(item.top + engine.centerWorld().y - 257, item.y * 256, 1e-8, 'tile screen y')
  })
  var wide = new MapEngine({ zoom: 8, latitude: 0, longitude: 0 })
  wide.setViewport(800, 700, 256)
  assert.ok(wide.planVisibleTiles().length > plans.length)

  var beforeAnchor = engine.screenToLonLat(100, 150)
  engine.zoomAround(16, 100, 150)
  var afterAnchor = engine.screenToLonLat(100, 150)
  near(afterAnchor.latitude, beforeAnchor.latitude, 1e-8, 'zoom anchor latitude remains fixed')
  near(Projection.normalizeLongitude(afterAnchor.longitude - beforeAnchor.longitude), 0, 1e-8, 'zoom anchor longitude remains fixed')

  var startWorld = engine.centerWorld()
  var movedWorld = engine.panCenterWorld(startWorld, 90, -24)
  engine.commitWorldCenter(movedWorld)
  var moved = engine.center
  assert.ok(moved.longitude < 116.4074, 'dragging right moves the geographic center west')
  assert.ok(moved.latitude > 39.9042, 'dragging up moves the geographic center north')

  engine.setCenter(0, 179.999)
  var dateLineStart = engine.centerWorld()
  var cross = engine.panCenterWorld(dateLineStart, 500, 0)
  engine.commitWorldCenter(cross)
  assert.ok(engine.center.longitude < -179 || engine.center.longitude > 179, 'panning across the date line wraps')
  assert.strictEqual(engine.setCenter(NaN, 0), false, 'invalid center rejected')
  engine.setZoom(99)
  assert.strictEqual(engine.zoom, Config.MAX_ZOOM)
  engine.setZoom(-10)
  assert.strictEqual(engine.zoom, Config.MIN_ZOOM)
}

function testGestures() {
  var event = { touches: [
    { identifier: 10, clientX: 50, clientY: 60 },
    { identifier: 11, clientX: 90, clientY: 60 }
  ] }
  var second = Gestures.getTouch(event, 11)
  assert.strictEqual(second.clientX, 90)
  var a = Gestures.getPoint(event.touches[0], { left: 10, top: 20 })
  var b = Gestures.getPoint(second, { left: 10, top: 20 })
  assert.deepStrictEqual(Gestures.midpoint(a, b), { x: 60, y: 40 })
  near(Gestures.distance(a, b), 40, 1e-9)
  near(Gestures.pinchScale(40, 60), 1.5, 1e-9)
  near(Gestures.pinchScale(40, 2), 0.6, 1e-9, 'pinch scale is bounded')
  var anchor = { x: 800, y: 400 }
  var startCenter = { x: 216, y: 257 }
  var movingCenter = { x: 224, y: 250 }
  var previewScale = 1.4
  var snappedCenter = Gestures.centerAfterPinch(anchor, startCenter, movingCenter, previewScale, 10, 11, 432, 514)
  var worldAtCurrent = {
    x: (anchor.x + movingCenter.x - startCenter.x) / previewScale,
    y: (anchor.y + movingCenter.y - startCenter.y) / previewScale
  }
  near(snappedCenter.x + movingCenter.x - 216, worldAtCurrent.x * 2, 1e-9, 'pinch keeps its x anchor fixed')
  near(snappedCenter.y + movingCenter.y - 257, worldAtCurrent.y * 2, 1e-9, 'pinch keeps its y anchor fixed')
}

function testTileLayout() {
  var reportedLogicalWidth = TileLayout.physicalScreenWidth({ screenWidth: 213.3, screenDensity: 2.025 }, 432)
  near(reportedLogicalWidth, 432.0, 0.1, 'logical device width is converted to physical raster width')
  near(TileLayout.physicalScreenWidth({ screenWidth: 432, screenDensity: 2.025 }, 432), 432, 1e-9,
    'physical device width is not multiplied by DPR twice')
  near(TileLayout.styleTileSize(256, TileLayout.pixelScale(432, 432)), 256, 1e-9,
    'raster tile uses the matching design-space size')

  var first = TileLayout.snappedRect(10.1, 20.2, 256.4, 2)
  var second = TileLayout.snappedRect(10.1 + 256.4, 20.2, 256.4, 2)
  near(first.left + first.width, second.left, 1e-9, 'adjacent raster tile edges snap to the same physical pixel')

  var tileCenter = { x: 4 * 256 + 120.25, y: 4 * 256 + 127.25 }
  var tileA = TileLayout.layoutTile({ id: 'a', z: 4, x: 4, y: 4 }, tileCenter, 256, 432, 514, 2)
  var tileRight = TileLayout.layoutTile({ id: 'b', z: 4, x: 5, y: 4 }, tileCenter, 256, 432, 514, 2)
  var tileBelow = TileLayout.layoutTile({ id: 'c', z: 4, x: 4, y: 5 }, tileCenter, 256, 432, 514, 2)
  near(tileA.left + tileA.width, tileRight.left, 1e-9, 'rendered horizontal tile bounds have no subpixel gap')
  near(tileA.top + tileA.height, tileBelow.top, 1e-9, 'rendered vertical tile bounds have no subpixel gap')

  var center = { x: 4 * 256 + 128 + 170, y: 4 * 256 + 128 }
  var retained = TileLayout.mergeVisibleTiles([], [{
    id: 'old', key: 'old', src: 'internal://files/old.png', z: 4, x: 4, unwrappedX: 4, y: 4
  }], center, 4, 256, 432, 514, 1)
  assert.strictEqual(retained.length, 1, 'visible previous tiles remain during a pan while new tiles load')
  assert.ok(retained[0].left + retained[0].size > 0 && retained[0].left < 432,
    'retained tiles are repositioned into the live viewport')
}

function makeFileApi(savedIndex) {
  var state = { indexText: savedIndex || '', files: {}, writes: 0, deletes: [] }
  var api = {
    mkdir: function (options) { options.success({}) },
    readText: function (options) {
      if (state.indexText) options.success({ text: state.indexText })
      else options.fail('not found', 301)
    },
    access: function (options) {
      if (state.files[options.uri]) options.success({})
      else options.fail('not found', 301)
    },
    list: function (options) {
      var fileList = Object.keys(state.files).map(function (uri) {
        return { uri: uri, length: state.files[uri].length || 0 }
      })
      options.success({ fileList: fileList })
    },
    writeArrayBuffer: function (options) {
      state.writes += 1
      state.files[options.uri] = options.buffer
      options.success({})
    },
    writeText: function (options) {
      state.indexText = options.text
      options.success({})
    },
    delete: function (options) {
      delete state.files[options.uri]
      state.deletes.push(options.uri)
      options.success({})
    }
  }
  return { api: api, state: state }
}

function testTileManager() {
  var file = makeFileApi()
  var network = { requests: [], fetch: function (options) { this.requests.push(options) } }
  var changes = []
  var statuses = []
  var manager = new TileManager(network, file.api, function (tiles, needed) {
    changes.push({ tiles: tiles, needed: needed })
  }, function (message) { statuses.push(message) })
  manager.setViewportSize(432, 514)
  manager.setVisible(true)
  var plans = []
  for (var i = 0; i < 5; i += 1) plans.push({
    key: 'osm-standard-v1:10:' + i + ':4', z: 10, x: i, unwrappedX: i, y: 4,
    left: i * 256, top: 0, size: 256
  })
  manager.setPlan(plans)
  assert.strictEqual(network.requests.length, Config.REQUEST_CONCURRENCY, 'request concurrency is capped by configuration')
  assert.strictEqual(network.requests[0].header['User-Agent'], Config.USER_AGENT, 'tile provider receives application identity')
  assert.strictEqual(network.requests[0].responseType, 'arraybuffer')

  var completed = {}
  var attempts = 0
  while (attempts < 20) {
    var found = null
    var foundIndex = -1
    for (var j = 0; j < network.requests.length; j += 1) {
      if (!completed[j]) { found = network.requests[j]; foundIndex = j; break }
    }
    if (!found) break
    completed[foundIndex] = true
    attempts += 1
    found.success({
      code: 200,
      headers: { 'cache-control': 'public, max-age=604800', etag: 'test-' + foundIndex },
      data: pngHeader()
    })
    assert.ok(manager.activeCount <= Config.REQUEST_CONCURRENCY, 'active network requests never exceed the configured limit')
  }
  assert.strictEqual(network.requests.length, 5, 'each desired tile is fetched once')
  assert.strictEqual(file.state.writes, 5, 'tile bytes are persisted locally')
  assert.strictEqual(manager.activeCount, 0)
  assert.strictEqual(manager.disk['osm-standard-v1:10:0:4'].expires > Date.now(), true)
  assert.ok(changes[changes.length - 1].tiles.length >= 4, 'loaded tiles are exposed to the native image layer')
  assert.ok(file.state.indexText.indexOf('osm-standard-v1:10:0:4') >= 0, 'cache index is saved')

  manager.destroy()
  var persisted = file.state.indexText
  var restoredFile = makeFileApi(persisted)
  var restoredEntry = JSON.parse(persisted).entries['osm-standard-v1:10:0:4']
  restoredFile.state.files[restoredEntry.uri] = pngHeader()
  var restoredNetwork = { requests: [], fetch: function (options) { this.requests.push(options) } }
  var restored = new TileManager(restoredNetwork, restoredFile.api, function () {}, function () {})
  restored.setVisible(true)
  restored.setPlan([plans[0]])
  assert.strictEqual(restoredNetwork.requests.length, 0, 'unexpired on-disk cache avoids a duplicate request')
  assert.strictEqual(restored.memory[plans[0].key].uri, restoredEntry.uri)
  restored.destroy()

  var expiredKey = plans[0].key
  var expiredUri = Config.TILE_DIRECTORY + 'expired.png'
  var expiredRecord = {
    uri: expiredUri, size: 8, saved: Date.now() - 10000, used: Date.now() - 10000,
    expires: 0, etag: 'prior-etag', lastModified: 'Tue, 01 Jan 2030 00:00:00 GMT'
  }
  var expiredIndex = JSON.stringify({ version: 1, entries: (function () {
    var entries = {}
    entries[expiredKey] = expiredRecord
    return entries
  })() })
  var expiredFile = makeFileApi(expiredIndex)
  expiredFile.state.files[expiredUri] = pngHeader()
  var expiredNetwork = { requests: [], fetch: function (options) { this.requests.push(options) } }
  var expired = new TileManager(expiredNetwork, expiredFile.api, function () {}, function () {})
  expired.setVisible(true)
  expired.setPlan([plans[0]])
  assert.strictEqual(expiredNetwork.requests.length, 1, 'expired cache entries are revalidated')
  assert.strictEqual(expiredNetwork.requests[0].header['If-None-Match'], 'prior-etag')
  assert.strictEqual(expiredNetwork.requests[0].header['If-Modified-Since'], expiredRecord.lastModified)
  expiredNetwork.requests[0].success({ code: 304, headers: { 'cache-control': 'public, max-age=3600' }, data: new Uint8Array(0) })
  assert.strictEqual(expired.memory[expiredKey].uri, expiredUri, '304 keeps the cached tile bytes')
  assert.ok(expired.memory[expiredKey].expires > Date.now(), '304 updates the cache freshness window')
  expired.destroy()

  var forbiddenFile = makeFileApi()
  var forbiddenNetwork = { requests: [], fetch: function (options) { this.requests.push(options) } }
  var forbidden = new TileManager(forbiddenNetwork, forbiddenFile.api, function () {}, function () {})
  forbidden.setVisible(true)
  forbidden.setPlan([plans[0]])
  forbiddenNetwork.requests[0].success({ code: 403, headers: {}, data: new Uint8Array(0) })
  forbidden.setPlan([plans[0]])
  assert.strictEqual(forbiddenNetwork.requests.length, 1, '403 does not trigger a request loop')
  forbidden.retryVisible()
  assert.strictEqual(forbiddenNetwork.requests.length, 2, 'manual retry can retry a blocked visible tile')
  forbidden.destroy()
  forbiddenNetwork.requests[1].fail('closed', -1)

  var tempFile = makeFileApi()
  var tempNetwork = { requests: [], fetch: function (options) { this.requests.push(options) } }
  var temp = new TileManager(tempNetwork, tempFile.api, function () {}, function () {})
  temp.directoryReady = false
  temp.ready = true
  temp.setVisible(true)
  temp.setPlan([plans[0]])
  assert.strictEqual(tempNetwork.requests[0].responseType, 'file', 'temporary image URI is the no-file-storage fallback')
  tempNetwork.requests[0].success({ code: 200, headers: { 'cache-control': 'no-store' }, data: 'internal://tmp/map-tile.png' })
  assert.strictEqual(temp.memory[plans[0].key].noStore, true)
  temp.setVisible(false)
  assert.strictEqual(temp.memory[plans[0].key], undefined, 'temporary no-store images are released when hidden')
  temp.destroy()
  assert.strictEqual(statuses.length, 0)

  var failedWriteFile = makeFileApi()
  failedWriteFile.api.writeArrayBuffer = function (options) {
    failedWriteFile.state.writes += 1
    options.fail('storage unavailable', 300)
  }
  var fallbackNetwork = { requests: [], fetch: function (options) { this.requests.push(options) } }
  var fallback = new TileManager(fallbackNetwork, failedWriteFile.api, function () {}, function () {})
  fallback.setVisible(true)
  fallback.setPlan([plans[0]])
  fallbackNetwork.requests[0].success({
    code: 200,
    headers: { 'cache-control': 'public, max-age=3600' },
    data: pngHeader()
  })
  assert.strictEqual(fallbackNetwork.requests.length, 2, 'failed local writes fall back to a Vela temporary image URI')
  assert.strictEqual(fallbackNetwork.requests[1].responseType, 'file')
  fallbackNetwork.requests[1].success({
    code: 200,
    headers: { 'cache-control': 'no-store' },
    data: 'internal://tmp/fallback-map-tile.png'
  })
  assert.strictEqual(fallback.memory[plans[0].key].uri, 'internal://tmp/fallback-map-tile.png')
  fallback.destroy()
}

function testHongKongDefaultAndMathCaches() {
  var engine = new MapEngine()
  engine.setViewport(432, 514, 256)
  near(engine.center.latitude, 22.2819, 1e-9, 'default center is Hong Kong')
  near(engine.center.longitude, 114.1589, 1e-9)
  var center = engine.centerWorld()
  var boundary = new MapEngine({ zoom: 10, latitude: 0, longitude: 0 })
  boundary.setViewport(432, 514, 256)
  var boundaryWorld = boundary.centerWorld()
  boundaryWorld.x += 128
  var boundaryPlan = boundary.planVisibleTiles(boundaryWorld)
  assert.strictEqual(boundaryPlan.length, 12, '514px viewport can touch four tile rows')
  var loadedBoundary = boundaryPlan.map(function (t) { t.id = t.key; t.src = 'boundary.png'; return t })
  var mergedBoundary = TileLayout.mergeVisibleTiles(loadedBoundary, [], boundaryWorld, 10, 256, 432, 514, 1)
  assert.strictEqual(mergedBoundary.length, 12, 'memory profile must not truncate actually visible boundary tiles')
  var first = engine.planVisibleTiles(center)
  var left = first[0].left
  var same = engine.planVisibleTiles({ x: center.x + 0.01, y: center.y })
  assert.strictEqual(same, first, 'unchanged tile bounds reuse the plan and tile records')
  near(same[0].left, left - 0.01, 1e-6)
  var oldLeft = same[0].left
  var next = engine.planVisibleTiles({ x: center.x + 256, y: center.y })
  assert.notStrictEqual(next, first, 'crossing a tile boundary produces a new plan')
  near(first[0].left, oldLeft, 1e-6, 'old request plan is not overwritten by the new tile range')
  engine.sourceId = 'osm-standard-v1'
  assert.notStrictEqual(engine.planVisibleTiles(center), next, 'provider change invalidates the cached plan')
  var original = Projection.lonLatToWorld
  var count = 0
  Projection.lonLatToWorld = function () { count += 1; return original.apply(null, arguments) }
  try {
    engine.markerScreenPoint(22.28, 114.15, center)
    var cached = engine.markerCache
    engine.markerScreenPoint(22.28, 114.15, { x: center.x + 10, y: center.y })
    assert.strictEqual(count, 1, 'panning does not repeatedly project an unchanged GPS point')
    assert.strictEqual(engine.markerCache, cached)
    engine.markerScreenPoint(22.29, 114.15, center)
    assert.strictEqual(count, 2, 'new GPS coordinates invalidate projection cache')
    engine.setZoom(engine.zoom + 1)
    engine.markerScreenPoint(22.29, 114.15, { x: center.x * 2, y: center.y * 2 })
    assert.strictEqual(count, 3, 'zoom invalidates projection cache')
    engine.setViewport(432, 514, 128)
    engine.markerScreenPoint(22.29, 114.15, center)
    assert.strictEqual(count, 4, 'tile scale invalidates projection cache')
  } finally { Projection.lonLatToWorld = original }
}

function testFailureBorders() {
  var failures = require('../src/common/map/tile-failures')
  var plans = [
    { key: 'network', left: 0, top: 0, size: 256, z: 10, x: 1, y: 1 },
    { key: 'decode', left: 256, top: 0, size: 256, z: 10, x: 2, y: 1 },
    { key: 'cached', left: 0, top: 256, size: 256, z: 10, x: 1, y: 2 },
    { key: 'outside', left: 800, top: 0, size: 256, z: 10, x: 4, y: 1 }
  ]
  var manager = { getTileState: function () { return 'failed' } }
  var tiles = [{ id: 'decode', src: 'bad.png' }, { id: 'cached', src: 'cached.png' }]
  var result = failures.build(plans, tiles, { decode: 'bad.png' }, manager, 432, 514, 1)
  assert.strictEqual(result.length, 2, 'only visible failed tiles get borders, valid cached images remain unmarked')
  assert.strictEqual(result[0].id, 'network')
  assert.strictEqual(result[1].id, 'decode')
  assert.strictEqual(result[1].width, 256, 'border follows complete tile geometry so pan updates stay aligned')
  assert.ok(result.every(function (node) { return node.left < 432 && node.top < 514 && node.left + node.width > 0 && node.top + node.height > 0 }), 'only viewport-intersecting tiles get borders')
  var retrying = { getTileState: function () { return 'queued' }, hasTileFailure: function () { return true } }
  assert.strictEqual(failures.build([plans[0]], [], {}, retrying, 432, 514, 1).length, 1, 'failure border remains while automatic retry waits')
  tiles[0].src = 'recovered.png'
  assert.strictEqual(failures.build(plans, tiles, { decode: 'bad.png' }, manager, 432, 514, 1).length, 1, 'new successful image clears the decode failure border')
}

function testPanNodeReuse() {
  var PanLayout = require('../src/common/map/pan-layout')
  var engine = new MapEngine({ zoom: 10, latitude: 0, longitude: 0 })
  engine.setViewport(432, 514, 256)
  var center = engine.centerWorld()
  var tiles = engine.planVisibleTiles().map(function (t) { t.id = t.key; t.src = 'internal://map.png'; return t })
  var first = PanLayout.update(tiles, [], center, 10, 256, 432, 514, 1, {})
  var left = first[0].left
  first.forEach(function (node) {
    Object.defineProperty(node, 'width', { get: function () { return 256 }, set: function () { assert.fail('pan must not resize native images') } })
    Object.defineProperty(node, 'height', { get: function () { return 256 }, set: function () { assert.fail('pan must not resize native images') } })
  })
  var next = PanLayout.update(tiles, first, { x: center.x + 12, y: center.y }, 10, 256, 432, 514, 1, {})
  assert.strictEqual(next, first, 'normal pan retains the image list and nodes')
  near(next[0].left, left - 12, 1e-8)
  assert.strictEqual(PanLayout.update(tiles, first, { x: center.x + 5000, y: center.y }, 10, 256, 432, 514, 1, {}).length, 0)
  engine.setCenter(10, 179.99)
  center = engine.centerWorld()
  tiles = engine.planVisibleTiles().map(function (t) { t.id = t.key; t.src = 'internal://map.png'; return t })
  next = PanLayout.update(tiles, [], { x: center.x + 30, y: center.y }, 10, 256, 432, 514, 1, {})
  next.forEach(function (node) { assert.ok(node.left + node.width > 0 && node.left < 432, 'date-line pan remains inside the viewport') })
  assert.ok(next.length > 0)
}

function testTiandituProvider() {
  var Providers = require('../src/common/map/providers')
  var provider = Providers.get('tianditu-v1')
  assert.strictEqual(provider.id, 'tianditu-v1')
  assert.ok(provider.url.indexOf('/vec_w/wmts') >= 0, 'Tianditu base uses vec_w WMTS')
  assert.ok(provider.overlayUrl.indexOf('/cva_w/wmts') >= 0, 'Tianditu overlay uses cva_w WMTS')
  assert.strictEqual(provider.headers, undefined, 'server key does not need browser headers')
  assert.ok(provider.url.indexOf('{z}') >= 0 && provider.url.indexOf('{x}') >= 0 && provider.url.indexOf('{y}') >= 0)

  var file = makeFileApi()
  var network = { requests: [], fetch: function (options) { this.requests.push(options) } }
  var manager = new TileManager(network, file.api, function () {}, function () {}, {
    url: provider.overlayUrl,
    subdomains: provider.overlaySubdomains,
    headers: provider.overlayHeaders,
    directory: Config.OVERLAY_TILE_DIRECTORY,
    indexUri: Config.OVERLAY_INDEX_URI
  })
  manager.setViewportSize(432, 514)
  manager.setVisible(true)
  manager.setPlan([{
    key: 'tianditu-v1:15:26774:14302', z: 15, x: 26774, unwrappedX: 26774, y: 14302,
    left: 0, top: 0, size: 256
  }], 'tianditu-v1-labels:')
  assert.strictEqual(manager.directory, Config.OVERLAY_TILE_DIRECTORY, 'overlay cache has its own directory')
  assert.strictEqual(manager.indexUri, Config.OVERLAY_INDEX_URI, 'overlay cache has its own index')
  assert.strictEqual(manager.desired[0].key, 'tianditu-v1-labels:tianditu-v1:15:26774:14302', 'overlay keys do not collide with base tiles')
  assert.strictEqual(network.requests.length, 1)
  assert.ok(network.requests[0].url.indexOf('cva_w') >= 0)
  assert.ok(network.requests[0].url.indexOf('TILEMATRIX=15') >= 0)
  assert.ok(network.requests[0].url.indexOf('TILEROW=14302') >= 0)
  assert.ok(network.requests[0].url.indexOf('TILECOL=26774') >= 0)
  assert.strictEqual(network.requests[0].header['User-Agent'], Config.USER_AGENT, 'server key keeps the app UA')
  network.requests[0].fail('closed', -1)
  manager.destroy()
}

function testPreferencesAndProviderSwitch() {
  var Preferences = require('../src/common/map/preferences')
  var Providers = require('../src/common/map/providers')
  var saved = ''
  var storage = { get: function (o) { o.success(saved) }, set: function (o) { saved = o.value; o.success() } }
  var values = { sourceId: 'osm-standard-v1', previousSourceId: 'osmfr-v1', hideBottomHint: true, showLoadingIndicators: false, showStatus: false }
  Preferences.save(storage, values, function () {}, function () { assert.fail('save failed') })
  Preferences.load(storage, function (restored) { assert.deepStrictEqual(restored, values, 'settings survive a fresh read') })
  assert.strictEqual(Preferences.normalize({ sourceId: 'bad-source' }).sourceId, 'osmfr-v1')
  assert.strictEqual(Preferences.normalize({}).showStatus, true, 'status card defaults to visible')
  var file = makeFileApi()
  file.api.writeArrayBuffer = function (o) { o.fail('unavailable', 300) }
  var network = { requests: [], fetch: function (o) { this.requests.push(o) } }
  var engine = new MapEngine({ sourceId: 'osmfr-v1', zoom: 10 })
  engine.setViewport(100, 100, 256)
  var manager = new TileManager(network, file.api, null, null, Providers.get('osmfr-v1'))
  manager.setVisible(true)
  var first = engine.planVisibleTiles()[0]
  manager.setPlan([first])
  engine.sourceId = 'osm-standard-v1'
  var next = engine.planVisibleTiles()[0]
  assert.notStrictEqual(first.key, next.key, 'source cache keys are isolated')
  manager.setProvider(Providers.get(engine.sourceId))
  manager.setPlan([next])
  network.requests[0].success({ code: 200, headers: {}, data: pngHeader() })
  // With REQUEST_CONCURRENCY 2 the new plan request may start before the old
  // tile's fallback; identify requests by URL instead of by position.
  var fallbackRequest = null
  var newSourceRequest = null
  for (var r = 1; r < network.requests.length; r += 1) {
    var request = network.requests[r]
    if (!fallbackRequest && request.url === network.requests[0].url) fallbackRequest = request
    else if (!newSourceRequest && request.url.indexOf('https://tile.openstreetmap.org/') === 0) newSourceRequest = request
  }
  assert.ok(fallbackRequest, 'fallback of an old request stays on its original provider')
  assert.ok(newSourceRequest, 'new viewport uses selected provider')
  fallbackRequest.success({ code: 200, headers: {}, data: 'internal://tmp/old-source.png' })
  newSourceRequest.fail('closed', -1)
  manager.destroy()
}

function testTileLoadingIndicators() {
  var indicators = require('../src/common/map/loading-indicators')
  var plans = [
    { key: 'ready', left: 0, top: 0, size: 256 },
    { key: 'active', left: 256, top: 0, size: 256 },
    { key: 'queued', left: 0, top: 256, size: 256 },
    { key: 'failed', left: 256, top: 256, size: 256 },
    { key: 'outside', left: 800, top: 0, size: 256 }
  ]
  var manager = { getTileState: function (key) { return key === 'active' ? 'loading' : key === 'failed' ? 'failed' : 'queued' } }
  var tiles = [{ id: 'ready', src: 'internal://tile.png' }]
  var result = indicators.build(plans, tiles, { ready: 'internal://tile.png' }, {}, manager, 432, 514)
  assert.strictEqual(result.length, 1, 'only the active tile gets a loading indicator')
  assert.strictEqual(result[0].active, true)
  assert.strictEqual(result[0].id, 'active', 'queued and failed tiles have no overlay')
  assert.ok(result[0].left >= 256 && result[0].left + 32 <= 432, 'partially visible tile indicator stays centered in visible portion')
  var decoding = indicators.build([plans[0]], tiles, {}, {}, manager, 432, 514)
  assert.strictEqual(decoding[0].active, true, 'downloaded tile remains loading until native image completion')
  var failed = indicators.build([plans[0]], tiles, {}, { ready: 'internal://tile.png' }, manager, 432, 514)
  assert.strictEqual(failed.length, 0, 'decode failures have no loading or error overlay')
}

function testAsyncCacheStartup() {
  var files = makeFileApi()
  var read
  files.api.readText = function (options) { read = options }
  var network = { requests: [], fetch: function (o) { this.requests.push(o) } }
  var manager = new TileManager(network, files.api)
  manager.setVisible(true)
  manager.setPlan([{ key: 'startup:10:1:1', z: 10, x: 1, y: 1, unwrappedX: 1, left: 0, top: 0, size: 256 }])
  assert.strictEqual(network.requests.length, 0)
  read.fail('missing')
  assert.strictEqual(network.requests.length, 1, 'async cache completion starts initial downloads without touching screen')
  manager.destroy()
  network.requests[0].fail('closed', -1)
}

function loadPageModule() {
  var text = fs.readFileSync(require('path').join(__dirname, '../src/pages/index/index.ux'), 'utf8')
  var script = text.split('<script>')[1].split('</script>')[0].replace(/^import .*$/gm, '').replace('export default', 'module.exports =')
  var timers = []
  var context = {
    module: { exports: {} },
    Config: Config,
    TileLayout: TileLayout,
    Projection: Projection,
    TileFailures: require('../src/common/map/tile-failures'),
    PanInput: require('../src/common/map/pan-input'),
    PanLayout: require('../src/common/map/pan-layout'),
    Gestures: Gestures,
    LoadingIndicators: require('../src/common/map/loading-indicators'),
    setTimeout: function (callback) { timers.push(callback); return timers.length },
    clearTimeout: function () {}
  }
  require('vm').runInNewContext(script, context)
  return { page: context.module.exports, runtime: context.runtime, timers: timers }
}

function createPageHarness(zoom) {
  var loaded = loadPageModule()
  var engine = new MapEngine({ zoom: zoom || 10, latitude: 0, longitude: 0 })
  engine.setViewport(432, 514, 256)
  var rt = loaded.runtime
  rt.engine = engine
  rt.tileSize = 256
  rt.pixelScale = 1
  rt.viewport = { left: 0, top: 0, width: 432, height: 514 }
  rt.layoutMeasured = true
  rt.pageShown = true
  rt.pageVisible = true
  rt.preferencesReady = true
  var state = Object.assign({}, loaded.page.private, loaded.page)
  return { page: loaded.page, state: state, runtime: rt, engine: engine, timers: loaded.timers }
}

function testNativeViewportCulling() {
  var harness = createPageHarness(10)
  var page = harness.page
  var state = harness.state
  var rt = harness.runtime
  var engine = harness.engine
  var plan = engine.planVisibleTiles()
  rt.tiles = plan.map(function (t) { t.id = t.key; t.src = 'internal://map.png'; return t })
  state.updateMarker = function () {}
  state.redrawTiles()
  assert.ok(state.visibleTiles.length > 0)
  assert.strictEqual(state.tileSlots.length, Config.TILE_SLOT_COUNT, 'native image slot count is fixed')
  var slotIds = state.tileSlots.filter(function (slot) { return slot.id }).map(function (slot) { return slot.id })
  assert.strictEqual(slotIds.length, state.visibleTiles.length, 'every visible tile gets one native slot')
  assert.strictEqual(new Set(slotIds).size, slotIds.length, 'no tile is rendered in two slots')
  var slotTids = state.tileSlots.map(function (slot) { return slot.tid })
  assert.strictEqual(new Set(slotTids).size, slotTids.length, 'native slot tids are unique')
  var visibleById = {}
  state.visibleTiles.forEach(function (tile) { visibleById[tile.id] = tile })
  state.tileSlots.forEach(function (slot, index) {
    if (slot.id) {
      assert.ok(slot.tid.indexOf('s' + index + '_' + visibleById[slot.id].tid + '_') === 0,
        'slot tid changes with the tile and its source assigned to it')
    } else {
      assert.strictEqual(slot.tid, 's' + index + '_e', 'empty slot has a distinct tid')
    }
  })
  var slotTile = state.visibleTiles[0]
  rt.overlayTiles = [{
    z: slotTile.z, x: slotTile.x, y: slotTile.y, src: 'internal://files/test-label.png'
  }]
  state.applyTileSlots(state.visibleTiles)
  var slotIndex = -1
  for (var slotPos = 0; slotPos < state.tileSlots.length; slotPos += 1) {
    if (state.tileSlots[slotPos].id === slotTile.id) slotIndex = slotPos
  }
  var labelled = state.overlaySlots[slotIndex]
  assert.strictEqual(labelled.src, 'internal://files/test-label.png', 'label layer follows the base tile coordinate')
  assert.strictEqual(labelled.opacity, 1)
  assert.ok(labelled.tid.indexOf('o') === 0 && labelled.tid.indexOf('_e') < 0, 'label layer has its own native list')
  rt.overlayTiles = []
  state.applyTileSlots(state.visibleTiles)
  labelled = state.overlaySlots[slotIndex]
  assert.strictEqual(labelled.opacity, 0, 'label layer is cleared when no label tile is available')
  assert.strictEqual(labelled.src, '')
  var tidBefore = state.tileSlots.filter(function (slot) { return slot.id === slotTile.id })[0].tid
  state.applyTileSlots(state.visibleTiles.map(function (tile) {
    return tile.id === slotTile.id ? Object.assign({}, tile, { src: tile.src + '?v=2' }) : tile
  }))
  var tidAfter = state.tileSlots.filter(function (slot) { return slot.id === slotTile.id })[0].tid
  assert.notStrictEqual(tidBefore, tidAfter, 'native slot is recreated when the tile source changes')
  state.applyTileSlots(state.visibleTiles)
  var original = state.visibleTiles[0]
  rt.tiles = rt.tiles.map(function (tile) { return Object.assign({}, tile) })
  var center = engine.centerWorld()
  state.redrawTiles({ x: center.x + 10, y: center.y })
  assert.ok(state.visibleTiles.some(function (tile) { return tile === original }),
    'stable visible nodes survive source metadata refresh')
  assert.deepStrictEqual(Object.keys(original).sort(), ['drawHeight', 'drawWidth', 'height', 'id', 'left', 'src', 'tid', 'top', 'width'],
    'the view model only receives render fields for each image node')
  state.redrawTiles({ x: center.x + 5000, y: center.y })
  assert.strictEqual(state.visibleTiles.length, 0, 'offscreen tile nodes are removed during a drag')
  state.redrawTiles(center)
  assert.ok(state.visibleTiles.length > 0, 'cached tile metadata can restore nodes when dragging back')
  var bad = state.visibleTiles[0]
  state.onTileImageError(bad.id, bad.src)
  assert.strictEqual(state.visibleTiles.some(function (tile) { return tile.id === bad.id }), false, 'failed native image node is removed so its error placeholder disappears')
  state.redrawTiles(center)
  assert.strictEqual(state.visibleTiles.some(function (tile) { return tile.id === bad.id }), false, 'failed URI does not get reinserted on the next redraw')
  var transitions = []
  rt.tileManager = {
    setInteracting: function (v) { transitions.push(v) },
    setPinnedKeys: function () {}
  }
  state.updateTilePlan = function () {}
  state.refreshLoadingIndicators = function () { assert.fail('pan must not rebuild loading overlays') }
  engine.planVisibleTiles = function () { assert.fail('pan must not replan tiles') }
  state.onMapTouchStart({ touches: [{ identifier: 1, clientX: 100, clientY: 100 }] })
  for (var m = 0; m < 1000; m += 1) {
    state.onMapTouchMove({ touches: [{ identifier: 1, clientX: 110 + m / 10, clientY: 100 }] })
  }
  assert.strictEqual(rt.gesture.deltaX, 0, 'high-frequency events only update the closure buffer')
  assert.strictEqual(transitions.length, 1, 'request pause is set once per drag')
  state.renderDragTranslation()
  near(rt.gesture.deltaX, 110, 1e-8, 'render consumes newest input snapped to a physical pixel')
  assert.strictEqual(state.syncPanInput(), false, 'unchanged snapped input skips the display update')
  state.onMapTouchMove({ touches: [{ identifier: 1, clientX: 250, clientY: 100 }] })
  state.onMapTouchEnd({ touches: [] })
  near(engine.centerWorld().x, center.x - 150, 1e-6, 'release commits even an input newer than the last render')
  assert.strictEqual(transitions[transitions.length - 1], false, 'release resumes downloads')
  assert.strictEqual(page.private.gesture, undefined, 'gesture buffers are no longer declared in the view model')
  assert.strictEqual(page.private.engine, undefined, 'the map engine is no longer declared in the view model')
  assert.strictEqual(page.private.tileManager, undefined, 'the tile manager is no longer declared in the view model')
}

function testTileUpdateCoalescing() {
  var harness = createPageHarness(10)
  var state = harness.state
  var rt = harness.runtime
  var engine = harness.engine
  var plan = engine.planVisibleTiles()
  var tiles = plan.map(function (t) { t.id = t.key; t.src = 'internal://map.png'; t.z = 10; return t })
  var redraws = 0
  state.redrawTiles = function () { redraws += 1 }
  state.onTileManagerChange(tiles, 6, 1)
  state.onTileManagerChange(tiles.slice(0, 4), 6, 2)
  assert.strictEqual(redraws, 0, 'bursty tile callbacks are coalesced before touching native image nodes')
  assert.strictEqual(harness.timers.length, 1, 'one deferred apply is scheduled for a tile burst')
  harness.timers[0]()
  assert.strictEqual(redraws, 1, 'a tile burst causes one redraw instead of one per tile')
  assert.strictEqual(rt.tiles.length, 4, 'the latest tile snapshot is applied')
  rt.gesture = { moved: true }
  state.onTileManagerChange(tiles, 6, 6)
  harness.timers[1]()
  assert.strictEqual(redraws, 1, 'dragging never adds or removes native image nodes')
  assert.strictEqual(rt.tiles.length, 4, 'new tile metadata waits until the finger is up')
  rt.gesture = null
  state.flushPendingTiles()
  assert.strictEqual(redraws, 2, 'release applies the deferred tile snapshot once')
  assert.ok(rt.tiles.length >= 6 && rt.tiles.length <= 12, 'deferred tiles are merged after release')
}

function testBackGestureConsumed() {
  var harness = createPageHarness(10)
  assert.strictEqual(harness.state.onBackPress(), true,
    'the root map page consumes the right-swipe back gesture instead of exiting')
}

function testStagedTileReveal() {
  var harness = createPageHarness(10)
  var state = harness.state
  var rt = harness.runtime
  var engine = harness.engine
  var center = engine.centerWorld()
  center.x += 128
  rt.tiles = engine.planVisibleTiles(center).map(function (t) {
    t.id = t.key
    t.src = 'internal://map.png'
    return t
  })
  state.updateMarker = function () {}
  state.redrawTiles(center)
  assert.strictEqual(state.visibleTiles.length, Config.REVEAL_TILE_BATCH,
    'a cache burst only creates one small batch of native image nodes')
  assert.strictEqual(harness.timers.length, 1, 'the remaining tiles are revealed by a short timer')
  harness.timers[0]()
  assert.ok(state.visibleTiles.length > Config.REVEAL_TILE_BATCH &&
    state.visibleTiles.length <= Config.REVEAL_TILE_BATCH * 2,
    'the second batch adds the next few tiles without a decode spike')
  harness.timers[1]()
  assert.ok(state.visibleTiles.length >= 7, 'all on-screen tiles are revealed eventually')
  assert.strictEqual(rt.revealPending, false, 'no reveal work is left after the final batch')
}

function testLocationRecovery() {
  var calls = { gets: [], subscriptions: [] }
  var api = { getLocation: function (o) { calls.gets.push(o) }, subscribe: function (o) { calls.subscriptions.push(o) }, unsubscribe: function () {} }
  var statuses = []
  var manager = new LocationManager(api, function () {}, function (s) { statuses.push(s) })
  manager.start()
  manager.requestOnce()
  assert.strictEqual(calls.gets.length, 1, 'location button deduplicates in-flight requests')
  assert.strictEqual(calls.subscriptions.length, 0, 'subscription waits for single request completion')
  calls.gets[0].fail('timeout', 204)
  assert.ok(statuses[statuses.length - 1].indexOf('超时') >= 0)
  assert.strictEqual(calls.subscriptions.length, 1)
  manager.requestOnce()
  manager.stop()
  manager.start()
  calls.gets[1].success({ latitude: 1, longitude: 1 })
  assert.strictEqual(calls.gets.length, 3, 'old lifecycle callback restarts a fresh request without applying stale coordinates')
  calls.gets[2].success({ latitude: 2, longitude: 2, accuracy: 10 })
  assert.strictEqual(manager.lastFix.latitude, 2)
  assert.strictEqual(manager.accept({ latitude: null, longitude: null }, 'single'), false)
  manager.stop()
}

function testFailureHistoryBound() {
  var network = { requests: [], fetch: function (o) { this.requests.push(o) } }
  var manager = new TileManager(network, makeFileApi().api)
  manager.setVisible(true)
  for (var i = 0; i < 200; i += 1) {
    manager.setPlan([{ key: 'fail:10:' + i + ':1', z: 10, x: i, y: 1, unwrappedX: i, left: 0, top: 0, size: 256 }])
    network.requests[network.requests.length - 1].success({ code: 403, headers: {} })
  }
  assert.ok(Object.keys(manager.failureCount).length <= 49, 'long failed browsing keeps bounded error history')
  assert.ok(Object.keys(manager.blocked).length <= 49, 'blocked tile history stays bounded')
  manager.destroy()
}

function testPageReentryAndDragging() {
  var network = { requests: [], fetch: function (o) { this.requests.push(o) } }
  var plan = [{ key: 'reentry:10:1:1', z: 10, x: 1, y: 1, unwrappedX: 1, left: 0, top: 0, size: 256 }]
  var old = new TileManager(network, makeFileApi().api)
  old.setVisible(true)
  old.setPlan(plan)
  old.destroy()
  var next = new TileManager(network, makeFileApi().api)
  next.setVisible(true)
  next.setInteracting(true)
  next.setPlan(plan)
  assert.strictEqual(network.requests.length, 1, 'reentry cannot overlap a native request left by the old page')
  network.requests[0].fail('old page finished', -1)
  next.pump()
  assert.strictEqual(network.requests.length, 1, 'dragging defers new downloads')
  next.setInteracting(false)
  assert.strictEqual(network.requests.length, 2, 'releasing drag resumes downloads after previous native request settled')
  next.destroy()
  network.requests[1].fail('closed', -1)
}

function testLocationManager() {
  var calls = { fixes: [], statuses: [], unsubscribed: 0 }
  var api = {
    getLocation: function (options) { calls.get = options },
    subscribe: function (options) { calls.subscription = options },
    unsubscribe: function () { calls.unsubscribed += 1 }
  }
  var manager = new LocationManager(api, function (fix) { calls.fixes.push(fix) }, function (message) { calls.statuses.push(message) })
  manager.start()
  calls.get.success({ latitude: 0, longitude: 0, accuracy: 10 })
  calls.subscription.callback({ latitude: 0.00001, longitude: 0.00001, accuracy: 10 })
  calls.subscription.callback({ latitude: 0, longitude: 0.001, accuracy: 10 })
  calls.subscription.callback({ latitude: 20, longitude: 20, accuracy: 2000 })
  calls.subscription.callback({ latitude: 10, longitude: 10, accuracy: 10 })
  assert.strictEqual(calls.fixes.length, 2, 'invalid jitter and implausible position jumps are discarded')
  assert.strictEqual(manager.accept({ latitude: 95, longitude: 0, accuracy: 10 }, 'test'), false)
  manager.stop()
  assert.strictEqual(calls.unsubscribed, 1)
  calls.subscription.callback({ latitude: 1, longitude: 1, accuracy: 5 })
  assert.strictEqual(calls.fixes.length, 2, 'stopped subscriptions no longer update the page')
}

function testNativeLayeringAndMemoryProfile() {
  var page = fs.readFileSync(require('path').join(__dirname, '../src/pages/index/index.ux'), 'utf8')
  var tileLayer = page.indexOf('<stack class="tile-layer"')
  var markerLayer = page.indexOf('<stack class="marker-layer"')
  var controlsLayer = page.indexOf('<stack class="controls-layer"')
  assert.ok(tileLayer >= 0 && markerLayer > tileLayer && controlsLayer > markerLayer,
    'asynchronous map tiles, position marker, and controls stay in separate ordered layers')
  assert.strictEqual(page.indexOf('rotary-scroll'), -1,
    'the unverified full-screen scroll overlay is removed from the touch path')
  assert.strictEqual(page.indexOf('onscroll='), -1,
    'no scroll handler can reset native scroll state during a finger swipe')
  assert.strictEqual(page.indexOf('scrollTo('), -1,
    'no native scrollTo call runs inside touch or scroll callbacks')
  assert.strictEqual(page.indexOf('transform: translateX({{dragOffsetX}}px)'), -1,
    'map layers avoid high-frequency transform updates on low-memory watch hardware')
  assert.ok(page.indexOf('var DRAG_RENDER_DELAY = 80') >= 0,
    'drag layer positions update at a bounded rate')
  assert.ok(page.indexOf('var TILE_APPLY_DELAY = 50') >= 0,
    'bursty tile callbacks are coalesced before native image work')
  assert.strictEqual(Config.REQUEST_CONCURRENCY, 2, 'tile downloads stay at a bounded two-request concurrency on the low-memory watch')
  assert.strictEqual(Config.EDGE_BUFFER_RATIO, 0, 'the low-memory profile does not prefetch off-screen tiles')
  assert.ok(page.indexOf('width: {{$item.drawWidth}}px; height: {{$item.drawHeight}}px;') >= 0,
    'tiles use a precomputed draw size so the template never does arithmetic')
  assert.ok(page.indexOf('retryVisible(true, true)') >= 0,
    'network retries happen only after an explicit retry gesture')
  assert.strictEqual(/\bonwheel=|\bonrotary=/.test(page), false,
    'undocumented Vela wheel and rotary event bindings are not used')
  var viewModel = page.split('private: {')[1].split('\n  },')[0]
  ;['engine', 'tileManager', 'locationManager', 'gesture', 'tiles', 'imageReady', 'imageErrors'].forEach(function (key) {
    assert.strictEqual(viewModel.indexOf(key + ':'), -1, key + ' must stay outside the observed view model')
  })
}

function testTileRequestTimeout() {
  var originalTimeout = Config.REQUEST_TIMEOUT_MS
  Config.REQUEST_TIMEOUT_MS = 20
  var file = makeFileApi()
  var network = { requests: [], fetch: function (options) { this.requests.push(options) } }
  var statuses = []
  var manager = new TileManager(network, file.api, function () {}, function (message) { statuses.push(message) })
  manager.setVisible(true)
  manager.setPlan([{
    key: 'timeout:10:1:1', z: 10, x: 1, unwrappedX: 1, y: 1,
    left: 88, top: 129, size: 256
  }])
  return new Promise(function (resolve, reject) {
    setTimeout(function () {
      try {
        assert.strictEqual(manager.activeCount, 0, 'a timeout releases the logical request slot')
        assert.ok(statuses.indexOf('地图请求超时') >= 0, 'timeout is reported to the UI')
        assert.strictEqual(network.requests.length, 1, 'the hung native request is left alone')
        assert.ok(manager.queue.length > 0, 'a timed-out tile is queued for retry')
        manager.queue[0].due = 0
        manager.pump()
        assert.strictEqual(network.requests.length, 2, 'a hung request no longer blocks the map forever')
        network.requests[0].success({ code: 200, headers: {}, data: pngHeader() })
        assert.strictEqual(manager.activeCount, 1, 'a late abandoned callback does not disturb the new request')
        assert.strictEqual(manager.memory['timeout:10:1:1'], undefined, 'a late response is not stored')
        network.requests[1].fail('closed', -1)
        resolve()
      } catch (error) { reject(error) }
      finally {
        manager.destroy()
        Config.REQUEST_TIMEOUT_MS = originalTimeout
      }
    }, 60)
  })
}

testRasterBounds()
testProjection()
testEngine()
testGestures()
testTileLayout()
testTileManager()
testTiandituProvider()
testHongKongDefaultAndMathCaches()
testFailureBorders()
testPanNodeReuse()
testPreferencesAndProviderSwitch()
testTileLoadingIndicators()
testAsyncCacheStartup()
testNativeViewportCulling()
testTileUpdateCoalescing()
testBackGestureConsumed()
testStagedTileReveal()
testLocationRecovery()
testFailureHistoryBound()
testPageReentryAndDragging()
testLocationManager()
testNativeLayeringAndMemoryProfile()
testTileRequestTimeout().then(function () {
  console.log('Map core tests passed: projection, viewport, pan/zoom, pixel-aligned tiles, retained pan tiles, tile queue/cache/timeout, location filtering, deferred tile application, and a view-model-free runtime state')
}).catch(function (error) {
  console.error(error && error.stack ? error.stack : error)
  process.exitCode = 1
})
