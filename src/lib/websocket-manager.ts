/**
 * WebSocket管理器
 * 用于处理实时通信和状态广播
 */

export interface WebSocketMessage {
  type: string;
  sessionId: string;
  data: any;
  timestamp: Date;
}

export interface WebSocketConnection {
  id: string;
  sessionId: string;
  socket: any; // WebSocket实例
  isActive: boolean;
  lastActivity: Date;
}

export class WebSocketManager {
  private connections: Map<string, WebSocketConnection> = new Map();
  private sessionConnections: Map<string, Set<string>> = new Map();

  constructor() {
    console.log('🔌 WebSocket管理器已初始化');
  }

  /**
   * 添加连接
   */
  addConnection(connectionId: string, sessionId: string, socket: any): void {
    const connection: WebSocketConnection = {
      id: connectionId,
      sessionId,
      socket,
      isActive: true,
      lastActivity: new Date()
    };

    this.connections.set(connectionId, connection);

    // 维护会话连接映射
    if (!this.sessionConnections.has(sessionId)) {
      this.sessionConnections.set(sessionId, new Set());
    }
    this.sessionConnections.get(sessionId)!.add(connectionId);

    console.log(`🔌 新连接已添加: ${connectionId} (会话: ${sessionId})`);
  }

  /**
   * 移除连接
   */
  removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      const sessionConnections = this.sessionConnections.get(connection.sessionId);
      if (sessionConnections) {
        sessionConnections.delete(connectionId);
        if (sessionConnections.size === 0) {
          this.sessionConnections.delete(connection.sessionId);
        }
      }
      this.connections.delete(connectionId);
      console.log(`🔌 连接已移除: ${connectionId}`);
    }
  }

  /**
   * 向特定会话广播消息
   */
  broadcastToSession(sessionId: string, message: WebSocketMessage): void {
    const connectionIds = this.sessionConnections.get(sessionId);
    if (!connectionIds) {
      console.warn(`⚠️ 会话 ${sessionId} 没有活跃连接`);
      return;
    }

    let sentCount = 0;
    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.isActive) {
        try {
          // 这里应该调用实际的WebSocket发送方法
          // connection.socket.send(JSON.stringify(message));
          console.log(`📤 消息已发送到连接 ${connectionId}:`, message.type);
          sentCount++;
        } catch (error) {
          console.error(`❌ 发送消息失败 (连接 ${connectionId}):`, error);
          connection.isActive = false;
        }
      }
    }

    console.log(`📡 消息已广播到会话 ${sessionId} (${sentCount}个连接)`);
  }

  /**
   * 向所有连接广播消息
   */
  broadcastToAll(message: WebSocketMessage): void {
    let sentCount = 0;
    for (const connection of this.connections.values()) {
      if (connection.isActive) {
        try {
          // connection.socket.send(JSON.stringify(message));
          console.log(`📤 消息已发送到连接 ${connection.id}:`, message.type);
          sentCount++;
        } catch (error) {
          console.error(`❌ 发送消息失败 (连接 ${connection.id}):`, error);
          connection.isActive = false;
        }
      }
    }

    console.log(`📡 消息已广播到所有连接 (${sentCount}个连接)`);
  }

  /**
   * 获取会话的活跃连接数
   */
  getSessionConnectionCount(sessionId: string): number {
    const connectionIds = this.sessionConnections.get(sessionId);
    if (!connectionIds) return 0;

    let activeCount = 0;
    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.isActive) {
        activeCount++;
      }
    }

    return activeCount;
  }

  /**
   * 清理非活跃连接
   */
  cleanupInactiveConnections(): void {
    const now = new Date();
    const inactiveThreshold = 5 * 60 * 1000; // 5分钟

    const toRemove: string[] = [];
    for (const [connectionId, connection] of this.connections) {
      if (!connection.isActive || 
          (now.getTime() - connection.lastActivity.getTime()) > inactiveThreshold) {
        toRemove.push(connectionId);
      }
    }

    for (const connectionId of toRemove) {
      this.removeConnection(connectionId);
    }

    if (toRemove.length > 0) {
      console.log(`🧹 已清理 ${toRemove.length} 个非活跃连接`);
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalConnections: number;
    activeSessions: number;
    activeConnections: number;
  } {
    let activeConnections = 0;
    for (const connection of this.connections.values()) {
      if (connection.isActive) {
        activeConnections++;
      }
    }

    return {
      totalConnections: this.connections.size,
      activeSessions: this.sessionConnections.size,
      activeConnections
    };
  }

  /**
   * 销毁管理器
   */
  destroy(): void {
    this.connections.clear();
    this.sessionConnections.clear();
    console.log('🔌 WebSocket管理器已销毁');
  }
}
