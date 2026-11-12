function LocationManager(geolocation, onFix, onStatus) {
  this.api = geolocation
  this.onFix = onFix || function () {}
  this.onStatus = onStatus || function () {}
  this.active = false
  this.subscribed = false
  this.lastFix = null
  this.pending = false
  this.generation = 0
}

LocationManager.prototype.start = function () {
  if (this.active) return
  this.active = true
  this.requestOnce()
}

LocationManager.prototype.subscribe = function () {
  if (!this.active || this.subscribed) return
  var self = this
  var generation = this.generation
  this.subscribed = true
  try {
    this.api.subscribe({
      callback: function (data) {
        if (generation === self.generation) self.accept(data, 'subscription')
      },
      fail: function (data, code) {
        if (generation !== self.generation || !self.active) return
        self.subscribed = false
        self.onStatus('实时定位失败 (' + code + ') · 点定位重试')
        console.log('Map GPS subscribe failure', code, String(data))
      }
    })
  } catch (error) {
    this.subscribed = false
    this.onStatus('实时定位接口不可用')
  }
}

LocationManager.prototype.stop = function () {
  this.active = false
  this.generation += 1
  if (this.subscribed) {
    try { this.api.unsubscribe() } catch (ignored) {}
  }
  this.subscribed = false
}

LocationManager.prototype.requestOnce = function () {
  if (!this.active) return
  if (this.pending) { this.onStatus('等待卫星定位 · 请在室外稍候'); return }
  if (this.subscribed) {
    try { this.api.unsubscribe() } catch (ignored) {}
    this.subscribed = false
  }
  this.generation += 1
  var self = this
  var generation = this.generation
  var settled = false
  this.pending = true
  this.onStatus('卫星定位中 · 最长等待60秒')
  function finish(data, code, failed) {
    if (settled) return
    settled = true
    self.pending = false
    if (!self.active) return
    if (generation !== self.generation) { self.requestOnce(); return }
    if (failed) {
      self.onStatus(Number(code) === 204 ? '定位超时 · 到室外点定位重试' : Number(code) === 203 ? '当前固件不支持定位' : '定位失败 (' + code + ') · 检查定位授权')
      console.log('Map GPS getLocation failure', code, String(data))
    } else if (!self.accept(data, 'single')) {
      if (!self.lastFix) self.onStatus('定位数据无效 · 点定位重试')
    }
    if (Number(code) !== 203) self.subscribe()
  }
  try {
    this.api.getLocation({
      timeout: 60000,
      success: function (data) { finish(data, 0, false) },
      fail: function (data, code) { finish(data, code, true) }
    })
  } catch (error) { finish(String(error), -1, true) }
}

LocationManager.prototype.accept = function (data, source) {
  if (!this.active || !data || typeof data.latitude !== 'number' || typeof data.longitude !== 'number' || !isFinite(data.latitude) || !isFinite(data.longitude)) return false
  if (data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) return false
  var accuracy = Number(data.accuracy)
  if (!isFinite(accuracy) && data.accuracyInfo) accuracy = Number(data.accuracyInfo.horizontal)
  if (!isFinite(accuracy) || accuracy < 0) accuracy = null
  var fix = {
    latitude: data.latitude,
    longitude: data.longitude,
    accuracy: accuracy,
    timestamp: Date.now(),
    source: source
  }
  if (this.lastFix) {
    var distance = haversine(this.lastFix.latitude, this.lastFix.longitude, fix.latitude, fix.longitude)
    var elapsed = Math.max(1, (fix.timestamp - this.lastFix.timestamp) / 1000)
    var previousAccuracy = this.lastFix.accuracy === null ? 0 : this.lastFix.accuracy
    var uncertainty = (accuracy === null ? 0 : accuracy) + previousAccuracy
    if (distance > Math.max(5000, elapsed * 350 + uncertainty * 10)) return false
  }
  if (this.lastFix) {
    var movement = haversine(this.lastFix.latitude, this.lastFix.longitude, fix.latitude, fix.longitude)
    if (source !== 'single' && movement < Math.max(4, Math.min(accuracy === null ? 0 : accuracy, 60) * 0.35)) return false
  }
  this.lastFix = fix
  this.onFix(fix)
  if (accuracy !== null && accuracy > 100) this.onStatus('已定位 · 精度较低')
  return true
}

function haversine(lat1, lon1, lat2, lon2) {
  var radians = Math.PI / 180
  var dLat = (lat2 - lat1) * radians
  var dLon = (lon2 - lon1) * radians
  var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * radians) * Math.cos(lat2 * radians) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}

module.exports = LocationManager
