// The key is injected from the git-ignored tianditu-key.js (see tools/ensure-keys.js)
// so the public repository never carries a private quota key.
var TIANDITU_KEY = require('./tianditu-key.js').key
// tk leads the query string: the device has shown both failure modes for this
// provider (JS fetch mangles chunked bodies, and fetch 'file' drops query
// parameters), so tiles are handed to the native <image> as remote URLs.
var TIANDITU_BASE = 'https://{s}.tianditu.gov.cn/vec_w/wmts?tk=' + TIANDITU_KEY + '&SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'
var TIANDITU_DATA = 'https://{s}.tianditu.gov.cn/DataServer?tk=' + TIANDITU_KEY + '&T=vec_w&x={x}&y={y}&l={z}'
var TIANDITU_LABELS = 'https://{s}.tianditu.gov.cn/cva_w/wmts?tk=' + TIANDITU_KEY + '&SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}'

var providers = [
  { id: 'osmfr-v1', name: 'OSM 法国社区', url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', subdomains: ['a', 'b', 'c'], attribution: '© OpenStreetMap / ODbL · Tiles: OSM France' },
  {
    id: 'tianditu-v1',
    name: '天地图 · 矢量 + 注记',
    url: TIANDITU_BASE,
    urls: [TIANDITU_BASE, TIANDITU_DATA],
    subdomains: ['t0', 't1', 't2', 't3'],
    // The tile src IS the remote URL: the native image component downloads and
    // decodes it itself, with its own cache. No JS fetch, no byte validation,
    // no temp files. Retries rotate the subdomain to force a fresh download.
    direct: true,
    overlayUrl: TIANDITU_LABELS,
    overlaySubdomains: ['t0', 't1', 't2', 't3'],
    attribution: '© 天地图 · 矢量底图与注记'
  }
]
function get(id) {
  for (var i = 0; i < providers.length; i += 1) if (providers[i].id === id) return providers[i]
  return providers[0]
}
module.exports = { get: get }
