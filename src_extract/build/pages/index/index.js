export default function(global, globalThis, window, $app_exports$, $app_evaluate$) {
    var org_app_require = $app_require$;
    (function(global, globalThis, window, $app_exports$, $app_evaluate$) {
        var setTimeout = global.setTimeout;
        var setInterval = global.setInterval;
        var clearTimeout = global.clearTimeout;
        var clearInterval = global.clearInterval;
        var $app_require$1 = global.$app_require$ || org_app_require;
        var createPageHandler = function() {
            return (()=>{
                var __webpack_modules__ = {
                    "./src/common/map/config.js" (module) {
                        "use strict";
                        module.exports = {
                            DESIGN_WIDTH: 432,
                            TILE_RASTER_SIZE: 256,
                            MIN_ZOOM: 3,
                            MAX_ZOOM: 18,
                            INITIAL_ZOOM: 15,
                            INITIAL_CENTER: {
                                latitude: 22.2819,
                                longitude: 114.1589
                            },
                            TILE_SOURCE_ID: 'osmfr-v1',
                            TILE_URL: 'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
                            TILE_ATTRIBUTION: '© OpenStreetMap / ODbL · Tiles: OSM France',
                            USER_AGENT: 'RedmiWatch6NativeMap/0.1.14 (Xiaomi Vela)',
                            REQUEST_CONCURRENCY: 1,
                            REQUEST_TIMEOUT_MS: 15000,
                            ENABLE_PINCH_PREVIEW: false,
                            EDGE_BUFFER_RATIO: 0,
                            MEMORY_TILE_LIMIT: 6,
                            DISK_TILE_LIMIT: 16,
                            DISK_BYTE_LIMIT: 2097152,
                            DEFAULT_CACHE_SECONDS: 604800,
                            CACHE_DIRECTORY: 'internal://files/redmi-watch6-map/',
                            TILE_DIRECTORY: 'internal://files/redmi-watch6-map/tiles/',
                            INDEX_URI: 'internal://files/redmi-watch6-map/index.json'
                        };
                    },
                    "./src/common/map/engine.js" (module, __unused_rspack_exports, __webpack_require__) {
                        "use strict";
                        var Projection = __webpack_require__("./src/common/map/projection.js");
                        var Config = __webpack_require__("./src/common/map/config.js");
                        function MapEngine(options) {
                            options = options || {};
                            this.zoom = Projection.clamp(void 0 === options.zoom ? Config.INITIAL_ZOOM : options.zoom, Config.MIN_ZOOM, Config.MAX_ZOOM);
                            this.center = {
                                latitude: void 0 === options.latitude ? Config.INITIAL_CENTER.latitude : options.latitude,
                                longitude: void 0 === options.longitude ? Config.INITIAL_CENTER.longitude : options.longitude
                            };
                            this.sourceId = options.sourceId || Config.TILE_SOURCE_ID;
                            this.tilePlan = null;
                            this.planBounds = null;
                            this.markerCache = null;
                            this.width = 0;
                            this.height = 0;
                            this.tileSize = Config.TILE_RASTER_SIZE;
                            this.setCenter(this.center.latitude, this.center.longitude);
                        }
                        MapEngine.prototype.setViewport = function(width, height, tileSize) {
                            this.width = Math.max(0, Number(width) || 0);
                            this.height = Math.max(0, Number(height) || 0);
                            this.tileSize = Math.max(1, Number(tileSize) || Config.TILE_RASTER_SIZE);
                        };
                        MapEngine.prototype.setCenter = function(latitude, longitude) {
                            if (!isFinite(latitude) || !isFinite(longitude)) return false;
                            this.center.latitude = Projection.clampLatitude(latitude);
                            this.center.longitude = Projection.normalizeLongitude(longitude);
                            return true;
                        };
                        MapEngine.prototype.setZoom = function(zoom) {
                            if (!isFinite(zoom)) return false;
                            this.zoom = Projection.clamp(Math.round(zoom), Config.MIN_ZOOM, Config.MAX_ZOOM);
                            return true;
                        };
                        MapEngine.prototype.centerWorld = function() {
                            return Projection.lonLatToWorld(this.center.longitude, this.center.latitude, this.zoom, this.tileSize);
                        };
                        MapEngine.prototype.worldAtScreen = function(x, y, centerWorld) {
                            var center = centerWorld || this.centerWorld();
                            return {
                                x: center.x + (Number(x) - this.width / 2),
                                y: center.y + (Number(y) - this.height / 2)
                            };
                        };
                        MapEngine.prototype.screenToLonLat = function(x, y, centerWorld) {
                            var point = this.worldAtScreen(x, y, centerWorld);
                            return Projection.worldToLonLat(point.x, point.y, this.zoom, this.tileSize);
                        };
                        MapEngine.prototype.panCenterWorld = function(startWorld, deltaX, deltaY) {
                            var size = Projection.worldSize(this.zoom, this.tileSize);
                            return {
                                x: startWorld.x - deltaX,
                                y: Projection.clamp(startWorld.y - deltaY, 0, size)
                            };
                        };
                        MapEngine.prototype.commitWorldCenter = function(point) {
                            var center = Projection.worldToLonLat(point.x, point.y, this.zoom, this.tileSize);
                            this.setCenter(center.latitude, center.longitude);
                        };
                        MapEngine.prototype.zoomAround = function(nextZoom, screenX, screenY) {
                            var target = Projection.clamp(Math.round(nextZoom), Config.MIN_ZOOM, Config.MAX_ZOOM);
                            if (target === this.zoom) return false;
                            var anchor = this.worldAtScreen(screenX, screenY);
                            var scale = Math.pow(2, target - this.zoom);
                            var nextCenterWorld = {
                                x: anchor.x * scale - (screenX - this.width / 2),
                                y: anchor.y * scale - (screenY - this.height / 2)
                            };
                            this.zoom = target;
                            var center = Projection.worldToLonLat(nextCenterWorld.x, nextCenterWorld.y, target, this.tileSize);
                            this.setCenter(center.latitude, center.longitude);
                            return true;
                        };
                        MapEngine.prototype.planVisibleTiles = function(centerWorld, edgeBuffer) {
                            if (!this.width || !this.height) return [];
                            var center = centerWorld || this.centerWorld();
                            var size = Projection.worldSize(this.zoom, this.tileSize);
                            var buffer = Math.max(0, Number(edgeBuffer) || 0);
                            var minX = Math.floor((center.x - this.width / 2 - buffer) / this.tileSize);
                            var maxX = Math.floor((center.x + this.width / 2 + buffer - 0.0001) / this.tileSize);
                            var minY = Math.max(0, Math.floor((center.y - this.height / 2 - buffer) / this.tileSize));
                            var maxY = Math.min(Math.pow(2, this.zoom) - 1, Math.floor((center.y + this.height / 2 + buffer - 0.0001) / this.tileSize));
                            var count = Math.pow(2, this.zoom);
                            var cached = this.planBounds;
                            if (cached && cached.zoom === this.zoom && cached.sourceId === this.sourceId && cached.size === this.tileSize && cached.minX === minX && cached.maxX === maxX && cached.minY === minY && cached.maxY === maxY) {
                                for(var c = 0; c < this.tilePlan.length; c += 1){
                                    var tile = this.tilePlan[c];
                                    tile.left = tile.unwrappedX * this.tileSize - center.x + this.width / 2;
                                    tile.top = tile.y * this.tileSize - center.y + this.height / 2;
                                }
                                return this.tilePlan;
                            }
                            var tiles = [];
                            var x;
                            var y;
                            for(y = minY; y <= maxY; y += 1){
                                for(x = minX; x <= maxX; x += 1){
                                    var wrappedX = Projection.mod(x, count);
                                    tiles.push({
                                        key: this.sourceId + ':' + this.zoom + ':' + wrappedX + ':' + y,
                                        z: this.zoom,
                                        x: wrappedX,
                                        unwrappedX: x,
                                        y: y,
                                        left: x * this.tileSize - center.x + this.width / 2,
                                        top: y * this.tileSize - center.y + this.height / 2,
                                        size: this.tileSize
                                    });
                                }
                            }
                            this.tilePlan = tiles;
                            this.planBounds = {
                                zoom: this.zoom,
                                sourceId: this.sourceId,
                                size: this.tileSize,
                                minX: minX,
                                maxX: maxX,
                                minY: minY,
                                maxY: maxY
                            };
                            return tiles;
                        };
                        MapEngine.prototype.markerScreenPoint = function(latitude, longitude, centerWorld) {
                            if (!isFinite(latitude) || !isFinite(longitude) || !this.width || !this.height) return null;
                            var center = centerWorld || this.centerWorld();
                            var marker = this.markerCache;
                            if (!marker || marker.longitude !== longitude || marker.latitude !== latitude || marker.zoom !== this.zoom || marker.tileSize !== this.tileSize) {
                                var projected = Projection.lonLatToWorld(longitude, latitude, this.zoom, this.tileSize);
                                marker = {
                                    longitude: longitude,
                                    latitude: latitude,
                                    zoom: this.zoom,
                                    tileSize: this.tileSize,
                                    x: projected.x,
                                    y: projected.y,
                                    worldSize: Projection.worldSize(this.zoom, this.tileSize)
                                };
                                this.markerCache = marker;
                            }
                            var size = marker.worldSize;
                            var dx = marker.x - center.x;
                            if (dx > size / 2) dx -= size;
                            if (dx < -size / 2) dx += size;
                            return {
                                x: this.width / 2 + dx,
                                y: this.height / 2 + marker.y - center.y
                            };
                        };
                        module.exports = MapEngine;
                    },
                    "./src/common/map/gesture-controller.js" (module) {
                        "use strict";
                        function getTouch(event, identifier) {
                            var touches = event && event.touches ? event.touches : [];
                            for(var i = 0; i < touches.length; i += 1)if (void 0 === identifier || touches[i].identifier === identifier) return touches[i];
                            return null;
                        }
                        function getPoint(touch, viewport) {
                            if (!touch) return null;
                            var rect = viewport || {
                                left: 0,
                                top: 0
                            };
                            return {
                                x: Number(touch.clientX) - (Number(rect.left) || 0),
                                y: Number(touch.clientY) - (Number(rect.top) || 0),
                                identifier: touch.identifier
                            };
                        }
                        function midpoint(a, b) {
                            return {
                                x: (a.x + b.x) / 2,
                                y: (a.y + b.y) / 2
                            };
                        }
                        function distance(a, b) {
                            var dx = a.x - b.x;
                            var dy = a.y - b.y;
                            return Math.sqrt(dx * dx + dy * dy);
                        }
                        function pinchScale(startDistance, currentDistance) {
                            if (!(startDistance > 0) || !(currentDistance > 0)) return 1;
                            return Math.max(0.6, Math.min(1.7, currentDistance / startDistance));
                        }
                        function centerAfterPinch(anchorWorld, startCentroid, currentCentroid, scale, oldZoom, newZoom, viewportWidth, viewportHeight) {
                            var safeScale = Math.max(0.0001, Number(scale) || 1);
                            var zoomFactor = Math.pow(2, newZoom - oldZoom);
                            var worldAtCurrentCentroid = {
                                x: (anchorWorld.x + currentCentroid.x - startCentroid.x) / safeScale * zoomFactor,
                                y: (anchorWorld.y + currentCentroid.y - startCentroid.y) / safeScale * zoomFactor
                            };
                            return {
                                x: worldAtCurrentCentroid.x - (currentCentroid.x - viewportWidth / 2),
                                y: worldAtCurrentCentroid.y - (currentCentroid.y - viewportHeight / 2)
                            };
                        }
                        module.exports = {
                            getTouch: getTouch,
                            getPoint: getPoint,
                            midpoint: midpoint,
                            distance: distance,
                            pinchScale: pinchScale,
                            centerAfterPinch: centerAfterPinch
                        };
                    },
                    "./src/common/map/image-metadata.js" (module) {
                        "use strict";
                        function validRaster(data) {
                            var b;
                            try {
                                b = data instanceof Uint8Array ? data : new Uint8Array(data);
                            } catch (e) {
                                return false;
                            }
                            if (!b || b.length < 24 || b.length > 131072) return false;
                            var w = 0;
                            var h = 0;
                            if (137 === b[0] && 80 === b[1] && 78 === b[2] && 71 === b[3]) {
                                if (b.length < 33 || 13 !== b[4] || 10 !== b[5] || 26 !== b[6] || 10 !== b[7] || 73 !== b[12] || 72 !== b[13] || 68 !== b[14] || 82 !== b[15]) return false;
                                w = 16777216 * b[16] + 65536 * b[17] + 256 * b[18] + b[19];
                                h = 16777216 * b[20] + 65536 * b[21] + 256 * b[22] + b[23];
                            } else if (255 === b[0] && 216 === b[1]) {
                                var i = 2;
                                while(i + 8 < b.length){
                                    if (255 !== b[i++]) return false;
                                    while(255 === b[i])i += 1;
                                    var marker = b[i++];
                                    if (218 === marker || 217 === marker) return false;
                                    var length = 256 * b[i] + b[i + 1];
                                    if (length < 2 || i + length > b.length) return false;
                                    if (marker >= 192 && marker <= 207 && 196 !== marker && 200 !== marker && 204 !== marker) {
                                        h = 256 * b[i + 3] + b[i + 4];
                                        w = 256 * b[i + 5] + b[i + 6];
                                        break;
                                    }
                                    i += length;
                                }
                            }
                            return 256 === w && 256 === h;
                        }
                        module.exports = validRaster;
                    },
                    "./src/common/map/loading-indicators.js" (module) {
                        "use strict";
                        function build(plans, tiles, ready, errors, manager, width, height) {
                            var sources = {};
                            var decoding = null;
                            for(var i = 0; i < tiles.length; i += 1)sources[tiles[i].id] = tiles[i].src;
                            for(var j = 0; j < plans.length; j += 1){
                                var plan = plans[j];
                                var src = sources[plan.key];
                                if (errors[plan.key]) continue;
                                if (!src || ready[plan.key] !== src) {
                                    var x1 = Math.max(0, plan.left);
                                    var y1 = Math.max(0, plan.top);
                                    var x2 = Math.min(width, plan.left + plan.size);
                                    var y2 = Math.min(height, plan.top + plan.size);
                                    if (!(x2 <= x1) && !(y2 <= y1)) {
                                        var state = src ? 'decoding' : manager ? manager.getTileState(plan.key) : 'queued';
                                        if (src && errors[plan.key] === src) state = 'failed';
                                        if ('loading' === state || 'decoding' === state) {
                                            var indicator = {
                                                id: plan.key,
                                                left: (x1 + x2) / 2 - 16,
                                                top: (y1 + y2) / 2 - 16,
                                                angle: 0,
                                                active: true,
                                                color: '#a8d6df',
                                                label: '加载'
                                            };
                                            if ('loading' === state) return [
                                                indicator
                                            ];
                                            if (!decoding) decoding = indicator;
                                        }
                                    }
                                }
                            }
                            return decoding ? [
                                decoding
                            ] : [];
                        }
                        module.exports = {
                            build: build
                        };
                    },
                    "./src/common/map/location-manager.js" (module) {
                        "use strict";
                        function LocationManager(geolocation, onFix, onStatus) {
                            this.api = geolocation;
                            this.onFix = onFix || function() {};
                            this.onStatus = onStatus || function() {};
                            this.active = false;
                            this.subscribed = false;
                            this.lastFix = null;
                            this.pending = false;
                            this.generation = 0;
                        }
                        LocationManager.prototype.start = function() {
                            if (this.active) return;
                            this.active = true;
                            this.requestOnce();
                        };
                        LocationManager.prototype.subscribe = function() {
                            if (!this.active || this.subscribed) return;
                            var self = this;
                            var generation = this.generation;
                            this.subscribed = true;
                            try {
                                this.api.subscribe({
                                    callback: function(data) {
                                        if (generation === self.generation) self.accept(data, "subscription");
                                    },
                                    fail: function(data, code) {
                                        if (generation !== self.generation || !self.active) return;
                                        self.subscribed = false;
                                        self.onStatus('实时定位失败 (' + code + ') · 点定位重试');
                                        console.log('Map GPS subscribe failure', code, String(data));
                                    }
                                });
                            } catch (error) {
                                this.subscribed = false;
                                this.onStatus('实时定位接口不可用');
                            }
                        };
                        LocationManager.prototype.stop = function() {
                            this.active = false;
                            this.generation += 1;
                            if (this.subscribed) {
                                try {
                                    this.api.unsubscribe();
                                } catch (ignored) {}
                            }
                            this.subscribed = false;
                        };
                        LocationManager.prototype.requestOnce = function() {
                            if (!this.active) return;
                            if (this.pending) return void this.onStatus('等待卫星定位 · 请在室外稍候');
                            if (this.subscribed) {
                                try {
                                    this.api.unsubscribe();
                                } catch (ignored) {}
                                this.subscribed = false;
                            }
                            this.generation += 1;
                            var self = this;
                            var generation = this.generation;
                            var settled = false;
                            this.pending = true;
                            this.onStatus('卫星定位中 · 最长等待60秒');
                            function finish(data, code, failed) {
                                if (settled) return;
                                settled = true;
                                self.pending = false;
                                if (!self.active) return;
                                if (generation !== self.generation) return void self.requestOnce();
                                if (failed) {
                                    self.onStatus(204 === Number(code) ? '定位超时 · 到室外点定位重试' : 203 === Number(code) ? '当前固件不支持定位' : '定位失败 (' + code + ') · 检查定位授权');
                                    console.log('Map GPS getLocation failure', code, String(data));
                                } else if (!self.accept(data, 'single')) {
                                    if (!self.lastFix) self.onStatus('定位数据无效 · 点定位重试');
                                }
                                if (203 !== Number(code)) self.subscribe();
                            }
                            try {
                                this.api.getLocation({
                                    timeout: 60000,
                                    success: function(data) {
                                        finish(data, 0, false);
                                    },
                                    fail: function(data, code) {
                                        finish(data, code, true);
                                    }
                                });
                            } catch (error) {
                                finish(String(error), -1, true);
                            }
                        };
                        LocationManager.prototype.accept = function(data, source) {
                            if (!this.active || !data || 'number' != typeof data.latitude || 'number' != typeof data.longitude || !isFinite(data.latitude) || !isFinite(data.longitude)) return false;
                            if (data.latitude < -90 || data.latitude > 90 || data.longitude < -180 || data.longitude > 180) return false;
                            var accuracy = Number(data.accuracy);
                            if (!isFinite(accuracy) && data.accuracyInfo) accuracy = Number(data.accuracyInfo.horizontal);
                            if (!isFinite(accuracy) || accuracy < 0) accuracy = null;
                            var fix = {
                                latitude: data.latitude,
                                longitude: data.longitude,
                                accuracy: accuracy,
                                timestamp: Date.now(),
                                source: source
                            };
                            if (this.lastFix) {
                                var distance = haversine(this.lastFix.latitude, this.lastFix.longitude, fix.latitude, fix.longitude);
                                var elapsed = Math.max(1, (fix.timestamp - this.lastFix.timestamp) / 1000);
                                var previousAccuracy = null === this.lastFix.accuracy ? 0 : this.lastFix.accuracy;
                                var uncertainty = (null === accuracy ? 0 : accuracy) + previousAccuracy;
                                if (distance > Math.max(5000, 350 * elapsed + 10 * uncertainty)) return false;
                            }
                            if (this.lastFix) {
                                var movement = haversine(this.lastFix.latitude, this.lastFix.longitude, fix.latitude, fix.longitude);
                                if ('single' !== source && movement < Math.max(4, 0.35 * Math.min(null === accuracy ? 0 : accuracy, 60))) return false;
                            }
                            this.lastFix = fix;
                            this.onFix(fix);
                            if (null !== accuracy && accuracy > 100) this.onStatus('已定位 · 精度较低');
                            return true;
                        };
                        function haversine(lat1, lon1, lat2, lon2) {
                            var radians = Math.PI / 180;
                            var dLat = (lat2 - lat1) * radians;
                            var dLon = (lon2 - lon1) * radians;
                            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * radians) * Math.cos(lat2 * radians) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
                            return 12742000 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)));
                        }
                        module.exports = LocationManager;
                    },
                    "./src/common/map/pan-input.js" (module) {
                        "use strict";
                        function create() {
                            var x = 0;
                            var y = 0;
                            return {
                                set: function(nextX, nextY) {
                                    x = nextX;
                                    y = nextY;
                                },
                                getX: function() {
                                    return x;
                                },
                                getY: function() {
                                    return y;
                                },
                                read: function() {
                                    return {
                                        x: x,
                                        y: y
                                    };
                                },
                                reset: function() {
                                    x = 0;
                                    y = 0;
                                }
                            };
                        }
                        module.exports = {
                            create: create
                        };
                    },
                    "./src/common/map/pan-layout.js" (module) {
                        "use strict";
                        var NO_ERRORS = {};
                        function update(tiles, previous, center, zoom, size, width, height, scale, errors) {
                            if (!tiles.length) return previous.length ? [] : previous;
                            errors = errors || NO_ERRORS;
                            var worldSize = Math.pow(2, zoom) * size;
                            var halfWorld = worldSize / 2;
                            var halfWidth = width / 2;
                            var baseY = height / 2 - center.y;
                            var next = null;
                            var visibleCount = 0;
                            for(var j = 0; j < tiles.length; j += 1){
                                var tile = tiles[j];
                                if (tile.z === zoom && errors[tile.id] !== tile.src) {
                                    var dx = tile.x * size - center.x;
                                    if (dx > halfWorld || dx <= -halfWorld) dx += Math.round(-dx / worldSize) * worldSize;
                                    var left = Math.round((dx + halfWidth) * scale) / scale;
                                    var top = Math.round((tile.y * size + baseY) * scale) / scale;
                                    if (!(left + size <= 0) && !(top + size <= 0) && !(left >= width) && !(top >= height)) {
                                        var node = previous[visibleCount];
                                        if (!node || node.id !== tile.id || node.src !== tile.src) {
                                            node = null;
                                            for(var i = 0; i < previous.length; i += 1)if (previous[i].id === tile.id && previous[i].src === tile.src) {
                                                node = previous[i];
                                                break;
                                            }
                                            if (!node) node = {
                                                id: tile.id,
                                                src: tile.src,
                                                left: left,
                                                top: top,
                                                width: size,
                                                height: size
                                            };
                                            if (!next) next = previous.slice(0, visibleCount);
                                        }
                                        if (node.left !== left) node.left = left;
                                        if (node.top !== top) node.top = top;
                                        if (next) next.push(node);
                                        visibleCount += 1;
                                    }
                                }
                            }
                            if (next) return next;
                            return visibleCount === previous.length ? previous : previous.slice(0, visibleCount);
                        }
                        module.exports = {
                            update: update
                        };
                    },
                    "./src/common/map/preferences.js" (module, __unused_rspack_exports, __webpack_require__) {
                        "use strict";
                        var Providers = __webpack_require__("./src/common/map/providers.js");
                        var KEY = 'map-preferences-v1';
                        function normalize(value) {
                            var input = value || {};
                            return {
                                sourceId: Providers.get(input.sourceId).id,
                                previousSourceId: input.previousSourceId ? Providers.get(input.previousSourceId).id : '',
                                hideBottomHint: true === input.hideBottomHint,
                                showLoadingIndicators: false !== input.showLoadingIndicators
                            };
                        }
                        function load(storage, callback) {
                            var done = false;
                            function finish(data) {
                                if (done) return;
                                done = true;
                                var value = {};
                                try {
                                    value = JSON.parse(data || '{}');
                                } catch (ignored) {}
                                callback(normalize(value));
                            }
                            try {
                                storage.get({
                                    key: KEY,
                                    success: finish,
                                    fail: function() {
                                        finish('');
                                    }
                                });
                            } catch (error) {
                                finish('');
                            }
                        }
                        function save(storage, value, success, fail) {
                            try {
                                storage.set({
                                    key: KEY,
                                    value: JSON.stringify(normalize(value)),
                                    success: success,
                                    fail: fail
                                });
                            } catch (error) {
                                if (fail) fail(String(error));
                            }
                        }
                        module.exports = {
                            normalize: normalize,
                            load: load,
                            save: save
                        };
                    },
                    "./src/common/map/projection.js" (module) {
                        "use strict";
                        var MAX_MERCATOR_LAT = 85.0511287798066;
                        var DEG_TO_RAD = Math.PI / 180;
                        var RAD_TO_DEG = 180 / Math.PI;
                        function clamp(value, min, max) {
                            return Math.max(min, Math.min(max, value));
                        }
                        function wrapLongitude(longitude) {
                            if (!isFinite(longitude)) return NaN;
                            var wrapped = ((longitude + 180) % 360 + 360) % 360 - 180;
                            return -180 === wrapped && longitude > 0 ? 180 : wrapped;
                        }
                        function normalizeLongitude(longitude) {
                            var wrapped = wrapLongitude(longitude);
                            if (!isFinite(wrapped)) return NaN;
                            return 180 === wrapped ? -180 : wrapped;
                        }
                        function clampLatitude(latitude) {
                            return clamp(latitude, -MAX_MERCATOR_LAT, MAX_MERCATOR_LAT);
                        }
                        function worldSize(zoom, tileSize) {
                            return tileSize * Math.pow(2, zoom);
                        }
                        function lonLatToWorld(longitude, latitude, zoom, tileSize) {
                            if (!isFinite(longitude) || !isFinite(latitude) || !isFinite(zoom) || !isFinite(tileSize)) return {
                                x: NaN,
                                y: NaN
                            };
                            var size = worldSize(zoom, tileSize);
                            var lon = normalizeLongitude(longitude);
                            var lat = clampLatitude(latitude) * DEG_TO_RAD;
                            var x = (lon + 180) / 360 * size;
                            var sinLatitude = Math.sin(lat);
                            var y = (0.5 - Math.log((1 + sinLatitude) / (1 - sinLatitude)) / (4 * Math.PI)) * size;
                            return {
                                x: x,
                                y: clamp(y, 0, size)
                            };
                        }
                        function worldToLonLat(x, y, zoom, tileSize) {
                            if (!isFinite(x) || !isFinite(y) || !isFinite(zoom) || !isFinite(tileSize)) return {
                                longitude: NaN,
                                latitude: NaN
                            };
                            var size = worldSize(zoom, tileSize);
                            var wrappedX = (x % size + size) % size;
                            var safeY = clamp(y, 0, size);
                            var longitude = wrappedX / size * 360 - 180;
                            var n = Math.PI - 2 * Math.PI * safeY / size;
                            var latitude = RAD_TO_DEG * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
                            return {
                                longitude: normalizeLongitude(longitude),
                                latitude: clampLatitude(latitude)
                            };
                        }
                        function geoToTile(longitude, latitude, zoom) {
                            var n = Math.pow(2, zoom);
                            var point = lonLatToWorld(longitude, latitude, zoom, 256);
                            return {
                                x: Math.floor(point.x / 256),
                                y: clamp(Math.floor(point.y / 256), 0, n - 1),
                                z: zoom
                            };
                        }
                        function tileToLonLat(x, y, zoom, tileSize) {
                            return worldToLonLat(x * tileSize, y * tileSize, zoom, tileSize);
                        }
                        function tileParent(tile) {
                            if (!tile || tile.z <= 0) return null;
                            return {
                                x: Math.floor(tile.x / 2),
                                y: Math.floor(tile.y / 2),
                                z: tile.z - 1
                            };
                        }
                        function tileChildren(tile) {
                            if (!tile || tile.z < 0) return [];
                            var z = tile.z + 1;
                            var x = 2 * tile.x;
                            var y = 2 * tile.y;
                            return [
                                {
                                    x: x,
                                    y: y,
                                    z: z
                                },
                                {
                                    x: x + 1,
                                    y: y,
                                    z: z
                                },
                                {
                                    x: x,
                                    y: y + 1,
                                    z: z
                                },
                                {
                                    x: x + 1,
                                    y: y + 1,
                                    z: z
                                }
                            ];
                        }
                        function tileBounds(tile) {
                            if (!tile || !isFinite(tile.x) || !isFinite(tile.y) || !isFinite(tile.z)) return null;
                            var count = Math.pow(2, tile.z);
                            var north = tileToLonLat(0, tile.y, tile.z, 256).latitude;
                            var south = tileToLonLat(0, tile.y + 1, tile.z, 256).latitude;
                            return [
                                tile.x / count * 360 - 180,
                                south,
                                (tile.x + 1) / count * 360 - 180,
                                north
                            ];
                        }
                        function mod(value, divisor) {
                            return (value % divisor + divisor) % divisor;
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
                        };
                    },
                    "./src/common/map/providers.js" (module) {
                        "use strict";
                        var providers = [
                            {
                                id: 'osmfr-v1',
                                name: 'OSM 法国社区',
                                url: 'https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
                                attribution: '© OpenStreetMap / ODbL · Tiles: OSM France'
                            },
                            {
                                id: 'osm-standard-v1',
                                name: 'OSM 标准（原图源）',
                                url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                                attribution: '© OpenStreetMap contributors / ODbL'
                            }
                        ];
                        function get(id) {
                            for(var i = 0; i < providers.length; i += 1)if (providers[i].id === id) return providers[i];
                            return providers[0];
                        }
                        module.exports = {
                            get: get
                        };
                    },
                    "./src/common/map/tile-failures.js" (module, __unused_rspack_exports, __webpack_require__) {
                        "use strict";
                        var TileLayout = __webpack_require__("./src/common/map/tile-layout.js");
                        function build(plans, tiles, errors, manager, width, height, scale) {
                            var sources = {};
                            var result = [];
                            for(var i = 0; i < tiles.length; i += 1)sources[tiles[i].id] = tiles[i].src;
                            for(var j = 0; j < plans.length; j += 1){
                                var plan = plans[j];
                                var src = sources[plan.key];
                                var decodeFailed = src && errors[plan.key] === src;
                                var requestFailed = !src && manager && ('failed' === manager.getTileState(plan.key) || manager.hasTileFailure && manager.hasTileFailure(plan.key));
                                if (decodeFailed || requestFailed) {
                                    if (!(plan.left + plan.size <= 0) && !(plan.top + plan.size <= 0) && !(plan.left >= width) && !(plan.top >= height)) {
                                        var rect = TileLayout.snappedRect(plan.left, plan.top, plan.size, scale);
                                        result.push({
                                            id: plan.key,
                                            key: plan.key,
                                            src: 'failure',
                                            left: rect.left,
                                            top: rect.top,
                                            width: rect.width,
                                            height: rect.height,
                                            size: plan.size,
                                            z: plan.z,
                                            x: plan.x,
                                            y: plan.y,
                                            unwrappedX: plan.unwrappedX
                                        });
                                    }
                                }
                            }
                            return result;
                        }
                        module.exports = {
                            build: build
                        };
                    },
                    "./src/common/map/tile-layout.js" (module) {
                        "use strict";
                        var MAX_RETAINED_TILES = 12;
                        function physicalScreenWidth(deviceInfo, designWidth) {
                            var info = deviceInfo || {};
                            var width = Number(info.screenWidth);
                            var density = Number(info.screenDensity);
                            var design = Number(designWidth) || 432;
                            if (!(width > 0)) return design;
                            if (width < 0.75 * design) return width * (density > 1 ? density : 2);
                            return width;
                        }
                        function pixelScale(viewWidth, physicalWidth) {
                            var width = Number(viewWidth);
                            var physical = Number(physicalWidth);
                            if (!(width > 0) || !(physical > 0)) return 1;
                            return physical / width;
                        }
                        function styleTileSize(rasterSize, scale) {
                            var raster = Number(rasterSize) || 256;
                            var ratio = Number(scale);
                            if (!(ratio > 0)) ratio = 1;
                            return raster / ratio;
                        }
                        function snap(value, scale) {
                            var ratio = Number(scale);
                            if (!(ratio > 0)) return value;
                            return Math.round(value * ratio) / ratio;
                        }
                        function snappedRect(left, top, size, scale) {
                            var x1 = snap(left, scale);
                            var y1 = snap(top, scale);
                            var x2 = snap(left + size, scale);
                            var y2 = snap(top + size, scale);
                            return {
                                left: x1,
                                top: y1,
                                width: Math.max(0, x2 - x1),
                                height: Math.max(0, y2 - y1)
                            };
                        }
                        function nearestTileX(tile, centerWorld, tileSize) {
                            var count = Math.pow(2, tile.z);
                            var centerTileX = centerWorld.x / tileSize;
                            return tile.x + Math.round((centerTileX - tile.x) / count) * count;
                        }
                        function layoutTile(tile, centerWorld, tileSize, width, height, scale) {
                            var tileX = nearestTileX(tile, centerWorld, tileSize);
                            var left = tileX * tileSize - centerWorld.x + width / 2;
                            var top = tile.y * tileSize - centerWorld.y + height / 2;
                            var rect = snappedRect(left, top, tileSize, scale);
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
                            };
                        }
                        function mergeVisibleTiles(targetTiles, previousTiles, centerWorld, zoom, tileSize, width, height, scale) {
                            var seen = {};
                            var result = [];
                            var current = targetTiles || [];
                            var previous = previousTiles || [];
                            var i;
                            for(i = 0; i < current.length && result.length < MAX_RETAINED_TILES; i += 1){
                                var loaded = layoutTile(current[i], centerWorld, tileSize, width, height, scale);
                                if (!(loaded.left + loaded.width <= 0) && !(loaded.top + loaded.height <= 0) && !(loaded.left >= width) && !(loaded.top >= height)) {
                                    if (!seen[loaded.id]) {
                                        seen[loaded.id] = true;
                                        result.push(loaded);
                                    }
                                }
                            }
                            for(i = 0; i < previous.length && result.length < MAX_RETAINED_TILES; i += 1){
                                var old = previous[i];
                                var key = old.key || old.id;
                                if (old.src && old.z === zoom) {
                                    if (!seen[key]) {
                                        var copy = layoutTile(old, centerWorld, tileSize, width, height, scale);
                                        if (!(copy.left + copy.size <= 0) && !(copy.top + copy.size <= 0) && !(copy.left >= width) && !(copy.top >= height)) {
                                            seen[key] = true;
                                            result.push(copy);
                                        }
                                    }
                                }
                            }
                            return result;
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
                        };
                    },
                    "./src/common/map/tile-manager.js" (module, __unused_rspack_exports, __webpack_require__) {
                        "use strict";
                        var Config = __webpack_require__("./src/common/map/config.js");
                        var isImageBytes = __webpack_require__("./src/common/map/image-metadata.js");
                        var INDEX_VERSION = 1;
                        var nativeRequests = 0;
                        function TileManager(network, fileApi, onChange, onStatus, provider) {
                            this.provider = provider || {
                                url: Config.TILE_URL
                            };
                            this.network = network;
                            this.file = fileApi;
                            this.onChange = onChange || function() {};
                            this.onStatus = onStatus || function() {};
                            this.memory = {};
                            this.memoryOrder = [];
                            this.disk = {};
                            this.desired = [];
                            this.desiredByKey = {};
                            this.queue = [];
                            this.inFlight = {};
                            this.accessing = {};
                            this.failureCount = {};
                            this.failureRetryAt = {};
                            this.blocked = {};
                            this.activeCount = 0;
                            this.visible = false;
                            this.interacting = false;
                            this.dead = false;
                            this.ready = false;
                            this.directoryReady = false;
                            this.indexDirty = false;
                            this.indexWriting = false;
                            this.pumpTimer = null;
                            this.planRevision = 0;
                            this.cooldownUntil = 0;
                            this.ephemeralUris = [];
                            this.pinnedKeys = {};
                            this.retiredUris = [];
                            this.retireTimer = null;
                            this.fileVersion = 0;
                            this.prepare();
                        }
                        TileManager.prototype.prepare = function() {
                            var self = this;
                            try {
                                this.file.mkdir({
                                    uri: Config.TILE_DIRECTORY,
                                    recursive: true,
                                    success: function() {
                                        self.directoryReady = true;
                                        self.readIndex();
                                    },
                                    fail: function(data, code) {
                                        self.directoryReady = false;
                                        self.onStatus('缓存不可用，地图只在当前运行期间保留');
                                        self.readIndex();
                                    }
                                });
                            } catch (error) {
                                this.readIndex();
                            }
                        };
                        TileManager.prototype.readIndex = function() {
                            var self = this;
                            try {
                                this.file.readText({
                                    uri: Config.INDEX_URI,
                                    success: function(data) {
                                        if (self.dead) return;
                                        try {
                                            var index = JSON.parse(data && data.text ? data.text : '{}');
                                            if (index.version === INDEX_VERSION && index.entries && 'object' == typeof index.entries) self.disk = index.entries;
                                        } catch (ignored) {
                                            self.disk = {};
                                        }
                                        self.reconcileFiles();
                                    },
                                    fail: function() {
                                        if (self.dead) return;
                                        self.reconcileFiles();
                                    }
                                });
                            } catch (error) {
                                this.reconcileFiles();
                            }
                        };
                        TileManager.prototype.reconcileFiles = function() {
                            var self = this;
                            if (!this.directoryReady || 'function' != typeof this.file.list) return void this.finishReadingIndex();
                            try {
                                this.file.list({
                                    uri: Config.TILE_DIRECTORY,
                                    success: function(result) {
                                        if (self.dead) return;
                                        var files = result && result.fileList ? result.fileList : [];
                                        var referenced = {};
                                        var keys = Object.keys(self.disk);
                                        for(var i = 0; i < keys.length; i += 1)if (self.disk[keys[i]] && self.disk[keys[i]].uri) referenced[self.disk[keys[i]].uri] = true;
                                        for(var j = 0; j < files.length; j += 1)if (files[j] && files[j].uri && !referenced[files[j].uri]) self.deleteFile(files[j].uri);
                                        self.finishReadingIndex();
                                    },
                                    fail: function() {
                                        self.finishReadingIndex();
                                    }
                                });
                            } catch (error) {
                                this.finishReadingIndex();
                            }
                        };
                        TileManager.prototype.finishReadingIndex = function() {
                            if (this.dead) return;
                            this.ready = true;
                            this.trimDisk();
                            this.resolveDesired();
                            this.pump();
                        };
                        TileManager.prototype.setVisible = function(visible) {
                            this.visible = !!visible;
                            if (this.visible) this.pump();
                            else this.clearEphemeral();
                        };
                        TileManager.prototype.setInteracting = function(value) {
                            this.interacting = !!value;
                            if (!this.interacting) this.pump();
                        };
                        TileManager.prototype.destroy = function() {
                            this.dead = true;
                            this.visible = false;
                            if (null !== this.pumpTimer) clearTimeout(this.pumpTimer);
                            this.pumpTimer = null;
                            if (null !== this.retireTimer) clearTimeout(this.retireTimer);
                            this.retireTimer = null;
                            var activeKeys = Object.keys(this.inFlight);
                            for(var a = 0; a < activeKeys.length; a += 1)if (this.inFlight[activeKeys[a]].watchdog) clearTimeout(this.inFlight[activeKeys[a]].watchdog);
                            this.clearEphemeral();
                            this.pruneRetired(true);
                            this.queue = [];
                            this.desired = [];
                            this.desiredByKey = {};
                            this.memory = {};
                            this.memoryOrder = [];
                            this.disk = {};
                            this.pinnedKeys = {};
                            this.onChange = function() {};
                            this.onStatus = function() {};
                        };
                        TileManager.prototype.setProvider = function(provider) {
                            this.provider = provider;
                            this.cooldownUntil = 0;
                        };
                        TileManager.prototype.setPlan = function(plans) {
                            var nextPlans = plans || [];
                            var sameKeys = nextPlans.length === this.desired.length;
                            if (sameKeys) {
                                for(var k = 0; k < nextPlans.length; k += 1)if (nextPlans[k].key !== this.desired[k].key) {
                                    sameKeys = false;
                                    break;
                                }
                            }
                            this.planRevision += 1;
                            this.desired = nextPlans;
                            this.desiredByKey = {};
                            for(var i = 0; i < this.desired.length; i += 1)this.desiredByKey[this.desired[i].key] = this.desired[i];
                            if (sameKeys) {
                                for(var q = 0; q < this.queue.length; q += 1){
                                    var updated = this.desiredByKey[this.queue[q].key];
                                    if (updated) {
                                        this.queue[q].plan = updated;
                                        this.queue[q].priority = requestPriority(updated, this.viewportWidth, this.viewportHeight);
                                    }
                                }
                                this.queue.sort(function(a, b) {
                                    return a.priority - b.priority;
                                });
                                this.resolveDesired(true);
                                this.pump();
                                return;
                            }
                            this.cleanupUndesiredEphemeral();
                            this.trimMemory();
                            this.trimFailures();
                            var kept = [];
                            for(var q = 0; q < this.queue.length; q += 1)if (this.desiredByKey[this.queue[q].key]) kept.push(this.queue[q]);
                            this.queue = kept;
                            this.resolveDesired();
                            this.pump();
                        };
                        TileManager.prototype.resolveDesired = function(skipPublish) {
                            if (this.dead || !this.ready) return;
                            for(var i = 0; i < this.desired.length; i += 1){
                                var plan = this.desired[i];
                                var cached = this.memory[plan.key];
                                if (cached) {
                                    cached.used = Date.now();
                                    this.touchMemory(plan.key);
                                    if (!cached.noStore && cached.expires <= Date.now()) this.enqueue(plan, cached, false);
                                    continue;
                                }
                                var diskEntry = this.disk[plan.key];
                                if (diskEntry) {
                                    if (this.accessing[plan.key]) continue;
                                    this.checkDiskEntry(plan, diskEntry);
                                    continue;
                                }
                                this.enqueue(plan, null, false);
                            }
                            if (!skipPublish) this.publish();
                        };
                        TileManager.prototype.checkDiskEntry = function(plan, entry) {
                            var self = this;
                            var key = plan.key;
                            this.accessing[key] = true;
                            try {
                                this.file.access({
                                    uri: entry.uri,
                                    success: function() {
                                        delete self.accessing[key];
                                        if (self.dead) return;
                                        var usable = self.disk[key];
                                        if (!usable) return;
                                        usable.used = Date.now();
                                        self.memory[key] = usable;
                                        self.touchMemory(key);
                                        if (usable.expires <= Date.now()) self.enqueue(self.desiredByKey[key] || plan, usable, false);
                                        self.trimMemory();
                                        self.publish();
                                        self.pump();
                                    },
                                    fail: function() {
                                        delete self.accessing[key];
                                        if (self.dead) return;
                                        delete self.disk[key];
                                        self.markIndexDirty();
                                        var latest = self.desiredByKey[key];
                                        if (latest) self.enqueue(latest, null, false);
                                        self.publish();
                                        self.pump();
                                    }
                                });
                            } catch (error) {
                                delete this.accessing[key];
                                delete this.disk[key];
                                this.markIndexDirty();
                                this.enqueue(this.desiredByKey[key] || plan, null, false);
                            }
                        };
                        TileManager.prototype.enqueue = function(plan, staleEntry, retry, preferFile) {
                            if (!plan || this.dead || this.inFlight[plan.key]) return;
                            if (!retry && this.blocked[plan.key]) return;
                            if (!retry && this.failureRetryAt[plan.key]) {
                                if (this.failureRetryAt[plan.key] > Date.now()) return;
                                delete this.failureRetryAt[plan.key];
                                delete this.failureCount[plan.key];
                            }
                            for(var i = 0; i < this.queue.length; i += 1)if (this.queue[i].key === plan.key) return;
                            if (!retry && this.memory[plan.key] && this.memory[plan.key].expires > Date.now()) return;
                            this.queue.push({
                                key: plan.key,
                                plan: plan,
                                stale: staleEntry || null,
                                preferFile: !!preferFile,
                                attempt: this.failureCount[plan.key] || 0,
                                due: Date.now(),
                                priority: requestPriority(plan, this.viewportWidth, this.viewportHeight)
                            });
                            this.queue.sort(function(a, b) {
                                return a.priority - b.priority;
                            });
                        };
                        TileManager.prototype.setViewportSize = function(width, height) {
                            this.viewportWidth = width;
                            this.viewportHeight = height;
                        };
                        TileManager.prototype.setPinnedKeys = function(keys) {
                            this.pinnedKeys = {};
                            for(var i = 0; i < keys.length; i += 1)this.pinnedKeys[keys[i]] = true;
                            this.pruneRetired(false);
                            this.trimDisk();
                        };
                        TileManager.prototype.pump = function() {
                            if (this.dead || !this.visible || !this.ready || this.interacting) return;
                            if (this.cooldownUntil > Date.now()) return void this.schedulePump(this.cooldownUntil - Date.now());
                            if (this.activeCount >= Config.REQUEST_CONCURRENCY || !this.queue.length) return;
                            if (nativeRequests >= Config.REQUEST_CONCURRENCY) return void this.schedulePump(300);
                            var now = Date.now();
                            var nextIndex = -1;
                            var nextDue = 1 / 0;
                            for(var i = 0; i < this.queue.length; i += 1){
                                if (this.queue[i].due <= now) {
                                    nextIndex = i;
                                    break;
                                }
                                nextDue = Math.min(nextDue, this.queue[i].due);
                            }
                            if (nextIndex < 0) return void this.schedulePump(Math.max(100, nextDue - now));
                            var job = this.queue.splice(nextIndex, 1)[0];
                            this.startRequest(job);
                            if (this.activeCount < Config.REQUEST_CONCURRENCY) this.pump();
                        };
                        TileManager.prototype.schedulePump = function(delay) {
                            if (null !== this.pumpTimer) clearTimeout(this.pumpTimer);
                            var self = this;
                            this.pumpTimer = setTimeout(function() {
                                self.pumpTimer = null;
                                self.pump();
                            }, delay);
                        };
                        TileManager.prototype.dispatchNetwork = function(job, options) {
                            var self = this;
                            var finished = false;
                            var success = options.success;
                            var fail = options.fail;
                            job.fetchPending = true;
                            nativeRequests += 1;
                            function settle(callback, data, code) {
                                if (finished) return;
                                finished = true;
                                job.fetchPending = false;
                                nativeRequests = Math.max(0, nativeRequests - 1);
                                callback(data, code);
                                self.pump();
                            }
                            options.success = function(data) {
                                settle(success, data);
                            };
                            options.fail = function(data, code) {
                                settle(fail, data, code);
                            };
                            try {
                                this.network.fetch(options);
                            } catch (error) {
                                settle(fail, null, -1);
                            }
                        };
                        TileManager.prototype.startRequest = function(job) {
                            var self = this;
                            var url = this.provider.url.replace('{z}', job.plan.z).replace('{x}', job.plan.x).replace('{y}', job.plan.y);
                            job.url = url;
                            var headers = {
                                'User-Agent': Config.USER_AGENT,
                                Accept: 'image/png,image/jpeg'
                            };
                            if (job.stale && job.stale.etag) headers['If-None-Match'] = job.stale.etag;
                            if (job.stale && job.stale.lastModified) headers['If-Modified-Since'] = job.stale.lastModified;
                            job.started = Date.now();
                            job.timedOut = false;
                            job.responseType = job.preferFile || !this.directoryReady ? 'file' : 'arraybuffer';
                            this.activeCount += 1;
                            this.inFlight[job.key] = job;
                            this.publish();
                            this.armWatchdog(job);
                            try {
                                this.dispatchNetwork(job, {
                                    url: url,
                                    method: 'GET',
                                    responseType: job.responseType,
                                    header: headers,
                                    success: function(response) {
                                        self.handleResponse(job, response || {});
                                    },
                                    fail: function(data, code) {
                                        self.finishFailure(job, '网络不可用', code, null);
                                    }
                                });
                            } catch (error) {
                                this.finishFailure(job, '网络接口不可用', -1, null);
                            }
                        };
                        TileManager.prototype.startFileFallback = function(job) {
                            var self = this;
                            if (this.dead || this.inFlight[job.key] !== job || job.preferFile) return void this.finishFailure(job, '瓦片无法写入手表缓存', 300, null);
                            job.preferFile = true;
                            job.responseType = 'file';
                            job.timedOut = false;
                            this.armWatchdog(job);
                            var url = job.url;
                            var headers = {
                                'User-Agent': Config.USER_AGENT,
                                Accept: 'image/png,image/jpeg'
                            };
                            this.onStatus('正在使用临时图片加载地图');
                            try {
                                this.dispatchNetwork(job, {
                                    url: url,
                                    method: 'GET',
                                    responseType: 'file',
                                    header: headers,
                                    success: function(response) {
                                        self.handleResponse(job, response || {});
                                    },
                                    fail: function(data, code) {
                                        self.finishFailure(job, '临时地图图片加载失败', code, null);
                                    }
                                });
                            } catch (error) {
                                this.finishFailure(job, '临时地图图片接口不可用', -1, null);
                            }
                        };
                        TileManager.prototype.handleResponse = function(job, response) {
                            if (this.dead || this.inFlight[job.key] !== job) return;
                            if (job.timedOut) return void this.finishFailure(job, '地图请求超时', 408, null);
                            var status = Number(response.code) || 0;
                            var headers = response.headers || {};
                            if (304 === status && job.stale && job.stale.uri) {
                                var revalidated = this.recordForResponse(job, job.stale.uri, job.stale.size, headers);
                                this.storeRecord(job, revalidated);
                                return;
                            }
                            if (status < 200 || status >= 300) {
                                var retryAfter = getHeader(headers, 'retry-after');
                                this.finishFailure(job, 403 === status ? '地图服务拒绝了请求' : 429 === status ? '地图服务暂时限流' : '地图瓦片请求失败 (' + status + ')', status, retryAfter);
                                return;
                            }
                            var bytes = response.data;
                            if ('string' == typeof bytes && bytes.length > 0) {
                                var temporaryRecord = this.recordForResponse(job, bytes, 0, headers);
                                temporaryRecord.noStore = true;
                                temporaryRecord.temporary = true;
                                this.storeRecord(job, temporaryRecord);
                                return;
                            }
                            if (!isImageBytes(bytes)) return void this.finishFailure(job, '地图图片格式或尺寸无效', 404, null);
                            var buffer = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
                            this.fileVersion += 1;
                            var uri = Config.TILE_DIRECTORY + safeFileName(job.key) + '-' + Date.now() + '-' + this.fileVersion + '.png';
                            var self = this;
                            var record = this.recordForResponse(job, uri, buffer.byteLength, headers);
                            try {
                                this.file.writeArrayBuffer({
                                    uri: uri,
                                    buffer: buffer,
                                    success: function() {
                                        if (self.dead) return void self.deleteFile(uri);
                                        if (self.inFlight[job.key] !== job) return void self.deleteFile(uri);
                                        if (record.noStore && self.visible) self.ephemeralUris.push(uri);
                                        self.storeRecord(job, record);
                                    },
                                    fail: function() {
                                        self.onStatus('瓦片缓存写入失败，改用临时图片');
                                        self.deleteFile(uri);
                                        self.startFileFallback(job);
                                    }
                                });
                            } catch (error) {
                                this.onStatus('手表文件缓存不可用，改用临时图片');
                                this.deleteFile(uri);
                                this.startFileFallback(job);
                            }
                        };
                        TileManager.prototype.recordForResponse = function(job, uri, byteLength, headers) {
                            var cacheControl = getHeader(headers, 'cache-control') || '';
                            var expiresHeader = getHeader(headers, 'expires');
                            var maxAge = /(?:^|,)\s*max-age\s*=\s*(\d+)/i.exec(cacheControl);
                            var age = Number(getHeader(headers, 'age')) || 0;
                            var expiry;
                            expiry = /no-store/i.test(cacheControl) ? Date.now() : maxAge ? Date.now() + 1000 * Math.max(0, Number(maxAge[1]) - age) : /no-cache/i.test(cacheControl) ? Date.now() : expiresHeader && !isNaN(Date.parse(expiresHeader)) ? Date.parse(expiresHeader) : Date.now() + 1000 * Config.DEFAULT_CACHE_SECONDS;
                            return {
                                uri: uri,
                                size: Number(byteLength) || 0,
                                saved: Date.now(),
                                used: Date.now(),
                                expires: expiry,
                                noStore: /no-store/i.test(cacheControl),
                                etag: getHeader(headers, 'etag') || job.stale && job.stale.etag || '',
                                lastModified: getHeader(headers, 'last-modified') || job.stale && job.stale.lastModified || ''
                            };
                        };
                        TileManager.prototype.storeRecord = function(job, record) {
                            if (this.dead || this.inFlight[job.key] !== job) return;
                            delete this.failureCount[job.key];
                            delete this.failureRetryAt[job.key];
                            delete this.blocked[job.key];
                            if (record.noStore && !this.visible) {
                                if (!record.temporary) this.deleteFile(record.uri);
                                this.finishRequest(job);
                                this.pump();
                                return;
                            }
                            var oldRecord = this.disk[job.key] || this.memory[job.key];
                            if (oldRecord && oldRecord.uri && oldRecord.uri !== record.uri) this.retireUri(oldRecord.uri, job.key);
                            this.memory[job.key] = record;
                            this.touchMemory(job.key);
                            var hadDiskRecord = !!this.disk[job.key];
                            var persistIndex = !record.noStore || hadDiskRecord;
                            if (record.noStore) delete this.disk[job.key];
                            else this.disk[job.key] = record;
                            this.trimMemory();
                            this.trimDisk();
                            if (persistIndex) this.markIndexDirty();
                            this.finishRequest(job);
                            this.publish();
                            this.pump();
                        };
                        TileManager.prototype.trimFailures = function() {
                            var keys = Object.keys(this.failureCount);
                            var count = keys.length;
                            for(var i = 0; i < keys.length && count > 48; i += 1){
                                var key = keys[i];
                                if (!this.desiredByKey[key] && !this.inFlight[key]) {
                                    delete this.failureCount[key];
                                    delete this.failureRetryAt[key];
                                    delete this.blocked[key];
                                    count -= 1;
                                }
                            }
                        };
                        TileManager.prototype.finishFailure = function(job, message, code, retryAfter) {
                            if (this.dead || this.inFlight[job.key] !== job) return;
                            var count = (this.failureCount[job.key] || 0) + 1;
                            this.failureCount[job.key] = count;
                            this.onStatus(message);
                            if (403 === code || 404 === code) this.blocked[job.key] = true;
                            var shouldRetry = 403 !== code && 404 !== code && count <= 2;
                            var delay = Math.min(30000, 1000 * Math.pow(2, count - 1));
                            if (429 === code) {
                                var after = retryAfter ? parseRetryAfter(retryAfter) : 60000;
                                delay = Math.max(delay, Math.min(after, 300000));
                                this.cooldownUntil = Math.max(this.cooldownUntil, Date.now() + delay);
                            }
                            this.finishRequest(job);
                            if (shouldRetry && this.desiredByKey[job.key]) {
                                var latest = this.desiredByKey[job.key];
                                this.enqueue(latest, job.stale, true, job.preferFile);
                                for(var i = 0; i < this.queue.length; i += 1)if (this.queue[i].key === job.key) this.queue[i].due = Date.now() + delay;
                                this.failureRetryAt[job.key] = Date.now() + delay;
                            } else if (!this.blocked[job.key]) this.failureRetryAt[job.key] = Date.now() + 60000;
                            this.publish();
                            this.pump();
                        };
                        TileManager.prototype.finishRequest = function(job) {
                            if (this.inFlight[job.key] !== job) return;
                            if (job.watchdog) clearTimeout(job.watchdog);
                            delete this.inFlight[job.key];
                            this.activeCount = Math.max(0, this.activeCount - 1);
                        };
                        TileManager.prototype.hasTileFailure = function(key) {
                            return !!(this.failureCount[key] || this.blocked[key]);
                        };
                        TileManager.prototype.getTileState = function(key) {
                            var job = this.inFlight[key];
                            if (job) return job.timedOut ? 'failed' : 'loading';
                            if (this.memory[key]) return 'decoding';
                            for(var i = 0; i < this.queue.length; i += 1)if (this.queue[i].key === key) return 'queued';
                            return this.blocked[key] || this.failureCount[key] ? 'failed' : 'queued';
                        };
                        TileManager.prototype.publish = function() {
                            if (this.dead) return;
                            var tiles = [];
                            for(var i = 0; i < this.desired.length; i += 1){
                                var plan = this.desired[i];
                                var record = this.memory[plan.key];
                                if (record) {
                                    record.used = Date.now();
                                    this.touchMemory(plan.key);
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
                                    });
                                }
                            }
                            this.onChange(tiles, this.desired.length, tiles.length);
                        };
                        TileManager.prototype.armWatchdog = function(job) {
                            if (job.watchdog) clearTimeout(job.watchdog);
                            var self = this;
                            job.timedOut = false;
                            job.watchdog = setTimeout(function() {
                                if (self.inFlight[job.key] !== job || self.dead) return;
                                job.timedOut = true;
                                if (job.fetchPending) self.onStatus('地图请求超时 · 等待网络恢复');
                                else self.finishFailure(job, '地图请求超时', 408, null);
                            }, Config.REQUEST_TIMEOUT_MS);
                        };
                        TileManager.prototype.touchMemory = function(key) {
                            var index = this.memoryOrder.indexOf(key);
                            if (index >= 0) this.memoryOrder.splice(index, 1);
                            this.memoryOrder.push(key);
                        };
                        TileManager.prototype.trimMemory = function() {
                            while(this.memoryOrder.length > Config.MEMORY_TILE_LIMIT){
                                var removeIndex = -1;
                                for(var i = 0; i < this.memoryOrder.length; i += 1)if (!this.desiredByKey[this.memoryOrder[i]]) {
                                    removeIndex = i;
                                    break;
                                }
                                if (removeIndex < 0) break;
                                var key = this.memoryOrder.splice(removeIndex, 1)[0];
                                delete this.memory[key];
                            }
                        };
                        TileManager.prototype.trimDisk = function() {
                            var keys = Object.keys(this.disk);
                            var bytes = 0;
                            for(var i = 0; i < keys.length; i += 1)bytes += Number(this.disk[keys[i]].size) || 0;
                            keys.sort((function(a, b) {
                                return (Number(this.disk[a].used) || 0) - (Number(this.disk[b].used) || 0);
                            }).bind(this));
                            while(keys.length > Config.DISK_TILE_LIMIT || bytes > Config.DISK_BYTE_LIMIT){
                                var removeKey = null;
                                for(var j = 0; j < keys.length; j += 1)if (!this.desiredByKey[keys[j]] && !this.pinnedKeys[keys[j]]) {
                                    removeKey = keys[j];
                                    break;
                                }
                                if (!removeKey) break;
                                var entry = this.disk[removeKey];
                                bytes -= Number(entry.size) || 0;
                                delete this.disk[removeKey];
                                delete this.memory[removeKey];
                                var memoryIndex = this.memoryOrder.indexOf(removeKey);
                                if (memoryIndex >= 0) this.memoryOrder.splice(memoryIndex, 1);
                                keys.splice(keys.indexOf(removeKey), 1);
                                this.deleteFile(entry.uri);
                                this.markIndexDirty();
                            }
                        };
                        TileManager.prototype.deleteFile = function(uri) {
                            if (!uri || /^internal:\/\/tmp\//.test(uri)) return;
                            try {
                                this.file.delete({
                                    uri: uri,
                                    success: function() {},
                                    fail: function() {}
                                });
                            } catch (ignored) {}
                        };
                        TileManager.prototype.retireUri = function(uri, key) {
                            if (!uri) return;
                            this.retiredUris.push({
                                uri: uri,
                                key: key,
                                retireAt: Date.now() + 10000
                            });
                            if (null !== this.retireTimer) clearTimeout(this.retireTimer);
                            var self = this;
                            this.retireTimer = setTimeout(function() {
                                self.retireTimer = null;
                                self.pruneRetired(false);
                            }, 10000);
                        };
                        TileManager.prototype.pruneRetired = function(force) {
                            if (!this.retiredUris.length) return;
                            var keep = [];
                            for(var i = 0; i < this.retiredUris.length; i += 1){
                                var item = this.retiredUris[i];
                                var active = this.memory[item.key] && this.memory[item.key].uri === item.uri;
                                var persisted = this.disk[item.key] && this.disk[item.key].uri === item.uri;
                                if (!force && (this.pinnedKeys[item.key] || active || persisted || item.retireAt > Date.now())) keep.push(item);
                                else this.deleteFile(item.uri);
                            }
                            this.retiredUris = keep;
                            if (!force && keep.length && null === this.retireTimer) {
                                var self = this;
                                var delay = 10000;
                                var now = Date.now();
                                for(var k = 0; k < keep.length; k += 1)if (keep[k].retireAt > now) delay = Math.min(delay, keep[k].retireAt - now);
                                this.retireTimer = setTimeout(function() {
                                    self.retireTimer = null;
                                    self.pruneRetired(false);
                                }, Math.max(100, delay));
                            }
                        };
                        TileManager.prototype.cleanupUndesiredEphemeral = function() {
                            var keys = Object.keys(this.memory);
                            for(var i = 0; i < keys.length; i += 1){
                                var key = keys[i];
                                var record = this.memory[key];
                                if (record.noStore && !this.desiredByKey[key] && !this.pinnedKeys[key]) {
                                    delete this.memory[key];
                                    var memoryIndex = this.memoryOrder.indexOf(key);
                                    if (memoryIndex >= 0) this.memoryOrder.splice(memoryIndex, 1);
                                    if (!record.temporary) {
                                        this.deleteFile(record.uri);
                                        var uriIndex = this.ephemeralUris.indexOf(record.uri);
                                        if (uriIndex >= 0) this.ephemeralUris.splice(uriIndex, 1);
                                    }
                                }
                            }
                        };
                        TileManager.prototype.markIndexDirty = function() {
                            this.indexDirty = true;
                            this.flushIndex();
                        };
                        TileManager.prototype.flushIndex = function() {
                            if (this.dead || !this.directoryReady || this.indexWriting || !this.indexDirty) return;
                            this.indexWriting = true;
                            this.indexDirty = false;
                            var self = this;
                            var text = JSON.stringify({
                                version: INDEX_VERSION,
                                entries: this.disk
                            });
                            try {
                                this.file.writeText({
                                    uri: Config.INDEX_URI,
                                    text: text,
                                    success: function() {
                                        self.indexWriting = false;
                                        if (self.indexDirty) self.flushIndex();
                                    },
                                    fail: function() {
                                        self.indexWriting = false;
                                        self.onStatus('地图缓存索引无法保存');
                                    }
                                });
                            } catch (error) {
                                this.indexWriting = false;
                                this.onStatus('地图缓存索引不可用');
                            }
                        };
                        TileManager.prototype.retryVisible = function(force, preferFile) {
                            for(var i = 0; i < this.desired.length; i += 1){
                                var plan = this.desired[i];
                                var record = this.memory[plan.key];
                                if (force && record) {
                                    if (record.noStore && this.pinnedKeys[plan.key]) this.retireUri(record.uri, plan.key);
                                    else if (record.noStore && !record.temporary) this.deleteFile(record.uri);
                                    var ephemeralIndex = this.ephemeralUris.indexOf(record.uri);
                                    if (ephemeralIndex >= 0) this.ephemeralUris.splice(ephemeralIndex, 1);
                                    delete this.memory[plan.key];
                                    var memoryIndex = this.memoryOrder.indexOf(plan.key);
                                    if (memoryIndex >= 0) this.memoryOrder.splice(memoryIndex, 1);
                                    if (this.disk[plan.key]) {
                                        if (this.pinnedKeys[plan.key]) this.retireUri(this.disk[plan.key].uri, plan.key);
                                        else this.deleteFile(this.disk[plan.key].uri);
                                        delete this.disk[plan.key];
                                        this.markIndexDirty();
                                    }
                                    record = null;
                                }
                                if (!(!force && record && record.expires > Date.now())) {
                                    delete this.blocked[plan.key];
                                    delete this.failureRetryAt[plan.key];
                                    delete this.failureCount[plan.key];
                                    this.enqueue(plan, record || null, !!force || !!(record && record.expires <= Date.now()), !!preferFile);
                                }
                            }
                            this.pump();
                        };
                        TileManager.prototype.clearEphemeral = function() {
                            for(var i = 0; i < this.ephemeralUris.length; i += 1)this.deleteFile(this.ephemeralUris[i]);
                            this.ephemeralUris = [];
                            var keys = Object.keys(this.memory);
                            for(var j = 0; j < keys.length; j += 1)if (this.memory[keys[j]].noStore) {
                                if (!this.memory[keys[j]].temporary && 0 === this.memory[keys[j]].uri.indexOf(Config.TILE_DIRECTORY)) this.deleteFile(this.memory[keys[j]].uri);
                                delete this.memory[keys[j]];
                                var index = this.memoryOrder.indexOf(keys[j]);
                                if (index >= 0) this.memoryOrder.splice(index, 1);
                            }
                            this.publish();
                        };
                        function getHeader(headers, name) {
                            var target = String(name).toLowerCase();
                            var keys = Object.keys(headers || {});
                            for(var i = 0; i < keys.length; i += 1)if (keys[i].toLowerCase() === target) return String(headers[keys[i]]);
                            return '';
                        }
                        function parseRetryAfter(value) {
                            var seconds = Number(value);
                            if (isFinite(seconds)) return Math.max(0, 1000 * seconds);
                            var date = Date.parse(value);
                            return isNaN(date) ? 60000 : Math.max(0, date - Date.now());
                        }
                        function safeFileName(key) {
                            return String(key).replace(/[^a-zA-Z0-9_-]/g, '_');
                        }
                        function requestPriority(plan, width, height) {
                            var distanceX = plan.left + plan.size / 2 - (Number(width) || 0) / 2;
                            var distanceY = plan.top + plan.size / 2 - (Number(height) || 0) / 2;
                            return distanceX * distanceX + distanceY * distanceY;
                        }
                        module.exports = TileManager;
                    }
                };
                var __webpack_module_cache__ = {};
                function __webpack_require__(moduleId) {
                    var cachedModule = __webpack_module_cache__[moduleId];
                    if (void 0 !== cachedModule) return cachedModule.exports;
                    var module = __webpack_module_cache__[moduleId] = {
                        exports: {}
                    };
                    __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
                    return module.exports;
                }
                (()=>{
                    __webpack_require__.g = (()=>{
                        if ('object' == typeof globalThis) return globalThis;
                        try {
                            return this || new Function('return this')();
                        } catch (e) {
                            if ('object' == typeof window) return window;
                        }
                    })();
                })();
                (()=>{
                    __webpack_require__.rv = ()=>"1.7.12";
                })();
                (()=>{
                    __webpack_require__.ruid = "bundler=rspack@1.7.12";
                })();
                (()=>{
                    var $app_style$ = [
                        [
                            [
                                [
                                    0,
                                    "map-root"
                                ]
                            ],
                            {
                                width: "100%",
                                height: "100%",
                                backgroundColor: "#111719"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "failure-layer"
                                ]
                            ],
                            {
                                position: "absolute",
                                left: "0px",
                                top: "0px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "loading-layer"
                                ]
                            ],
                            {
                                position: "absolute",
                                left: "0px",
                                top: "0px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "tile-layer"
                                ]
                            ],
                            {
                                position: "absolute",
                                left: "0px",
                                top: "0px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "marker-layer"
                                ]
                            ],
                            {
                                position: "absolute",
                                left: "0px",
                                top: "0px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "controls-layer"
                                ]
                            ],
                            {
                                position: "absolute",
                                left: "0px",
                                top: "0px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "failed-tile"
                                ]
                            ],
                            {
                                position: "absolute",
                                borderTopWidth: "2px",
                                borderRightWidth: "2px",
                                borderBottomWidth: "2px",
                                borderLeftWidth: "2px",
                                borderTopColor: "#e36d68",
                                borderRightColor: "#e36d68",
                                borderBottomColor: "#e36d68",
                                borderLeftColor: "#e36d68",
                                backgroundColor: "rgba(0, 0, 0, 0)"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "tile-loading"
                                ]
                            ],
                            {
                                position: "absolute",
                                width: "32px",
                                height: "52px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "tile-loading-ring"
                                ]
                            ],
                            {
                                width: "26px",
                                height: "26px",
                                borderTopWidth: "3px",
                                borderRightWidth: "3px",
                                borderBottomWidth: "3px",
                                borderLeftWidth: "3px",
                                borderTopColor: "#a8d6df",
                                borderRightColor: "#a8d6df",
                                borderBottomColor: "#a8d6df",
                                borderLeftColor: "#a8d6df",
                                borderRadius: "13px",
                                backgroundColor: "rgba(13, 22, 24, 0.5)"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "tile-loading-label"
                                ]
                            ],
                            {
                                position: "absolute",
                                top: "34px",
                                width: "32px",
                                height: "16px",
                                fontSize: "11px",
                                textAlign: "center"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "map-tile"
                                ]
                            ],
                            {
                                width: "256px",
                                height: "256px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "status-card"
                                ]
                            ],
                            {
                                height: "38px",
                                paddingLeft: "12px",
                                paddingRight: "12px",
                                borderRadius: "14px",
                                backgroundColor: "rgba(13, 22, 24, 0.86)",
                                justifyContent: "center"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "status-text"
                                ]
                            ],
                            {
                                color: "#f4f7f2",
                                fontSize: "15px",
                                fontWeight: 600,
                                textOverflow: "ellipsis"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "map-control"
                                ]
                            ],
                            {
                                width: "56px",
                                height: "56px",
                                borderRadius: "22px",
                                backgroundColor: "rgba(250, 252, 250, 0.95)",
                                alignItems: "center",
                                justifyContent: "center"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "recenter-control"
                                ]
                            ],
                            {
                                backgroundColor: "#e7f1f8"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "control-glyph"
                                ]
                            ],
                            {
                                color: "#17333d",
                                fontSize: "34px",
                                fontWeight: 500,
                                textAlign: "center"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "locate-glyph"
                                ]
                            ],
                            {
                                color: "#1769aa",
                                fontSize: "34px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "zoom-minus"
                                ]
                            ],
                            {
                                fontSize: "38px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "position-halo"
                                ]
                            ],
                            {
                                width: "40px",
                                height: "40px",
                                borderRadius: "20px",
                                backgroundColor: "rgba(26, 115, 232, 0.28)"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "position-dot"
                                ]
                            ],
                            {
                                width: "18px",
                                height: "18px",
                                borderRadius: "9px",
                                borderTopWidth: "3px",
                                borderRightWidth: "3px",
                                borderBottomWidth: "3px",
                                borderLeftWidth: "3px",
                                borderTopColor: "#ffffff",
                                borderRightColor: "#ffffff",
                                borderBottomColor: "#ffffff",
                                borderLeftColor: "#ffffff",
                                backgroundColor: "#1a73e8"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "attribution"
                                ]
                            ],
                            {
                                height: "27px",
                                paddingLeft: "9px",
                                paddingRight: "9px",
                                borderRadius: "9px",
                                backgroundColor: "rgba(13, 22, 24, 0.85)",
                                justifyContent: "center"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "attribution-text"
                                ]
                            ],
                            {
                                color: "#ffffff",
                                fontSize: "11px",
                                textOverflow: "ellipsis"
                            }
                        ]
                    ];
                    var $app_script$ = function __scriptModule__(module, exports, $app_require$1) {
                        "use strict";
                        Object.defineProperty(exports, "__esModule", {
                            value: true
                        });
                        exports.default = void 0;
                        var _system = _interopRequireDefault($app_require$1("@app-module/system.fetch"));
                        var _system2 = _interopRequireDefault($app_require$1("@app-module/system.file"));
                        var _system3 = _interopRequireDefault($app_require$1("@app-module/system.device"));
                        var _system4 = _interopRequireDefault($app_require$1("@app-module/system.brightness"));
                        var _system5 = _interopRequireDefault($app_require$1("@app-module/system.router"));
                        var _system6 = _interopRequireDefault($app_require$1("@app-module/system.storage"));
                        var _system7 = _interopRequireDefault($app_require$1("@app-module/system.geolocation"));
                        var _config = _interopRequireDefault(__webpack_require__("./src/common/map/config.js"));
                        var _projection = _interopRequireDefault(__webpack_require__("./src/common/map/projection.js"));
                        var _engine = _interopRequireDefault(__webpack_require__("./src/common/map/engine.js"));
                        var _tileManager = _interopRequireDefault(__webpack_require__("./src/common/map/tile-manager.js"));
                        var _tileLayout = _interopRequireDefault(__webpack_require__("./src/common/map/tile-layout.js"));
                        var _locationManager = _interopRequireDefault(__webpack_require__("./src/common/map/location-manager.js"));
                        var _gestureController = _interopRequireDefault(__webpack_require__("./src/common/map/gesture-controller.js"));
                        var _loadingIndicators = _interopRequireDefault(__webpack_require__("./src/common/map/loading-indicators.js"));
                        var _tileFailures = _interopRequireDefault(__webpack_require__("./src/common/map/tile-failures.js"));
                        var _panInput = _interopRequireDefault(__webpack_require__("./src/common/map/pan-input.js"));
                        var _panLayout = _interopRequireDefault(__webpack_require__("./src/common/map/pan-layout.js"));
                        var _preferences = _interopRequireDefault(__webpack_require__("./src/common/map/preferences.js"));
                        var _providers = _interopRequireDefault(__webpack_require__("./src/common/map/providers.js"));
                        function _interopRequireDefault(e) {
                            return e && e.__esModule ? e : {
                                default: e
                            };
                        }
                        var DRAG_START_DISTANCE = 5;
                        var DRAG_RENDER_DELAY = 80;
                        var TILE_APPLY_DELAY = 50;
                        var PINCH_IN_THRESHOLD = 1.3;
                        var PINCH_OUT_THRESHOLD = 0.77;
                        var runtime = createRuntimeState();
                        function createRuntimeState() {
                            return {
                                sourceId: 'osmfr-v1',
                                showLoadingIndicators: true,
                                preferencesReady: false,
                                preferencesGeneration: 0,
                                openingSettings: false,
                                engine: null,
                                tileManager: null,
                                locationManager: null,
                                locationFix: null,
                                followLocation: true,
                                runtimeReady: false,
                                pageVisible: true,
                                pageShown: false,
                                disposed: false,
                                viewport: {
                                    left: 0,
                                    top: 0,
                                    width: 432,
                                    height: 514
                                },
                                tileSize: 256,
                                screenWidth: 432,
                                screenDensity: 1,
                                physicalScreenWidth: 432,
                                pixelScale: 1,
                                layoutMeasured: false,
                                layoutSignature: '',
                                layoutTimer: null,
                                dragTimer: null,
                                tileApplyTimer: null,
                                pendingTiles: null,
                                pendingRequired: 0,
                                pendingLoaded: 0,
                                lastZoomAt: 0,
                                lastManualRetryAt: 0,
                                gesture: null,
                                panInput: null,
                                pinch: null,
                                uiTouchActive: false,
                                requiredTileCount: 0,
                                loadedTileCount: 0,
                                imageErrorCount: 0,
                                lastTileStatus: '',
                                gpsStatus: '等待定位',
                                tiles: [],
                                failureRecords: [],
                                imageReady: {},
                                imageErrors: {}
                            };
                        }
                        function collectGarbage() {
                            try {
                                if (void 0 !== __webpack_require__.g && __webpack_require__.g && 'function' == typeof __webpack_require__.g.runGC) __webpack_require__.g.runGC();
                            } catch (ignored) {}
                        }
                        function sameRenderNodes(previous, next) {
                            if (previous.length !== next.length) return false;
                            for(var i = 0; i < next.length; i += 1){
                                var a = previous[i];
                                var b = next[i];
                                if (a.id !== b.id || a.left !== b.left || a.top !== b.top || a.width !== b.width || a.height !== b.height) return false;
                            }
                            return true;
                        }
                        var _default = exports.default = {
                            private: {
                                hideBottomHint: false,
                                viewWidth: 432,
                                viewHeight: 514,
                                statusWidth: 220,
                                attributionWidth: 300,
                                attributionTop: 476,
                                controlLeft: 360,
                                recenterTop: 284,
                                zoomInTop: 350,
                                zoomOutTop: 418,
                                visibleTiles: [],
                                loadingIndicators: [],
                                failedTiles: [],
                                markerVisible: false,
                                markerLeft: 0,
                                markerTop: 0,
                                dotLeft: 0,
                                dotTop: 0,
                                statusText: '地图加载中',
                                mapAttribution: _config.default.TILE_ATTRIBUTION
                            },
                            onReady () {
                                runtime = createRuntimeState();
                                runtime.panInput = _panInput.default.create();
                                runtime.engine = new _engine.default({
                                    sourceId: runtime.sourceId,
                                    zoom: _config.default.INITIAL_ZOOM,
                                    latitude: _config.default.INITIAL_CENTER.latitude,
                                    longitude: _config.default.INITIAL_CENTER.longitude
                                });
                                var self = this;
                                runtime.layoutTimer = setTimeout(function() {
                                    self.finalizeLayout();
                                }, 500);
                                this.readDeviceInfo();
                                if (runtime.pageShown) this.measureViewport();
                            },
                            onShow () {
                                var state = runtime;
                                if (state.disposed) return;
                                this.setScreenAwake(true);
                                state.openingSettings = false;
                                state.pageShown = true;
                                state.pageVisible = true;
                                this.loadPreferences();
                                this.measureViewport();
                                if (state.runtimeReady && state.preferencesReady) this.startRuntime();
                            },
                            onHide () {
                                var state = runtime;
                                this.setScreenAwake(false);
                                state.pageVisible = false;
                                state.preferencesGeneration += 1;
                                state.uiTouchActive = false;
                                state.pendingTiles = null;
                                if (null !== state.tileApplyTimer) clearTimeout(state.tileApplyTimer);
                                state.tileApplyTimer = null;
                                if (state.tileManager) state.tileManager.setVisible(false);
                                this.cancelGesture();
                                if (state.locationManager) state.locationManager.stop();
                            },
                            onDestroy () {
                                var state = runtime;
                                this.setScreenAwake(false);
                                state.disposed = true;
                                state.pageVisible = false;
                                this.cancelGesture();
                                if (null !== state.layoutTimer) clearTimeout(state.layoutTimer);
                                if (null !== state.dragTimer) clearTimeout(state.dragTimer);
                                if (null !== state.tileApplyTimer) clearTimeout(state.tileApplyTimer);
                                state.layoutTimer = null;
                                state.dragTimer = null;
                                state.tileApplyTimer = null;
                                state.pendingTiles = null;
                                if (state.tileManager) state.tileManager.destroy();
                                if (state.locationManager) state.locationManager.stop();
                                state.tileManager = null;
                                state.locationManager = null;
                                state.engine = null;
                                state.tiles = [];
                                state.failureRecords = [];
                                state.imageReady = {};
                                state.imageErrors = {};
                                state.gesture = null;
                                state.pinch = null;
                                state.pendingTiles = null;
                                collectGarbage();
                            },
                            setScreenAwake (enabled) {
                                try {
                                    _system4.default.setKeepScreenOn({
                                        keepScreenOn: enabled,
                                        fail: function(data, code) {
                                            console.log('Map keep-screen-on failed', code, String(data));
                                        }
                                    });
                                } catch (error) {
                                    console.log('Map keep-screen-on unavailable', String(error));
                                }
                            },
                            openSettings () {
                                var state = runtime;
                                if (!state.pageVisible || state.disposed || state.openingSettings || state.uiTouchActive || state.gesture && state.gesture.moved) return;
                                state.openingSettings = true;
                                this.cancelGesture(true);
                                try {
                                    _system5.default.push({
                                        uri: '/pages/settings'
                                    });
                                } catch (error) {
                                    state.openingSettings = false;
                                    this.statusText = '设置页面打开失败';
                                }
                            },
                            loadPreferences () {
                                var self = this;
                                var state = runtime;
                                var generation = ++state.preferencesGeneration;
                                state.preferencesReady = false;
                                _preferences.default.load(_system6.default, function(value) {
                                    if (state.disposed || !state.pageVisible || generation !== state.preferencesGeneration) return;
                                    var changed = state.sourceId !== value.sourceId;
                                    state.sourceId = value.sourceId;
                                    self.hideBottomHint = value.hideBottomHint;
                                    state.showLoadingIndicators = value.showLoadingIndicators;
                                    self.mapAttribution = _providers.default.get(value.sourceId).attribution;
                                    state.preferencesReady = true;
                                    if (state.engine) state.engine.sourceId = value.sourceId;
                                    if (changed) {
                                        state.layoutSignature = '';
                                        if (state.tileManager) state.tileManager.setProvider(_providers.default.get(value.sourceId));
                                        state.tiles = [];
                                        state.failureRecords = [];
                                        state.imageReady = {};
                                        state.imageErrors = {};
                                        state.lastTileStatus = '';
                                        self.visibleTiles = [];
                                        self.failedTiles = [];
                                        self.loadingIndicators = [];
                                    }
                                    self.finalizeLayout();
                                    if (state.runtimeReady) self.startRuntime();
                                });
                            },
                            readDeviceInfo () {
                                var self = this;
                                var state = runtime;
                                try {
                                    _system3.default.getInfo({
                                        success: function(info) {
                                            if (state.disposed || !info) return;
                                            if (Number(info.screenWidth) > 0) state.screenWidth = Number(info.screenWidth);
                                            if (Number(info.screenDensity) > 0) state.screenDensity = Number(info.screenDensity);
                                            self.finalizeLayout();
                                        },
                                        fail: function() {
                                            self.finalizeLayout();
                                        }
                                    });
                                } catch (error) {
                                    this.finalizeLayout();
                                }
                            },
                            measureViewport () {
                                var self = this;
                                var state = runtime;
                                try {
                                    this.$element('map-root').getBoundingClientRect({
                                        success: function(rect) {
                                            if (state.disposed || !rect || !(rect.width > 0) || !(rect.height > 0)) return;
                                            state.viewport = {
                                                left: Number(rect.left) || 0,
                                                top: Number(rect.top) || 0,
                                                width: Number(rect.width),
                                                height: Number(rect.height)
                                            };
                                            state.layoutMeasured = true;
                                            self.finalizeLayout();
                                        },
                                        fail: function() {
                                            self.finalizeLayout();
                                        }
                                    });
                                } catch (error) {
                                    this.finalizeLayout();
                                }
                            },
                            finalizeLayout () {
                                var state = runtime;
                                if (state.disposed || !state.engine || !state.pageShown || !state.preferencesReady) return;
                                if (null !== state.layoutTimer) {
                                    clearTimeout(state.layoutTimer);
                                    state.layoutTimer = null;
                                }
                                if (!state.layoutMeasured) state.viewport = {
                                    left: 0,
                                    top: 0,
                                    width: 432,
                                    height: 514
                                };
                                this.viewWidth = state.viewport.width;
                                this.viewHeight = state.viewport.height;
                                state.physicalScreenWidth = _tileLayout.default.physicalScreenWidth({
                                    screenWidth: state.screenWidth,
                                    screenDensity: state.screenDensity
                                }, _config.default.DESIGN_WIDTH);
                                state.pixelScale = _tileLayout.default.pixelScale(this.viewWidth, state.physicalScreenWidth);
                                state.tileSize = _tileLayout.default.styleTileSize(_config.default.TILE_RASTER_SIZE, state.pixelScale);
                                state.engine.setViewport(this.viewWidth, this.viewHeight, state.tileSize);
                                this.updateLayoutControls();
                                var signature = this.viewWidth + 'x' + this.viewHeight + ':' + state.tileSize + ':' + state.pixelScale + ':' + state.sourceId;
                                if (signature === state.layoutSignature) return;
                                state.layoutSignature = signature;
                                if (state.runtimeReady) this.updateTilePlan();
                                else this.createMapRuntime();
                            },
                            updateLayoutControls () {
                                var state = runtime;
                                var width = state.viewport.width;
                                var height = state.viewport.height;
                                this.statusWidth = Math.max(150, Math.min(250, width - 106));
                                this.controlLeft = Math.max(10, width - 70);
                                this.recenterTop = Math.max(72, height - 230);
                                this.zoomInTop = Math.max(136, height - 164);
                                this.zoomOutTop = Math.max(200, height - 96);
                                this.attributionTop = Math.max(10, height - 40);
                                this.attributionWidth = Math.max(190, width - 106);
                            },
                            createMapRuntime () {
                                var state = runtime;
                                if (state.runtimeReady || state.disposed) return;
                                var self = this;
                                state.tileManager = new _tileManager.default(_system.default, _system2.default, function(tiles, requiredCount, loadedCount) {
                                    self.onTileManagerChange(tiles, requiredCount, loadedCount);
                                }, function(message) {
                                    if (state.disposed) return;
                                    state.lastTileStatus = message;
                                    if (state.tileManager) self.refreshLoadingIndicators();
                                    self.statusText = state.locationFix ? '定位 · ' + message : message;
                                }, _providers.default.get(state.sourceId));
                                state.locationManager = new _locationManager.default(_system7.default, function(fix) {
                                    if (state.disposed) return;
                                    state.locationFix = fix;
                                    if (state.followLocation) {
                                        state.engine.setCenter(fix.latitude, fix.longitude);
                                        if (state.gesture && !state.gesture.moved) {
                                            state.gesture.centerWorld = state.engine.centerWorld();
                                            state.gesture.currentWorld = state.gesture.centerWorld;
                                        }
                                        self.updateTilePlan();
                                    }
                                    self.updateMarker(state.gesture && state.gesture.moved ? state.gesture.currentWorld : null);
                                    self.statusText = null !== fix.accuracy && fix.accuracy > 100 ? '已定位 · 精度较低' : '已定位';
                                }, function(message) {
                                    if (!state.disposed) {
                                        state.gpsStatus = message;
                                        self.statusText = message;
                                    }
                                });
                                state.tileManager.setViewportSize(this.viewWidth, this.viewHeight);
                                state.tileManager.setVisible(state.pageVisible);
                                state.runtimeReady = true;
                                this.updateTilePlan();
                                if (state.pageVisible) state.locationManager.start();
                            },
                            startRuntime () {
                                var state = runtime;
                                if (state.disposed || !state.runtimeReady) return;
                                state.pageVisible = true;
                                if (state.tileManager) {
                                    state.tileManager.setVisible(true);
                                    state.tileManager.publish();
                                    this.updateTilePlan();
                                }
                                if (state.locationManager) state.locationManager.start();
                            },
                            onTileManagerChange (tiles, requiredCount, loadedCount) {
                                var state = runtime;
                                if (state.disposed || !state.pageVisible) return;
                                state.pendingTiles = tiles;
                                state.pendingRequired = requiredCount;
                                state.pendingLoaded = loadedCount;
                                if (null !== state.tileApplyTimer) return;
                                var self = this;
                                state.tileApplyTimer = setTimeout(function() {
                                    state.tileApplyTimer = null;
                                    self.applyTileChange();
                                }, TILE_APPLY_DELAY);
                            },
                            applyTileChange () {
                                var state = runtime;
                                if (state.disposed || !state.pageVisible || !state.engine || !state.pendingTiles) return;
                                if (state.gesture || state.pinch) return;
                                var tiles = state.pendingTiles;
                                state.pendingTiles = null;
                                state.requiredTileCount = state.pendingRequired;
                                state.loadedTileCount = state.pendingLoaded;
                                var center = state.engine.centerWorld();
                                state.tiles = _tileLayout.default.mergeVisibleTiles(tiles, state.tiles, center, state.engine.zoom, state.tileSize, this.viewWidth, this.viewHeight, state.pixelScale);
                                this.redrawTiles();
                                if (!state.locationFix) {
                                    if (state.loadedTileCount > 0 && state.loadedTileCount >= state.requiredTileCount) {
                                        state.lastTileStatus = '';
                                        this.statusText = state.gpsStatus || '默认位置 · 香港';
                                    } else if (state.requiredTileCount > 0 && !state.lastTileStatus) this.statusText = '地图加载中 ' + state.loadedTileCount + '/' + state.requiredTileCount;
                                }
                            },
                            flushPendingTiles () {
                                var state = runtime;
                                if (null !== state.tileApplyTimer) {
                                    clearTimeout(state.tileApplyTimer);
                                    state.tileApplyTimer = null;
                                }
                                if (state.pendingTiles) this.applyTileChange();
                            },
                            updateTilePlan (centerWorld) {
                                var state = runtime;
                                if (!state.tileManager || !state.engine || state.disposed) return;
                                state.tileManager.setViewportSize(this.viewWidth, this.viewHeight);
                                state.tileManager.setPlan(state.engine.planVisibleTiles(centerWorld || state.engine.centerWorld(), state.tileSize * _config.default.EDGE_BUFFER_RATIO));
                                this.redrawTiles(centerWorld);
                            },
                            redrawTiles (centerWorld) {
                                var state = runtime;
                                if (!state.engine) return;
                                var center = centerWorld || (state.gesture && state.gesture.moved ? state.gesture.currentWorld : state.engine.centerWorld());
                                var width = this.viewWidth;
                                var height = this.viewHeight;
                                var size = state.tileSize;
                                var previous = this.visibleTiles;
                                var previousById = null;
                                var visible = [];
                                for(var i = 0; i < state.tiles.length; i += 1){
                                    var tile = state.tiles[i];
                                    if (tile.z === state.engine.zoom) {
                                        if (state.imageErrors[tile.id] !== tile.src) {
                                            var left;
                                            var top;
                                            var tileWidth;
                                            var tileHeight;
                                            if (state.pinch && state.pinch.active) {
                                                var factor = Math.pow(2, state.pinch.zoom - tile.z);
                                                var tileWorldX = tile.unwrappedX * size * factor;
                                                var tileWorldY = tile.y * size * factor;
                                                var pinchLeft = state.pinch.currentCentroid.x + (tileWorldX - state.pinch.anchorWorld.x) * state.pinch.scale;
                                                var pinchTop = state.pinch.currentCentroid.y + (tileWorldY - state.pinch.anchorWorld.y) * state.pinch.scale;
                                                var pinchSize = size * factor * state.pinch.scale;
                                                var pinchRect = _tileLayout.default.snappedRect(pinchLeft, pinchTop, pinchSize, state.pixelScale);
                                                left = pinchRect.left;
                                                top = pinchRect.top;
                                                tileWidth = pinchRect.width;
                                                tileHeight = pinchRect.height;
                                            } else {
                                                var rect = _tileLayout.default.layoutTile(tile, center, size, width, height, state.pixelScale);
                                                left = rect.left;
                                                top = rect.top;
                                                tileWidth = rect.width;
                                                tileHeight = rect.height;
                                            }
                                            if (!(left + tileWidth <= 0) && !(top + tileHeight <= 0) && !(left >= width) && !(top >= height)) {
                                                if (!previousById) {
                                                    previousById = {};
                                                    for(var p = 0; p < previous.length; p += 1)previousById[previous[p].id] = previous[p];
                                                }
                                                var node = previousById[tile.id];
                                                if (!node || node.src !== tile.src) node = {
                                                    id: tile.id,
                                                    src: tile.src,
                                                    left: 0,
                                                    top: 0,
                                                    width: 0,
                                                    height: 0
                                                };
                                                node.left = left;
                                                node.top = top;
                                                node.width = tileWidth;
                                                node.height = tileHeight;
                                                visible.push(node);
                                            }
                                        }
                                    }
                                }
                                var same = visible.length === previous.length;
                                for(var v = 0; same && v < visible.length; v += 1)if (visible[v] !== previous[v]) same = false;
                                if (!same) this.visibleTiles = visible;
                                var ready = {};
                                var errors = {};
                                for(var k = 0; k < visible.length; k += 1)if (state.imageReady[visible[k].id] === visible[k].src) ready[visible[k].id] = visible[k].src;
                                for(var e = 0; e < state.tiles.length; e += 1){
                                    var failed = state.tiles[e];
                                    if (state.imageErrors[failed.id] === failed.src) errors[failed.id] = failed.src;
                                }
                                state.imageReady = ready;
                                state.imageErrors = errors;
                                this.refreshLoadingIndicators(center);
                                this.updateMarker(center);
                            },
                            refreshLoadingIndicators (centerWorld) {
                                var state = runtime;
                                if (state.disposed || !state.engine || !state.pageVisible) return;
                                if (state.gesture && state.gesture.moved) {
                                    if (this.loadingIndicators.length) this.loadingIndicators = [];
                                    return;
                                }
                                var center = centerWorld || state.engine.centerWorld();
                                var plans = state.engine.planVisibleTiles(center, 0);
                                state.failureRecords = _tileFailures.default.build(plans, state.tiles, state.imageErrors, state.tileManager, this.viewWidth, this.viewHeight, state.pixelScale);
                                var failureNodes = [];
                                for(var i = 0; i < state.failureRecords.length; i += 1){
                                    var failure = state.failureRecords[i];
                                    failureNodes.push({
                                        id: failure.id,
                                        src: 'failure',
                                        left: failure.left,
                                        top: failure.top,
                                        width: failure.width,
                                        height: failure.height
                                    });
                                }
                                if (!sameRenderNodes(this.failedTiles, failureNodes)) this.failedTiles = failureNodes;
                                if (!state.showLoadingIndicators) {
                                    if (this.loadingIndicators.length) this.loadingIndicators = [];
                                    return;
                                }
                                var indicators = _loadingIndicators.default.build(plans, this.visibleTiles, state.imageReady, state.imageErrors, state.tileManager, this.viewWidth, this.viewHeight);
                                var indicatorNodes = [];
                                for(var j = 0; j < indicators.length; j += 1){
                                    var indicator = indicators[j];
                                    indicatorNodes.push({
                                        id: indicator.id,
                                        left: indicator.left,
                                        top: indicator.top,
                                        color: indicator.color,
                                        label: indicator.label
                                    });
                                }
                                if (!sameRenderNodes(this.loadingIndicators, indicatorNodes)) this.loadingIndicators = indicatorNodes;
                            },
                            onTileImageComplete (id, src) {
                                var state = runtime;
                                if (state.disposed || !state.pageVisible) return;
                                for(var i = 0; i < this.visibleTiles.length; i += 1)if (this.visibleTiles[i].id === id && this.visibleTiles[i].src === src) {
                                    state.imageReady[id] = src;
                                    delete state.imageErrors[id];
                                    this.refreshLoadingIndicators();
                                    return;
                                }
                            },
                            updateMarker (centerWorld) {
                                var state = runtime;
                                if (!state.engine || !state.locationFix) {
                                    if (this.markerVisible) this.markerVisible = false;
                                    return;
                                }
                                var point;
                                if (state.pinch && state.pinch.active) {
                                    var projected = _projection.default.lonLatToWorld(state.locationFix.longitude, state.locationFix.latitude, state.pinch.zoom, state.tileSize);
                                    point = {
                                        x: state.pinch.currentCentroid.x + (projected.x - state.pinch.anchorWorld.x) * state.pinch.scale,
                                        y: state.pinch.currentCentroid.y + (projected.y - state.pinch.anchorWorld.y) * state.pinch.scale
                                    };
                                } else point = state.engine.markerScreenPoint(state.locationFix.latitude, state.locationFix.longitude, centerWorld);
                                if (!point) {
                                    if (this.markerVisible) this.markerVisible = false;
                                    return;
                                }
                                var haloLeft = point.x - 20;
                                var haloTop = point.y - 20;
                                var dotLeft = point.x - 9;
                                var dotTop = point.y - 9;
                                if (!this.markerVisible) this.markerVisible = true;
                                if (this.markerLeft !== haloLeft) this.markerLeft = haloLeft;
                                if (this.markerTop !== haloTop) this.markerTop = haloTop;
                                if (this.dotLeft !== dotLeft) this.dotLeft = dotLeft;
                                if (this.dotTop !== dotTop) this.dotTop = dotTop;
                            },
                            syncPanInput () {
                                var state = runtime;
                                if (!state.gesture || !state.gesture.moved || !state.panInput) return false;
                                var dx = Math.round(state.panInput.getX() * state.pixelScale) / state.pixelScale;
                                var dy = Math.round(state.panInput.getY() * state.pixelScale) / state.pixelScale;
                                if (dx === state.gesture.deltaX && dy === state.gesture.deltaY) return false;
                                state.gesture.deltaX = dx;
                                state.gesture.deltaY = dy;
                                state.gesture.currentWorld = state.engine.panCenterWorld(state.gesture.centerWorld, dx, dy);
                                return true;
                            },
                            redrawPanTiles () {
                                var state = runtime;
                                if (!state.gesture || !state.gesture.moved) return;
                                var center = state.gesture.currentWorld;
                                var visible = _panLayout.default.update(state.tiles, this.visibleTiles, center, state.engine.zoom, state.tileSize, this.viewWidth, this.viewHeight, state.pixelScale, state.imageErrors);
                                if (visible !== this.visibleTiles) this.visibleTiles = visible;
                                var failed = _panLayout.default.update(state.failureRecords, this.failedTiles, center, state.engine.zoom, state.tileSize, this.viewWidth, this.viewHeight, state.pixelScale);
                                if (failed !== this.failedTiles) this.failedTiles = failed;
                                this.updateMarker(center);
                            },
                            renderDragTranslation () {
                                var state = runtime;
                                if (!state.gesture || !state.gesture.moved) return;
                                if (!this.syncPanInput()) return;
                                this.redrawPanTiles();
                            },
                            zoomIn () {
                                this.changeZoom(runtime.engine.zoom + 1);
                            },
                            zoomOut () {
                                this.changeZoom(runtime.engine.zoom - 1);
                            },
                            changeZoom (nextZoom) {
                                var state = runtime;
                                if (!state.engine || state.disposed) return;
                                var zoom = Math.max(_config.default.MIN_ZOOM, Math.min(_config.default.MAX_ZOOM, Math.round(nextZoom)));
                                if (zoom === state.engine.zoom || Date.now() - state.lastZoomAt < 600) return;
                                state.lastZoomAt = Date.now();
                                if (state.tileManager) state.tileManager.setInteracting(true);
                                this.cancelGesture(true);
                                state.engine.zoomAround(zoom, this.viewWidth / 2, this.viewHeight / 2);
                                this.updateTilePlan();
                                if (state.tileManager) state.tileManager.setInteracting(false);
                            },
                            recenter () {
                                var state = runtime;
                                if (!state.engine || state.disposed) return;
                                state.followLocation = true;
                                if (!state.locationFix) {
                                    this.statusText = '正在请求当前位置';
                                    if (state.locationManager) state.locationManager.requestOnce();
                                    return;
                                }
                                this.cancelGesture();
                                state.engine.setCenter(state.locationFix.latitude, state.locationFix.longitude);
                                this.updateTilePlan();
                                this.statusText = '已回到当前位置';
                                if (state.locationManager) state.locationManager.requestOnce();
                            },
                            onUiTouchStart () {
                                runtime.uiTouchActive = true;
                                this.cancelGesture();
                            },
                            onMapTouchStart (event) {
                                var state = runtime;
                                if (state.uiTouchActive || state.openingSettings || !state.engine || !state.pageVisible) return;
                                if (!state.panInput) state.panInput = _panInput.default.create();
                                state.panInput.reset();
                                if (event && event.touches && event.touches.length >= 2) return void this.startPinch(event);
                                var touch = _gestureController.default.getTouch(event);
                                var point = _gestureController.default.getPoint(touch, state.viewport);
                                if (!point) return;
                                state.gesture = {
                                    identifier: point.identifier,
                                    startX: point.x,
                                    startY: point.y,
                                    deltaX: 0,
                                    deltaY: 0,
                                    moved: false,
                                    centerWorld: state.engine.centerWorld(),
                                    currentWorld: state.engine.centerWorld()
                                };
                            },
                            onMapTouchMove (event) {
                                var state = runtime;
                                if (state.uiTouchActive || !state.pageVisible) return;
                                if (state.pinch && state.pinch.active) return void this.movePinch(event);
                                if (event && event.touches && event.touches.length >= 2) return void this.startPinch(event);
                                if (!state.gesture) return;
                                var touch = _gestureController.default.getTouch(event, state.gesture.identifier);
                                if (!touch) return;
                                var dx = Number(touch.clientX) - state.viewport.left - state.gesture.startX;
                                var dy = Number(touch.clientY) - state.viewport.top - state.gesture.startY;
                                if (!isFinite(dx) || !isFinite(dy)) return;
                                state.panInput.set(dx, dy);
                                if (!state.gesture.moved) {
                                    if (dx * dx + dy * dy < DRAG_START_DISTANCE * DRAG_START_DISTANCE) return;
                                    state.gesture.moved = true;
                                    if (state.tileManager) state.tileManager.setInteracting(true);
                                    state.followLocation = false;
                                    if (this.loadingIndicators.length) this.loadingIndicators = [];
                                }
                                this.scheduleDragRender();
                            },
                            onMapTouchEnd (event) {
                                var state = runtime;
                                if (state.uiTouchActive) {
                                    state.uiTouchActive = false;
                                    return;
                                }
                                if (state.pinch && state.pinch.active) return void this.finishPinch(event);
                                if (!state.gesture) return;
                                this.syncPanInput();
                                var gesture = state.gesture;
                                if (gesture.moved) {
                                    state.engine.commitWorldCenter(gesture.currentWorld);
                                    state.gesture = null;
                                    this.flushPendingTiles();
                                    this.updateTilePlan();
                                    this.updateStatusForFollow();
                                } else {
                                    state.gesture = null;
                                    this.flushPendingTiles();
                                }
                                if (null !== state.dragTimer) clearTimeout(state.dragTimer);
                                state.dragTimer = null;
                                if (state.tileManager) state.tileManager.setInteracting(false);
                            },
                            scheduleDragRender () {
                                var state = runtime;
                                if (null !== state.dragTimer) return;
                                var self = this;
                                state.dragTimer = setTimeout(function() {
                                    state.dragTimer = null;
                                    if (state.pinch && state.pinch.active) self.redrawTiles(state.pinch.centerWorld);
                                    else self.renderDragTranslation();
                                }, DRAG_RENDER_DELAY);
                            },
                            startPinch (event) {
                                if (!_config.default.ENABLE_PINCH_PREVIEW) return;
                                var state = runtime;
                                if (!event || !event.touches || event.touches.length < 2 || !state.engine) return;
                                var first = _gestureController.default.getPoint(event.touches[0], state.viewport);
                                var second = _gestureController.default.getPoint(event.touches[1], state.viewport);
                                if (!first || !second) return;
                                if (state.gesture && state.gesture.moved) state.engine.commitWorldCenter(state.gesture.currentWorld);
                                state.gesture = null;
                                this.redrawTiles(state.engine.centerWorld());
                                var centerWorld = state.engine.centerWorld();
                                var middle = _gestureController.default.midpoint(first, second);
                                state.pinch = {
                                    active: true,
                                    ids: [
                                        first.identifier,
                                        second.identifier
                                    ],
                                    zoom: state.engine.zoom,
                                    centerWorld: centerWorld,
                                    anchorWorld: state.engine.worldAtScreen(middle.x, middle.y, centerWorld),
                                    startCentroid: middle,
                                    currentCentroid: middle,
                                    startDistance: _gestureController.default.distance(first, second),
                                    scale: 1
                                };
                                state.followLocation = false;
                            },
                            movePinch (event) {
                                var state = runtime;
                                var firstTouch = _gestureController.default.getTouch(event, state.pinch.ids[0]);
                                var secondTouch = _gestureController.default.getTouch(event, state.pinch.ids[1]);
                                var first = _gestureController.default.getPoint(firstTouch, state.viewport);
                                var second = _gestureController.default.getPoint(secondTouch, state.viewport);
                                if (!first || !second) return;
                                state.pinch.currentCentroid = _gestureController.default.midpoint(first, second);
                                state.pinch.scale = _gestureController.default.pinchScale(state.pinch.startDistance, _gestureController.default.distance(first, second));
                                this.scheduleDragRender();
                            },
                            finishPinch (event) {
                                var state = runtime;
                                var pinch = state.pinch;
                                if (!pinch) return;
                                var scale = pinch.scale;
                                var remaining = event && event.touches ? event.touches : [];
                                var nextZoom = pinch.zoom;
                                if (scale >= PINCH_IN_THRESHOLD) nextZoom = Math.min(_config.default.MAX_ZOOM, pinch.zoom + 1);
                                else if (scale <= PINCH_OUT_THRESHOLD) nextZoom = Math.max(_config.default.MIN_ZOOM, pinch.zoom - 1);
                                var committedScale = nextZoom === pinch.zoom ? 1 : scale;
                                var nextCenter = _gestureController.default.centerAfterPinch(pinch.anchorWorld, pinch.startCentroid, pinch.currentCentroid, committedScale, pinch.zoom, nextZoom, this.viewWidth, this.viewHeight);
                                state.engine.zoom = nextZoom;
                                state.engine.commitWorldCenter(nextCenter);
                                state.pinch = null;
                                this.updateTilePlan();
                                if (1 === remaining.length) {
                                    var point = _gestureController.default.getPoint(remaining[0], state.viewport);
                                    if (point) {
                                        var centerWorld = state.engine.centerWorld();
                                        state.gesture = {
                                            identifier: point.identifier,
                                            startX: point.x,
                                            startY: point.y,
                                            deltaX: 0,
                                            deltaY: 0,
                                            moved: false,
                                            centerWorld: centerWorld,
                                            currentWorld: centerWorld
                                        };
                                    }
                                } else {
                                    state.followLocation = false;
                                    this.updateStatusForFollow();
                                }
                            },
                            cancelGesture (deferResume) {
                                var state = runtime;
                                this.syncPanInput();
                                if (state.gesture && state.gesture.moved && state.engine) state.engine.commitWorldCenter(state.gesture.currentWorld);
                                state.gesture = null;
                                state.pinch = null;
                                if (null !== state.dragTimer) clearTimeout(state.dragTimer);
                                state.dragTimer = null;
                                if (state.engine && state.tileManager && !state.disposed && state.pageVisible && !deferResume) this.updateTilePlan();
                                if (!deferResume && state.tileManager) state.tileManager.setInteracting(false);
                            },
                            updateStatusForFollow () {
                                var state = runtime;
                                if (state.followLocation) this.statusText = '位置跟随已开启';
                                else if (state.locationFix) this.statusText = '自由浏览地图';
                                else this.statusText = '默认位置 · 香港';
                            },
                            retryTiles () {
                                var state = runtime;
                                if (!state.tileManager || state.disposed) return;
                                var now = Date.now();
                                if (now - state.lastManualRetryAt < 2500) return;
                                state.lastManualRetryAt = now;
                                state.lastTileStatus = '';
                                state.imageErrorCount = 0;
                                this.statusText = '正在重试地图加载';
                                state.tileManager.retryVisible(true, true);
                            },
                            onTileImageError (id, src) {
                                var state = runtime;
                                if (state.disposed || !state.pageVisible) return;
                                for(var i = 0; i < this.visibleTiles.length; i += 1)if (this.visibleTiles[i].id === id && this.visibleTiles[i].src === src) {
                                    state.imageErrors[id] = src;
                                    delete state.imageReady[id];
                                    if (!state.gesture && !state.pinch) this.redrawTiles();
                                    break;
                                }
                                state.imageErrorCount += 1;
                                this.statusText = '地图图片显示失败 · 点按重试';
                            }
                        };
                        const moduleOwn = exports.default || module.exports;
                        const accessors = [
                            'public',
                            'protected',
                            'private'
                        ];
                        if (moduleOwn.data && accessors.some(function(acc) {
                            return moduleOwn[acc];
                        })) throw new Error('页面VM对象中的属性data不可与"' + accessors.join(',') + '"同时存在，请使用private替换data名称');
                        if (!moduleOwn.data) {
                            moduleOwn.data = {};
                            moduleOwn._descriptor = {};
                            accessors.forEach(function(acc) {
                                const accType = typeof moduleOwn[acc];
                                if ('object' === accType) {
                                    moduleOwn.data = Object.assign(moduleOwn.data, moduleOwn[acc]);
                                    for(const name in moduleOwn[acc])moduleOwn._descriptor[name] = {
                                        access: acc
                                    };
                                } else if ('function' === accType) console.warn('页面VM对象中的属性' + acc + '的值不能是函数，请使用对象');
                            });
                        }
                    };
                    var $app_template$ = function(vm) {
                        const _vm_ = vm || this;
                        return aiot.__ce__("stack", {
                            __vm__: _vm_,
                            __opts__: {
                                id: "map-root",
                                classList: [
                                    "map-root"
                                ],
                                style: function() {
                                    return __webpack_require__.g.$translateStyle$("width: " + _vm_.viewWidth + "px; height: " + _vm_.viewHeight + "px;");
                                },
                                events: {
                                    touchstart: function(evt) {
                                        return _vm_.onMapTouchStart(evt);
                                    },
                                    touchmove: function(evt) {
                                        return _vm_.onMapTouchMove(evt);
                                    },
                                    touchend: function(evt) {
                                        return _vm_.onMapTouchEnd(evt);
                                    },
                                    longpress: function(evt) {
                                        return _vm_.openSettings(evt);
                                    }
                                }
                            }
                        }, [
                            aiot.__ce__("stack", {
                                __vm__: _vm_,
                                __opts__: {
                                    classList: [
                                        "tile-layer"
                                    ],
                                    style: function() {
                                        return __webpack_require__.g.$translateStyle$("left: 0px; top: 0px; width: " + _vm_.viewWidth + "px; height: " + _vm_.viewHeight + "px;");
                                    }
                                }
                            }, [
                                aiot.__cf__({
                                    __vm__: _vm_,
                                    __opts__: {
                                        exp: function() {
                                            return {
                                                __list__: _vm_.visibleTiles,
                                                __tid__: "id"
                                            };
                                        },
                                        key: "$idx",
                                        value: "$item"
                                    }
                                }, function($idx, $item) {
                                    return [
                                        aiot.__ce__("image", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "map-tile"
                                                ],
                                                alt: "blank",
                                                src: function() {
                                                    return $item.src;
                                                },
                                                style: function() {
                                                    return __webpack_require__.g.$translateStyle$("left: " + $item.left + "px; top: " + $item.top + "px; width: " + $item.width + "px; height: " + $item.height + "px;");
                                                },
                                                events: {
                                                    complete: function(evt) {
                                                        return _vm_.onTileImageComplete($item.id, $item.src, evt);
                                                    },
                                                    error: function(evt) {
                                                        return _vm_.onTileImageError($item.id, $item.src, evt);
                                                    }
                                                }
                                            }
                                        }, [])
                                    ];
                                })
                            ]),
                            aiot.__ce__("stack", {
                                __vm__: _vm_,
                                __opts__: {
                                    classList: [
                                        "failure-layer"
                                    ],
                                    style: function() {
                                        return __webpack_require__.g.$translateStyle$("left: 0px; top: 0px; width: " + _vm_.viewWidth + "px; height: " + _vm_.viewHeight + "px;");
                                    }
                                }
                            }, [
                                aiot.__cf__({
                                    __vm__: _vm_,
                                    __opts__: {
                                        exp: function() {
                                            return {
                                                __list__: _vm_.failedTiles,
                                                __tid__: "id"
                                            };
                                        },
                                        key: "$idx",
                                        value: "$item"
                                    }
                                }, function($idx, $item) {
                                    return [
                                        aiot.__ce__("div", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "failed-tile"
                                                ],
                                                style: function() {
                                                    return __webpack_require__.g.$translateStyle$("left: " + $item.left + "px; top: " + $item.top + "px; width: " + $item.width + "px; height: " + $item.height + "px;");
                                                }
                                            }
                                        }, [])
                                    ];
                                })
                            ]),
                            aiot.__ce__("stack", {
                                __vm__: _vm_,
                                __opts__: {
                                    classList: [
                                        "loading-layer"
                                    ],
                                    style: function() {
                                        return __webpack_require__.g.$translateStyle$("left: 0px; top: 0px; width: " + _vm_.viewWidth + "px; height: " + _vm_.viewHeight + "px;");
                                    }
                                }
                            }, [
                                aiot.__cf__({
                                    __vm__: _vm_,
                                    __opts__: {
                                        exp: function() {
                                            return {
                                                __list__: _vm_.loadingIndicators,
                                                __tid__: "id"
                                            };
                                        },
                                        key: "$idx",
                                        value: "$item"
                                    }
                                }, function($idx, $item) {
                                    return [
                                        aiot.__ce__("stack", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "tile-loading"
                                                ],
                                                style: function() {
                                                    return __webpack_require__.g.$translateStyle$("left: " + $item.left + "px; top: " + $item.top + "px;");
                                                }
                                            }
                                        }, [
                                            aiot.__ce__("div", {
                                                __vm__: _vm_,
                                                __opts__: {
                                                    classList: [
                                                        "tile-loading-ring"
                                                    ],
                                                    style: function() {
                                                        return __webpack_require__.g.$translateStyle$("border-color: " + $item.color + ";");
                                                    }
                                                }
                                            }, []),
                                            aiot.__ce__("text", {
                                                __vm__: _vm_,
                                                __opts__: {
                                                    classList: [
                                                        "tile-loading-label"
                                                    ],
                                                    style: function() {
                                                        return __webpack_require__.g.$translateStyle$("color: " + $item.color + ";");
                                                    },
                                                    value: function() {
                                                        return $item.label;
                                                    }
                                                }
                                            }, [])
                                        ])
                                    ];
                                })
                            ]),
                            aiot.__ce__("stack", {
                                __vm__: _vm_,
                                __opts__: {
                                    classList: [
                                        "marker-layer"
                                    ],
                                    style: function() {
                                        return __webpack_require__.g.$translateStyle$("left: 0px; top: 0px; width: " + _vm_.viewWidth + "px; height: " + _vm_.viewHeight + "px;");
                                    }
                                }
                            }, [
                                aiot.__ci__({
                                    __vm__: _vm_,
                                    __opts__: {
                                        shown: function() {
                                            return _vm_.markerVisible;
                                        }
                                    }
                                }, function() {
                                    return [
                                        aiot.__ce__("div", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "position-halo"
                                                ],
                                                style: function() {
                                                    return __webpack_require__.g.$translateStyle$("left: " + _vm_.markerLeft + "px; top: " + _vm_.markerTop + "px;");
                                                }
                                            }
                                        }, [])
                                    ];
                                }),
                                aiot.__ci__({
                                    __vm__: _vm_,
                                    __opts__: {
                                        shown: function() {
                                            return _vm_.markerVisible;
                                        }
                                    }
                                }, function() {
                                    return [
                                        aiot.__ce__("div", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "position-dot"
                                                ],
                                                style: function() {
                                                    return __webpack_require__.g.$translateStyle$("left: " + _vm_.dotLeft + "px; top: " + _vm_.dotTop + "px;");
                                                }
                                            }
                                        }, [])
                                    ];
                                })
                            ]),
                            aiot.__ce__("stack", {
                                __vm__: _vm_,
                                __opts__: {
                                    classList: [
                                        "controls-layer"
                                    ],
                                    style: function() {
                                        return __webpack_require__.g.$translateStyle$("left: 0px; top: 0px; width: " + _vm_.viewWidth + "px; height: " + _vm_.viewHeight + "px;");
                                    }
                                }
                            }, [
                                aiot.__ce__("div", {
                                    __vm__: _vm_,
                                    __opts__: {
                                        classList: [
                                            "status-card"
                                        ],
                                        style: function() {
                                            return __webpack_require__.g.$translateStyle$("left: 14px; top: 12px; width: " + _vm_.statusWidth + "px;");
                                        },
                                        events: {
                                            click: function(evt) {
                                                return _vm_.retryTiles(evt);
                                            },
                                            touchstart: function(evt) {
                                                return _vm_.onUiTouchStart(evt);
                                            }
                                        }
                                    }
                                }, [
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "status-text"
                                            ],
                                            value: function() {
                                                return _vm_.statusText;
                                            }
                                        }
                                    }, [])
                                ]),
                                aiot.__ce__("div", {
                                    __vm__: _vm_,
                                    __opts__: {
                                        classList: [
                                            "map-control",
                                            "recenter-control"
                                        ],
                                        style: function() {
                                            return __webpack_require__.g.$translateStyle$("left: " + _vm_.controlLeft + "px; top: " + _vm_.recenterTop + "px;");
                                        },
                                        events: {
                                            click: function(evt) {
                                                return _vm_.recenter(evt);
                                            },
                                            touchstart: function(evt) {
                                                return _vm_.onUiTouchStart(evt);
                                            }
                                        }
                                    }
                                }, [
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "control-glyph",
                                                "locate-glyph"
                                            ],
                                            value: "◎"
                                        }
                                    }, [])
                                ]),
                                aiot.__ce__("div", {
                                    __vm__: _vm_,
                                    __opts__: {
                                        classList: [
                                            "map-control",
                                            "zoom-control"
                                        ],
                                        style: function() {
                                            return __webpack_require__.g.$translateStyle$("left: " + _vm_.controlLeft + "px; top: " + _vm_.zoomInTop + "px;");
                                        },
                                        events: {
                                            click: function(evt) {
                                                return _vm_.zoomIn(evt);
                                            },
                                            touchstart: function(evt) {
                                                return _vm_.onUiTouchStart(evt);
                                            }
                                        }
                                    }
                                }, [
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "control-glyph"
                                            ],
                                            value: "+"
                                        }
                                    }, [])
                                ]),
                                aiot.__ce__("div", {
                                    __vm__: _vm_,
                                    __opts__: {
                                        classList: [
                                            "map-control",
                                            "zoom-control"
                                        ],
                                        style: function() {
                                            return __webpack_require__.g.$translateStyle$("left: " + _vm_.controlLeft + "px; top: " + _vm_.zoomOutTop + "px;");
                                        },
                                        events: {
                                            click: function(evt) {
                                                return _vm_.zoomOut(evt);
                                            },
                                            touchstart: function(evt) {
                                                return _vm_.onUiTouchStart(evt);
                                            }
                                        }
                                    }
                                }, [
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "control-glyph",
                                                "zoom-minus"
                                            ],
                                            value: "−"
                                        }
                                    }, [])
                                ]),
                                aiot.__ci__({
                                    __vm__: _vm_,
                                    __opts__: {
                                        shown: function() {
                                            return !_vm_.hideBottomHint;
                                        }
                                    }
                                }, function() {
                                    return [
                                        aiot.__ce__("div", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "attribution"
                                                ],
                                                style: function() {
                                                    return __webpack_require__.g.$translateStyle$("left: 12px; top: " + _vm_.attributionTop + "px; width: " + _vm_.attributionWidth + "px;");
                                                },
                                                events: {
                                                    touchstart: function(evt) {
                                                        return _vm_.onUiTouchStart(evt);
                                                    }
                                                }
                                            }
                                        }, [
                                            aiot.__ce__("text", {
                                                __vm__: _vm_,
                                                __opts__: {
                                                    classList: [
                                                        "attribution-text"
                                                    ],
                                                    value: function() {
                                                        return _vm_.mapAttribution;
                                                    }
                                                }
                                            }, [])
                                        ])
                                    ];
                                })
                            ])
                        ]);
                    };
                    $app_exports$['entry'] = function($app_exports$) {
                        $app_script$({}, $app_exports$, $app_require$1);
                        $app_exports$.default.template = $app_template$;
                        $app_exports$.default.style = $app_style$;
                    };
                })();
            })();
        };
        return createPageHandler();
    })(global, globalThis, window, $app_exports$, $app_evaluate$);
}
