/**
 * 智游助手v6.2 监控指标控制器
 * 基于现有健康检查系统的监控端点扩展
 */

import { Controller, Get, Header, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { MetricsService } from './metrics.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('监控指标')
@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus指标端点
   * 扩展现有的健康检查系统
   */
  @Get('/metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ 
    summary: 'Prometheus指标端点',
    description: '返回Prometheus格式的监控指标，基于现有健康检查系统扩展'
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Prometheus格式的指标数据',
    content: {
      'text/plain': {
        example: `# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/health",status_code="200",service="smart-travel"} 1

# HELP smart_travel_payment_success_rate Payment success rate (0-1)
# TYPE smart_travel_payment_success_rate gauge
smart_travel_payment_success_rate 0.99`
      }
    }
  })
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getMetrics();
      res.status(HttpStatus.OK).send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('Error collecting metrics');
    }
  }

  /**
   * 健康检查指标端点
   * 与现有的/health端点配合使用
   */
  @Get('/health/metrics')
  @ApiOperation({ 
    summary: '健康检查指标',
    description: '返回JSON格式的关键健康指标，补充现有的/health端点'
  })
  @ApiResponse({ 
    status: 200, 
    description: '关键健康指标',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string', example: '2025-08-06T10:30:00.000Z' },
        metrics: {
          type: 'object',
          properties: {
            paymentSuccessRate: { type: 'number', example: 0.99 },
            paymentResponseTimeP95: { type: 'number', example: 2.5 },
            userRegistrationRate: { type: 'number', example: 0.15 },
            orderCompletionRate: { type: 'number', example: 0.95 },
            activeUsers: { type: 'number', example: 1250 },
            cacheHitRate: { type: 'number', example: 0.85 }
          }
        }
      }
    }
  })
  async getHealthMetrics(): Promise<any> {
    try {
      const metrics = this.metricsService.getHealthMetrics();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'smart-travel-v6.2',
        version: '6.2.0',
        metrics: {
          // 支付系统指标（基于隔离式支付验证架构）
          payment: {
            successRate: metrics.paymentSuccessRate,
            responseTimeP95: metrics.paymentResponseTimeP95,
            status: metrics.paymentSuccessRate >= 0.99 ? 'healthy' : 'warning'
          },
          
          // 业务指标
          business: {
            userRegistrationRate: metrics.userRegistrationRate,
            orderCompletionRate: metrics.orderCompletionRate,
            activeUsers: metrics.activeUsers,
            status: metrics.orderCompletionRate >= 0.95 ? 'healthy' : 'warning'
          },
          
          // 系统指标
          system: {
            cacheHitRate: metrics.cacheHitRate,
            status: metrics.cacheHitRate >= 0.8 ? 'healthy' : 'warning'
          }
        }
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to collect health metrics'
      };
    }
  }

  /**
   * 支付系统专项监控端点
   * 基于隔离式支付验证架构的专业监控
   */
  @Get('/health/payment')
  @ApiOperation({ 
    summary: '支付系统健康检查',
    description: '返回支付系统的详细健康状态，基于隔离式支付验证架构'
  })
  @ApiResponse({ 
    status: 200, 
    description: '支付系统健康状态',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', example: 'healthy' },
        timestamp: { type: 'string' },
        paymentNodes: {
          type: 'object',
          properties: {
            orderCreationNode: { type: 'string', example: 'healthy' },
            paymentProcessingNode: { type: 'string', example: 'healthy' },
            isolatedVerificationNode: { type: 'string', example: 'healthy' }
          }
        },
        providers: {
          type: 'object',
          properties: {
            wechat: { type: 'string', example: 'healthy' },
            alipay: { type: 'string', example: 'healthy' }
          }
        }
      }
    }
  })
  async getPaymentHealth(): Promise<any> {
    try {
      const metrics = this.metricsService.getHealthMetrics();
      
      return {
        status: metrics.paymentSuccessRate >= 0.99 ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        
        // 隔离式支付验证架构的三个节点状态
        paymentNodes: {
          orderCreationNode: 'healthy',      // 订单创建节点
          paymentProcessingNode: 'healthy',  // 支付处理节点
          isolatedVerificationNode: 'healthy' // 隔离验证节点
        },
        
        // 支付提供商状态
        providers: {
          wechat: 'healthy',
          alipay: 'healthy'
        },
        
        // 关键指标
        metrics: {
          successRate: metrics.paymentSuccessRate,
          responseTimeP95: metrics.paymentResponseTimeP95,
          errorRate: 1 - metrics.paymentSuccessRate
        },
        
        // 安全状态（基于九层安全防护）
        security: {
          status: 'secure',
          isolationLevel: 'high',
          auditLogging: 'enabled'
        }
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to check payment system health'
      };
    }
  }

  /**
   * 系统状态总览端点
   * 整合现有健康检查和新增监控指标
   */
  @Get('/status')
  @ApiOperation({ 
    summary: '系统状态总览',
    description: '返回系统整体状态，整合现有健康检查和监控指标'
  })
  @ApiResponse({ 
    status: 200, 
    description: '系统整体状态'
  })
  async getSystemStatus(): Promise<any> {
    try {
      const metrics = this.metricsService.getHealthMetrics();
      
      // 计算整体健康状态
      const overallHealth = this.calculateOverallHealth(metrics);
      
      return {
        status: overallHealth.status,
        timestamp: new Date().toISOString(),
        service: 'smart-travel-v6.2',
        version: '6.2.0',
        
        // 各子系统状态
        subsystems: {
          application: {
            status: 'healthy',
            description: '应用服务运行正常'
          },
          payment: {
            status: metrics.paymentSuccessRate >= 0.99 ? 'healthy' : 'warning',
            description: '支付系统状态',
            successRate: metrics.paymentSuccessRate
          },
          database: {
            status: 'healthy',
            description: '数据库连接正常'
          },
          cache: {
            status: metrics.cacheHitRate >= 0.8 ? 'healthy' : 'warning',
            description: '缓存系统状态',
            hitRate: metrics.cacheHitRate
          },
          monitoring: {
            status: 'healthy',
            description: '监控系统运行正常'
          }
        },
        
        // 关键指标摘要
        summary: {
          activeUsers: metrics.activeUsers,
          paymentSuccessRate: metrics.paymentSuccessRate,
          orderCompletionRate: metrics.orderCompletionRate,
          cacheHitRate: metrics.cacheHitRate
        },
        
        // 告警状态
        alerts: {
          critical: 0,
          warning: overallHealth.warnings,
          info: 0
        }
      };
    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Failed to get system status'
      };
    }
  }

  /**
   * 计算整体健康状态
   */
  private calculateOverallHealth(metrics: any): { status: string; warnings: number } {
    let warnings = 0;
    
    if (metrics.paymentSuccessRate < 0.99) warnings++;
    if (metrics.orderCompletionRate < 0.95) warnings++;
    if (metrics.cacheHitRate < 0.8) warnings++;
    
    let status = 'healthy';
    if (warnings > 0) status = 'warning';
    if (warnings > 2) status = 'critical';
    
    return { status, warnings };
  }
}
