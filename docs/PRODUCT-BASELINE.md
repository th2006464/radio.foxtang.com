# Radio 生产基线与 Git 版本管理

## 基线定义（2026-10-20）
- 产品名：**Radio**；生产地址 `https://radio.foxtang.com/`。
- 页面只保留**全球电台地球**（含点云材质、拖动与真实电台定位）；星图模式已删除。
- Logo：`https://logo.foxtang.com/avatars-512/set-05/media.png`，网页与 favicon 一致，移动端使用约 30px 尺寸。
- 桌面：维持 WebGL2 点阵与大视口地球；iPhone/iPad WebKit：优先同材质 WebGL2，GPU 失败时自动 Canvas2D，移动端限制 DPR/帧率并缓存背景。
- 不修改 D1、KV、Secrets、Cron、Access 或其他项目的 DNS。

## Git 基线
- 持续开发主分支：`main`，必须通过 PR 合并；生产部署由 Cloudflare Pages 的 GitHub 集成自动触发。
- 稳定版本快照：`baseline/radio-2026-10-20-v1`，在**生产版本 Merge Commit 与 Cloudflare 版本 SHA 一致**后创建，并固定该提交作为后续回滚来源。
- 新移动端部署快照计划固定于 `baseline/radio-2026-10-20-v2-mobile-gpu`，指向本轮生产 Merge Commit；此引用标记**已部署代码来源**，不意味着真实 Safari 性能验收通过，v1 继续保留。
- 此基线使用独立**分支**而不是伪造 Git tag；没有经过实际创建的 tag 不应宣称存在。分支一经建立，不再改写或强推，后续新版本使用新基线分支。
- PR Merge Commit、GitHub Actions Verify Run ID、Cloudflare Deployment ID 以 GitHub 和 Cloudflare 真实记录为准，禁止在文档中编造。

## 发布门槛
1. 在 GitHub PR 中审查改动范围，确认没有无关服务或音频服务器的变更。
2. `npm run check`（包含 syntax、Node tests、静态构建）通过；GitHub Actions Verify 与 Head SHA 一致。
3. 标准 `merge` 方法合并 PR，并记录 Merge SHA。
4. 检查 Cloudflare Pages 项目 `radio-foxtang-com` 的 Production Deployment：构建 `success`，`deployment_trigger.metadata.commit_hash` 与 Merge SHA 一致；生产别名包含 `https://radio.foxtang.com`。
5. 验证生产页面品牌、图标、星图入口不存在、核心静态资源与 `/api/stations`；请用户用 Safari 真机验收地球显示与拖动。
6. 创建稳定基线分支并记录其精确 SHA；**自动化检查和 Cloudflare 成功不等于 iPhone Safari 实机验收通过**。

## 回滚
优先使用 Cloudflare Pages 已知成功的旧 Deployment 回滚，或从固定的 `baseline/...` 分支新建恢复 PR 合并至 `main`，由 GitHub 集成自动部署。不得直接 force push 主分支或改变不相关 Worker/DNS/Access 策略。

## 下一次迭代
先从此基线分支或当前 `main` 创建功能分支；涉及画面/手势的变更同步更新 `docs/UI-GLOBE-PLAYBOOK.md` 和 `docs/SAFARI-TESTING.md`，新增回归测试，并在生产真机验收后创建新的固定基线引用。

## 2026-10-20 v3 Safari Alpha 修复候选
- 对应问题：真实 iPhone 截图出现浅绿色实心地球，遮挡首页文字。
- 核心修复：移动 WebGL 使用预乘 Alpha 输出和匹配的 Context；只调整移动首页地球比例与位置，桌面保持此前验证过的材质和布局。
- 发布后使用 `baseline/radio-2026-10-20-v3-safari-alpha` 固定已部署的 Merge Commit，保留 v1、v2 不变；**仅表示部署来源，不代表 Safari 视觉实机通过**。
- 用户确认 iPhone Safari 真机正常后，再将本次视觉验收标为通过；如果失败应以 v2 的可靠 Git 引用回滚或准备补丁，而不是声称该版已稳定。
