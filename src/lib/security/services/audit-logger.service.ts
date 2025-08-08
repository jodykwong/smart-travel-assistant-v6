/**
 * 审计日志服务实现
 * 支持安全事件、支付事件、用户事件、系统事件的完整记录
 * 基于数据库持久化存储
 */

import { 
  IAuditLogger, 
  SecurityEvent, 
  PaymentEvent, 
  UserEvent, 
  SystemEvent,
  AuditLog,
  LogFilter,
  LogStatistics,
  TimeRange
} from '../interfaces/security.interfaces';

export interface IDatabaseService {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<any>;
}

export class DatabaseAuditLogger implements IAuditLogger {
  constructor(
    private databaseService: IDatabaseService,
    private enableConsoleLogging: boolean = process.env.NODE_ENV === 'development'
  ) {
    console.log('📊 审计日志服务初始化完成');
  }

  /**
   * 记录安全事件
   */
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    try {
      const logEntry = this.createBaseLogEntry(event);
      
      // 安全事件特有字段
      const securityDetails = {
        ...event.details,
        threatLevel: event.threatLevel,
        attackType: event.attackType,
        blocked: event.blocked,
        mitigationAction: event.mitigationAction
      };

      await this.insertAuditLog({
        ...logEntry,
        details: securityDetails
      });

      // 高危安全事件立即告警
      if (event.severity === 'HIGH' || event.severity === 'CRITICAL') {
        await this.triggerSecurityAlert(event);
      }

      if (this.enableConsoleLogging) {
        console.log(`🚨 [SECURITY] ${event.eventType}: ${event.severity} - ${JSON.stringify(securityDetails)}`);
      }
    } catch (error) {
      console.error('❌ 安全事件日志记录失败:', error);
      // 安全事件记录失败不应该影响主流程
    }
  }

  /**
   * 记录支付事件
   */
  async logPaymentEvent(event: PaymentEvent): Promise<void> {
    try {
      const logEntry = this.createBaseLogEntry(event);
      
      // 支付事件特有字段
      const paymentDetails = {
        ...event.details,
        orderId: event.orderId,
        amount: event.amount,
        provider: event.provider,
        transactionId: event.transactionId,
        verificationMethod: event.verificationMethod,
        result: event.result
      };

      await this.insertAuditLog({
        ...logEntry,
        resourceType: 'PAYMENT',
        resourceId: event.orderId,
        details: paymentDetails
      });

      // 支付失败事件需要特别关注
      if (event.result === 'FAILURE') {
        await this.handlePaymentFailureEvent(event);
      }

      if (this.enableConsoleLogging) {
        console.log(`💳 [PAYMENT] ${event.eventType}: ${event.result} - Order: ${event.orderId}`);
      }
    } catch (error) {
      console.error('❌ 支付事件日志记录失败:', error);
    }
  }

  /**
   * 记录用户事件
   */
  async logUserEvent(event: UserEvent): Promise<void> {
    try {
      const logEntry = this.createBaseLogEntry(event);

      await this.insertAuditLog({
        ...logEntry,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        action: event.action,
        oldValues: event.oldValues,
        newValues: event.newValues,
        result: event.result
      });

      if (this.enableConsoleLogging) {
        console.log(`👤 [USER] ${event.eventType}: ${event.action} - ${event.result}`);
      }
    } catch (error) {
      console.error('❌ 用户事件日志记录失败:', error);
    }
  }

  /**
   * 记录系统事件
   */
  async logSystemEvent(event: SystemEvent): Promise<void> {
    try {
      const logEntry = this.createBaseLogEntry(event);
      
      // 系统事件特有字段
      const systemDetails = {
        ...event.details,
        component: event.component,
        performance: event.performance
      };

      await this.insertAuditLog({
        ...logEntry,
        resourceType: 'SYSTEM',
        resourceId: event.component,
        action: event.action,
        details: systemDetails,
        result: event.result
      });

      if (this.enableConsoleLogging) {
        console.log(`⚙️ [SYSTEM] ${event.component}: ${event.action} - ${event.result}`);
      }
    } catch (error) {
      console.error('❌ 系统事件日志记录失败:', error);
    }
  }

  /**
   * 查询审计日志
   */
  async queryLogs(filter: LogFilter): Promise<AuditLog[]> {
    try {
      let sql = `
        SELECT 
          id, event_type, event_category, severity,
          user_id, session_id, resource_type, resource_id,
          action, ip_address, user_agent, request_id,
          details, old_values, new_values, result,
          error_code, error_message, created_at
        FROM audit_logs
        WHERE 1=1
      `;
      
      const params: any[] = [];
      
      if (filter.eventType) {
        sql += ' AND event_type = ?';
        params.push(filter.eventType);
      }
      
      if (filter.eventCategory) {
        sql += ' AND event_category = ?';
        params.push(filter.eventCategory);
      }
      
      if (filter.severity) {
        sql += ' AND severity = ?';
        params.push(filter.severity);
      }
      
      if (filter.userId) {
        sql += ' AND user_id = ?';
        params.push(filter.userId);
      }
      
      if (filter.ipAddress) {
        sql += ' AND ip_address = ?';
        params.push(filter.ipAddress);
      }
      
      if (filter.startTime) {
        sql += ' AND created_at >= ?';
        params.push(filter.startTime);
      }
      
      if (filter.endTime) {
        sql += ' AND created_at <= ?';
        params.push(filter.endTime);
      }
      
      sql += ' ORDER BY created_at DESC';
      
      if (filter.limit) {
        sql += ' LIMIT ?';
        params.push(filter.limit);
        
        if (filter.offset) {
          sql += ' OFFSET ?';
          params.push(filter.offset);
        }
      }

      const rows = await this.databaseService.query(sql, params);
      
      return rows.map(row => ({
        id: row.id,
        eventType: row.event_type,
        eventCategory: row.event_category,
        severity: row.severity,
        userId: row.user_id,
        sessionId: row.session_id,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        action: row.action,
        ipAddress: row.ip_address,
        userAgent: row.user_agent,
        requestId: row.request_id,
        details: row.details ? JSON.parse(row.details) : null,
        oldValues: row.old_values ? JSON.parse(row.old_values) : null,
        newValues: row.new_values ? JSON.parse(row.new_values) : null,
        result: row.result,
        errorCode: row.error_code,
        errorMessage: row.error_message,
        createdAt: new Date(row.created_at)
      }));
    } catch (error) {
      console.error('❌ 审计日志查询失败:', error);
      throw error;
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStatistics(timeRange: TimeRange): Promise<LogStatistics> {
    try {
      // 总事件数
      const totalEventsResult = await this.databaseService.query(
        'SELECT COUNT(*) as total FROM audit_logs WHERE created_at BETWEEN ? AND ?',
        [timeRange.startTime, timeRange.endTime]
      );
      const totalEvents = totalEventsResult[0]?.total || 0;

      // 按分类统计
      const categoryStatsResult = await this.databaseService.query(
        'SELECT event_category, COUNT(*) as count FROM audit_logs WHERE created_at BETWEEN ? AND ? GROUP BY event_category',
        [timeRange.startTime, timeRange.endTime]
      );
      const eventsByCategory = categoryStatsResult.reduce((acc, row) => {
        acc[row.event_category] = row.count;
        return acc;
      }, {});

      // 按严重程度统计
      const severityStatsResult = await this.databaseService.query(
        'SELECT severity, COUNT(*) as count FROM audit_logs WHERE created_at BETWEEN ? AND ? GROUP BY severity',
        [timeRange.startTime, timeRange.endTime]
      );
      const eventsBySeverity = severityStatsResult.reduce((acc, row) => {
        acc[row.severity] = row.count;
        return acc;
      }, {});

      // 活跃用户TOP10
      const topUsersResult = await this.databaseService.query(
        'SELECT user_id, COUNT(*) as event_count FROM audit_logs WHERE created_at BETWEEN ? AND ? AND user_id IS NOT NULL GROUP BY user_id ORDER BY event_count DESC LIMIT 10',
        [timeRange.startTime, timeRange.endTime]
      );
      const topUsers = topUsersResult.map(row => ({
        userId: row.user_id,
        eventCount: row.event_count
      }));

      // 活跃IP TOP10
      const topIpResult = await this.databaseService.query(
        'SELECT ip_address, COUNT(*) as event_count FROM audit_logs WHERE created_at BETWEEN ? AND ? AND ip_address IS NOT NULL GROUP BY ip_address ORDER BY event_count DESC LIMIT 10',
        [timeRange.startTime, timeRange.endTime]
      );
      const topIpAddresses = topIpResult.map(row => ({
        ipAddress: row.ip_address,
        eventCount: row.event_count
      }));

      return {
        totalEvents,
        eventsByCategory,
        eventsBySeverity,
        topUsers,
        topIpAddresses,
        timeRange
      };
    } catch (error) {
      console.error('❌ 日志统计查询失败:', error);
      throw error;
    }
  }

  // ============= 私有方法 =============

  /**
   * 创建基础日志条目
   */
  private createBaseLogEntry(event: SecurityEvent | PaymentEvent | UserEvent | SystemEvent): Partial<AuditLog> {
    return {
      eventType: event.eventType,
      eventCategory: event.eventCategory,
      severity: event.severity,
      userId: event.userId,
      sessionId: event.sessionId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestId: event.requestId,
      createdAt: event.timestamp || new Date()
    };
  }

  /**
   * 插入审计日志到数据库
   */
  private async insertAuditLog(logEntry: Partial<AuditLog>): Promise<void> {
    const sql = `
      INSERT INTO audit_logs (
        event_type, event_category, severity, user_id, session_id,
        resource_type, resource_id, action, ip_address, user_agent,
        request_id, details, old_values, new_values, result,
        error_code, error_message, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      logEntry.eventType,
      logEntry.eventCategory,
      logEntry.severity,
      logEntry.userId,
      logEntry.sessionId,
      logEntry.resourceType,
      logEntry.resourceId,
      logEntry.action,
      logEntry.ipAddress,
      logEntry.userAgent,
      logEntry.requestId,
      logEntry.details ? JSON.stringify(logEntry.details) : null,
      logEntry.oldValues ? JSON.stringify(logEntry.oldValues) : null,
      logEntry.newValues ? JSON.stringify(logEntry.newValues) : null,
      logEntry.result,
      logEntry.errorCode,
      logEntry.errorMessage,
      logEntry.createdAt
    ];

    await this.databaseService.execute(sql, params);
  }

  /**
   * 触发安全告警
   */
  private async triggerSecurityAlert(event: SecurityEvent): Promise<void> {
    // 这里可以集成告警系统，如邮件、短信、钉钉等
    console.log(`🚨 安全告警: ${event.eventType} - ${event.severity}`);
    
    // 记录到安全事件表
    try {
      const sql = `
        INSERT INTO security_events (
          event_type, threat_level, user_id, ip_address, event_data, created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `;
      
      await this.databaseService.execute(sql, [
        event.eventType,
        event.threatLevel,
        event.userId,
        event.ipAddress,
        JSON.stringify(event.details),
        new Date()
      ]);
    } catch (error) {
      console.error('❌ 安全事件记录失败:', error);
    }
  }

  /**
   * 处理支付失败事件
   */
  private async handlePaymentFailureEvent(event: PaymentEvent): Promise<void> {
    // 支付失败可能需要特殊处理，如风控检查
    console.log(`💳 支付失败事件: 订单 ${event.orderId}, 金额 ${event.amount}`);
    
    // 可以在这里添加支付失败的后续处理逻辑
    // 如：通知风控系统、更新订单状态等
  }
}
