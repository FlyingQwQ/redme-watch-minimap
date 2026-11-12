var Config = require('./config')
var isImageBytes = require('./image-metadata')

var INDEX_VERSION = 1
// Shared across page instances: fetch has no documented cancellation API.
var nativeRequests = 0
// A timed-out native fetch cannot be cancelled. Keep a small bounded number of
// abandoned requests so one hung socket can never stop the map forever.
var abandonedRequests = 0
var MAX_ABANDONED_REQUESTS = 2

function TileManager(network, fileApi, onChange, onStatus, provider) {
  this.provider = provider || { url: Config.TILE_URL }
  this.network = network
  this.file = fileApi
  this.onChange = onChange || function () {}
  this.onStatus = onStatus || function () {}
  this.memory = {}
  this.memoryOrder = []
  this.disk = {}
  this.desired = []
  this.desiredByKey = {}
  this.queue = []
  this.inFlight = {}
  this.accessing = {}
  this.failureCount = {}
  this.failureRetryAt = {}
  this.blocked = {}
  this.activeCount = 0
  this.visible = false
  this.interacting = false
  this.dead = false
  this.ready = false
  this.directoryReady = false
  this.indexDirty = false
  this.indexWriting = false
  this.pumpTimer = null
  this.planRevision = 0
  this.cooldownUntil = 0
  this.consecutiveFailures = 0
  this.ephemeralUris = []
  this.pinnedKeys = {}
  this.retiredUris = []
  this.retireTimer = null
  this.fileVersion = 0
  this.stats = { attempted: 0, succeeded: 0, failed: 0, lastCode: 0, lastMessage: '' }
  this.prepare()
}

TileManager.prototype.prepare = function () {
  var self = this
  var settled = false
  function finish(ok) {
    if (settled) return
    settled = true
    clearTimeout(timer)
    if (self.dead) return
    self.directoryReady = ok
    self.readIndex()
  }
  var timer = setTimeout(function () {
    self.onStatus('缓存目录初始化超时，改用临时图片')
    finish(false)
  }, 3000)
  try {
    this.file.mkdir({
      uri: Config.TILE_DIRECTORY,
      recursive: true,
      success: function () { finish(true) },
      fail: function (data, code) {
        self.onStatus('缓存不可用，地图只在当前运行期间保留')
        finish(false)
      }
    })
  } catch (error) {
    finish(false)
  }
}

TileManager.prototype.readIndex = function () {
  var self = this
  var settled = false
  var timer = setTimeout(function () { finish(null) }, 3000)
  function finish(text) {
    if (settled) return
    settled = true
    clearTimeout(timer)
    if (self.dead) return
    if (text) {
      try {
        var index = JSON.parse(text || '{}')
        if (index.version === INDEX_VERSION && index.entries && typeof index.entries === 'object') {
          self.disk = index.entries
        }
      } catch (ignored) { self.disk = {} }
    }
    self.reconcileFiles()
  }
  try {
    this.file.readText({
      uri: Config.INDEX_URI,
      success: function (data) { finish(data && data.text ? data.text : null) },
      fail: function () { finish(null) }
    })
  } catch (error) {
    finish(null)
  }
}

TileManager.prototype.reconcileFiles = function () {
  var self = this
  if (!this.directoryReady || typeof this.file.list !== 'function') {
    this.finishReadingIndex()
    return
  }
  var settled = false
  var timer = setTimeout(function () { finish() }, 3000)
  function finish() {
    if (settled) return
    settled = true
    clearTimeout(timer)
    self.finishReadingIndex()
  }
  try {
    this.file.list({
      uri: Config.TILE_DIRECTORY,
      success: function (result) {
        if (self.dead) { finish(); return }
        var files = result && result.fileList ? result.fileList : []
        var referenced = {}
        var keys = Object.keys(self.disk)
        for (var i = 0; i < keys.length; i += 1) {
          if (self.disk[keys[i]] && self.disk[keys[i]].uri) referenced[self.disk[keys[i]].uri] = true
        }
        for (var j = 0; j < files.length; j += 1) {
          if (files[j] && files[j].uri && !referenced[files[j].uri]) self.deleteFile(files[j].uri)
        }
        finish()
      },
      fail: function () { finish() }
    })
  } catch (error) { finish() }
}

TileManager.prototype.finishReadingIndex = function () {
  if (this.dead) return
  this.ready = true
  this.trimDisk()
  this.resolveDesired()
  this.pump()
}

TileManager.prototype.setVisible = function (visible) {
  this.visible = !!visible
  if (this.visible) this.pump()
  else this.clearEphemeral()
}

TileManager.prototype.setInteracting = function (value) {
  this.interacting = !!value
  if (!this.interacting) this.pump()
}

TileManager.prototype.destroy = function () {
  this.dead = true
  this.visible = false
  if (this.pumpTimer !== null) clearTimeout(this.pumpTimer)
  this.pumpTimer = null
  if (this.retireTimer !== null) clearTimeout(this.retireTimer)
  this.retireTimer = null
  var activeKeys = Object.keys(this.inFlight)
  for (var a = 0; a < activeKeys.length; a += 1) {
    if (this.inFlight[activeKeys[a]].watchdog) clearTimeout(this.inFlight[activeKeys[a]].watchdog)
  }
  this.clearEphemeral()
  this.pruneRetired(true)
  this.queue = []
  this.desired = []
  this.desiredByKey = {}
  this.memory = {}
  this.memoryOrder = []
  this.disk = {}
  this.pinnedKeys = {}
  this.onChange = function () {}
  this.onStatus = function () {}
}

TileManager.prototype.setProvider = function (provider) {
  this.provider = provider
  this.cooldownUntil = 0
  this.consecutiveFailures = 0
  this.stats = { attempted: 0, succeeded: 0, failed: 0, lastCode: 0, lastMessage: '' }
}

TileManager.prototype.getStats = function () {
  return {
    attempted: this.stats.attempted,
    succeeded: this.stats.succeeded,
    failed: this.stats.failed,
    lastCode: this.stats.lastCode,
    lastMessage: this.stats.lastMessage
  }
}

TileManager.prototype.setPlan = function (plans) {
  var nextPlans = plans || []
  var sameKeys = nextPlans.length === this.desired.length
  if (sameKeys) {
    for (var k = 0; k < nextPlans.length; k += 1) {
      if (nextPlans[k].key !== this.desired[k].key) { sameKeys = false; break }
    }
  }
  this.planRevision += 1
  this.desired = nextPlans
  this.desiredByKey = {}
  for (var i = 0; i < this.desired.length; i += 1) {
    this.desiredByKey[this.desired[i].key] = this.desired[i]
  }
  if (sameKeys) {
    for (var q = 0; q < this.queue.length; q += 1) {
      var updated = this.desiredByKey[this.queue[q].key]
      if (updated) {
        this.queue[q].plan = updated
        this.queue[q].priority = requestPriority(updated, this.viewportWidth, this.viewportHeight)
      }
    }
    this.queue.sort(function (a, b) { return a.priority - b.priority })
    this.resolveDesired(true)
    this.pump()
    return
  }
  this.cleanupUndesiredEphemeral()
  this.trimMemory()
  this.trimFailures()
  var kept = []
  for (var q = 0; q < this.queue.length; q += 1) {
    if (this.desiredByKey[this.queue[q].key]) kept.push(this.queue[q])
  }
  this.queue = kept
  this.resolveDesired()
  this.pump()
}

TileManager.prototype.resolveDesired = function (skipPublish) {
  if (this.dead || !this.ready) return
  for (var i = 0; i < this.desired.length; i += 1) {
    var plan = this.desired[i]
    var cached = this.memory[plan.key]
    if (cached) {
      cached.used = Date.now()
      this.touchMemory(plan.key)
      if (!cached.noStore && cached.expires <= Date.now()) this.enqueue(plan, cached, false)
      continue
    }
    var diskEntry = this.disk[plan.key]
    if (diskEntry) {
      if (this.accessing[plan.key]) continue
      this.checkDiskEntry(plan, diskEntry)
      continue
    }
    this.enqueue(plan, null, false)
  }
  if (!skipPublish) this.publish()
}

TileManager.prototype.checkDiskEntry = function (plan, entry) {
  var self = this
  var key = plan.key
  var settled = false
  var timer = null
  this.accessing[key] = true
  function finish(callback) {
    if (settled) return
    settled = true
    clearTimeout(timer)
    delete self.accessing[key]
    if (self.dead) return
    callback()
  }
  timer = setTimeout(function () {
    finish(function () {
      delete self.disk[key]
      self.markIndexDirty()
      self.enqueue(self.desiredByKey[key] || plan, null, false)
      self.publish()
      self.pump()
    })
  }, 2000)
  try {
    this.file.access({
      uri: entry.uri,
      success: function () {
        finish(function () {
          var usable = self.disk[key]
          if (!usable) return
          usable.used = Date.now()
          self.memory[key] = usable
          self.touchMemory(key)
          if (usable.expires <= Date.now()) self.enqueue(self.desiredByKey[key] || plan, usable, false)
          self.trimMemory()
          self.publish()
          self.pump()
        })
      },
      fail: function () {
        finish(function () {
          delete self.disk[key]
          self.markIndexDirty()
          var latest = self.desiredByKey[key]
          if (latest) self.enqueue(latest, null, false)
          self.publish()
          self.pump()
        })
      }
    })
  } catch (error) {
    finish(function () {
      delete self.disk[key]
      self.markIndexDirty()
      self.enqueue(self.desiredByKey[key] || plan, null, false)
    })
  }
}

TileManager.prototype.enqueue = function (plan, staleEntry, retry, preferFile) {
  if (!plan || this.dead || this.inFlight[plan.key]) return
  if (!retry && this.blocked[plan.key]) return
  if (!retry && this.failureRetryAt[plan.key]) {
    if (this.failureRetryAt[plan.key] > Date.now()) return
    delete this.failureRetryAt[plan.key]
    delete this.failureCount[plan.key]
  }
  for (var i = 0; i < this.queue.length; i += 1) {
    if (this.queue[i].key === plan.key) return
  }
  if (!retry && this.memory[plan.key] && this.memory[plan.key].expires > Date.now()) return
  this.queue.push({
    key: plan.key,
    plan: plan,
    stale: staleEntry || null,
    preferFile: !!preferFile,
    attempt: this.failureCount[plan.key] || 0,
    due: Date.now(),
    priority: requestPriority(plan, this.viewportWidth, this.viewportHeight)
  })
  this.queue.sort(function (a, b) { return a.priority - b.priority })
}

TileManager.prototype.setViewportSize = function (width, height) {
  this.viewportWidth = width
  this.viewportHeight = height
}

TileManager.prototype.setPinnedKeys = function (keys) {
  this.pinnedKeys = {}
  for (var i = 0; i < keys.length; i += 1) this.pinnedKeys[keys[i]] = true
  this.pruneRetired(false)
  this.trimDisk()
}

TileManager.prototype.pump = function () {
  if (this.dead || !this.visible || !this.ready || this.interacting) return
  if (this.cooldownUntil > Date.now()) {
    this.schedulePump(this.cooldownUntil - Date.now())
    return
  }
  if (this.activeCount >= Config.REQUEST_CONCURRENCY || !this.queue.length) return
  if (nativeRequests >= Config.REQUEST_CONCURRENCY || abandonedRequests >= MAX_ABANDONED_REQUESTS) {
    this.schedulePump(300)
    return
  }
  var now = Date.now()
  var nextIndex = -1
  var nextDue = Infinity
  for (var i = 0; i < this.queue.length; i += 1) {
    if (this.queue[i].due <= now) { nextIndex = i; break }
    nextDue = Math.min(nextDue, this.queue[i].due)
  }
  if (nextIndex < 0) {
    this.schedulePump(Math.max(100, nextDue - now))
    return
  }
  var job = this.queue.splice(nextIndex, 1)[0]
  this.startRequest(job)
  if (this.activeCount < Config.REQUEST_CONCURRENCY) this.pump()
}

TileManager.prototype.schedulePump = function (delay) {
  if (this.pumpTimer !== null) clearTimeout(this.pumpTimer)
  var self = this
  this.pumpTimer = setTimeout(function () {
    self.pumpTimer = null
    self.pump()
  }, delay)
}

TileManager.prototype.dispatchNetwork = function (job, options) {
  var self = this
  var finished = false
  var success = options.success
  var fail = options.fail
  job.fetchPending = true
  job.counted = true
  nativeRequests += 1
  function settle(callback, data, code) {
    if (finished) return
    finished = true
    job.fetchPending = false
    if (job.abandoned) {
      job.abandoned = false
      abandonedRequests = Math.max(0, abandonedRequests - 1)
    }
    if (job.counted) {
      job.counted = false
      nativeRequests = Math.max(0, nativeRequests - 1)
    }
    callback(data, code)
    self.pump()
  }
  options.success = function (data) { settle(success, data) }
  options.fail = function (data, code) { settle(fail, data, code) }
  try { this.network.fetch(options) }
  catch (error) { settle(fail, null, -1) }
}

TileManager.prototype.startRequest = function (job) {
  var self = this
  var url = this.provider.url
  if (this.provider.subdomains && url.indexOf('{s}') >= 0) {
    var hosts = this.provider.subdomains
    url = url.replace('{s}', hosts[(job.attempt || 0) % hosts.length])
  }
  url = url.replace('{z}', job.plan.z).replace('{x}', job.plan.x).replace('{y}', job.plan.y)
  job.url = url
  this.stats.attempted += 1
  var headers = {
    'User-Agent': Config.USER_AGENT,
    'Accept': 'image/png,image/jpeg'
  }
  if (job.stale && job.stale.etag) headers['If-None-Match'] = job.stale.etag
  if (job.stale && job.stale.lastModified) headers['If-Modified-Since'] = job.stale.lastModified
  job.started = Date.now()
  job.timedOut = false
  job.responseType = job.preferFile || !this.directoryReady ? 'file' : 'arraybuffer'
  this.activeCount += 1
  this.inFlight[job.key] = job
  this.publish()
  this.armWatchdog(job)
  try {
    this.dispatchNetwork(job, {
      url: url,
      method: 'GET',
      responseType: job.responseType,
      header: headers,
      success: function (response) { self.handleResponse(job, response || {}) },
      fail: function (data, code) { self.finishFailure(job, '网络不可用', code, null) }
    })
  } catch (error) {
    this.finishFailure(job, '网络接口不可用', -1, null)
  }
}

TileManager.prototype.startFileFallback = function (job) {
  var self = this
  if (this.dead || this.inFlight[job.key] !== job || job.preferFile) {
    this.finishFailure(job, '瓦片无法写入手表缓存', 300, null)
    return
  }
  job.preferFile = true
  job.responseType = 'file'
  job.timedOut = false
  this.armWatchdog(job)
  var url = job.url
  var headers = { 'User-Agent': Config.USER_AGENT, 'Accept': 'image/png,image/jpeg' }
  this.onStatus('正在使用临时图片加载地图')
  try {
    this.dispatchNetwork(job, {
      url: url,
      method: 'GET',
      responseType: 'file',
      header: headers,
      success: function (response) { self.handleResponse(job, response || {}) },
      fail: function (data, code) { self.finishFailure(job, '临时地图图片加载失败', code, null) }
    })
  } catch (error) {
    this.finishFailure(job, '临时地图图片接口不可用', -1, null)
  }
}

TileManager.prototype.handleResponse = function (job, response) {
  if (this.dead || this.inFlight[job.key] !== job) return
  if (job.timedOut) {
    this.finishFailure(job, '地图请求超时', 408, null)
    return
  }
  var status = Number(response.code) || 0
  var headers = response.headers || {}
  if (status === 304 && job.stale && job.stale.uri) {
    var revalidated = this.recordForResponse(job, job.stale.uri, job.stale.size, headers)
    this.storeRecord(job, revalidated)
    return
  }
  if (status < 200 || status >= 300) {
    var retryAfter = getHeader(headers, 'retry-after')
    this.finishFailure(job, status === 403 ? '地图服务拒绝了请求' : status === 429 ? '地图服务暂时限流' : '地图瓦片请求失败 (' + status + ')', status, retryAfter)
    return
  }
  var bytes = response.data
  if (typeof bytes === 'string' && bytes.length > 0) {
    var temporaryRecord = this.recordForResponse(job, bytes, 0, headers)
    temporaryRecord.noStore = true
    temporaryRecord.temporary = true
    this.storeRecord(job, temporaryRecord)
    return
  }
  if (!isImageBytes(bytes)) {
    this.finishFailure(job, '地图图片格式或尺寸无效', 404, null)
    return
  }
  // Copy into an exact-length Uint8Array: Vela may hand back a view whose
  // backing buffer is larger than the tile, and writing the whole buffer
  // produces a corrupt image file.
  var buffer = new Uint8Array(bytes)
  var extension = buffer.length > 1 && buffer[0] === 0xFF && buffer[1] === 0xD8 ? '.jpg' : '.png'
  this.fileVersion += 1
  var uri = Config.TILE_DIRECTORY + safeFileName(job.key) + '-' + Date.now() + '-' + this.fileVersion + extension
  var self = this
  var record = this.recordForResponse(job, uri, buffer.byteLength, headers)
  var writeSettled = false
  var writeTimer = setTimeout(function () {
    if (writeSettled) return
    writeSettled = true
    self.onStatus('瓦片缓存写入超时，改用临时图片')
    self.deleteFile(uri)
    self.startFileFallback(job)
  }, 5000)
  try {
    this.file.writeArrayBuffer({
      uri: uri,
      buffer: buffer,
      success: function () {
        if (writeSettled) {
          self.deleteFile(uri)
          return
        }
        writeSettled = true
        clearTimeout(writeTimer)
        if (self.dead) {
          self.deleteFile(uri)
          return
        }
        if (self.inFlight[job.key] !== job) {
          self.deleteFile(uri)
          return
        }
        if (record.noStore && self.visible) self.ephemeralUris.push(uri)
        self.storeRecord(job, record)
      },
      fail: function () {
        if (writeSettled) return
        writeSettled = true
        clearTimeout(writeTimer)
        self.onStatus('瓦片缓存写入失败，改用临时图片')
        self.deleteFile(uri)
        self.startFileFallback(job)
      }
    })
  } catch (error) {
    if (writeSettled) return
    writeSettled = true
    clearTimeout(writeTimer)
    this.onStatus('手表文件缓存不可用，改用临时图片')
    this.deleteFile(uri)
    this.startFileFallback(job)
  }
}

TileManager.prototype.recordForResponse = function (job, uri, byteLength, headers) {
  var cacheControl = getHeader(headers, 'cache-control') || ''
  var expiresHeader = getHeader(headers, 'expires')
  var maxAge = /(?:^|,)\s*max-age\s*=\s*(\d+)/i.exec(cacheControl)
  var age = Number(getHeader(headers, 'age')) || 0
  var expiry
  if (/no-store/i.test(cacheControl)) {
    expiry = Date.now()
  } else if (maxAge) {
    expiry = Date.now() + Math.max(0, Number(maxAge[1]) - age) * 1000
  } else if (/no-cache/i.test(cacheControl)) {
    expiry = Date.now()
  } else if (expiresHeader && !isNaN(Date.parse(expiresHeader))) {
    expiry = Date.parse(expiresHeader)
  } else {
    expiry = Date.now() + Config.DEFAULT_CACHE_SECONDS * 1000
  }
  return {
    uri: uri,
    size: Number(byteLength) || 0,
    saved: Date.now(),
    used: Date.now(),
    expires: expiry,
    noStore: /no-store/i.test(cacheControl),
    etag: getHeader(headers, 'etag') || (job.stale && job.stale.etag) || '',
    lastModified: getHeader(headers, 'last-modified') || (job.stale && job.stale.lastModified) || ''
  }
}

TileManager.prototype.storeRecord = function (job, record) {
  if (this.dead || this.inFlight[job.key] !== job) return
  this.stats.succeeded += 1
  this.stats.lastCode = 0
  this.stats.lastMessage = ''
  this.consecutiveFailures = 0
  delete this.failureCount[job.key]
  delete this.failureRetryAt[job.key]
  delete this.blocked[job.key]
  if (record.noStore && !this.visible) {
    if (!record.temporary) this.deleteFile(record.uri)
    this.finishRequest(job)
    this.pump()
    return
  }
  var oldRecord = this.disk[job.key] || this.memory[job.key]
  if (oldRecord && oldRecord.uri && oldRecord.uri !== record.uri) this.retireUri(oldRecord.uri, job.key)
  this.memory[job.key] = record
  this.touchMemory(job.key)
  var hadDiskRecord = !!this.disk[job.key]
  var persistIndex = !record.noStore || hadDiskRecord
  if (record.noStore) {
    delete this.disk[job.key]
  } else this.disk[job.key] = record
  this.trimMemory()
  this.trimDisk()
  if (persistIndex) this.markIndexDirty()
  this.finishRequest(job)
  this.publish()
  this.pump()
}

TileManager.prototype.trimFailures = function () {
  var keys = Object.keys(this.failureCount)
  var count = keys.length
  for (var i = 0; i < keys.length && count > 48; i += 1) {
    var key = keys[i]
    if (this.desiredByKey[key] || this.inFlight[key]) continue
    delete this.failureCount[key]
    delete this.failureRetryAt[key]
    delete this.blocked[key]
    count -= 1
  }
}

TileManager.prototype.finishFailure = function (job, message, code, retryAfter) {
  if (this.dead || this.inFlight[job.key] !== job) return
  var count = (this.failureCount[job.key] || 0) + 1
  this.failureCount[job.key] = count
  this.consecutiveFailures += 1
  this.stats.failed += 1
  this.stats.lastCode = Number(code) || 0
  this.stats.lastMessage = message
  this.onStatus(message)
  if (this.consecutiveFailures >= 3) {
    // A blocked or dead network otherwise churns through every visible tile.
    this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + 10000)
    this.onStatus('网络连续失败 · 10秒后自动重试')
  }
  if (code === 403 || code === 404) this.blocked[job.key] = true
  var shouldRetry = code !== 403 && code !== 404 && count <= 2
  var delay = Math.min(30000, 1000 * Math.pow(2, count - 1))
  if (code === 429) {
    var after = retryAfter ? parseRetryAfter(retryAfter) : 60000
    delay = Math.max(delay, Math.min(after, 300000))
    this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + delay)
  }
  this.finishRequest(job)
  if (shouldRetry && this.desiredByKey[job.key]) {
    var latest = this.desiredByKey[job.key]
    this.enqueue(latest, job.stale, true, job.preferFile)
    for (var i = 0; i < this.queue.length; i += 1) {
      if (this.queue[i].key === job.key) this.queue[i].due = Date.now() + delay
    }
    this.failureRetryAt[job.key] = Date.now() + delay
  } else if (!this.blocked[job.key]) {
    this.failureRetryAt[job.key] = Date.now() + 60000
  }
  this.publish()
  this.pump()
}

TileManager.prototype.finishRequest = function (job) {
  if (this.inFlight[job.key] !== job) return
  if (job.watchdog) clearTimeout(job.watchdog)
  delete this.inFlight[job.key]
  this.activeCount = Math.max(0, this.activeCount - 1)
}

TileManager.prototype.hasTileFailure = function (key) {
  return !!(this.failureCount[key] || this.blocked[key])
}

TileManager.prototype.getTileState = function (key) {
  var job = this.inFlight[key]
  if (job) return job.timedOut ? 'failed' : 'loading'
  if (this.memory[key]) return 'decoding'
  for (var i = 0; i < this.queue.length; i += 1) {
    if (this.queue[i].key === key) return 'queued'
  }
  return this.blocked[key] || this.failureCount[key] ? 'failed' : 'queued'
}

TileManager.prototype.publish = function () {
  if (this.dead) return
  var tiles = []
  for (var i = 0; i < this.desired.length; i += 1) {
    var plan = this.desired[i]
    var record = this.memory[plan.key]
    if (!record) continue
    record.used = Date.now()
    this.touchMemory(plan.key)
    tiles.push({
      id: plan.key,
      key: plan.key,
      src: record.uri,
      left: plan.left,
      top: plan.top,
      size: plan.size,
      z: plan.z,
      x: plan.x,
      unwrappedX: plan.unwrappedX,
      y: plan.y,
      stale: record.expires <= Date.now()
    })
  }
  this.onChange(tiles, this.desired.length, tiles.length)
}

TileManager.prototype.armWatchdog = function (job) {
  if (job.watchdog) clearTimeout(job.watchdog)
  var self = this
  job.timedOut = false
  job.watchdog = setTimeout(function () {
    if (self.inFlight[job.key] !== job || self.dead) return
    job.timedOut = true
    // A JS timer cannot cancel the native fetch. Release the logical slot so a
    // hung socket cannot stall every later tile; a late callback is ignored by
    // the inFlight identity check.
    if (job.fetchPending && job.counted) {
      job.counted = false
      nativeRequests = Math.max(0, nativeRequests - 1)
      job.abandoned = true
      abandonedRequests += 1
    }
    self.finishFailure(job, '地图请求超时', 408, null)
  }, Config.REQUEST_TIMEOUT_MS)
}

TileManager.prototype.touchMemory = function (key) {
  var index = this.memoryOrder.indexOf(key)
  if (index >= 0) this.memoryOrder.splice(index, 1)
  this.memoryOrder.push(key)
}

TileManager.prototype.trimMemory = function () {
  while (this.memoryOrder.length > Config.MEMORY_TILE_LIMIT) {
    var removeIndex = -1
    for (var i = 0; i < this.memoryOrder.length; i += 1) {
      if (!this.desiredByKey[this.memoryOrder[i]]) { removeIndex = i; break }
    }
    if (removeIndex < 0) break
    var key = this.memoryOrder.splice(removeIndex, 1)[0]
    delete this.memory[key]
  }
}

TileManager.prototype.trimDisk = function () {
  var keys = Object.keys(this.disk)
  var bytes = 0
  for (var i = 0; i < keys.length; i += 1) bytes += Number(this.disk[keys[i]].size) || 0
  keys.sort(function (a, b) {
    return (Number(this.disk[a].used) || 0) - (Number(this.disk[b].used) || 0)
  }.bind(this))
  while (keys.length > Config.DISK_TILE_LIMIT || bytes > Config.DISK_BYTE_LIMIT) {
    var removeKey = null
    for (var j = 0; j < keys.length; j += 1) {
      if (!this.desiredByKey[keys[j]] && !this.pinnedKeys[keys[j]]) { removeKey = keys[j]; break }
    }
    if (!removeKey) break
    var entry = this.disk[removeKey]
    bytes -= Number(entry.size) || 0
    delete this.disk[removeKey]
    delete this.memory[removeKey]
    var memoryIndex = this.memoryOrder.indexOf(removeKey)
    if (memoryIndex >= 0) this.memoryOrder.splice(memoryIndex, 1)
    keys.splice(keys.indexOf(removeKey), 1)
    // Never delete a byte range that a native <image> may still be decoding.
    this.retireUri(entry.uri, removeKey)
    this.markIndexDirty()
  }
}

TileManager.prototype.deleteFile = function (uri) {
  if (!uri || /^internal:\/\/tmp\//.test(uri)) return
  try { this.file.delete({ uri: uri, success: function () {}, fail: function () {} }) } catch (ignored) {}
}

TileManager.prototype.retireUri = function (uri, key) {
  if (!uri) return
  this.retiredUris.push({ uri: uri, key: key, retireAt: Date.now() + 10000 })
  if (this.retireTimer !== null) clearTimeout(this.retireTimer)
  var self = this
  this.retireTimer = setTimeout(function () {
    self.retireTimer = null
    self.pruneRetired(false)
  }, 10000)
}

TileManager.prototype.pruneRetired = function (force) {
  if (!this.retiredUris.length) return
  var keep = []
  for (var i = 0; i < this.retiredUris.length; i += 1) {
    var item = this.retiredUris[i]
    var active = this.memory[item.key] && this.memory[item.key].uri === item.uri
    var persisted = this.disk[item.key] && this.disk[item.key].uri === item.uri
    if (!force && (this.pinnedKeys[item.key] || active || persisted || item.retireAt > Date.now())) keep.push(item)
    else this.deleteFile(item.uri)
  }
  this.retiredUris = keep
  if (!force && keep.length && this.retireTimer === null) {
    var self = this
    var delay = 10000
    var now = Date.now()
    for (var k = 0; k < keep.length; k += 1) {
      if (keep[k].retireAt > now) delay = Math.min(delay, keep[k].retireAt - now)
    }
    this.retireTimer = setTimeout(function () {
      self.retireTimer = null
      self.pruneRetired(false)
    }, Math.max(100, delay))
  }
}

TileManager.prototype.cleanupUndesiredEphemeral = function () {
  var keys = Object.keys(this.memory)
  for (var i = 0; i < keys.length; i += 1) {
    var key = keys[i]
    var record = this.memory[key]
    if (!record.noStore || this.desiredByKey[key] || this.pinnedKeys[key]) continue
    delete this.memory[key]
    var memoryIndex = this.memoryOrder.indexOf(key)
    if (memoryIndex >= 0) this.memoryOrder.splice(memoryIndex, 1)
    if (!record.temporary) {
      this.retireUri(record.uri, key)
      var uriIndex = this.ephemeralUris.indexOf(record.uri)
      if (uriIndex >= 0) this.ephemeralUris.splice(uriIndex, 1)
    }
  }
}

TileManager.prototype.markIndexDirty = function () {
  this.indexDirty = true
  this.flushIndex()
}

TileManager.prototype.flushIndex = function () {
  if (this.dead || !this.directoryReady || this.indexWriting || !this.indexDirty) return
  this.indexWriting = true
  this.indexDirty = false
  var self = this
  var settled = false
  var timer = setTimeout(function () {
    if (settled) return
    settled = true
    self.indexWriting = false
    self.indexDirty = true
    self.onStatus('地图缓存索引保存超时')
  }, 3000)
  var text = JSON.stringify({ version: INDEX_VERSION, entries: this.disk })
  try {
    this.file.writeText({
      uri: Config.INDEX_URI,
      text: text,
      success: function () {
        if (settled) return
        settled = true
        clearTimeout(timer)
        self.indexWriting = false
        if (self.indexDirty) self.flushIndex()
      },
      fail: function () {
        if (settled) return
        settled = true
        clearTimeout(timer)
        self.indexWriting = false
        self.onStatus('地图缓存索引无法保存')
      }
    })
  } catch (error) {
    if (settled) return
    settled = true
    clearTimeout(timer)
    this.indexWriting = false
    this.onStatus('地图缓存索引不可用')
  }
}

TileManager.prototype.retryVisible = function (force, preferFile) {
  this.consecutiveFailures = 0
  this.cooldownUntil = 0
  for (var i = 0; i < this.desired.length; i += 1) {
    var plan = this.desired[i]
    var record = this.memory[plan.key]
    if (force && record) {
      if (record.noStore && !record.temporary) this.retireUri(record.uri, plan.key)
      var ephemeralIndex = this.ephemeralUris.indexOf(record.uri)
      if (ephemeralIndex >= 0) this.ephemeralUris.splice(ephemeralIndex, 1)
      delete this.memory[plan.key]
      var memoryIndex = this.memoryOrder.indexOf(plan.key)
      if (memoryIndex >= 0) this.memoryOrder.splice(memoryIndex, 1)
      if (this.disk[plan.key]) {
        this.retireUri(this.disk[plan.key].uri, plan.key)
        delete this.disk[plan.key]
        this.markIndexDirty()
      }
      record = null
    }
    if (!force && record && record.expires > Date.now()) continue
    delete this.blocked[plan.key]
    delete this.failureRetryAt[plan.key]
    delete this.failureCount[plan.key]
    this.enqueue(plan, record || null, !!force || !!(record && record.expires <= Date.now()), !!preferFile)
  }
  this.pump()
}

TileManager.prototype.clearEphemeral = function () {
  for (var i = 0; i < this.ephemeralUris.length; i += 1) this.deleteFile(this.ephemeralUris[i])
  this.ephemeralUris = []
  var keys = Object.keys(this.memory)
  for (var j = 0; j < keys.length; j += 1) {
    if (this.memory[keys[j]].noStore) {
      if (!this.memory[keys[j]].temporary && this.memory[keys[j]].uri.indexOf(Config.TILE_DIRECTORY) === 0) {
        this.deleteFile(this.memory[keys[j]].uri)
      }
      delete this.memory[keys[j]]
      var index = this.memoryOrder.indexOf(keys[j])
      if (index >= 0) this.memoryOrder.splice(index, 1)
    }
  }
  this.publish()
}

function getHeader(headers, name) {
  var target = String(name).toLowerCase()
  var keys = Object.keys(headers || {})
  for (var i = 0; i < keys.length; i += 1) {
    if (keys[i].toLowerCase() === target) return String(headers[keys[i]])
  }
  return ''
}

function parseRetryAfter(value) {
  var seconds = Number(value)
  if (isFinite(seconds)) return Math.max(0, seconds * 1000)
  var date = Date.parse(value)
  return isNaN(date) ? 60000 : Math.max(0, date - Date.now())
}

function safeFileName(key) {
  return String(key).replace(/[^a-zA-Z0-9_-]/g, '_')
}

function requestPriority(plan, width, height) {
  var distanceX = plan.left + plan.size / 2 - (Number(width) || 0) / 2
  var distanceY = plan.top + plan.size / 2 - (Number(height) || 0) / 2
  return distanceX * distanceX + distanceY * distanceY
}

module.exports = TileManager
