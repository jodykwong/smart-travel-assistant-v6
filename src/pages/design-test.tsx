/**
 * 智游助手v6.5 设计系统测试页面
 * 用于验证Apple HIG和Material Design规范的实现
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { Button, PrimaryButton, SecondaryButton, OutlineButton, GhostButton, DangerButton } from '@/components/ui/Button';
import { Input, DateInput, SearchInput } from '@/components/ui/Input';
import { Card, CardHeader, CardContent, CardActions, ItineraryCard } from '@/components/ui/Card';
import { Progress, StepProgress } from '@/components/ui/Progress';

export default function DesignTest() {
  const [inputValue, setInputValue] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const [progressValue, setProgressValue] = useState(65);
  const [loading, setLoading] = useState(false);

  const handleLoadingTest = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 3000);
  };

  const sampleSteps = [
    { label: '目的地选择', description: '选择您的旅行目的地', completed: true },
    { label: '时间安排', description: '确定出行日期', completed: true },
    { label: '偏好设置', description: '设置旅行偏好', active: true },
    { label: '生成规划', description: '生成个性化行程', completed: false },
  ];

  const sampleActivities = [
    {
      time: '09:00-12:00',
      title: '西湖晨游',
      description: '漫步苏堤白堤，感受湖光山色\n• 参观断桥残雪，聆听白娘子传说\n💡 建议：清晨游览人少景美，适合拍照',
      icon: '🌅',
      cost: 0,
      duration: '约3小时',
    },
    {
      time: '14:00-17:00',
      title: '灵隐寺参观',
      description: '探访千年古刹，感受佛教文化\n• 参观飞来峰石窟造像\n💰 门票：45元/人',
      icon: '🏛️',
      cost: 45,
      duration: '约3小时',
    },
  ];

  return (
    <>
      <Head>
        <title>设计系统测试 - 智游助手v6.5</title>
        <meta name="description" content="Apple HIG和Material Design规范测试页面" />
      </Head>

      <div className="min-h-screen bg-md-background text-md-on-background">
        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-md-display-medium font-bold text-md-on-background mb-2">
              智游助手v6.5 设计系统测试
            </h1>
            <p className="text-md-body-large text-md-on-surface-variant">
              基于Apple HIG和Material Design规范的组件展示
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* 按钮组件测试 */}
            <Card variant="elevated">
              <CardHeader title="按钮组件" subtitle="支持多种变体和平台自适应" />
              <CardContent>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <PrimaryButton size="sm">小按钮</PrimaryButton>
                    <PrimaryButton size="md">中按钮</PrimaryButton>
                    <PrimaryButton size="lg">大按钮</PrimaryButton>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <PrimaryButton>主要按钮</PrimaryButton>
                    <SecondaryButton>次要按钮</SecondaryButton>
                    <OutlineButton>边框按钮</OutlineButton>
                    <GhostButton>幽灵按钮</GhostButton>
                    <DangerButton>危险按钮</DangerButton>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <PrimaryButton 
                      icon={<i className="fas fa-download"></i>}
                      iconPosition="left"
                    >
                      带图标
                    </PrimaryButton>
                    <PrimaryButton 
                      loading={loading}
                      onClick={handleLoadingTest}
                    >
                      {loading ? '加载中...' : '加载测试'}
                    </PrimaryButton>
                    <PrimaryButton disabled>禁用状态</PrimaryButton>
                  </div>

                  <PrimaryButton fullWidth>全宽按钮</PrimaryButton>
                </div>
              </CardContent>
            </Card>

            {/* 输入组件测试 */}
            <Card variant="elevated">
              <CardHeader title="输入组件" subtitle="支持多种输入类型和验证" />
              <CardContent>
                <div className="space-y-4">
                  <Input
                    label="基础输入框"
                    placeholder="请输入内容"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    helperText="这是帮助文本"
                  />

                  <Input
                    label="必填输入框"
                    placeholder="请输入必填内容"
                    required
                    error={inputValue === '' ? '此字段为必填项' : ''}
                    startIcon={<i className="fas fa-user"></i>}
                  />

                  <DateInput
                    label="日期选择"
                    value={dateValue}
                    onChange={setDateValue}
                    helperText="选择您的出行日期"
                  />

                  <SearchInput
                    label="搜索输入"
                    placeholder="搜索目的地..."
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onSearch={(value) => alert(`搜索: ${value}`)}
                    onClear={() => setSearchValue('')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 进度组件测试 */}
            <Card variant="elevated">
              <CardHeader title="进度组件" subtitle="线性和圆形进度指示器" />
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-md-title-medium mb-3">线性进度条</h4>
                    <div className="space-y-3">
                      <Progress 
                        variant="linear" 
                        value={progressValue} 
                        showLabel 
                        label="任务进度"
                      />
                      <Progress 
                        variant="linear" 
                        indeterminate 
                        showLabel 
                        label="加载中"
                        color="secondary"
                      />
                    </div>
                  </div>

                  <div>
                    <h4 className="text-md-title-medium mb-3">圆形进度条</h4>
                    <div className="flex gap-4">
                      <Progress 
                        variant="circular" 
                        value={progressValue} 
                        showLabel 
                        size="sm"
                      />
                      <Progress 
                        variant="circular" 
                        value={progressValue} 
                        showLabel 
                        size="md"
                        color="success"
                      />
                      <Progress 
                        variant="circular" 
                        indeterminate 
                        size="lg"
                        color="warning"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => setProgressValue(Math.max(0, progressValue - 10))}
                    >
                      -10%
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={() => setProgressValue(Math.min(100, progressValue + 10))}
                    >
                      +10%
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 步骤进度测试 */}
            <Card variant="elevated">
              <CardHeader title="步骤进度" subtitle="多步骤流程指示器" />
              <CardContent>
                <StepProgress steps={sampleSteps} orientation="vertical" />
              </CardContent>
            </Card>

            {/* 行程卡片测试 */}
            <div className="lg:col-span-2">
              <Card variant="elevated">
                <CardHeader title="行程卡片组件" subtitle="专用于旅行行程展示" />
                <CardContent>
                  <ItineraryCard
                    day={1}
                    date="8月11日周日"
                    weather="晴朗"
                    temperature="26°C"
                    location="杭州"
                    cost={120}
                    activities={sampleActivities}
                    interactive
                  />
                </CardContent>
              </Card>
            </div>

            {/* 卡片变体测试 */}
            <div className="lg:col-span-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card variant="elevated">
                  <CardHeader title="Elevated卡片" />
                  <CardContent>
                    <p className="text-md-body-medium text-md-on-surface-variant">
                      使用阴影效果的卡片
                    </p>
                  </CardContent>
                  <CardActions>
                    <GhostButton size="sm">操作</GhostButton>
                  </CardActions>
                </Card>

                <Card variant="filled">
                  <CardHeader title="Filled卡片" />
                  <CardContent>
                    <p className="text-md-body-medium text-md-on-surface-variant">
                      使用填充色的卡片
                    </p>
                  </CardContent>
                  <CardActions>
                    <GhostButton size="sm">操作</GhostButton>
                  </CardActions>
                </Card>

                <Card variant="outlined">
                  <CardHeader title="Outlined卡片" />
                  <CardContent>
                    <p className="text-md-body-medium text-md-on-surface-variant">
                      使用边框的卡片
                    </p>
                  </CardContent>
                  <CardActions>
                    <GhostButton size="sm">操作</GhostButton>
                  </CardActions>
                </Card>
              </div>
            </div>
          </div>

          {/* 深色模式切换提示 */}
          <Card variant="outlined" className="mt-8">
            <CardContent>
              <div className="text-center">
                <h3 className="text-md-title-large mb-2">深色模式测试</h3>
                <p className="text-md-body-medium text-md-on-surface-variant mb-4">
                  请在系统设置中切换深色模式，或在浏览器开发者工具中模拟深色模式来测试组件的深色主题效果。
                </p>
                <code className="bg-md-surface-variant px-2 py-1 rounded text-sm">
                  prefers-color-scheme: dark
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
