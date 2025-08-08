/**
 * 智游助手v6.2 - 用户仪表板页面
 * 用户登录后的主要界面
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface UserInfo {
  userId: string;
  email: string;
  displayName: string;
  role: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 检查用户认证状态
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data.user);
      } else {
        // 未认证，跳转到登录页面
        router.push('/login');
      }
    } catch (error) {
      console.error('认证检查失败:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/user/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      // 清理本地状态
      setUserInfo(null);
      // 跳转到首页
      router.push('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>仪表板 - 智游助手v6.2</title>
        <meta name="description" content="智游助手用户仪表板" />
      </Head>

      <div className="min-h-screen bg-gray-50">
        {/* 导航栏 */}
        <nav className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              <div className="flex items-center">
                <h1 className="text-xl font-semibold text-gray-900">智游助手v6.2</h1>
              </div>
              
              <div className="flex items-center space-x-4">
                {userInfo && (
                  <>
                    <div className="text-sm text-gray-700" data-testid="user-info">
                      <span data-testid="user-display-name">{userInfo.displayName}</span>
                      <span className="text-gray-500 ml-2" data-testid="user-email">
                        ({userInfo.email})
                      </span>
                    </div>
                    <div className="text-xs text-green-600" data-testid="login-status">
                      已登录
                    </div>
                    <button
                      onClick={handleLogout}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                      data-testid="logout-button"
                    >
                      登出
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* 主要内容 */}
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* 快速操作卡片 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">🗺️</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          旅游规划
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          创建新的旅行计划
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href="/travel-planning"
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block text-center"
                    >
                      开始规划
                    </a>
                  </div>
                </div>
              </div>

              {/* 用户偏好卡片 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">⚙️</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          偏好设置
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          管理您的旅行偏好
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href="/profile/preferences"
                      className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block text-center"
                    >
                      设置偏好
                    </a>
                  </div>
                </div>
              </div>

              {/* 支付管理卡片 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">💳</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          支付管理
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          查看订单和支付记录
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href="/payment"
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block text-center"
                    >
                      支付管理
                    </a>
                  </div>
                </div>
              </div>

              {/* 我的行程卡片 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">📋</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          我的行程
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          查看保存的旅行计划
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href="/my-itineraries"
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block text-center"
                    >
                      查看行程
                    </a>
                  </div>
                </div>
              </div>

              {/* 账户设置卡片 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-gray-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">👤</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          账户设置
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          管理您的账户信息
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href="/profile"
                      className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block text-center"
                    >
                      账户设置
                    </a>
                  </div>
                </div>
              </div>

              {/* 帮助支持卡片 */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm">❓</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          帮助支持
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          获取使用帮助和支持
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-4">
                    <a
                      href="/help"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium inline-block text-center"
                    >
                      获取帮助
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* 欢迎信息 */}
            {userInfo && (
              <div className="mt-8 bg-white shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 mb-4">
                  欢迎回来，{userInfo.displayName}！
                </h2>
                <p className="text-gray-600">
                  您的智游助手v6.2账户已准备就绪。开始创建您的下一次完美旅行吧！
                </p>
                <div className="mt-4 flex space-x-4">
                  <a
                    href="/travel-planning"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md text-sm font-medium"
                  >
                    立即开始规划
                  </a>
                  <a
                    href="/profile/preferences"
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-md text-sm font-medium"
                  >
                    完善偏好设置
                  </a>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
