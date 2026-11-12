# 社区与 GitHub 图源核查（2026-11-12）

测试点：北京 XYZ 15/26979/12415。当前开发环境不在大陆，不代表大陆或 Watch 6 网络表现。每个候选仅做少量交互规模请求；没有批量下载。

## 可供评估的候选

- OSM France：`https://a.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png`。两次有效256×256 PNG，约0.71秒和4.55秒。样例22212字节。官方允许带明确署名和应用User-Agent的免费非营利移动应用，要求适度流量和公开使用。https://www.openstreetmap.fr/usage/ 。样式仓库：https://github.com/cquest/osmfr-cartocss 。这是海外社区，不承诺大陆可达或快速；部分标签采用法语本地化。
- OSM Germany：`https://tile.openstreetmap.de/{z}/{x}/{y}.png`。有效256×256 PNG，约0.95秒，26275字节。https://tile.openstreetmap.de/ 。未完成其移动客户端服务条款核对，非大陆CDN。
- OSM备用域名：`https://a.tile.osm.org/{z}/{x}/{y}.png`。从 https://github.com/chenzhuanxin/china-map-tile-tools 的 map_sources.json 找到。两次有效256×256 PNG，约0.23至0.28秒，28004字节。仓库称可在大陆使用，但未独立证实。不是中国社区运营的新源；OSMF当前政策要求使用其指定标准瓦片URL，因此不能把它当作长期受支持的独立服务。
- GeoQ灰色中文底图：`https://thematic.geoq.cn/arcgis/rest/services/ChinaOnlineStreetGray/MapServer/tile/{z}/{y}/{x}`。本轮有效256×256 PNG，约1.06秒，8128字节。注意是z/y/x顺序。元数据标记不含兴趣点、2020年12月16日最后更新。未核实此具体端点对第三方原生手表App的使用及缓存授权。旧价格页称基础地图服务免费，不足以单独确认这项服务的当前许可。https://web.geoq.cn/price.html 。不能把该样例成功推及所有GeoQ服务。

## 排除或暂缓

- map.geoq.cn 的 ChinaOnlineCommunity 服务：本轮503。
- 网上所谓 osm.open.cn 中国镜像：仅找到聚合转载，未找到可信运营说明；开发环境HTTPS隧道403，无法判定源站本身状态，不能描述为源站403或大陆屏蔽。
- OpenFreeMap：免费无需Key，允许应用使用，但提供矢量瓦片，无法直接接到当前Vela image栅格层。https://openfreemap.org/ ，https://github.com/hyperknot/openfreemap 。若以后采用，需额外部署栅格渲染服务。
- LFMaps：基于OpenFreeMap的矢量瓦片服务，同样不适合直接替换PNG图源。https://lfmaps.fr/ 。
- CARTO：最新官方文档要求API Key，有免费层，不能按旧教程宣称永久无需Key。https://carto.com/basemaps/apikey/ 。
- GitHub中的高德/谷歌反代图源：仓库代码MIT许可不代表上游地图服务授权；下载器不等于免费瓦片托管服务。

## 结论

有可访问的无Key栅格候选，尚没有在本轮验证“大陆快速且明确允许本应用免费使用”的完整组合。服务条件最明确的无Key个人试用候选为OSM France；国内端点候选为GeoQ灰色图，但需厘清该端点许可和数据时效。后续用户确认后，0.1.7 已切换至 OSM France，具体以 config.js 为准。原始HTTP结果见tile-source-probes.json。
