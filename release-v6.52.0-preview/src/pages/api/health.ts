import { NextApiRequest, NextApiResponse } from 'next';

/**
 * 健康检查API端点
 * 用于验证应用状态和基础功能
 */

interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    database: 'connected' | 'disconnected' | 'unknown';
    apis: {
      deepseek: 'configured' | 'not_configured';
      amap: 'configured' | 'not_configured';
      siliconflow: 'configured' | 'not_configured';
    };
  };
  performance: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  checks: Array<{
    name: string;
    status: 'pass' | 'fail';
    message?: string;
  }>;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthCheckResponse>
) {
  const startTime = Date.now();

  try {
    // 基础信息
    const timestamp = new Date().toISOString();
    const version = process.env.APP_VERSION || '6.0.0';
    const environment = process.env.NODE_ENV || 'development';

    // 检查服务状态
    const checks: Array<{ name: string; status: 'pass' | 'fail'; message?: string }> = [];

    // 1. 环境变量检查
    const requiredEnvVars = [
      'DEEPSEEK_API_KEY',
      'AMAP_MCP_API_KEY',
      'NEXT_PUBLIC_APP_URL'
    ];

    let envVarsOk = true;
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        checks.push({
          name: `Environment Variable: ${envVar}`,
          status: 'fail',
          message: 'Not configured'
        });
        envVarsOk = false;
      } else {
        checks.push({
          name: `Environment Variable: ${envVar}`,
          status: 'pass'
        });
      }
    }

    // 2. API配置检查（检测占位符）
    const deepseekKey = process.env.DEEPSEEK_API_KEY;
    const amapKey = process.env.AMAP_MCP_API_KEY;
    const siliconflowKey = process.env.SILICONFLOW_API_KEY;

    const apiServices = {
      deepseek: (deepseekKey && deepseekKey !== 'sk-your-deepseek-api-key-here') ? 'configured' as const : 'not_configured' as const,
      amap: (amapKey && amapKey !== 'your-amap-api-key-here') ? 'configured' as const : 'not_configured' as const,
      siliconflow: (siliconflowKey && siliconflowKey !== 'your-siliconflow-api-key-here') ? 'configured' as const : 'not_configured' as const
    };

    // 添加API密钥占位符检查
    if (deepseekKey === 'sk-your-deepseek-api-key-here') {
      checks.push({
        name: 'DeepSeek API Key',
        status: 'fail',
        message: 'Using placeholder value - please configure real API key'
      });
    }

    if (amapKey === 'your-amap-api-key-here') {
      checks.push({
        name: 'Amap API Key',
        status: 'fail',
        message: 'Using placeholder value - please configure real API key'
      });
    }

    if (siliconflowKey === 'your-siliconflow-api-key-here') {
      checks.push({
        name: 'SiliconFlow API Key',
        status: 'fail',
        message: 'Using placeholder value - please configure real API key'
      });
    }

    // 3. 内存使用检查
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const memoryPercentage = (usedMemory / totalMemory) * 100;

    checks.push({
      name: 'Memory Usage',
      status: memoryPercentage < 80 ? 'pass' : 'fail',
      message: `${memoryPercentage.toFixed(1)}% used`
    });

    // 4. 响应时间检查
    const responseTime = Date.now() - startTime;
    checks.push({
      name: 'Response Time',
      status: responseTime < 1000 ? 'pass' : 'fail',
      message: `${responseTime}ms`
    });

    // 5. 基础功能检查
    try {
      // 检查JSON处理
      JSON.stringify({ test: true });
      checks.push({
        name: 'JSON Processing',
        status: 'pass'
      });
    } catch (error) {
      checks.push({
        name: 'JSON Processing',
        status: 'fail',
        message: 'JSON processing failed'
      });
    }

    // 6. 文件系统检查
    try {
      const fs = require('fs');
      const packageJsonExists = fs.existsSync('./package.json');
      checks.push({
        name: 'File System Access',
        status: packageJsonExists ? 'pass' : 'fail',
        message: packageJsonExists ? 'package.json accessible' : 'Cannot access package.json'
      });
    } catch (error) {
      checks.push({
        name: 'File System Access',
        status: 'fail',
        message: 'File system access failed'
      });
    }

    // 确定整体状态
    const failedChecks = checks.filter(check => check.status === 'fail');
    const overallStatus = failedChecks.length === 0 ? 'healthy' : 'unhealthy';

    // 构建响应
    const healthResponse: HealthCheckResponse = {
      status: overallStatus,
      timestamp,
      version,
      environment,
      services: {
        database: 'unknown', // 暂时设为unknown，实际项目中应检查数据库连接
        apis: apiServices
      },
      performance: {
        uptime: process.uptime(),
        memory: {
          used: Math.round(usedMemory / 1024 / 1024), // MB
          total: Math.round(totalMemory / 1024 / 1024), // MB
          percentage: Math.round(memoryPercentage * 100) / 100
        }
      },
      checks
    };

    // 设置响应状态码
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    // 设置响应头
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('X-Health-Check-Time', responseTime.toString());

    res.status(statusCode).json(healthResponse);

  } catch (error) {
    // 错误处理
    const errorResponse: HealthCheckResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '6.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'unknown',
        apis: {
          deepseek: 'unknown',
          amap: 'unknown',
          siliconflow: 'unknown'
        }
      },
      performance: {
        uptime: process.uptime(),
        memory: {
          used: 0,
          total: 0,
          percentage: 0
        }
      },
      checks: [
        {
          name: 'Health Check Execution',
          status: 'fail',
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      ]
    };

    res.status(500).json(errorResponse);
  }
}
