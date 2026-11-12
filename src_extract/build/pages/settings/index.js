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
                                    "settings-root"
                                ]
                            ],
                            {
                                width: "100%",
                                height: "100%",
                                backgroundColor: "#10191c"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "settings-scroll"
                                ]
                            ],
                            {
                                width: "100%",
                                height: "100%"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "settings-body"
                                ]
                            ],
                            {
                                width: "100%",
                                flexDirection: "column",
                                paddingTop: "24px",
                                paddingRight: "24px",
                                paddingBottom: "24px",
                                paddingLeft: "24px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "back"
                                ]
                            ],
                            {
                                height: "48px",
                                justifyContent: "center"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "back-text"
                                ]
                            ],
                            {
                                color: "#a8d6df",
                                fontSize: "19px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "title"
                                ]
                            ],
                            {
                                color: "#ffffff",
                                fontSize: "27px",
                                marginBottom: "16px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "section"
                                ]
                            ],
                            {
                                color: "#91a6ae",
                                fontSize: "15px",
                                marginTop: "12px",
                                marginBottom: "8px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "row"
                                ]
                            ],
                            {
                                height: "62px",
                                width: "100%",
                                borderRadius: "14px",
                                backgroundColor: "#1e2d33",
                                marginBottom: "8px",
                                paddingLeft: "14px",
                                paddingRight: "14px",
                                alignItems: "center",
                                justifyContent: "space-between"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "label"
                                ]
                            ],
                            {
                                color: "#ffffff",
                                fontSize: "18px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "value"
                                ]
                            ],
                            {
                                color: "#a8d6df",
                                fontSize: "16px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "note"
                                ]
                            ],
                            {
                                color: "#a3b6bd",
                                fontSize: "14px",
                                marginBottom: "12px"
                            }
                        ],
                        [
                            [
                                [
                                    0,
                                    "previous"
                                ]
                            ],
                            {
                                minHeight: "44px",
                                justifyContent: "center"
                            }
                        ]
                    ];
                    var $app_script$ = function __scriptModule__(module, exports, $app_require$1) {
                        "use strict";
                        Object.defineProperty(exports, "__esModule", {
                            value: true
                        });
                        exports.default = void 0;
                        var _system = _interopRequireDefault($app_require$1("@app-module/system.router"));
                        var _system2 = _interopRequireDefault($app_require$1("@app-module/system.storage"));
                        var _system3 = _interopRequireDefault($app_require$1("@app-module/system.brightness"));
                        var _preferences = _interopRequireDefault(__webpack_require__("./src/common/map/preferences.js"));
                        var _providers = _interopRequireDefault(__webpack_require__("./src/common/map/providers.js"));
                        function _interopRequireDefault(e) {
                            return e && e.__esModule ? e : {
                                default: e
                            };
                        }
                        var _default = exports.default = {
                            private: {
                                sourceId: 'osmfr-v1',
                                previousSourceId: '',
                                previousName: '',
                                hideBottomHint: false,
                                showLoadingIndicators: true,
                                ready: false,
                                saving: false,
                                saveStatus: '正在读取设置',
                                disposed: false
                            },
                            onReady () {
                                var self = this;
                                _preferences.default.load(_system2.default, function(value) {
                                    if (self.disposed) return;
                                    self.applyValues(value);
                                    self.ready = true;
                                    self.saveStatus = '更改自动保存，返回地图后生效';
                                });
                            },
                            onShow () {
                                this.keepAwake(true);
                            },
                            onHide () {
                                this.keepAwake(false);
                            },
                            onDestroy () {
                                this.disposed = true;
                                this.keepAwake(false);
                            },
                            keepAwake (value) {
                                try {
                                    _system3.default.setKeepScreenOn({
                                        keepScreenOn: value
                                    });
                                } catch (ignored) {}
                            },
                            applyValues (value) {
                                this.sourceId = value.sourceId;
                                this.previousSourceId = value.previousSourceId;
                                this.previousName = value.previousSourceId ? _providers.default.get(value.previousSourceId).name : '';
                                this.hideBottomHint = value.hideBottomHint;
                                this.showLoadingIndicators = value.showLoadingIndicators;
                            },
                            currentValues () {
                                return {
                                    sourceId: this.sourceId,
                                    previousSourceId: this.previousSourceId,
                                    hideBottomHint: this.hideBottomHint,
                                    showLoadingIndicators: this.showLoadingIndicators
                                };
                            },
                            persist (value) {
                                if (!this.ready || this.saving) return;
                                this.saving = true;
                                this.saveStatus = '正在保存';
                                var self = this;
                                _preferences.default.save(_system2.default, value, function() {
                                    if (self.disposed) return;
                                    self.applyValues(value);
                                    self.saving = false;
                                    self.saveStatus = '已保存，返回地图后生效';
                                }, function() {
                                    if (self.disposed) return;
                                    self.saving = false;
                                    self.saveStatus = '保存失败，请重试';
                                });
                            },
                            selectSource (id) {
                                if (!this.ready || this.saving || id === this.sourceId) return;
                                var value = this.currentValues();
                                value.previousSourceId = value.sourceId;
                                value.sourceId = _providers.default.get(id).id;
                                this.persist(value);
                            },
                            usePrevious () {
                                if (this.previousSourceId) this.selectSource(this.previousSourceId);
                            },
                            toggleBottomHint () {
                                var value = this.currentValues();
                                value.hideBottomHint = !value.hideBottomHint;
                                this.persist(value);
                            },
                            toggleLoading () {
                                var value = this.currentValues();
                                value.showLoadingIndicators = !value.showLoadingIndicators;
                                this.persist(value);
                            },
                            goBack () {
                                if (!this.saving) _system.default.back();
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
                        return aiot.__ce__("div", {
                            __vm__: _vm_,
                            __opts__: {
                                classList: [
                                    "settings-root"
                                ]
                            }
                        }, [
                            aiot.__ce__("scroll", {
                                __vm__: _vm_,
                                __opts__: {
                                    classList: [
                                        "settings-scroll"
                                    ],
                                    scrollY: "true"
                                }
                            }, [
                                aiot.__ce__("div", {
                                    __vm__: _vm_,
                                    __opts__: {
                                        classList: [
                                            "settings-body"
                                        ]
                                    }
                                }, [
                                    aiot.__ce__("div", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "back"
                                            ],
                                            events: {
                                                click: function(evt) {
                                                    return _vm_.goBack(evt);
                                                }
                                            }
                                        }
                                    }, [
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "back-text"
                                                ],
                                                value: "‹ 返回地图"
                                            }
                                        }, [])
                                    ]),
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "title"
                                            ],
                                            value: "地图设置"
                                        }
                                    }, []),
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "section"
                                            ],
                                            value: "地图来源"
                                        }
                                    }, []),
                                    aiot.__ce__("div", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "row"
                                            ],
                                            events: {
                                                click: function(evt) {
                                                    return _vm_.selectSource("osmfr-v1", evt);
                                                }
                                            }
                                        }
                                    }, [
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "label"
                                                ],
                                                value: "OSM 法国社区"
                                            }
                                        }, []),
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "value"
                                                ],
                                                value: function() {
                                                    return "osmfr-v1" === _vm_.sourceId ? "\u4F7F\u7528\u4E2D" : "\u5207\u6362";
                                                }
                                            }
                                        }, [])
                                    ]),
                                    aiot.__ce__("div", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "row"
                                            ],
                                            events: {
                                                click: function(evt) {
                                                    return _vm_.selectSource("osm-standard-v1", evt);
                                                }
                                            }
                                        }
                                    }, [
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "label"
                                                ],
                                                value: "OSM 标准 · 原图源"
                                            }
                                        }, []),
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "value"
                                                ],
                                                value: function() {
                                                    return "osm-standard-v1" === _vm_.sourceId ? "\u4F7F\u7528\u4E2D" : "\u5207\u6362";
                                                }
                                            }
                                        }, [])
                                    ]),
                                    aiot.__ci__({
                                        __vm__: _vm_,
                                        __opts__: {
                                            shown: function() {
                                                return "" !== _vm_.previousSourceId && _vm_.previousSourceId !== _vm_.sourceId;
                                            }
                                        }
                                    }, function() {
                                        return [
                                            aiot.__ce__("div", {
                                                __vm__: _vm_,
                                                __opts__: {
                                                    classList: [
                                                        "previous"
                                                    ],
                                                    events: {
                                                        click: function(evt) {
                                                            return _vm_.usePrevious(evt);
                                                        }
                                                    }
                                                }
                                            }, [
                                                aiot.__ce__("text", {
                                                    __vm__: _vm_,
                                                    __opts__: {
                                                        classList: [
                                                            "note"
                                                        ],
                                                        value: function() {
                                                            return "切回上次：" + _vm_.previousName;
                                                        }
                                                    }
                                                }, [])
                                            ])
                                        ];
                                    }),
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "section"
                                            ],
                                            value: "显示"
                                        }
                                    }, []),
                                    aiot.__ce__("div", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "row"
                                            ],
                                            events: {
                                                click: function(evt) {
                                                    return _vm_.toggleBottomHint(evt);
                                                }
                                            }
                                        }
                                    }, [
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "label"
                                                ],
                                                value: "隐藏底部提示"
                                            }
                                        }, []),
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "value"
                                                ],
                                                value: function() {
                                                    return _vm_.hideBottomHint ? "\u5F00\u542F" : "\u5173\u95ED";
                                                }
                                            }
                                        }, [])
                                    ]),
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "note"
                                            ],
                                            value: "开启后完全隐藏底部内容"
                                        }
                                    }, []),
                                    aiot.__ce__("div", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "row"
                                            ],
                                            events: {
                                                click: function(evt) {
                                                    return _vm_.toggleLoading(evt);
                                                }
                                            }
                                        }
                                    }, [
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "label"
                                                ],
                                                value: "瓦片圆形加载提示"
                                            }
                                        }, []),
                                        aiot.__ce__("text", {
                                            __vm__: _vm_,
                                            __opts__: {
                                                classList: [
                                                    "value"
                                                ],
                                                value: function() {
                                                    return _vm_.showLoadingIndicators ? "\u5F00\u542F" : "\u5173\u95ED";
                                                }
                                            }
                                        }, [])
                                    ]),
                                    aiot.__ce__("text", {
                                        __vm__: _vm_,
                                        __opts__: {
                                            classList: [
                                                "note"
                                            ],
                                            value: function() {
                                                return _vm_.saveStatus;
                                            }
                                        }
                                    }, [])
                                ])
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
