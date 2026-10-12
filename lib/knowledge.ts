import { COUNTRIES, type CountryCode } from "./assessment";
export type CountryReference={code:CountryCode;status:"law"|"sector"|"pending";statusText:string;law:string;summary:string;url:string;updated:string;notes:string[]};
// Official public references are separate from the professionally reviewed AI evidence library.
export const REFERENCES:CountryReference[]=[
  {
    "code": "SG",
    "status": "law",
    "statusText": "专门法已生效",
    "law": "Personal Data Protection Act 2012",
    "summary": "政府法律库列有现行个人数据保护法及修订时间线。",
    "url": "https://sso.agc.gov.sg/Act/PDPA2012?segment=mnc",
    "updated": "2026-10-12",
    "notes": [
      "需结合业务核查适用范围、例外与现行修订。"
    ]
  },
  {
    "code": "MY",
    "status": "law",
    "statusText": "专门法已生效",
    "law": "Personal Data Protection Act 2010 · 2024 修法",
    "summary": "商业交易相关个人数据处理受其规制；2024 修法于 2025 年分三批施行。",
    "url": "https://www.pdp.gov.my/ppdpv1/en/akta/personal-data-protection-amendment-act-2024/",
    "updated": "2026-10-12",
    "notes": [
      "官方说明联邦政府和州政府不在该法适用范围内。",
      "适用范围与生效安排应结合现行原文复核。"
    ]
  },
  {
    "code": "ID",
    "status": "law",
    "statusText": "专门法已生效",
    "law": "2022 年第 27 号个人数据保护法",
    "summary": "官方法律库标记为现行有效，公布日期为 2022-10-17。",
    "url": "https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-2022-10",
    "updated": "2026-10-12",
    "notes": [
      "专门法有效不代表全部配套规定已完成核验。"
    ]
  },
  {
    "code": "TH",
    "status": "law",
    "statusText": "专门法已施行",
    "law": "Personal Data Protection Act B.E. 2562 (2019)",
    "summary": "数字经济与社会部收录专门法资料，并已公布企业行政处罚记录。",
    "url": "https://mdes.go.th/mission/detail/2317-กฎหมายคุ้มครองข้อมูลส่วนบุคคล",
    "updated": "2026-10-12",
    "notes": [
      "具体义务、例外与配套规则需结合官方原文复核。"
    ]
  },
  {
    "code": "VN",
    "status": "law",
    "statusText": "2026 年新法已生效",
    "law": "个人数据保护法 · 91/2025/QH15",
    "summary": "2025-06-26 颁布的个人数据保护法于 2026-01-01 生效。",
    "url": "https://congbao.chinhphu.vn/van-ban/luat-so-91-2025-qh15-45578.htm",
    "updated": "2026-10-12",
    "notes": [
      "新法与配套规定应一并核查，勿套用旧版本结论。"
    ]
  },
  {
    "code": "PH",
    "status": "law",
    "statusText": "专门法已生效",
    "law": "Data Privacy Act of 2012 · RA 10173",
    "summary": "NPC 实施规则涵盖政府或私人部门的自然人、法人处理个人数据。",
    "url": "https://privacy.gov.ph/implementing-rules%20regulations-data-privacy-act-2012/",
    "updated": "2026-10-12",
    "notes": [
      "与马来西亚的政府排除口径不同，具体适用仍需核查。"
    ]
  },
  {
    "code": "BN",
    "status": "law",
    "statusText": "主要条款已生效",
    "law": "Personal Data Protection Order, 2025",
    "summary": "主要个人数据保护部分自 2026-01-01 生效，需区分不同条款的施行安排。",
    "url": "https://www.agc.gov.bn/wp-content/uploads/2026/07/S-1-2025-PERSONAL-DATA-PROTECTION-ORDER-2025-1.pdf",
    "updated": "2026-10-12",
    "notes": [
      "不能再把该令归为草案；具体条款生效范围需复核。"
    ]
  },
  {
    "code": "KH",
    "status": "sector",
    "statusText": "草案记录 · 颁布待核验",
    "law": "个人数据保护法草案 · 电子商务法",
    "summary": "法律改革委员会 2026-08-05 记录仍称为最终草案；既有电子商务法包含电子形式个人信息保护条款。",
    "url": "https://lrc.gov.kh/en/8896/",
    "updated": "2026-10-12",
    "notes": [
      "尚未取得草案后续颁布和生效的官方证据。",
      "待核验不表示当地没有适用规定。"
    ]
  },
  {
    "code": "LA",
    "status": "sector",
    "statusText": "电子数据相关法 · 待复核",
    "law": "Law on Electronic Data Protection · 25/NA",
    "summary": "工贸部官方贸易门户收录 2017-05-12 电子数据保护法，应核查其电子数据范围。",
    "url": "https://www.laotradeportal.gov.la/en-gb/site/display/1718",
    "updated": "2026-10-12",
    "notes": [
      "本轮未充分核实具体生效日期及 2026 年新增综合专门法情况。"
    ]
  },
  {
    "code": "MM",
    "status": "sector",
    "statusText": "相关法已施行 · 待复核",
    "law": "Cybersecurity Law · SAC Law No.1/2025",
    "summary": "2025 网络安全法于 2025-07-30 生效；它属于网络安全相关法律，不直接等同于综合个人数据保护专门法。",
    "url": "https://www.moi.gov.mm/moi:eng/news/16633",
    "updated": "2026-10-12",
    "notes": [
      "综合专门法状态尚待进一步核验；电子交易法及修法也可能相关。"
    ]
  }
];
export const countryReference=(code:CountryCode)=>REFERENCES.find(c=>c.code===code)!;
export const countryLabel=(code:CountryCode)=>COUNTRIES.find(c=>c.code===code)?.name??code;
export const SCENARIOS=[{id:"collection",label:"数据收集",check:"逐项列明收集目的、必要字段和用户告知方式。",avoid:"不要把订单履约与营销用途混写，也不要收集业务不需要的字段。",impact:"目的或范围不清，容易造成告知不一致与后续投诉。"},{id:"storage",label:"存储与期限",check:"记录服务器位置、保存期限、删除触发条件与权限负责人。",avoid:"不要无限期保留已失去用途的数据，或让所有员工共用访问账号。",impact:"保存与权限管理不清，会增加泄露和整改成本。"},{id:"transfer",label:"跨境传输",check:"绘制数据流转图，记录境外与境内接收方及保护安排。",avoid:"不要仅凭服务器位置或传输目的，直接认定可以跨境传输。",impact:"接收方与传输安排不明，会影响专业人员核查当地要求。"},{id:"rights",label:"用户权利",check:"设置联系渠道，记录用户请求、身份核验及处理过程。",avoid:"不要在未核查当地规定前承诺固定办理天数或全部删除。",impact:"请求无处受理或处理记录缺失，容易增加争议。"},{id:"sharing",label:"第三方共享",check:"维护服务商清单，明确访问范围、处理目的和终止后的处置。",avoid:"不要默认平台、客服和物流服务商可以复用全部客户资料。",impact:"职责和权限不清，会导致超范围使用或数据流向无法追踪。"},{id:"breach",label:"泄露通报",check:"准备事件分级、内部联络、调查记录与属地通报核查流程。",avoid:"不要把其他国家的通报时限直接套用到当前市场。",impact:"事件处置不及时或记录不足，可能增加业务损失及监管应对难度。"}] as const;
export type CaseRecord={id:string;country:CountryCode;title:string;date:string;industry:string;violation:string;outcome:string;summary:string;lessons:string[];basis:string;url:string};
export const CASES:CaseRecord[]=[
  {
    "id": "sg-carousell-2024",
    "country": "SG",
    "title": "Carousell 用户数据保护安排不足",
    "date": "2024-02-22",
    "industry": "电商平台",
    "violation": "安全措施不足",
    "outcome": "罚款 58,000 新加坡元；要求复审测试与技术规范记录流程并修补缺口。",
    "summary": "新加坡 PDPC 公布 Carousell 违反数据保护义务的决定，涉及平台用户个人数据的安全保护安排。",
    "lessons": [
      "检查上线前的功能测试、权限与数据访问安排。",
      "保留软件测试和技术规范的记录。"
    ],
    "basis": "官方决定：Breach of the Protection Obligation by Carousell。日期为官方公布日。",
    "url": "https://www.pdpc.gov.sg/all-commissions-decisions/2024/02/breach-of-the-protection-obligation-by-carousell"
  },
  {
    "id": "th-ecommerce-2024",
    "country": "TH",
    "title": "大型电商公司数据外泄",
    "date": "2024-08-21",
    "industry": "电商平台",
    "violation": "安全与事件响应",
    "outcome": "行政罚款共 7,000,000 泰铢；要求改进安全措施、培训员工并报告整改。",
    "summary": "泰国数字经济与社会部通报某大型线上交易公司客户数据流入诈骗团伙。官方未公布企业名称。",
    "lessons": [
      "检查数据访问、权限控制和事件响应流程。",
      "核查人员职责、培训与当地通报安排。"
    ],
    "basis": "官方通报认定缺少适当安全措施、未任命数据保护官及迟报事件。日期为官方通报日。",
    "url": "https://mdes.go.th/news/detail/8539-ดีอี---สคส--คุมเข้มสั่งปรับข้อมูลรั่วไหลภาคเอกชน-จำนวน-7-ล้านบาท"
  },
  {
    "id": "ph-philhealth-2025",
    "country": "PH",
    "title": "PhilHealth 数据隐私行政罚款",
    "date": "2025-06-02",
    "industry": "医疗与公共机构",
    "violation": "数据隐私违法",
    "outcome": "行政罚款 15,000,000 菲律宾比索；NPC 表示行政罚款决定已终局并可执行。",
    "summary": "菲律宾 NPC 官方披露 PhilHealth 违反 2012 年数据隐私法并被处以行政罚款。该披露页未列逐项裁决事实。",
    "lessons": [
      "建立安全治理、责任人与审计记录。",
      "将调查通报与最终裁决分开阅读，勿推断未披露的认定。"
    ],
    "basis": "NPC 2025 年隐私意识周官方披露。日期为披露日，非裁决日；追究刑责建议不等同于已经刑事定罪。",
    "url": "https://privacy.gov.ph/paw-2025-npc-champions-global-privacy-in-borderless-digital-era/"
  }
];
export function referenceLines(code:CountryCode){const r=countryReference(code);return `${countryLabel(code)} · ${r.statusText}\n${r.law}\n${r.summary}\n官方出处：${r.url}\n资料核验日期：${r.updated}；专业复核待完成。`;}
export const FRAMEWORK_NOTE="公开资料整理供查阅，专业复核尚未完成。区域框架不能替代当地法律；状态待核验不代表当地没有适用规定。";
