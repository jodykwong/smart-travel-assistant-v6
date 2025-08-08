/**
 * 智游助手v6.2 - 首页
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* 导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-blue-600">智游助手</h1>
              <span className="ml-2 text-sm text-gray-500">v6.2</span>
            </div>
            <div className="flex space-x-4">
              <Link href="/admin/payment-features">
                <Button variant="outline" size="sm">
                  管理后台
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI驱动的智能旅游规划助手
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            基于人工智能技术，为您量身定制完美的旅游计划。
            支持个性化推荐、实时路线规划和智能预算管理。
          </p>
        </div>

        {/* 功能特性 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <Card className="text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI智能规划</h3>
            <p className="text-gray-600">
              基于深度学习算法，分析您的偏好和需求，
              生成个性化的旅游方案。
            </p>
          </Card>

          <Card className="text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h3 className="text-xl font-semibold mb-2">实时路线优化</h3>
            <p className="text-gray-600">
              集成高德地图服务，提供实时交通信息，
              优化您的出行路线。
            </p>
          </Card>

          <Card className="text-center">
            <div className="text-4xl mb-4">💰</div>
            <h3 className="text-xl font-semibold mb-2">智能预算管理</h3>
            <p className="text-gray-600">
              根据您的预算范围，推荐最优的住宿、
              餐饮和景点组合。
            </p>
          </Card>
        </div>

        {/* 系统状态 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card title="系统状态">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">核心功能</span>
                <span className="text-green-600 font-semibold">✅ 正常</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">AI服务</span>
                <span className="text-green-600 font-semibold">✅ 正常</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">地图服务</span>
                <span className="text-green-600 font-semibold">✅ 正常</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">支付功能</span>
                <span className="text-orange-600 font-semibold">⚠️ 维护中</span>
              </div>
            </div>
          </Card>

          <Card title="快速开始">
            <div className="space-y-4">
              <p className="text-gray-600">
                开始您的智能旅游规划之旅：
              </p>
              <div className="space-y-2">
                <Button className="w-full" variant="primary">
                  开始规划旅程
                </Button>
                <Button className="w-full" variant="outline">
                  查看示例规划
                </Button>
                <Link href="/admin/payment-features">
                  <Button className="w-full" variant="outline">
                    管理员控制台
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* 版本信息 */}
        <div className="mt-12 text-center text-sm text-gray-500">
          <p>智游助手 v6.2.0 | 构建时间: {new Date().toLocaleDateString()}</p>
          <p>安全修复版本 | 特性开关系统已启用</p>
        </div>
      </div>
    </div>
  );
}
