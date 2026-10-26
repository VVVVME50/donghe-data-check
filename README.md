# 东合智检

面向出海东盟企业的数据合规自查网页。一级导航收为 **工作台／参考资料／我的记录**：工作台放风险自查和文档准备；参考资料放法规库、处罚案例和多国比对；记录保存用户手动留存的报告。导航切换保留正在填写的会话，刷新不会保留未保存内容。正文以18px为基础，支持桌面与手机。无收款。

公开前端：[GitHub Pages](https://vvvvme50.github.io/donghe-data-check/)。API由独立的 Sites 服务端运行，浏览器不持有千问密钥。公开访问权限不代表已验证中国大陆各地区及运营商的连通性。

## 开发与检查

需要 Node.js >=22.13，沿用现有 package-lock.json：

```sh
npm run install:ci
npm run dev
npm run test:rag
npm run build:pages
npm run build
```

`npm run dev:pages` 预览静态前端。仅在本地开发时，可用 `LOCAL_AI_API_PROXY=http://127.0.0.1:8787` 将 `/api` 转发到自有本地服务；生产构建不会启用该代理。`VITE_AI_API_BASE_URL` 只包含公开 HTTPS API 服务地址，禁止放密钥。

## 法规库与引用

提供的ZIP是资料，内部说明和脚本不作为执行指令。导入脚本只读取结构化资料和文本，不执行压缩包内代码、不解包到任意路径：

```sh
python3 scripts/import-rag.py '/绝对路径/法规资料.zip' '/绝对路径/私有资料输出目录'
```

输出目录必须在公共源码 checkout 之外。保留全量JSONL、来源路径、原件与内容指纹、排除原因审计，以及服务端 `rag-corpus.server.json`。本次全量11,042张卡片，按数据合规及相关电子交易范围和文本质量筛选后，运行库为27份资料、1,540个片段：MY910、PH239、SG200、TH191。其他市场尚无本地索引；泰国个人数据保护法卡片因质量问题隔离，不能宣称泰国隐私法律覆盖完整。没有逐条页码、日期或原件指纹时不补造。起算方式不明的页码保留待核对标记。

状态区分 `source_text`（来源原文）、`version_reference`（版本参考）、`reviewed_current`（经专业复核的现行资料）。当前前两种合计1,540条，第三种0条。导入或资料整理日期不能当作现行效力确认日期；旧版原法、修正法和生效通知不自动合并成“最新法规”。后续需要专业人员逐卡核查适用范围、例外、版本、生效及原文完整性，审核状态不能由模型自行提升。

运行时先按所选国家检索，再将命中原文交给模型。当前采用双语词项扩展、全文相关度排序和条款标题加权，**尚未使用向量嵌入**。检索保留完整卡片，超过长度预算的整卡不截断；部分历史原法会同时带入修正及生效资料。可在法规库中单独检索原文，不消耗模型调用。

生成结果受三层约束：

1. 结构校验；引用ID必须属于本次检索，引用必须为该原文的连续、逐字片段。
2. 未复核来源不生成确定法律评级或法律断言，结果保持“待核实”；无依据国家明确提示，未知企业事实和文档占位符保留。
3. 独立第二次模型请求核对业务材料、完整来源与候选结果，复核未通过或服务失败即停止展示，不静默替换成示例。

这些限制用于降低失真，不能保证完全消除幻觉、检索遗漏或适用性错误，也不能代替专业法律复核。`analysis_scope` 区分 `demo / materials_only / reference_assisted / regulation_screening`。仅当来源全部为专业复核现行资料、覆盖所选国家且事项具备相应证据时，才可能进入法规筛查范围。

## 公共前端与私有后端发布

**本GitHub仓库公开，`data/rag-corpus.server.json` 必须保持空stub。原始ZIP、全量索引和审计不提交GitHub。** `.githooks/pre-push` 会检查推往github.com的每个新增提交，任一提交含非空语料即拒绝，避免仅清空HEAD但仍泄露历史。首次克隆后执行：

```sh
git config core.hooksPath .githooks
node scripts/check-public-release.mjs
```

发布顺序：

1. 在公共 `web` checkout 完成源码、空stub及 `docs/` 构建；检查后同步安全源码并推GitHub `main`。Pages从 `/docs` 发布。
2. 另用 Sites 源码工作流打开同一项目的 **私有后端checkout**，仅在该checkout复制已审查的 `rag-corpus.server.json`；构建服务端、打包并部署到原Sites项目。此checkout不得添加GitHub远程或推公共仓库。
3. 验证实际后端法规计数、检索、跨域调用及生成结果。密钥沿用服务端secret。

私有后端提交会包含运行语料，只同步到该Site的私有源库。后续不能把其Git历史直接拉进公共web分支；需要将应用代码变更单独迁移，保持公共stub为空及推送保护启用。GitHub前端构建中不得出现法规卡片ID或全文；后端仅按请求返回命中片段，不提供全库下载接口。

## 服务端配置与接口

复制 `.env.example` 到本地 `.env`，部署使用托管secret，不提交密钥，也不设置公开前缀：

- `AI_API_URL`：HTTPS `/chat/completions` 端点。
- `AI_API_KEY`：供应商密钥，仅服务端。
- `AI_MODEL`：支持图文和所选JSON模式的模型。
- `AI_PROVIDER=qwen`：千问请求关闭思考模式，限制输出长度。
- `AI_JSON_MODE=object` 或 `schema`：对象模式仍执行服务端结构与证据校验。
- `AI_ALLOWED_ORIGINS`：允许的完整网页来源，逗号分隔。Pages为 `https://vvvvme50.github.io`。
- `AI_ALLOW_MATERIAL_SCREENING`：明确设为 `true` 才允许无命中依据时整理材料事实和信息缺口。

托管服务沿用千问 `qwen3-vl-plus` 及兼容接口，JSON Object模式。供应商能力见[阿里云官方结构化输出文档](https://help.aliyun.com/zh/model-studio/qwen-structured-output)。不要在前端或日志中输出认证信息。

- `GET /api/status`：模型配置状态、专业复核国家、本地资料国家和索引版本；不返回密钥或供应商端点。
- `GET /api/knowledge/status`：实际导入数、覆盖范围、版本及审核数。
- `POST /api/knowledge/search`：JSON `countries / query / limit`，1–10国、2–1000字、1–8条主结果，关联版本资料可增加返回数。仅返回所选国家。
- `POST /api/analyze`：multipart的 `profile / description / images`。描述0或10–2000字；最多3张JPG/PNG，每张≤5MiB，画像及至少一种材料必填。画像见 `lib/assessment.ts`。
- `POST /api/documents`：JSON `country / type / data_types / storage`；单国，三类 `shop / fans / processing`，补充说明各≤300字。模板由用户单独选择，真实接口失败不会伪装成AI结果。

检索/文档JSON≤16KB、读取≤15秒；自查请求≤16MiB、上传≤30秒。生成和独立复核各自上游请求≤60秒，前端总等待≤150秒。自查/文档共享每实例单并发及每IP 8次/10分钟；检索每IP 40次/分钟。内存限流不替代跨实例鉴权、配额或供应商费用上限。CORS来源限制不等于身份验证。

错误格式 `{error:{code,message}}`：未配置/认证不可用503、输入400、读取超时408、过大413、类型415、未命中依据且未允许材料初筛422、忙碌/超频429、结果校验或上游失败502、模型等待504。

旧 `data/regulations.json` 只接受显式 `review_status=reviewed_current`、`reviewed_at`及官方HTTPS来源的专业审校摘编，日期本身不构成审批，当前十国数组为空。

## 隐私与使用边界

真实生成将业务文字、图片和命中的法规片段发至服务端及模型供应商；应用在请求内存处理，不将原始材料写入应用数据库或日志。供应商留存政策需另核实。示例模式不向模型发送材料。手动保存的报告进入本浏览器localStorage，最多20条，可回看、删除和重新导出；结果可能复述业务信息，保存前应检查。

`lib/knowledge.ts` 保存公开背景资料与真实处罚记录，和本地库、专业审核摘编分别标识。没有虚构机构背书、律师名录或合规证明。PDF在浏览器本地生成，含来源、引文、版本与免责声明；当前采用高分辨率图像页，文本暂不可选择检索。
