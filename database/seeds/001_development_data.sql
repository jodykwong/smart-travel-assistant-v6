-- Phase 3A开发环境种子数据
-- 用于开发和测试的初始数据

-- 测试用户数据
INSERT INTO users (id, email, phone, nickname, password_hash, salt, preferences, status) VALUES
(
  'test-user-001',
  'test@smarttravel.com',
  '13800138001',
  '测试用户1',
  '$2b$12$LQv3c1yqBwEHFl5aBLlF8.YjjSm9/YIYyujLEMmnwdtYzm4T6B7FO', -- password: test123456
  'salt123456',
  JSON_OBJECT(
    'travelStyle', 'comfort',
    'transportModes', JSON_ARRAY('driving', 'walking'),
    'interests', JSON_ARRAY('景点', '美食', '购物'),
    'language', 'zh-CN',
    'currency', 'CNY',
    'notifications', JSON_OBJECT(
      'email', true,
      'sms', false,
      'push', true
    )
  ),
  'ACTIVE'
),
(
  'test-user-002',
  'demo@smarttravel.com',
  '13800138002',
  '演示用户',
  '$2b$12$LQv3c1yqBwEHFl5aBLlF8.YjjSm9/YIYyujLEMmnwdtYzm4T6B7FO', -- password: demo123456
  'salt123457',
  JSON_OBJECT(
    'travelStyle', 'budget',
    'transportModes', JSON_ARRAY('transit', 'walking'),
    'interests', JSON_ARRAY('历史', '文化', '自然'),
    'language', 'zh-CN',
    'currency', 'CNY'
  ),
  'ACTIVE'
),
(
  'test-user-003',
  'vip@smarttravel.com',
  '13800138003',
  'VIP用户',
  '$2b$12$LQv3c1yqBwEHFl5aBLlF8.YjjSm9/YIYyujLEMmnwdtYzm4T6B7FO', -- password: vip123456
  'salt123458',
  JSON_OBJECT(
    'travelStyle', 'luxury',
    'transportModes', JSON_ARRAY('driving'),
    'interests', JSON_ARRAY('奢华', '美食', '购物', '娱乐'),
    'language', 'zh-CN',
    'currency', 'CNY'
  ),
  'ACTIVE'
);

-- 测试订单数据
INSERT INTO orders (id, user_id, order_no, title, description, amount, status, business_data, expired_at) VALUES
(
  'order-001',
  'test-user-001',
  'ST202501060001',
  '北京三日游规划',
  '包含故宫、长城、颐和园的三日游行程规划',
  9900, -- 99元
  'PENDING',
  JSON_OBJECT(
    'travelPlan', JSON_OBJECT(
      'destination', '北京',
      'duration', 3,
      'attractions', JSON_ARRAY('故宫', '长城', '颐和园'),
      'budget', 1000,
      'travelStyle', 'comfort'
    ),
    'routes', JSON_ARRAY(
      JSON_OBJECT('from', '酒店', 'to', '故宫', 'mode', 'driving'),
      JSON_OBJECT('from', '故宫', 'to', '长城', 'mode', 'driving')
    )
  ),
  DATE_ADD(NOW(), INTERVAL 30 MINUTE)
),
(
  'order-002',
  'test-user-001',
  'ST202501060002',
  '上海两日游规划',
  '包含外滩、迪士尼的两日游行程规划',
  19900, -- 199元
  'PAID',
  JSON_OBJECT(
    'travelPlan', JSON_OBJECT(
      'destination', '上海',
      'duration', 2,
      'attractions', JSON_ARRAY('外滩', '迪士尼', '南京路'),
      'budget', 2000,
      'travelStyle', 'comfort'
    )
  ),
  DATE_ADD(NOW(), INTERVAL 30 MINUTE)
),
(
  'order-003',
  'test-user-002',
  'ST202501060003',
  '杭州一日游规划',
  '西湖周边一日游行程规划',
  4900, -- 49元
  'PAID',
  JSON_OBJECT(
    'travelPlan', JSON_OBJECT(
      'destination', '杭州',
      'duration', 1,
      'attractions', JSON_ARRAY('西湖', '雷峰塔', '断桥'),
      'budget', 500,
      'travelStyle', 'budget'
    )
  ),
  DATE_ADD(NOW(), INTERVAL 30 MINUTE)
);

-- 测试支付记录
INSERT INTO payment_records (id, order_id, provider, provider_order_id, transaction_id, amount, status, payment_method, callback_verified, verification_method, verified_at, security_token, checksum_hash) VALUES
(
  'payment-001',
  'order-002',
  'wechat',
  'wx_order_20250106001',
  'wx_trans_20250106001',
  19900,
  'SUCCESS',
  'wechat_jsapi',
  TRUE,
  'BACKEND_QUERY',
  NOW(),
  'sec_token_001',
  'checksum_hash_001'
),
(
  'payment-002',
  'order-003',
  'alipay',
  'alipay_order_20250106001',
  'alipay_trans_20250106001',
  4900,
  'SUCCESS',
  'alipay_wap',
  TRUE,
  'BACKEND_QUERY',
  NOW(),
  'sec_token_002',
  'checksum_hash_002'
);

-- 更新已支付订单的支付信息
UPDATE orders SET 
  payment_provider = 'wechat',
  payment_method = 'wechat_jsapi',
  payment_transaction_id = 'wx_trans_20250106001',
  paid_at = NOW()
WHERE id = 'order-002';

UPDATE orders SET 
  payment_provider = 'alipay',
  payment_method = 'alipay_wap',
  payment_transaction_id = 'alipay_trans_20250106001',
  paid_at = NOW()
WHERE id = 'order-003';

-- 测试用户会话
INSERT INTO user_sessions (id, user_id, session_token, refresh_token, ip_address, user_agent, expires_at) VALUES
(
  'session-001',
  'test-user-001',
  'sess_token_001_' || UNIX_TIMESTAMP(),
  'refresh_token_001_' || UNIX_TIMESTAMP(),
  '127.0.0.1',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  DATE_ADD(NOW(), INTERVAL 1 HOUR)
),
(
  'session-002',
  'test-user-002',
  'sess_token_002_' || UNIX_TIMESTAMP(),
  'refresh_token_002_' || UNIX_TIMESTAMP(),
  '127.0.0.1',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  DATE_ADD(NOW(), INTERVAL 1 HOUR)
);

-- 测试审计日志
INSERT INTO audit_logs (event_type, event_category, severity, user_id, session_id, resource_type, resource_id, action, ip_address, details, result) VALUES
(
  'USER_LOGIN',
  'SECURITY',
  'INFO',
  'test-user-001',
  'session-001',
  'USER',
  'test-user-001',
  'LOGIN',
  '127.0.0.1',
  JSON_OBJECT(
    'loginMethod', 'email',
    'userAgent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'timestamp', NOW()
  ),
  'SUCCESS'
),
(
  'ORDER_CREATED',
  'USER',
  'INFO',
  'test-user-001',
  'session-001',
  'ORDER',
  'order-001',
  'CREATE',
  '127.0.0.1',
  JSON_OBJECT(
    'orderAmount', 9900,
    'orderTitle', '北京三日游规划'
  ),
  'SUCCESS'
),
(
  'PAYMENT_CREATED',
  'PAYMENT',
  'INFO',
  'test-user-001',
  'session-001',
  'PAYMENT',
  'payment-001',
  'CREATE',
  '127.0.0.1',
  JSON_OBJECT(
    'provider', 'wechat',
    'amount', 19900,
    'orderId', 'order-002'
  ),
  'SUCCESS'
),
(
  'PAYMENT_VERIFIED',
  'PAYMENT',
  'INFO',
  'test-user-001',
  'session-001',
  'PAYMENT',
  'payment-001',
  'VERIFY',
  '127.0.0.1',
  JSON_OBJECT(
    'verificationMethod', 'BACKEND_QUERY',
    'provider', 'wechat',
    'transactionId', 'wx_trans_20250106001'
  ),
  'SUCCESS'
);

-- 测试安全事件
INSERT INTO security_events (event_type, threat_level, user_id, ip_address, event_data, handled) VALUES
(
  'MULTIPLE_LOGIN_ATTEMPTS',
  'MEDIUM',
  'test-user-001',
  '192.168.1.100',
  JSON_OBJECT(
    'attemptCount', 3,
    'timeWindow', '5 minutes',
    'lastAttempt', NOW()
  ),
  TRUE
),
(
  'UNUSUAL_PAYMENT_AMOUNT',
  'LOW',
  'test-user-003',
  '127.0.0.1',
  JSON_OBJECT(
    'amount', 99900,
    'averageAmount', 9900,
    'deviation', 10
  ),
  FALSE
);

-- 创建测试用的存储过程
DELIMITER //

-- 生成测试订单的存储过程
CREATE PROCEDURE GenerateTestOrder(
  IN p_user_id VARCHAR(36),
  IN p_title VARCHAR(200),
  IN p_amount INT
)
BEGIN
  DECLARE v_order_id VARCHAR(36);
  DECLARE v_order_no VARCHAR(32);
  
  SET v_order_id = UUID();
  SET v_order_no = CONCAT('ST', DATE_FORMAT(NOW(), '%Y%m%d'), LPAD(FLOOR(RAND() * 10000), 4, '0'));
  
  INSERT INTO orders (id, user_id, order_no, title, description, amount, status, business_data, expired_at)
  VALUES (
    v_order_id,
    p_user_id,
    v_order_no,
    p_title,
    CONCAT('测试订单: ', p_title),
    p_amount,
    'PENDING',
    JSON_OBJECT('test', true, 'generated', NOW()),
    DATE_ADD(NOW(), INTERVAL 30 MINUTE)
  );
  
  SELECT v_order_id as order_id, v_order_no as order_no;
END //

-- 模拟支付成功的存储过程
CREATE PROCEDURE SimulatePaymentSuccess(
  IN p_order_id VARCHAR(36),
  IN p_provider VARCHAR(20)
)
BEGIN
  DECLARE v_payment_id VARCHAR(36);
  DECLARE v_transaction_id VARCHAR(100);
  
  SET v_payment_id = UUID();
  SET v_transaction_id = CONCAT(p_provider, '_', DATE_FORMAT(NOW(), '%Y%m%d%H%i%s'), '_', FLOOR(RAND() * 1000));
  
  -- 创建支付记录
  INSERT INTO payment_records (id, order_id, provider, transaction_id, amount, status, payment_method, callback_verified, verification_method, verified_at, security_token)
  SELECT 
    v_payment_id,
    p_order_id,
    p_provider,
    v_transaction_id,
    amount,
    'SUCCESS',
    CONCAT(p_provider, '_jsapi'),
    TRUE,
    'BACKEND_QUERY',
    NOW(),
    CONCAT('sec_', v_payment_id)
  FROM orders WHERE id = p_order_id;
  
  -- 更新订单状态
  UPDATE orders SET 
    status = 'PAID',
    payment_provider = p_provider,
    payment_transaction_id = v_transaction_id,
    paid_at = NOW()
  WHERE id = p_order_id;
  
  SELECT v_payment_id as payment_id, v_transaction_id as transaction_id;
END //

DELIMITER ;

COMMIT;
