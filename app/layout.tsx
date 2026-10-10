import type { Metadata } from "next";
import "./globals.css";
import {env} from "cloudflare:workers";

export async function generateMetadata():Promise<Metadata>{
let company="教育机构";try{const row=await env.DB?.prepare("SELECT data FROM workspaces WHERE id=?").bind("enterprise").first<{data:string}>();if(row)company=JSON.parse(row.data).company||company;}catch{}
return {
  title: company+" · 家教管理系统",
  description: "小初高一对一 · 企业教务工作台",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
