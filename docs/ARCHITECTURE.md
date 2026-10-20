# Radio 工程架构与数据流

## 目标与边界
本项目是无账号、无需数据库的公共在线电台可视化。**只保留一颗交互式地球**，首页（landing）和收听（listening）沿用同一地球材质与经纬度投影；不同状态只改变相机比例、镜头过渡及电台标记。

```
GitHub main --自动构建--> Cloudflare Pages dist/
浏览器 HTML/CSS -----> app.js 状态 / 播放器 / 收藏 localStorage
                     |                    |
                     v                    +--> 电台 HTTPS 音源（直接播放）
                 scene.js / globe.js
                     |
              earth.webp 地理遮罩
                     |
              真实电台 geo_lat / geo_long
浏览器 /api/stations --> Pages Functions --> Radio Browser 公开镜像
```

## 模块责任
- `src/app.js`：站点数据规范化、`eligible`、`isPlayable`、收藏 `rf_saved`、上次电台 `rf_last`、播放流程 `tune/next`、语言与筛选；进入探索使用 `enterExplore()` 并固定地球模式。
- `src/scene.js`：`Universe` 是唯一场景控制器；`setLanding` 保存首页旋转角，转换为探索相机过渡，`focus` 使用真实经纬度转向电台；`PointGlobeFallback` 保证无 WebGL2 时不出现黑屏。
- `src/globe.js`：WebGL2 fragment shader：`earth.webp` 仅作为陆地遮罩采样，点阵/轮廓/晨昏光由着色器生成。渲染异常则返回 `false` 供 Canvas2D 接管。
- `functions/api/stations.js`：有限字段查询、镜像回退、超时与缓存；后端不转发音频，避免带宽与费用风险。
- `index.html` / `src/style.css`：DOM 层、播放器覆盖层、移动断点、触摸范围及品牌 Logo；Canvas 地球必须始终可被触摸，前景文字和按钮不应截获非交互区域。

## 重要状态迁移
1. 初次访问：不启动自动音频；`welcome` 覆盖大地球，继续自转并响应拖拽。
2. 上次收听：读取有效 `rf_last`，左侧展示真实电台资料、页内焦点提示；不能使用虚构台名或随机填充位置。
3. 「探索地球」：隐藏首页、保留球体角度，同一地球相机放大；显示电台点/坐标。
4. 「开始收听」或点电台：浏览器用户手势发起播放，显示播放器；音源失败按策略跳台。
5. 点击左上角品牌返回首页：恢复球体角度和首页内容，不重新创建另一种地球材质。

## 约束
- 不重新引入星图菜单、`drawSky` 或 `setView('sky')`；修改产品导航先增加回归测试。
- 不在 D1 写入收听记录；收藏只在本地。
- 经纬度可能为空：地图位置卡只展示目录里的真实字段；无坐标不做假定位。
- 发布来源固定为 GitHub `main` → Cloudflare Pages。验收前不要改变账户级权限、安全策略和其他服务。
