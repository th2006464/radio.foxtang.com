# iPhone / iPad Safari 地球显示与排障

## 设计策略
移动 Safari 是 WebKit，WebGL2、Canvas 合成、上下文丢失和资源解码行为与桌面 Chromium 不完全相同。之前的失败症状是“桌面地球正常，但 iPhone Safari 看不到”。

当前采取**GPU 优先 + 自动轻量后备**：
1. iPhone/iPad WebKit 也尝试 WebGL2，共用桌面的 `GlobeRenderer` 和 Shader，不因 User-Agent 直接禁用 GPU；WebGL 初始化/纹理/渲染失败时改用 Canvas2D 点云球。
2. 移动端 Canvas DPR 最高 1.3；GPU 目标约 30 FPS，回退 Canvas 约 22 FPS；桌面端保留原来的 DPR 与渲染节奏。
3. 后备 Canvas **按需创建**：GPU 可用时既不生成大陆初始点也不重复解码图片；真正回退时先生成基础点云并绘制，随后异步用 `earth.webp` 加强大陆纹理，采样步长 6。
4. 缓存移动端渐变与 1100 颗背景星点，只在布局/首页状态切换时重建；不再随地球每一帧反复计算。
5. WebGL2 最初的 1×1 纹理采用 `LINEAR` 过滤，真实纹理加载并创建 mipmap 后才切换到 `LINEAR_MIPMAP_LINEAR`，避免初始阶段纹理不完整造成黑屏。

## 手动验收（每次涉及 globe.js、scene.js、CSS 或 build 时执行）
- [ ] iPhone Safari 首次访问（清除站点缓存）：几秒内能看到有大陆轮廓的点阵地球，不能整片空白
- [ ] 弱网/纹理暂不可用：仍有基础点阵，不因 `earth.webp` 加载延迟而空白
- [ ] 手指水平/垂直拖动时地球转动，松手后有阻尼（减少动态效果模式可无惯性）
- [ ] 「探索地球」进入后仍是同一颗地球；没有「星图」标签
- [ ] 随机收听后选中电台能显示国家/地区及定位（仅当目录提供坐标）
- [ ] 横屏、短屏幕高度、iPhone 安全区域与浏览器底栏不遮住关键按钮
- [ ] Safari 无持续性 JS 异常；上下文不可用时音频、搜索、收藏仍可操作
- [ ] 支持 GPU 的 iPhone：地球点阵和电脑视觉一致，加载和拖动无持续性卡顿
- [ ] 不支持 GPU 的 iPhone：Canvas 点阵基础轮廓可见，触摸可旋转，功能未失效
- [ ] 桌面 Chrome/Edge 的 WebGL 原效果及流畅度未回退

## 诊断顺序
1. 浏览器网络：检查 `/globe.js`、`/scene.js`、`/earth.webp`、`/style.css` HTTP 200，缓存刷新后再看。
2. 控制台：检查 `getContext('webgl2')` / shader compile / context lost 错误；**不可把静态页面加载成功等同于 GPU 绘制成功**。
3. DOM：`#universe`, `#globeCanvas`, `#markersCanvas` 均应具备正确宽高；Canvas 下层应能绘制后备内容。
4. 安装前的基线核对：`npm run check` 全绿；(prefers-reduced-motion) 分支和触控事件回归通过。
5. 真机失败优先反馈 iOS/Safari 版本、机型、手机竖横屏截图和复现步骤；先创建修复 PR，未经验证不要直接改生产 Secrets / D1 / Access。

**验收边界：** Node 测试可验证兼容逻辑；Chromium 的 iPhone 设备模拟不是真实 iOS Safari。生产发布需要用户真机确认显示和帧率。

## 本轮性能测试重点
请分别在禁用缓存首次访问、普通刷新、连续拖动地球 10 秒三个场景观察。对照电脑的光点质感和标题字形；旧设备进入 Canvas2D 后备时允许点密度降低，但不能出现黑屏。模拟 iPhone User-Agent 的 Chromium 不是原生 iOS Safari，不能替代真机验收。
