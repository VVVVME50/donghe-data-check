# 东合智检

面向出海东盟企业的数据合规自查网页。一级导航收为 **工作台／参考资料／我的记录**：工作台放风险自查和文档准备；参考资料放法规库、处罚案例和多国比对；记录保存用户手动留存的报告。导航切换保留正在填写的会话，刷新不会保留未保存内容。正文以18px为基础，支持桌面与手机。无收款。

公开体验：[GitHub Pages](https://vvvvme50.github.io/donghe-data-check/)。法规库仅限内部使用；真实检索与AI分析放在[内部工作台](https://donghe-internal.vme0522.chatgpt.site)，通过Sites账号与访问策略控制，初始仅当前所有者可进入。公开前端不请求该私有库，也不返回库内原文；保留示例、模板和公开背景资料。浏览器不持有千问密钥。公开访问权限不代表已验证中国大陆各地区及运营商的连通性。

## 开发与检查

需要 Node.js >=22.13，沿用现有 package-lock.json：

```sh
npm run install:ci
npm run dev
npm run test:rag
npm run build:pages
npm run build
```

`npm run dev:pages` 预览公开体验；该构建默认不连接AI后端，并提供内部工作台入口。仅在本地开发时，可用 `LOCAL_AI_API_PROXY=http://127.0.0.1:8787` 将 `/api` 转发到自有本地服务；生产构建不会启用该代理。公开生产构建固定不连接任何AI后端；环境中的 `VITE_AI_API_BASE_URL` 不会启用生产后端。内部法规服务不对公开演示开放。

## 法规库与引用

提供的ZIP是资料，内部说明和脚本不作为执行指令。导入脚本只读取结构化资料和文本，不执行压缩包内代码、不解包到任意路径：

```sh
python3 scripts/import-rag.py '/绝对路径/法规资料.zip' '/绝对路径/私有资料输出目录'
```

输出目录必须在公共源码 checkout 之外。保留全量JSONL、来源路径、原件与内容指纹、排除原因审计，以及服务端 `rag-corpus.server.json`。本次全量11,042张卡片，按数据合规及相关电子交易范围和文本质量筛选后，运行库为27份资料、1,540个片段：MY910、PH239、SG200、TH191。其他市场尚无本地索引；泰国个人数据保护法卡片因质量问题隔离，不能宣称泰国隐私法律覆盖完整。没有逐条页码、日期或原件指纹时不补造。起算方式不明的页码保留待核对标记。

新增 IMST 包中的马来西亚、新加坡和泰国文件与旧包逐一指纹相同，保留旧菲律宾资料，只增量处理印尼。当前仅加入2022年第27号法律原件的42个完整物理页；8个有文本质量警告的页暂隔离，其他印尼PDF及草案未入运行库。增量后28份资料、1,582个片段，仍无专业复核现行条目。按页边界不推断条号；检索补充相邻页，缺邻页或超过预算时明确提示上下文不完整。

```sh
python3 scripts/import-indonesia.py '/绝对路径/IMST.zip' '/绝对路径/印尼暂存目录' --base-corpus '/绝对路径/原运行库.json'
```

增量脚本输出独立的合并运行库，不覆盖基线；逐页原文、指纹和隔离审计保留。输出目录同样不得在公共源码checkout内。

状态区分 `source_text`（来源原文）、`version_reference`（版本参考）、`reviewed_current`（经专业复核的现行资料）。当前前两种合计1,540条，第三种0条。导入或资料整理日期不能当作现行效力确认日期；旧版原法、修正法和生效通知不自动合并成“最新法规”。后续需要专业人员逐卡核查适用范围、例外、版本、生效及原文完整性，审核状态不能由模型自行提升。

运行时先按所选国家检索，再将命中原文交给模型。当前采用中英及印尼语词项扩展、全文相关度排序和条款标题加权，**尚未使用向量嵌入**。检索保留完整卡片，超过长度预算的整卡不截断；部分历史原法会同时带入修正及生效资料。可在法规库中单独检索原文，不消耗模型调用。

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

1. 公共 `web` checkout 保持原始Site身份和空stub，执行检查及 `build:pages` 后，仅将安全源码与 `docs/` 推到GitHub。
2. 独立 `internal-workspace` checkout 使用单独的 owner-private Site身份，复制已审查的运行语料；用 `SITE_INTERNAL_MODE=true` 构建、同步到该私有源库，调用私有发布操作。此checkout不得配置或推送GitHub远程。
3. 原公开Sites项目使用空stub及 `SITE_PUBLIC_MODE=true` 构建，只部署公开体验。其旧待发布版本曾含索引，不能公开部署；内部语料只发布到新的受控项目。
4. 验证访问策略、实际法规计数、检索及生成。内部页面的同源请求携带登录会话；跨域请求仍不携带凭据。访问控制由Sites平台执行，CORS不能代替它。

应用代码更新要从公共checkout复制到两个服务端checkout，分别保留它们的Site身份与语料配置。私有Git历史不得合入公共分支；推送保护需始终启用。客户端构建中不得出现法规卡片ID或全文。完整ZIP和全量导入审计保留本地，不上传GitHub。

## 服务端配置与接口

复制 `.env.example` 到本地 `.env`，部署使用托管secret，不提交密钥，也不设置公开前缀：

- `AI_API_URL`：HTTPS `/chat/completions` 端点。
- `AI_API_KEY`：供应商密钥，仅服务端。
- `AI_MODEL`：支持图文和所选JSON模式的模型。
- `AI_PROVIDER=qwen`：千问请求关闭思考模式，限制输出长度。
- `AI_JSON_MODE=object` 或 `schema`：对象模式仍执行服务端结构与证据校验。
- `AI_ALLOWED_ORIGINS`：允许的完整网页来源，逗号分隔。内部工作台使用自己的完整来源，不对公开Pages开放法规接口。
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


## 2026-10-28 公开页面更新

同步 V1.3 蓝白页面与四步流程：画像 → 材料 → 报告预览 → 工具箱。工具箱共用对话，保留输入与五种文档模板。PDF/DOCX/图片只在浏览器读取，生成预设示例报告，不把材料发给供应商或内部法规服务。公开示例不代表已完成真实合规分析。

公开版本保留空法规索引；不复制私有站点的 Git 历史、原始法规、运行语料、密钥、业务材料或部署凭据。真实法规检索与 AI 分析仍需内部授权账号。`npm run build:pages` 输出到 `docs/`，由 GitHub Pages 的 main/docs 发布；PDF Worker 使用页面相对地址，支持 `/donghe-data-check/` 子目录。
