var TIANDITU_KEY = '0df4296c1d7da2ce72ab780d708b805e'
var TIANDITU_REFERER = 'https://www.tianditu.gov.cn/'
var TIANDITU_BASE = 'https://{s}.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + TIANDITU_KEY
var TIANDITU_LABELS = 'https://{s}.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=' + TIANDITU_KEY

var providers = [
  { id: 'osmfr-v1', name: 'OSM 法国社区', url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', subdomains: ['a', 'b', 'c'], attribution: '© OpenStreetMap / ODbL · Tiles: OSM France' },
  { id: 'osm-standard-v1', name: 'OSM 标准（原图源）', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors / ODbL' },
  {
    id: 'tianditu-v1',
    name: '天地图 · 矢量 + 注记',
    url: TIANDITU_BASE,
    subdomains: ['t0', 't1', 't2', 't3'],
    headers: { Referer: TIANDITU_REFERER },
    overlayUrl: TIANDITU_LABELS,
    overlaySubdomains: ['t0', 't1', 't2', 't3'],
    overlayHeaders: { Referer: TIANDITU_REFERER },
    attribution: '© 天地图 · 矢量底图与注记'
  }
]
function get(id) {
  for (var i = 0; i < providers.length; i += 1) if (providers[i].id === id) return providers[i]
  return providers[0]
}
module.exports = { get: get }
