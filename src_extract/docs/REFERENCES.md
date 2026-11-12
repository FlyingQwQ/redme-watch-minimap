# 开源参考与 Vela 文档

## 地图开源项目

| 项目 | 查看内容 | 本工程采用 | 许可证与代码处理 |
|---|---|---|---|
| [MiniMap](https://github.com/thelimonazo/MiniMap) 的 [`mini-map.js`](https://raw.githubusercontent.com/thelimonazo/MiniMap/main/mini-map.js) | 中心点/缩放状态、拖动偏移、瓦片视口规划。渲染代码依赖浏览器 DOM 和 Canvas。 | 借鉴交互/视口管理思路。 | 仓库没有发现许可证文件或 GitHub 识别的许可证；没有复制源码，只独立实现纯计算与 Vela 渲染。 |
| [Tilebelt](https://github.com/mapbox/tilebelt) 的 [`src/index.ts`](https://github.com/mapbox/tilebelt/blob/main/src/index.ts) | 经纬度与 XYZ 瓦片换算、父级/子级瓦片、瓦片边界。 | 依据标准 Web Mercator 数学关系独立实现 `projection.js`。 | 仓库为 MIT；没有复制代码，也没有增加依赖。 |
| [NanoMap](https://github.com/pierreraby/nanomap) 的 [`nanomap.js`](https://github.com/pierreraby/nanomap/blob/main/nanomap.js) | 双缓冲换层、过时请求的 epoch 丢弃、地图拖动/缩放状态。 | 只借鉴“保留上一层直到新瓦片就绪”的思路；用有限的原生图片列表实现。 | 仓库为 MIT；没有复制 Canvas/DOM 渲染代码或其他源码。 |

由于没有复用第三方代码，此工程没有把这些项目的许可证文本冒充成自身代码的依赖许可证。OSM 栅格瓦片及地图数据遵守其自身署名和使用政策，署名在屏幕底部常驻显示。

## 官方 Vela 文档

- [Data Request `@system.fetch`](https://iot.mi.com/vela/quickapp/en/features/network/fetch.html)：Watch 6 支持；文档列出自定义 header、HTTP 状态/响应头、`arraybuffer` 和图片临时 URI 返回类型。
- [File Storage `@system.file`](https://iot.mi.com/vela/quickapp/en/features/data/file.html)：私有文件读写、目录列表、读写 ArrayBuffer、删除和访问检查。
- [Geolocation `@system.geolocation`](https://iot.mi.com/vela/quickapp/en/features/system/geolocation.html)：Watch 6 支持；按 manifest 定位权限调用 `getLocation`、`subscribe`、`unsubscribe`。
- [Device Information](https://iot.mi.com/vela/quickapp/en/features/basic/device.html)：`screenWidth`、`screenHeight`、`screenDensity`、`screenShape`。
- [Common Events](https://iot.mi.com/vela/quickapp/en/components/general/events.html)：原生触摸坐标、触点标识及多点触摸数组。
- [Common Methods](https://iot.mi.com/vela/quickapp/en/components/general/methods.html)：`getBoundingClientRect` 必须在页面 `onShow` 后调用。
- [Stack](https://iot.mi.com/vela/quickapp/en/components/container/stack.html)：直接子组件分层，后绘制的子组件覆盖前层。
- [Image](https://iot.mi.com/vela/quickapp/en/components/basic/image.html)：本地 PNG/JPG、加载完成和解码错误事件。
- [Page Styling and Layout](https://iot.mi.com/vela/quickapp/zh/guide/framework/style/page-style-and-layout.html)：`px` 随 `designWidth` 换算，`dp` 与物理像素/DPR 的关系。
- [Animation Styles](https://iot.mi.com/vela/quickapp/zh/components/general/animation-style.html)：Vela 明确支持 `transform`、`translateX` 和 `translateY`。
- [OpenStreetMap Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/)：署名、客户端标识、缓存、禁止批量下载/离线预取和服务可用性说明。
- [GreatFire: openstreetmap.org](https://en.greatfire.org/domain/openstreetmap.org)：大陆网络可达性监测；这是第三方监测，不代表每个运营商/时段的实机结果。
- [REDMI Watch 6 规格](https://www.mi.com/global/product/redmi-watch-6-nfc/specs/)：屏幕分辨率为 432 × 514。
- [天地图图层文档](https://guangdong.tianditu.gov.cn/geomap-api/apidoc/jsNewApiDoc/GeoGlobe.TDTLayer.html)：`vec_w` 是墨卡托底图，`cva_w` 是墨卡托注记层，调用需要开发许可 token。

## 2026-11-11 图源探测记录

| 服务 | 本轮探测 | 处理 |
|---|---|---|
| `tile.openstreetmap.org` | 当前开发出口的北京瓦片 HTTP 200，TTFB 约 0.12 秒；GreatFire 对大陆持续探测列为 blocked。两者不是 Watch 6 的网络实测。 | 保留为标准开发源；不承诺大陆可用。OSM 官方政策明确无 SLA。 |
| `tile.osmchina.org` | 返回 HTTP 404。 | 不采用。 |
| `map.geoq.cn` | 本轮瓦片与 REST 信息接口返回 HTTP 503。 | 不采用。 |
| `thematic.geoq.cn` ChinaOnlineStreetGray | 本轮瓦片 HTTP 200，TTFB 约 2.1 秒；REST 元数据标记数据最后更新于 2020-12-16，未找到适合本应用的明确许可条款。 | 不作为默认图源。 |
| 天地图 | 有许可密钥后可使用 WMTS；标准矢量街道样式需要底图与注记图层。当前没有密钥，因此未完成瓦片成功测试。 | 作为大陆合规接入候选，待提供方许可/密钥和真机链路验证。 |

本开发环境的网络出口不在中国大陆；以上 HTTP 响应时间只记录当前出口，不用于声称大陆访问速度。瓦片 URL 探测不等同于完整地图数据许可。正式应用应使用明确授权且覆盖客户端设备形态的服务。

## 2026-11-12 OSMChina 接入复核

用户选择 OSM 中国社区源后重新核查：
- 社区项目 https://github.com/OSMChina/OSMChina-Website 当前首页明确写有“地图服务暂时停止提供”。
- `https://tile.osmchina.org/15/26979/12415.png` 当前开发环境实际请求返回 HTTP 404。
- `https://osmchina.org/pages/tile/tile_overview.html` 返回 HTTP 404；搜索引擎仍可找到历史内容，不能据此判断服务仍正常。
- `https://tile.osmchina.org/` 返回 HTTP 200，但 Content-Type 为 text/html，不是地图瓦片；根页面可访问不能当作瓦片服务可用证据。

尚未找到社区公布的恢复服务公告或可用替代端点。因此未把正在使用的图源改为这一失效地址，也未生成声称接入成功的新安装包。当前出口非大陆，以上结果不能代表大陆速度测量。
