/**
 * 智游助手v6.5 - 错误恢复页面
 * 帮助用户诊断和恢复失败的规划会话
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { PrimaryButton, OutlineButton, GhostButton } from '@/components/ui/Button';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface ApiKeyStatus {
  deepseek: { configured: boolean; placeholder: boolean };
  amap: { configured: boolean; placeholder: boolean };
  siliconflow: { configured: boolean; placeholder: boolean };
}

interface SystemStatus {
  status: ApiKeyStatus;
  guide: string;
}

export default function ErrorRecovery() {
  const router = useRouter();
  const { sessionId, error } = router.query;
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCleaningSession, setIsCleaningSession] = useState(false);

  // 检查系统状态
  useEffect(() => {
    checkSystemStatus();
  }, []);

  const checkSystemStatus = async () => {
    try {
      const response = await fetch('/api/system/api-keys-status');
      const data = await response.json();
      
      if (data.success) {
        setSystemStatus(data.data);
      }
    } catch (error) {
      console.error('检查系统状态失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cleanupSession = async () => {
    if (!sessionId) return;

    setIsCleaningSession(true);
    try {
      const response = await fetch('/api/system/cleanup-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert('会话已清理，您可以重新开始规划');
        router.push('/planning');
      } else {
        alert('清理会话失败，请稍后重试');
      }
    } catch (error) {
      console.error('清理会话失败:', error);
      alert('清理会话失败，请稍后重试');
    } finally {
      setIsCleaningSession(false);
    }
  };

  const getErrorMessage = () => {
    if (error) return decodeURIComponent(error as string);
    return '规划过程中发生了未知错误';
  };

  const getApiKeyIssues = () => {
    if (!systemStatus) return [];
    
    const issues = [];
    if (!systemStatus.status.deepseek.configured) {
      issues.push('DeepSeek API密钥未配置');
    }
    if (!systemStatus.status.amap.configured) {
      issues.push('高德地图API密钥未配置');
    }
    if (!systemStatus.status.siliconflow.configured) {
      issues.push('SiliconFlow API密钥未配置');
    }
    return issues;
  };

  if (isLoading) {
    return (
      <>
        <Head>
          <title>系统诊断中 - 智游助手v6.5</title>
        </Head>
        <div className="min-h-screen bg-md-background flex items-center justify-center">
          <Card variant="elevated">
            <CardContent>
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-md-primary mx-auto mb-4"></div>
                <h3 className="text-md-headline-small font-semibold text-md-on-surface mb-2">正在诊断系统状态</h3>
                <p className="text-md-body-medium text-md-on-surface-variant">请稍候...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  const apiKeyIssues = getApiKeyIssues();
  const hasApiKeyIssues = apiKeyIssues.length > 0;

  return (
    <>
      <Head>
        <title>错误恢复 - 智游助手v6.5</title>
        <meta name="description" content="诊断和修复规划过程中的错误" />
      </Head>

      <div className="min-h-screen bg-md-background">
        {/* 顶部导航栏 */}
        <nav className="bg-md-surface border-b border-md-outline">
          <div className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <OutlineButton
                  onClick={() => router.push('/planning')}
                  icon={<i className="fas fa-arrow-left"></i>}
                  iconPosition="left"
                >
                  返回规划
                </OutlineButton>
                <div>
                  <h1 className="text-md-headline-medium font-bold text-md-on-surface">
                    错误恢复
                  </h1>
                  <p className="text-md-body-medium text-md-on-surface-variant">
                    诊断和修复规划过程中的问题
                  </p>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* 主要内容区域 */}
        <div className="max-w-4xl mx-auto px-6 py-8">
          <div className="space-y-6">
            {/* 错误信息卡片 */}
            <Card variant="elevated">
              <CardHeader 
                title="错误详情" 
                icon={<i className="fas fa-exclamation-triangle text-md-error"></i>}
              />
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-md-error-container rounded-lg p-4">
                    <p className="text-md-body-medium text-md-on-error-container">
                      <strong>错误信息:</strong> {getErrorMessage()}
                    </p>
                    {sessionId && (
                      <p className="text-md-body-small text-md-on-error-container mt-2">
                        <strong>会话ID:</strong> {sessionId}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* API密钥状态检查 */}
            {hasApiKeyIssues && (
              <Card variant="elevated">
                <CardHeader 
                  title="API密钥配置问题" 
                  icon={<i className="fas fa-key text-md-warning"></i>}
                />
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-md-warning-container rounded-lg p-4">
                      <p className="text-md-body-medium text-md-on-warning-container mb-3">
                        <strong>发现以下API密钥配置问题:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 text-md-body-small text-md-on-warning-container">
                        {apiKeyIssues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="bg-md-surface-variant rounded-lg p-4">
                      <h4 className="font-semibold text-md-on-surface mb-2">解决方案:</h4>
                      <ol className="list-decimal list-inside space-y-2 text-md-body-small text-md-on-surface-variant">
                        <li>在项目根目录找到 <code className="bg-md-surface px-1 rounded">.env.local</code> 文件</li>
                        <li>将占位符替换为真实的API密钥</li>
                        <li>重启开发服务器</li>
                        <li>重新开始规划</li>
                      </ol>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 系统状态检查 */}
            <Card variant="elevated">
              <CardHeader 
                title="系统状态" 
                icon={<i className="fas fa-heartbeat text-md-primary"></i>}
              />
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                      systemStatus?.status.deepseek.configured ? 'bg-md-primary text-md-on-primary' : 'bg-md-error text-md-on-error'
                    }`}>
                      <i className="fas fa-brain"></i>
                    </div>
                    <p className="text-md-body-small font-medium">DeepSeek AI</p>
                    <p className={`text-md-body-small ${
                      systemStatus?.status.deepseek.configured ? 'text-md-primary' : 'text-md-error'
                    }`}>
                      {systemStatus?.status.deepseek.configured ? '已配置' : '未配置'}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                      systemStatus?.status.amap.configured ? 'bg-md-primary text-md-on-primary' : 'bg-md-error text-md-on-error'
                    }`}>
                      <i className="fas fa-map"></i>
                    </div>
                    <p className="text-md-body-small font-medium">高德地图</p>
                    <p className={`text-md-body-small ${
                      systemStatus?.status.amap.configured ? 'text-md-primary' : 'text-md-error'
                    }`}>
                      {systemStatus?.status.amap.configured ? '已配置' : '未配置'}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                      systemStatus?.status.siliconflow.configured ? 'bg-md-primary text-md-on-primary' : 'bg-md-error text-md-on-error'
                    }`}>
                      <i className="fas fa-microchip"></i>
                    </div>
                    <p className="text-md-body-small font-medium">SiliconFlow</p>
                    <p className={`text-md-body-small ${
                      systemStatus?.status.siliconflow.configured ? 'text-md-primary' : 'text-md-error'
                    }`}>
                      {systemStatus?.status.siliconflow.configured ? '已配置' : '未配置'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 操作按钮 */}
            <Card variant="elevated">
              <CardHeader title="恢复操作" />
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {sessionId && (
                    <PrimaryButton
                      onClick={cleanupSession}
                      disabled={isCleaningSession}
                      icon={<i className="fas fa-broom"></i>}
                      iconPosition="left"
                    >
                      {isCleaningSession ? '清理中...' : '清理失败会话'}
                    </PrimaryButton>
                  )}
                  
                  <OutlineButton
                    onClick={() => router.push('/planning')}
                    icon={<i className="fas fa-redo"></i>}
                    iconPosition="left"
                  >
                    重新开始规划
                  </OutlineButton>

                  <GhostButton
                    onClick={() => window.location.reload()}
                    icon={<i className="fas fa-sync"></i>}
                    iconPosition="left"
                  >
                    刷新页面
                  </GhostButton>

                  <GhostButton
                    onClick={() => window.open('/api/health', '_blank')}
                    icon={<i className="fas fa-stethoscope"></i>}
                    iconPosition="left"
                  >
                    系统健康检查
                  </GhostButton>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
