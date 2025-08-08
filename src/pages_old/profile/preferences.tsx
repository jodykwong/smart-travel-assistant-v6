/**
 * 智游助手v6.2 - 用户偏好设置页面
 * 支持P0级用户偏好管理功能
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

interface UserPreferences {
  travelStyles: string[];
  budgetRange: string;
  accommodationType: string[];
  transportMode: string[];
  cuisinePreferences: string[];
  interests: string[];
  language: string;
  currency: string;
  timezone: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  marketingEmails: boolean;
  profileVisibility: 'public' | 'private' | 'friends';
  shareLocation: boolean;
  shareItinerary: boolean;
}

export default function PreferencesPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  useEffect(() => {
    loadPreferences();
  }, []);

  // 加载用户偏好
  const loadPreferences = async () => {
    try {
      const response = await fetch('/api/user/preferences', {
        credentials: 'include'
      });

      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      
      if (data.success) {
        setPreferences(data.preferences);
      } else {
        setError(data.error || '加载偏好失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // 更新偏好字段
  const updatePreference = (field: keyof UserPreferences, value: any) => {
    setPreferences(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  // 处理数组类型偏好的切换
  const toggleArrayPreference = (field: keyof UserPreferences, value: string) => {
    if (!preferences) return;
    
    const currentArray = preferences[field] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updatePreference(field, newArray);
  };

  // 保存偏好
  const savePreferences = async () => {
    if (!preferences) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preferences),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('偏好设置已保存');
        setPreferences(data.preferences);
      } else {
        setError(data.error || '保存失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    } finally {
      setIsSaving(false);
    }
  };

  // 重置偏好
  const resetPreferences = async () => {
    if (!confirm('确定要重置所有偏好设置吗？')) return;

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('偏好设置已重置');
        await loadPreferences(); // 重新加载默认偏好
      } else {
        setError(data.error || '重置失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center" data-testid="preferences-error">
          <h2 className="text-xl font-medium text-gray-900 mb-2">加载偏好失败</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadPreferences}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
            data-testid="retry-load-preferences"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>偏好设置 - 智游助手v6.2</title>
        <meta name="description" content="管理您的旅行偏好和账户设置" />
      </Head>

      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">偏好设置</h1>
            <p className="mt-2 text-gray-600">个性化您的智游助手体验</p>
          </div>

          <form className="bg-white shadow rounded-lg p-6" data-testid="preferences-form">
            {/* 旅行偏好 */}
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-4">旅行偏好</h2>
              
              {/* 旅行风格 */}
              <div className="mb-6" data-testid="travel-styles-section">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  旅行风格（可多选）
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['culture', 'food', 'nature', 'adventure', 'relaxation', 'shopping', 'nightlife', 'history'].map(style => (
                    <label key={style} className="flex items-center">
                      <input
                        type="checkbox"
                        name="travelStyles"
                        value={style}
                        checked={preferences.travelStyles.includes(style)}
                        onChange={(e) => toggleArrayPreference('travelStyles', style)}
                        className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 capitalize">{style}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* 预算范围 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  预算范围
                </label>
                <select
                  name="budgetRange"
                  value={preferences.budgetRange}
                  onChange={(e) => updatePreference('budgetRange', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="budget">经济型 (< ¥500/天)</option>
                  <option value="mid-range">中档型 (¥500-1500/天)</option>
                  <option value="luxury">豪华型 (> ¥1500/天)</option>
                  <option value="premium">顶级型 (> ¥3000/天)</option>
                </select>
              </div>

              {/* 住宿偏好 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  住宿偏好（可多选）
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['hotel', 'bnb', 'hostel', 'resort', 'apartment'].map(type => (
                    <label key={type} className="flex items-center">
                      <input
                        type="checkbox"
                        value={type}
                        checked={preferences.accommodationType.includes(type)}
                        onChange={(e) => toggleArrayPreference('accommodationType', type)}
                        className="mr-2 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* 系统偏好 */}
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-4">系统偏好</h2>
              
              {/* 语言设置 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  语言
                </label>
                <select
                  name="language"
                  value={preferences.language}
                  onChange={(e) => updatePreference('language', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="zh-CN">中文</option>
                  <option value="en-US">English</option>
                  <option value="ja-JP">日本語</option>
                  <option value="ko-KR">한국어</option>
                </select>
              </div>

              {/* 货币设置 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  货币
                </label>
                <select
                  name="currency"
                  value={preferences.currency}
                  onChange={(e) => updatePreference('currency', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="CNY">人民币 (CNY)</option>
                  <option value="USD">美元 (USD)</option>
                  <option value="EUR">欧元 (EUR)</option>
                  <option value="JPY">日元 (JPY)</option>
                </select>
              </div>
            </div>

            {/* 通知偏好 */}
            <div className="mb-8">
              <h2 className="text-xl font-medium text-gray-900 mb-4">通知偏好</h2>
              
              <div className="space-y-4">
                {[
                  { key: 'emailNotifications', label: '邮件通知' },
                  { key: 'smsNotifications', label: '短信通知' },
                  { key: 'pushNotifications', label: '推送通知' },
                  { key: 'marketingEmails', label: '营销邮件' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      name={key}
                      checked={preferences[key as keyof UserPreferences] as boolean}
                      onChange={(e) => updatePreference(key as keyof UserPreferences, e.target.checked)}
                      className="mr-3 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 错误和成功提示 */}
            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="text-sm text-red-700">{error}</div>
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-md bg-green-50 p-4" data-testid="preferences-saved">
                <div className="text-sm text-green-700">{success}</div>
              </div>
            )}

            {/* 操作按钮 */}
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={savePreferences}
                disabled={isSaving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="save-preferences"
              >
                {isSaving ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    保存中...
                  </div>
                ) : (
                  '保存偏好'
                )}
              </button>

              <button
                type="button"
                onClick={resetPreferences}
                className="bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md text-sm font-medium"
                data-testid="reset-preferences"
              >
                重置为默认
              </button>
            </div>
          </form>

          {/* 返回仪表板 */}
          <div className="mt-6 text-center">
            <a
              href="/dashboard"
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
            >
              ← 返回仪表板
            </a>
          </div>
        </div>
      </div>

      {/* 重置确认模态框 */}
      {showResetModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" data-testid="confirm-reset">
            <h3 className="text-lg font-medium text-gray-900 mb-4">确认重置</h3>
            <p className="text-gray-600 mb-6">
              确定要将所有偏好设置重置为默认值吗？此操作无法撤销。
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-md"
              >
                取消
              </button>
              <button
                onClick={handleConfirmReset}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md"
                data-testid="confirm-reset-yes"
              >
                确认重置
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // 重置相关状态和函数
  const [showResetModal, setShowResetModal] = useState(false);

  function resetPreferences() {
    setShowResetModal(true);
  }

  async function handleConfirmReset() {
    setShowResetModal(false);
    
    try {
      const response = await fetch('/api/user/preferences', {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('偏好设置已重置为默认值');
        await loadPreferences();
      } else {
        setError(data.error || '重置失败');
      }
    } catch (err) {
      setError('网络错误，请稍后重试');
    }
  }
}
