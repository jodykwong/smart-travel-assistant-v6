/**
 * 简单测试页面 - 验证组件是否正常工作
 */

import React from 'react';
import Head from 'next/head';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

export default function SimpleTest() {
  return (
    <>
      <Head>
        <title>简单测试 - 智游助手v6.5</title>
      </Head>

      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">组件测试页面</h1>
          
          {/* 按钮测试 */}
          <Card variant="elevated" className="mb-8">
            <CardHeader title="按钮组件测试" />
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <PrimaryButton>主要按钮</PrimaryButton>
                  <OutlineButton>边框按钮</OutlineButton>
                </div>
                <div className="flex gap-4">
                  <PrimaryButton loading>加载中...</PrimaryButton>
                  <PrimaryButton disabled>禁用按钮</PrimaryButton>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 卡片测试 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card variant="elevated">
              <CardHeader title="Elevated卡片" />
              <CardContent>
                <p className="text-gray-600">这是一个使用阴影的卡片</p>
              </CardContent>
            </Card>

            <Card variant="filled">
              <CardHeader title="Filled卡片" />
              <CardContent>
                <p className="text-gray-600">这是一个使用填充色的卡片</p>
              </CardContent>
            </Card>

            <Card variant="outlined">
              <CardHeader title="Outlined卡片" />
              <CardContent>
                <p className="text-gray-600">这是一个使用边框的卡片</p>
              </CardContent>
            </Card>
          </div>

          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-lg font-semibold text-green-800 mb-2">✅ 测试成功</h2>
            <p className="text-green-700">如果您能看到这个页面，说明组件系统正常工作！</p>
          </div>
        </div>
      </div>
    </>
  );
}
