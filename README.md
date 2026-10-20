# Radio · 全球实时电台

独立实现的全球广播探索网站，生产访问地址：https://radio.foxtang.com/ 。页面品牌仅显示 **Radio**，左上角与浏览器标签使用自有媒体徽章。视觉参考 RoamDial，但不复制其专有代码或品牌。

## 产品基线功能
- **地球唯一视图**：首页与收听时使用同一套光点地球与坐标系，支持拖动、惯性、镜头放大与台站定位；已移除星图与模式切换。
- 全球 Radio Browser 公开广播目录、搜索、国家/地区显示、随机收听、码率/语言/类型筛选。
- 上次收听、收藏、前后切台、分享、音量、中文和英文。
- 桌面和支持 WebGL2 的 iPhone/iPad 共用 GPU 点阵地球。移动 Safari 对光点与光晕使用预乘 Alpha 输出，防止低透明度像素在合成时被显示成不透明浅绿色大球；桌面保持原 Shader 输出。移动端限制 DPR、帧率并缓存静态背景，只有 GPU 失败时才启用 Canvas2D 后备。
- Cloudflare Pages Functions 仅提供电台目录 API；音频直连广播站。无 D1、KV、Cron、Secrets。

## 代码与文档
| 路径 | 职责 |
| --- | --- |
| `index.html` / `src/style.css` | 响应式页面、品牌与交互层 |
| `src/app.js` | 页面状态、音频播放、台站目录与收藏 |
| `src/scene.js` | 地球相机、坐标投影、拖拽、Canvas2D 后备和定位 |
| `src/globe.js` | WebGL2 光点材质与纹理 |
| `earth.webp` | NASA Blue Marble 地理陆地遮罩 |
| `functions/api/stations.js` | Radio Browser API 代理 |
| `docs/ARCHITECTURE.md` | 模块与数据架构 |
| `docs/UI-GLOBE-PLAYBOOK.md` | **UI 和地球实现经验、踩坑与复用方法** |
| `docs/SAFARI-TESTING.md` | iOS Safari 后备与验收清单 |
| `docs/PRODUCT-BASELINE.md` | Git 基线策略与发版操作 |

## 开发与部署
```bash
npm run check   # 语法检查 + 自动化测试 + 静态构建
npm run dev     # 本地静态预览；Pages API 需 wrangler pages dev
npm run build   # 生成 dist/
```

GitHub `main` 已连接 Cloudflare Pages 项目 `radio-foxtang-com`。生产构建命令 `npm run build`、产物目录 `dist`；合并主分支自动触发部署。**不要操作不相关的 DNS、Worker、D1、Access。**

合并后必须验证 Cloudflare Production deployment 的 `commit_hash` 与 Merge Commit 一致，且构建、页面和关键静态资源成功；以 `baseline/radio-2026-10-20-v1` 分支固定稳定提交（创建步骤见文档）。**自动化测试或桌面模拟不等于真实 iPhone Safari 实机验收。** 本次新移动端性能发布的快照名称是 `baseline/radio-2026-10-20-v2-mobile-gpu`，旧 `v1` 保留不动。

### 数据与归属
Radio Browser 提供公开电台目录、音源及已发布的经纬度；站点不自行猜测缺失城市，GeoNames API 当前未接入。NASA Blue Marble Next Generation（NASA Earth Observatory / Reto Stöckli）影像仅用于陆地遮罩。音源可因地域限制、证书、浏览器编码和上游离线而失败。

### Safari 球体透明度专项修复（2026-10-20）
生产前用户实机截图显示：页面正常，但地球主体变成浅绿色实心圆。定位到移动 WebGL Canvas 使用 `premultipliedAlpha:false` 而 Shader 输出固定亮色 RGB + 极小 alpha 的不安全组合。在部分 WebKit 合成路径中透明度失效后，球体全部像素呈现固定 RGB。现对 iPhone/iPad 选择 `premultipliedAlpha:true` 并在 shader 端预乘光点及光晕 RGB，桌面仍用原来的输出。手机首页球体适当缩小、向下移动；真实 Safari GPU 合成需要实机再次验收，CI 不代表像素验收。
