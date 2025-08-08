/**
 * 智游助手v6.2 - 根布局组件
 */

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '智游助手v6.2',
  description: 'AI驱动的智能旅游规划助手',
  keywords: ['旅游', '规划', 'AI', '智能助手'],
  authors: [{ name: '智游助手团队' }],
  viewport: 'width=device-width, initial-scale=1',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="font-sans">
        <div id="root">
          {children}
        </div>
      </body>
    </html>
  );
}
