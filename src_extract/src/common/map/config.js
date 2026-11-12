module.exports = {
  DESIGN_WIDTH: 432,
  TILE_RASTER_SIZE: 256,
  MIN_ZOOM: 3,
  MAX_ZOOM: 18,
  INITIAL_ZOOM: 15,
  INITIAL_CENTER: { latitude: 22.2819, longitude: 114.1589 },
  TILE_SOURCE_ID: 'osmfr-v1',
  TILE_URL: 'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  TILE_ATTRIBUTION: '© OpenStreetMap / ODbL · Tiles: OSM France',
  USER_AGENT: 'RedmiWatch6NativeMap/0.1.16 (Xiaomi Vela)',
  REQUEST_CONCURRENCY: 1,
  REQUEST_TIMEOUT_MS: 15000,
  // Native image decodes are the largest memory spike on a 30MB watch.
  REVEAL_TILE_BATCH: 4,
  ENABLE_PINCH_PREVIEW: false,
  EDGE_BUFFER_RATIO: 0,
  // Target device has 32MB total RAM; app heap is smaller and unmeasured.
  MEMORY_TILE_LIMIT: 6,
  DISK_TILE_LIMIT: 16,
  DISK_BYTE_LIMIT: 2097152,
  DEFAULT_CACHE_SECONDS: 604800,
  CACHE_DIRECTORY: 'internal://files/redmi-watch6-map/',
  TILE_DIRECTORY: 'internal://files/redmi-watch6-map/tiles/',
  INDEX_URI: 'internal://files/redmi-watch6-map/index.json'
}
