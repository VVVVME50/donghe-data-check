import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title:"东合智检 | 东盟数据合规风险自查",description:"面向中国出海东盟小微企业的数据合规风险自查工具，覆盖新加坡、马来西亚、泰国和印度尼西亚。",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg"}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
