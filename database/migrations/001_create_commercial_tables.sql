-- Phase 3A商业化数据库迁移脚本
-- 基于Phase 1架构扩展，支持用户管理、订单管理、支付记录、审计日志

-- 用户表
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY COMMENT '用户唯一标识',
  email VARCHAR(255) UNIQUE NOT NULL COMMENT '用户邮箱',
  phone VARCHAR(20) UNIQUE COMMENT '用户手机号',
  nickname VARCHAR(100) NOT NULL COMMENT '用户昵称',
  avatar_url VARCHAR(500) COMMENT '头像URL',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  salt VARCHAR(32) NOT NULL COMMENT '密码盐值',
  status ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'DELETED') DEFAULT 'ACTIVE' COMMENT '用户状态',
  
  -- 用户偏好设置 (JSON格式)
  preferences JSON COMMENT '用户偏好设置',
  
  -- 安全相关字段
  last_login_at TIMESTAMP NULL COMMENT '最后登录时间',
  last_login_ip VARCHAR(45) COMMENT '最后登录IP',
  failed_login_attempts INT DEFAULT 0 COMMENT '登录失败次数',
  locked_until TIMESTAMP NULL COMMENT '账户锁定到期时间',
  
  -- 时间戳
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  -- 索引
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- 用户会话表
CREATE TABLE user_sessions (
  id VARCHAR(36) PRIMARY KEY COMMENT '会话ID',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  session_token VARCHAR(255) NOT NULL COMMENT '会话令牌',
  refresh_token VARCHAR(255) COMMENT '刷新令牌',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  expires_at TIMESTAMP NOT NULL COMMENT '过期时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_session_token (session_token),
  INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户会话表';

-- 订单表
CREATE TABLE orders (
  id VARCHAR(36) PRIMARY KEY COMMENT '订单ID',
  user_id VARCHAR(36) NOT NULL COMMENT '用户ID',
  order_no VARCHAR(32) UNIQUE NOT NULL COMMENT '订单号',
  
  -- 订单基本信息
  title VARCHAR(200) NOT NULL COMMENT '订单标题',
  description TEXT COMMENT '订单描述',
  amount INT NOT NULL COMMENT '订单金额(分)',
  currency VARCHAR(3) DEFAULT 'CNY' COMMENT '货币类型',
  
  -- 订单状态
  status ENUM('PENDING', 'PAID', 'CANCELLED', 'REFUNDED', 'EXPIRED') DEFAULT 'PENDING' COMMENT '订单状态',
  
  -- 支付相关
  payment_provider VARCHAR(20) COMMENT '支付提供商',
  payment_method VARCHAR(50) COMMENT '支付方式',
  payment_transaction_id VARCHAR(100) COMMENT '支付交易ID',
  
  -- 业务数据 (JSON格式存储旅游规划数据)
  business_data JSON COMMENT '业务数据',
  
  -- 时间字段
  paid_at TIMESTAMP NULL COMMENT '支付时间',
  cancelled_at TIMESTAMP NULL COMMENT '取消时间',
  expired_at TIMESTAMP NULL COMMENT '过期时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_id (user_id),
  INDEX idx_order_no (order_no),
  INDEX idx_status (status),
  INDEX idx_payment_provider (payment_provider),
  INDEX idx_created_at (created_at),
  INDEX idx_paid_at (paid_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='订单表';

-- 支付记录表
CREATE TABLE payment_records (
  id VARCHAR(36) PRIMARY KEY COMMENT '支付记录ID',
  order_id VARCHAR(36) NOT NULL COMMENT '订单ID',
  
  -- 支付提供商信息
  provider VARCHAR(20) NOT NULL COMMENT '支付提供商(wechat/alipay)',
  provider_order_id VARCHAR(100) COMMENT '支付商订单ID',
  transaction_id VARCHAR(100) COMMENT '交易ID',
  
  -- 支付金额
  amount INT NOT NULL COMMENT '支付金额(分)',
  currency VARCHAR(3) DEFAULT 'CNY' COMMENT '货币类型',
  
  -- 支付状态
  status VARCHAR(20) NOT NULL COMMENT '支付状态',
  
  -- 支付方式
  payment_method VARCHAR(50) COMMENT '支付方式',
  
  -- 回调数据
  callback_data JSON COMMENT '支付回调数据',
  callback_verified BOOLEAN DEFAULT FALSE COMMENT '回调是否已验证',
  
  -- 验证相关
  verification_method VARCHAR(50) COMMENT '验证方式',
  verified_at TIMESTAMP NULL COMMENT '验证时间',
  verification_result JSON COMMENT '验证结果',
  
  -- 安全字段
  security_token VARCHAR(255) COMMENT '安全令牌',
  checksum_hash VARCHAR(64) COMMENT '校验和',
  
  -- 时间字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  FOREIGN KEY (order_id) REFERENCES orders(id),
  INDEX idx_order_id (order_id),
  INDEX idx_provider (provider),
  INDEX idx_transaction_id (transaction_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付记录表';

-- 审计日志表
CREATE TABLE audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '日志ID',
  
  -- 事件基本信息
  event_type VARCHAR(50) NOT NULL COMMENT '事件类型',
  event_category VARCHAR(30) NOT NULL COMMENT '事件分类(SECURITY/PAYMENT/USER/SYSTEM)',
  severity VARCHAR(20) DEFAULT 'INFO' COMMENT '严重级别(LOW/MEDIUM/HIGH/CRITICAL)',
  
  -- 用户和资源信息
  user_id VARCHAR(36) COMMENT '用户ID',
  session_id VARCHAR(36) COMMENT '会话ID',
  resource_type VARCHAR(50) COMMENT '资源类型',
  resource_id VARCHAR(36) COMMENT '资源ID',
  action VARCHAR(50) NOT NULL COMMENT '操作动作',
  
  -- 请求信息
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  request_id VARCHAR(36) COMMENT '请求ID',
  
  -- 详细信息
  details JSON COMMENT '详细信息',
  old_values JSON COMMENT '变更前的值',
  new_values JSON COMMENT '变更后的值',
  
  -- 结果信息
  result VARCHAR(20) COMMENT '操作结果(SUCCESS/FAILURE/ERROR)',
  error_code VARCHAR(50) COMMENT '错误代码',
  error_message TEXT COMMENT '错误信息',
  
  -- 时间字段
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  -- 索引
  INDEX idx_event_type (event_type),
  INDEX idx_event_category (event_category),
  INDEX idx_severity (severity),
  INDEX idx_user_id (user_id),
  INDEX idx_resource_type_id (resource_type, resource_id),
  INDEX idx_ip_address (ip_address),
  INDEX idx_created_at (created_at),
  INDEX idx_result (result)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='审计日志表';

-- 系统配置表
CREATE TABLE system_configs (
  id VARCHAR(36) PRIMARY KEY COMMENT '配置ID',
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  config_type VARCHAR(20) DEFAULT 'STRING' COMMENT '配置类型',
  description TEXT COMMENT '配置描述',
  is_encrypted BOOLEAN DEFAULT FALSE COMMENT '是否加密',
  is_sensitive BOOLEAN DEFAULT FALSE COMMENT '是否敏感',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  
  INDEX idx_config_key (config_key),
  INDEX idx_config_type (config_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统配置表';

-- 安全事件表
CREATE TABLE security_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY COMMENT '事件ID',
  event_type VARCHAR(50) NOT NULL COMMENT '事件类型',
  threat_level VARCHAR(20) NOT NULL COMMENT '威胁级别',
  user_id VARCHAR(36) COMMENT '用户ID',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  event_data JSON COMMENT '事件数据',
  handled BOOLEAN DEFAULT FALSE COMMENT '是否已处理',
  handled_at TIMESTAMP NULL COMMENT '处理时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  
  INDEX idx_event_type (event_type),
  INDEX idx_threat_level (threat_level),
  INDEX idx_user_id (user_id),
  INDEX idx_ip_address (ip_address),
  INDEX idx_handled (handled),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='安全事件表';

-- 创建视图：用户订单统计
CREATE VIEW user_order_stats AS
SELECT 
  u.id as user_id,
  u.email,
  u.nickname,
  COUNT(o.id) as total_orders,
  COUNT(CASE WHEN o.status = 'PAID' THEN 1 END) as paid_orders,
  SUM(CASE WHEN o.status = 'PAID' THEN o.amount ELSE 0 END) as total_amount,
  MAX(o.created_at) as last_order_time
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
GROUP BY u.id, u.email, u.nickname;

-- 创建视图：支付统计
CREATE VIEW payment_stats AS
SELECT 
  DATE(created_at) as payment_date,
  provider,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as success_count,
  COUNT(CASE WHEN status = 'FAILED' THEN 1 END) as failed_count
FROM payment_records
GROUP BY DATE(created_at), provider;

-- 插入初始系统配置
INSERT INTO system_configs (id, config_key, config_value, config_type, description) VALUES
(UUID(), 'payment.wechat.enabled', 'true', 'BOOLEAN', '微信支付是否启用'),
(UUID(), 'payment.alipay.enabled', 'true', 'BOOLEAN', '支付宝支付是否启用'),
(UUID(), 'security.max_login_attempts', '5', 'INTEGER', '最大登录尝试次数'),
(UUID(), 'security.lockout_duration', '900', 'INTEGER', '账户锁定时长(秒)'),
(UUID(), 'order.default_expire_minutes', '30', 'INTEGER', '订单默认过期时间(分钟)'),
(UUID(), 'cache.user_session_ttl', '3600', 'INTEGER', '用户会话缓存TTL(秒)');

COMMIT;
