# 东合智检 · 一期网页 MVP

面向出海东盟小微企业的数据合规风险自查网页。无注册、无收款、无历史记录数据库。包含首页、3 题画像、文字与图片上传、报告、免费 A4 PDF 导出与移动适配。

## 开发

需要 Node.js >= 22.13，使用 npm 与现有 package-lock.json：

```sh
npm run install:ci
npm run dev
npm run build
```

## AI 接入

前端默认访问同源接口，GitHub Pages 版可配置独立后端地址，浏览器不持有密钥。后端使用兼容 Chat Completions 的 HTTP 接口，支持图文输入及结构化输出，参考 [官方 API 规范](https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create)。

复制 `.env.example` 到本地 `.env`，设置以下服务端变量；部署时用托管环境的 secret 管理，禁止设置 NEXT_PUBLIC 前缀，也不要提交密钥：

- `AI_API_URL`：完整 HTTPS `/chat/completions` 端点。
- `AI_API_KEY`：密钥。
- `AI_MODEL`：模型名，所选模型须支持图片与指定 JSON 模式。
- `AI_JSON_MODE`：`schema`（严格结构化输出）或 `object`（兼容 JSON 模式）。
- `AI_PROVIDER`：千问填写 `qwen`，请求会关闭思考模式并限制输出长度。
- `AI_ALLOWED_ORIGINS`：允许浏览器调用的完整来源，以逗号分隔；当前为 `https://vvvvme50.github.io`。
- `AI_ALLOW_MATERIAL_SCREENING`：默认 `false`；明确设为 `true` 才允许在法规尚未核验时提供材料初筛。

当前服务端已配置千问 `qwen3-vl-plus`，使用 `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`，`AI_JSON_MODE=object`。模型支持文字和图片，JSON Object 模式需要在提示中给出明确结构；此模型当前不支持 JSON Schema 模式。参见[阿里云结构化输出文档](https://help.aliyun.com/zh/model-studio/qwen-structured-output)。真实密钥只保存在托管服务端的 secret 中。

在 `data/regulations.json` 为支持国家加入**专业人员审核后的**法规摘编。每项字段为 `id / country / name / article / url / reviewed_at / excerpt`。`country` 为 SG/MY/TH/ID，`reviewed_at` 为 YYYY-MM-DD，url 为官方 HTTPS 法规出处。当前四国数组为空，线上已明确开启材料初筛：根据真实材料梳理业务流程和信息缺口，所有事项统一为“待核实”，禁止引用未经核验的法条或给出法律风险评级。法规审核完成后才能提供带来源的法规筛查；不能把空摘编改成虚构法规。

接口：

- `GET /api/status`：返回 `configured / provider / materials_only / reviewed_countries`，不返回端点或密钥。
- `POST /api/analyze`：multipart/form-data。`profile` 为 JSON 字符串；`description` 为 0 或 10–2000 字；`images` 最多 3 个 JPG/PNG 文件，每个 <=5 MiB。画像和至少一种材料必填。
- 画像字段：`country_list`（SG/MY/TH/ID 数组）、`business_type`（ecommerce/independent/livestream/social/trade/other）、`data_transfer`（all/partial/local/unknown）。
- 输出契约见 `lib/assessment.ts`。报告包含 `analysis_scope`（`demo / materials_only / regulation_screening`），由服务端补充日期、编号、免责声明和风险数量；法规 ID 映射至已审核摘编。缺乏可核验法规来源的项会降为“待核实”。
- 错误返回 `{error:{code,message}}`；未配置或认证不可用 503、输入不合法 400、上传超时 408、过大 413、不支持 Content-Type 415、并发忙碌或超频 429、上游或结果校验失败 502、模型连接超时 504。不会将真实接口错误静默换成示例。
- 请求体最多 16 MiB，上传阶段总期限 30 秒，模型请求期限 60 秒；每个 Worker 实例同时处理 1 次分析，按访问 IP 在实例内最多 8 次 / 10 分钟。此限制为内存中的尽力保护，不能代替跨实例限流、账号鉴权或供应商额度上限。CORS 仅允许指定网页来源，不等同于身份验证。

## 隐私与结果边界

真实分析时，材料在请求内存中处理，未写入磁盘、数据库或应用日志；本应用不能代替模型服务商承诺零留存，应在正式上线前核查供应商数据政策。浏览器仅使用当前页面内存，刷新后画像、材料、报告失效。示例模式不会把文字/图片发送到 AI，预设报告持续显示示例标识。

当前的法规资料和机构授权均未提供，网页未展示虚构合作背书或律师名录。产品用于风险自查参考，不能作为合规证明或替代律师意见。公开运营前需验证真实模型输出准确性、法规更新、成本配额与跨实例限流。

PDF 由浏览器本地生成，带页码与免责声明；示例标识及材料初筛边界保留。为确保中文字体及离线输出一致，采用 A4 高分辨率图像页面，文字暂不可选择检索。

## 自动化辅助

支持的浏览器中注册 `get_assessment_state`（只读）与 `stage_assessment_profile`（仅填写画像、不调用 AI）两个 WebMCP 工具。没有支持该能力的浏览器时不影响正常流程。
## GitHub Pages 公开网页

`npm run build:pages` 将同一套网页构建到 `docs/`。GitHub Pages 使用 `main` 分支的 `/docs` 目录，资源采用相对路径，支持项目子路径。提交 `docs/` 与源码后即可更新公开演示。开发预览：`npm run dev:pages`。

公开地址：`https://vvvvme50.github.io/donghe-data-check/`。GitHub Pages 运行前端，`app/api` 在独立后端运行。前端默认调用公开后端 `https://donghe-data-check.vme0522.chatgpt.site`；真实分析时会将文字和图片发至后端，再由后端调用千问。示例体验不向模型发送材料，PDF 在浏览器本地生成。

迁移后端时，在构建环境配置公开的 `VITE_AI_API_BASE_URL`（仅服务地址，无密钥），重新构建。前端继续使用现有数据协议；后端需要允许 Pages 站点来源的 CORS 请求，并保留来源校验、上传大小限制与费用控制。AI 供应商密钥始终只放在后端。未启用服务时页面提供示例体验；材料初筛与示例报告均持续显示对应标识。

公开访问权限不代表已验证中国大陆网络连通性；国内实际体验需通过不同地区和运营商实测。
