/**
 * 智游助手v6.2 - 支付功能管理页面
 * 管理员专用页面，用于控制支付功能的启用/禁用
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PaymentFeatureManager from '@/components/admin/PaymentFeatureManager';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default function PaymentFeaturesPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // 检查管理员权限
    checkAdminPermission();
  }, []);

  const checkAdminPermission = async () => {
    try {
      setIsLoading(true);
      
      // 这里应该调用实际的权限检查API
      // 当前为演示目的，使用简单的检查
      const isDevMode = process.env.NODE_ENV === 'development';
      const hasAdminToken = localStorage.getItem('admin_token') === 'admin_demo_token';
      
      if (isDevMode || hasAdminToken) {
        setIsAdmin(true);
      } else {
        setError('访问被拒绝：需要管理员权限');
      }
    } catch (err) {
      setError('权限检查失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    // 演示用的简单登录
    if (process.env.NODE_ENV === 'development') {
      localStorage.setItem('admin_token', 'admin_demo_token');
      setIsAdmin(true);
      setError('');
    } else {
      router.push('/admin/login');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setIsAdmin(false);
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">检查权限中...</p>
        </div>
      </div>
    );
  }

  if (error && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="max-w-md w-full mx-4">
          <div className="text-center space-y-4">
            <div className="text-red-500 text-6xl">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900">访问受限</h1>
            <p className="text-gray-600">{error}</p>
            
            {process.env.NODE_ENV === 'development' && (
              <div className="space-y-3">
                <p className="text-sm text-blue-600">开发环境：点击下方按钮获取演示权限</p>
                <Button onClick={handleLogin} variant="primary">
                  获取管理员权限 (演示)
                </Button>
              </div>
            )}
            
            <Button onClick={() => router.push('/')} variant="outline">
              返回首页
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">支付功能管理</h1>
              <p className="text-sm text-gray-600">智游助手v6.2 - 管理员控制台</p>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                👤 管理员模式
              </span>
              <Button onClick={handleLogout} variant="outline" size="sm">
                退出登录
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* 页面说明 */}
          <Card>
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">功能说明</h2>
              <div className="text-sm text-gray-600 space-y-2">
                <p>• 此页面用于管理智游助手的支付功能特性开关</p>
                <p>• 支持动态启用/禁用各种支付方式，无需修改代码</p>
                <p>• 所有修改都会实时生效（开发环境）或在下次重启时生效（生产环境）</p>
                <p>• 请谨慎操作，确保在合适的时机启用支付功能</p>
              </div>
            </div>
          </Card>

          {/* 支付功能管理组件 */}
          <PaymentFeatureManager isAdmin={isAdmin} />

          {/* 快速操作 */}
          <Card title="快速操作">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => router.push('/admin')}
                variant="outline"
                className="w-full"
              >
                返回管理后台
              </Button>
              <Button
                onClick={() => router.push('/admin/logs')}
                variant="outline"
                className="w-full"
              >
                查看系统日志
              </Button>
              <Button
                onClick={() => router.push('/admin/settings')}
                variant="outline"
                className="w-full"
              >
                系统设置
              </Button>
            </div>
          </Card>

          {/* 环境信息 */}
          <Card title="环境信息">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">运行环境</p>
                <p className="font-mono">{process.env.NODE_ENV}</p>
              </div>
              <div>
                <p className="text-gray-600">版本</p>
                <p className="font-mono">v6.2.0</p>
              </div>
              <div>
                <p className="text-gray-600">构建时间</p>
                <p className="font-mono">{new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-gray-600">权限级别</p>
                <p className="font-mono text-green-600">管理员</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
