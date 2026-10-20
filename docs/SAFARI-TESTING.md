# iPhone / iPad Safari 地球显示与排障

## 设计策略
移动 Safari 是 WebKit，WebGL2、Canvas 合成、上下文丢失和资源解码行为与桌面 Chromium 不完全相同。之前的失败症状是“桌面地球正常，但 iPhone Safari 看不到”。

当前采取**稳妥的双路径**：
1. iPhone/iPad（含 iPadOS 桌面 UA + 多点触控）通过 `isAppleMobileWebKit` 优先启用 Canvas2D 点云球。WebGL2 不初始化，避免 Safari 报错阻断整个页面。
2. 2D fallback **同步以大陆轮廓生成初始地球光点**，不等待图片网络请求。等本地 `earth.webp` 加载后再用真实地理纹理替换稀疏的轮廓点阵。
3. 其他设备继续走 WebGL2；`getContext`、shader、纹理上传和 `render` 异常必须返回失败状态，让 Canvas 后备渲染接管。
4. 2D 帧率目标约 25 FPS，并缓存近似不变的球体投影；纹理点采样步长略稀疏，优先保证可用与触控响应。

## 手动验收（每次涉及 globe.js、scene.js、CSS 或 build 时执行）
- [ ] iPhone Safari 首次访问（清除站点缓存）：几秒内能看到有大陆轮廓的点阵地球，不能整片空白
- [ ] 弱网/纹理暂不可用：仍有基础点阵，不因 `earth.webp` 加载延迟而空白
- [ ] 手指水平/垂直拖动时地球转动，松手后有阻尼（减少动态效果模式可无惯性）
- [ ] 「探索地球」进入后仍是同一颗地球；没有「星图」标签
- [ ] 随机收听后选中电台能显示国家/地区及定位（仅当目录提供坐标）
- [ ] 横屏、短屏幕高度、iPhone 安全区域与浏览器底栏不遮住关键按钮
- [ ] Safari 无持续性 JS 异常；上下文不可用时音频、搜索、收藏仍可操作
- [ ] 桌面 Chrome/Edge 的 WebGL 原效果及流畅度未回退

## 诊断顺序
1. 浏览器网络：检查 `/globe.js`、`/scene.js`、`/earth.webp`、`/style.css` HTTP 200，缓存刷新后再看。
2. 控制台：检查 `getContext('webgl2')` / shader compile / context lost 错误；**不可把静态页面加载成功等同于 GPU 绘制成功**。
3. DOM：`#universe`, `#globeCanvas`, `#markersCanvas` 均应具备正确宽高；Canvas 下层应能绘制后备内容。
4. 安装前的基线核对：`npm run check` 全绿；(prefers-reduced-motion) 分支和触控事件回归通过。
5. 真机失败优先反馈 iOS/Safari 版本、机型、手机竖横屏截图和复现步骤；先创建修复 PR，未经验证不要直接改生产 Secrets / D1 / Access。

**验收边界：** Node 测试可验证兼容逻辑；Chromium 的 iPhone 设备模拟不是真实 iOS Safari。生产发布需要用户真机确认显示和帧率。
