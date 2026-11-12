var providers = [
  { id: 'osmfr-v1', name: 'OSM 法国社区', url: 'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', attribution: '© OpenStreetMap / ODbL · Tiles: OSM France' },
  { id: 'osm-standard-v1', name: 'OSM 标准（原图源）', url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: '© OpenStreetMap contributors / ODbL' }
]
function get(id) {
  for (var i = 0; i < providers.length; i += 1) if (providers[i].id === id) return providers[i]
  return providers[0]
}
module.exports = { get: get }
