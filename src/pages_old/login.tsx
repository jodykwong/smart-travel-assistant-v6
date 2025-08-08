/**
 * 智游助手v6.2 - 用户登录页面
 * 支持P0级用户认证系统功能
 */

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface DeviceInfo {
  type: string;
  name: string;
  userAgent: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<LoginForm>({
    email: '',
    password: '',
    rememberMe: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lockInfo, setLockInfo] = useState<any>(null);

  // 处理表单输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // 获取设备信息
  const getDeviceInfo = (): DeviceInfo => {
    return {
      type: 'web',
      name: 'Browser',
      userAgent: navigator.userAgent
    };
  };

  // 处理表单提交
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setLockInfo(null);

    try {
      const deviceInfo = getDeviceInfo();

      const response = await fetch('/api/user/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          deviceInfo
        }),
      });

      const data = await response.json();

      if (data.success) {
        // 登录成功，跳转到仪表板
        router.push('/dashboard');
      } else {
        setError(data.error || '登录失败');
        
        // 处理账户锁定信息
        if (data.lockInfo) {
          setLockInfo(data.lockInfo);
        }
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>用户登录 - 智游助手v6.2</title>
        <meta name="description" content="登录智游助手账户，继续您的智能旅行规划" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              登录您的账户
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              还没有账户？{' '}
              <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                免费注册
              </a>
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit} data-testid="login-form">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  邮箱地址
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="请输入邮箱地址"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  密码
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="请输入密码"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="rememberMe" className="ml-2 block text-sm text-gray-900">
                    记住我
                  </label>
                </div>

                <div className="text-sm">
                  <a href="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                    忘记密码？
                  </a>
                </div>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="rounded-md bg-red-50 p-4" data-testid="login-error">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {/* 账户锁定提示 */}
            {lockInfo && (
              <div className="rounded-md bg-yellow-50 p-4" data-testid="account-locked">
                <div className="text-sm text-yellow-700">
                  账户已被锁定，请在 {new Date(lockInfo.lockedUntil).toLocaleString()} 后重试
                </div>
              </div>
            )}

            {/* 提交按钮 */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    登录中...
                  </div>
                ) : (
                  '登录'
                )}
              </button>
            </div>

            {/* 社交登录选项 */}
            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-50 text-gray-500">或使用以下方式登录</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  data-testid="wechat-login"
                >
                  <span>微信登录</span>
                </button>

                <button
                  type="button"
                  className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                  data-testid="alipay-login"
                >
                  <span>支付宝登录</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
