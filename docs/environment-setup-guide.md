# 智游助手v6.2开发环境配置指南

**项目**: 智游助手v6.2  
**版本**: v6.2.0  
**文档类型**: 环境配置指南  
**更新日期**: 2025年8月6日  

---

## 🔧 **本地开发环境恢复**

### **1. 恢复.env.local文件**

由于安全考虑，`.env.local`文件已从仓库中移除。请按以下步骤恢复本地开发环境配置：

#### **创建.env.local文件**
```bash
# 在项目根目录创建.env.local文件
cp .env.phase3a.example .env.local
```

#### **配置必要的API密钥**
编辑`.env.local`文件，填入以下必要配置：

```bash
# ============= 基础配置 =============
NODE_ENV=development
PORT=3000
API_VERSION=v1

# ============= 数据库配置 =============
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=smart_travel_dev
DB_PASSWORD=your_local_db_password
DB_DATABASE=smart_travel_dev

# ============= 安全配置 =============
# 生成32字符的加密密钥
ENCRYPTION_KEY=your_32_character_encryption_key_here

# 生成JWT密钥
JWT_SECRET=your_jwt_secret_for_development_here

# 会话密钥
SESSION_SECRET=your_session_secret_for_development

# ============= 高德地图API =============
# 从高德开放平台获取: https://lbs.amap.com/
AMAP_API_KEY=your_amap_api_key_here

# ============= LLM API配置 =============
# DeepSeek API密钥
DEEPSEEK_API_KEY=your_deepseek_api_key_here
LLM_API_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# ============= 支付配置 (开发环境) =============
# 微信支付沙盒配置
WECHAT_APP_ID=your_wechat_sandbox_app_id
WECHAT_MCH_ID=your_wechat_sandbox_mch_id
WECHAT_API_KEY=your_wechat_sandbox_api_key

# 支付宝沙盒配置
ALIPAY_APP_ID=your_alipay_sandbox_app_id
ALIPAY_MERCHANT_ID=your_alipay_sandbox_merchant_id
ALIPAY_PRIVATE_KEY=your_alipay_sandbox_private_key

# ============= 邮件配置 =============
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password

# ============= Redis配置 =============
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# ============= 开发工具配置 =============
DEBUG_MODE=true
VERBOSE_LOGGING=true
ENABLE_API_DOCS=true
```

### **2. 获取必要的API密钥**

#### **高德地图API密钥**
1. 访问 [高德开放平台](https://lbs.amap.com/)
2. 注册开发者账号
3. 创建应用，选择"Web服务"类型
4. 获取API Key并填入`AMAP_API_KEY`

#### **DeepSeek API密钥**
1. 访问 [DeepSeek开放平台](https://platform.deepseek.com/)
2. 注册账号并完成认证
3. 创建API密钥
4. 获取API Key并填入`DEEPSEEK_API_KEY`

#### **支付API密钥 (沙盒环境)**

**微信支付沙盒**
1. 访问 [微信支付商户平台](https://pay.weixin.qq.com/)
2. 申请沙盒环境
3. 获取沙盒AppID、商户号、API密钥

**支付宝沙盒**
1. 访问 [支付宝开放平台](https://open.alipay.com/)
2. 进入沙盒环境
3. 获取沙盒应用信息和密钥

### **3. 生成安全密钥**

#### **生成加密密钥**
```bash
# 生成32字符的加密密钥
node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"

# 或使用OpenSSL
openssl rand -hex 16
```

#### **生成JWT密钥**
```bash
# 生成JWT密钥
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

#### **生成会话密钥**
```bash
# 生成会话密钥
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

---

## 🗄️ **数据库环境配置**

### **1. 安装MySQL**

#### **macOS (使用Homebrew)**
```bash
# 安装MySQL
brew install mysql

# 启动MySQL服务
brew services start mysql

# 设置root密码
mysql_secure_installation
```

#### **Ubuntu/Debian**
```bash
# 安装MySQL
sudo apt update
sudo apt install mysql-server

# 启动MySQL服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 设置root密码
sudo mysql_secure_installation
```

#### **Windows**
1. 下载MySQL安装包
2. 运行安装程序
3. 配置root密码
4. 启动MySQL服务

### **2. 创建开发数据库**

```sql
-- 连接到MySQL
mysql -u root -p

-- 创建数据库
CREATE DATABASE smart_travel_dev CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 创建用户
CREATE USER 'smart_travel_dev'@'localhost' IDENTIFIED BY 'your_password_here';

-- 授权
GRANT ALL PRIVILEGES ON smart_travel_dev.* TO 'smart_travel_dev'@'localhost';

-- 刷新权限
FLUSH PRIVILEGES;

-- 退出
EXIT;
```

### **3. 运行数据库迁移**

```bash
# 安装依赖
npm install

# 运行数据库迁移
npm run db:migrate

# 插入种子数据
npm run db:seed
```

---

## 🔴 **Redis环境配置**

### **1. 安装Redis**

#### **macOS (使用Homebrew)**
```bash
# 安装Redis
brew install redis

# 启动Redis服务
brew services start redis

# 测试连接
redis-cli ping
```

#### **Ubuntu/Debian**
```bash
# 安装Redis
sudo apt update
sudo apt install redis-server

# 启动Redis服务
sudo systemctl start redis-server
sudo systemctl enable redis-server

# 测试连接
redis-cli ping
```

#### **Windows**
1. 下载Redis for Windows
2. 解压并运行redis-server.exe
3. 测试连接: redis-cli.exe ping

### **2. Redis配置优化**

编辑Redis配置文件 (`/usr/local/etc/redis.conf` 或 `/etc/redis/redis.conf`):

```conf
# 内存配置
maxmemory 256mb
maxmemory-policy allkeys-lru

# 持久化配置
save 900 1
save 300 10
save 60 10000

# 网络配置
bind 127.0.0.1
port 6379

# 安全配置
# requirepass your_redis_password
```

---

## 📧 **邮件服务配置**

### **1. Gmail SMTP配置**

1. 启用两步验证
2. 生成应用专用密码
3. 在`.env.local`中配置:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_specific_password
```

### **2. 其他邮件服务**

#### **Outlook/Hotmail**
```bash
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASSWORD=your_password
```

#### **QQ邮箱**
```bash
SMTP_HOST=smtp.qq.com
SMTP_PORT=587
SMTP_USER=your_email@qq.com
SMTP_PASSWORD=your_authorization_code
```

---

## 🚀 **启动开发环境**

### **1. 使用自动化脚本**

```bash
# 运行环境搭建脚本
chmod +x scripts/setup-phase3a-dev.sh
./scripts/setup-phase3a-dev.sh

# 启动开发服务器
./start-phase3a-dev.sh
```

### **2. 手动启动**

```bash
# 安装依赖
npm install

# 启动数据库和Redis (如果使用Docker)
docker-compose up -d mysql redis

# 运行数据库迁移
npm run db:migrate

# 启动开发服务器
npm run dev:phase3a
```

### **3. 验证环境**

访问以下URL验证环境是否正常：

- **应用首页**: http://localhost:3000
- **健康检查**: http://localhost:3000/health
- **API文档**: http://localhost:3000/api/docs
- **监控面板**: http://localhost:3001 (Grafana)

---

## 🔍 **故障排查**

### **常见问题**

#### **1. 数据库连接失败**
```bash
# 检查MySQL服务状态
brew services list | grep mysql
# 或
sudo systemctl status mysql

# 检查端口占用
lsof -i :3306

# 重启MySQL服务
brew services restart mysql
# 或
sudo systemctl restart mysql
```

#### **2. Redis连接失败**
```bash
# 检查Redis服务状态
brew services list | grep redis
# 或
sudo systemctl status redis

# 检查端口占用
lsof -i :6379

# 重启Redis服务
brew services restart redis
# 或
sudo systemctl restart redis
```

#### **3. 端口占用**
```bash
# 查看端口占用
lsof -i :3000

# 杀死占用进程
kill -9 <PID>

# 或使用不同端口
PORT=3001 npm run dev:phase3a
```

#### **4. 权限问题**
```bash
# 修复文件权限
chmod +x scripts/*.sh

# 修复目录权限
chmod 755 logs uploads backups
```

### **日志查看**

```bash
# 查看应用日志
tail -f logs/smart-travel.log

# 查看错误日志
tail -f logs/error.log

# 查看审计日志
tail -f logs/audit.log
```

---

## 📚 **开发工具推荐**

### **IDE配置**
- **VS Code**: 推荐安装TypeScript、ESLint、Prettier插件
- **WebStorm**: 内置TypeScript支持
- **Vim/Neovim**: 配置TypeScript LSP

### **数据库工具**
- **MySQL Workbench**: 官方GUI工具
- **DBeaver**: 通用数据库工具
- **Sequel Pro**: macOS专用工具

### **Redis工具**
- **Redis Desktop Manager**: GUI管理工具
- **RedisInsight**: 官方可视化工具
- **redis-cli**: 命令行工具

### **API测试工具**
- **Postman**: API测试和文档
- **Insomnia**: 轻量级API客户端
- **curl**: 命令行HTTP客户端

---

## 🔐 **安全注意事项**

### **1. 密钥管理**
- 不要将真实API密钥提交到代码仓库
- 定期轮换API密钥
- 使用环境变量存储敏感信息

### **2. 数据库安全**
- 使用强密码
- 限制数据库访问权限
- 定期备份数据

### **3. 网络安全**
- 使用HTTPS (开发环境可选)
- 配置防火墙规则
- 限制外部访问

---

## 📞 **技术支持**

如果在环境配置过程中遇到问题，请：

1. **查看日志**: 检查应用和服务日志
2. **运行健康检查**: `npm run health:check`
3. **重置环境**: `npm run env:reset`
4. **联系团队**: 在Slack #dev-support频道求助

**🎉 环境配置完成后，您就可以开始智游助手v6.2的开发工作了！**
