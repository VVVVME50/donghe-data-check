import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"东合智检 | 出海数据合规工具箱",description:"面向出海东盟企业的数据合规工具箱：风险自查、文档生成、处罚案例、法规参考、多国比对与本机报告记录。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
