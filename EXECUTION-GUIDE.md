# 🚀 智游助手v6.2 CI/CD体系阶段一执行指南

## 📋 **立即开始执行**

基于immediate-action-plan.md的成功执行基础，现在开始阶段一的实施：

### **前置条件检查**
确保以下条件已满足：
- ✅ immediate-action-plan.md已完成执行
- ✅ Prometheus + Grafana监控系统正常运行
- ✅ 统一指标管理架构已建立
- ✅ 错误处理和降级机制已实现

---

## 🎯 **第一步：环境准备**

### **1. 系统要求检查**
```bash
# 检查系统资源
free -h  # 内存 ≥ 8GB
df -h    # 磁盘 ≥ 100GB
nproc    # CPU ≥ 4核

# 检查必要软件
docker --version
docker-compose --version
curl --version
```

### **2. 创建项目目录结构**
```bash
# 在项目根目录执行
mkdir -p infrastructure/{gitlab,harbor,k3s,monitoring,ssl}
mkdir -p infrastructure/gitlab/config
mkdir -p infrastructure/harbor/config
mkdir -p infrastructure/k3s/scripts
mkdir -p infrastructure/monitoring/configs
```

### **3. 设置执行权限**
```bash
# 设置脚本执行权限
chmod +x infrastructure/deploy-infrastructure.sh
chmod +x infrastructure/k3s/install-k3s-cluster.sh
```

---

## 🔧 **第二步：基础设施部署**

### **选项A: 一键全部署（推荐）**
```bash
# 执行完整部署
./infrastructure/deploy-infrastructure.sh

# 选择 "1) 全部部署"
# 脚本将自动完成：
# - SSL证书生成
# - GitLab CE部署
# - Harbor镜像仓库部署  
# - K3s集群搭建
# - 监控系统扩展
```

### **选项B: 分步部署（调试用）**
```bash
# 1. 仅部署GitLab CE
./infrastructure/deploy-infrastructure.sh
# 选择 "2) 仅GitLab CE"

# 2. 仅部署Harbor
./infrastructure/deploy-infrastructure.sh  
# 选择 "3) 仅Harbor"

# 3. 仅部署K3s集群
./infrastructure/deploy-infrastructure.sh
# 选择 "4) 仅K3s集群"

# 4. 仅部署监控系统
./infrastructure/deploy-infrastructure.sh
# 选择 "5) 仅监控系统"
```

---

## 📊 **第三步：验证部署**

### **1. 服务状态检查**
```bash
# 检查Docker容器状态
docker ps -a

# 检查GitLab状态
curl -k https://gitlab.smarttravel.local/users/sign_in

# 检查Harbor状态  
curl -k https://harbor.smarttravel.local

# 检查K3s集群状态
kubectl get nodes
kubectl get pods -A

# 检查监控系统状态
kubectl get pods -n monitoring
```

### **2. 访问服务界面**
配置hosts文件或DNS解析：
```bash
# 添加到 /etc/hosts (Linux/Mac) 或 C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1 gitlab.smarttravel.local
127.0.0.1 harbor.smarttravel.local
```

然后访问：
- **GitLab CE**: https://gitlab.smarttravel.local
- **Harbor**: https://harbor.smarttravel.local  
- **Prometheus**: http://localhost:30900
- **Grafana**: http://localhost:30300

### **3. 获取初始密码**
```bash
# GitLab root密码
docker exec smart-travel-gitlab grep 'Password:' /etc/gitlab/initial_root_password

# Harbor默认密码
# 用户名: admin
# 密码: Harbor12345

# Grafana密码  
# 用户名: admin
# 密码: admin123
```

---

## 📋 **第四步：进度跟踪**

### **使用检查清单跟踪进度**
参考 `week1-2-implementation-checklist.md` 逐项完成：

```bash
# 每日更新进度
# ✅ 已完成
# 🔄 进行中  
# ❌ 遇到问题
# ⏸️ 暂停
```

### **每日进度报告**
```bash
# 创建每日报告
echo "## $(date '+%Y-%m-%d') 进度报告" >> daily-progress.md
echo "### 完成任务:" >> daily-progress.md
echo "- [ ] 任务描述" >> daily-progress.md
echo "### 遇到问题:" >> daily-progress.md  
echo "- 问题描述和解决方案" >> daily-progress.md
```

---

## 🚨 **故障排除**

### **常见问题和解决方案**

#### **1. GitLab启动失败**
```bash
# 检查日志
docker logs smart-travel-gitlab

# 常见原因：
# - 内存不足：增加swap或升级内存
# - 端口冲突：修改docker-compose.yml端口配置
# - 权限问题：检查SSL证书文件权限
```

#### **2. Harbor访问异常**
```bash
# 检查Harbor服务状态
docker-compose -f infrastructure/harbor/docker-compose.yml ps

# 常见原因：
# - SSL证书问题：重新生成证书
# - 数据库连接失败：检查PostgreSQL容器状态
# - 存储空间不足：清理Docker镜像和容器
```

#### **3. K3s集群问题**
```bash
# 检查K3s服务状态
sudo systemctl status k3s

# 检查节点状态
kubectl get nodes -o wide

# 常见原因：
# - 网络问题：检查防火墙和网络配置
# - 存储问题：检查磁盘空间和权限
# - 内存不足：检查系统资源使用情况
```

#### **4. 监控系统异常**
```bash
# 检查Prometheus状态
kubectl get pods -n monitoring -l app.kubernetes.io/name=prometheus

# 检查Grafana状态  
kubectl get pods -n monitoring -l app.kubernetes.io/name=grafana

# 常见原因：
# - 配置错误：检查ConfigMap配置
# - 资源不足：增加资源限制
# - 存储问题：检查PVC状态
```

---

## 📈 **成功指标**

### **Week 1-2 目标达成标准**
- [ ] **GitLab CE**: 正常访问，支持项目管理
- [ ] **Harbor**: 正常访问，支持镜像推拉
- [ ] **K3s集群**: 所有节点Ready，Pod正常运行
- [ ] **监控系统**: 指标收集正常，告警规则生效
- [ ] **集成测试**: 服务间通信正常
- [ ] **性能测试**: 响应时间满足要求

### **关键性能指标**
- GitLab响应时间 < 2秒
- Harbor镜像推拉速度 > 10MB/s  
- K8s API响应时间 < 500ms
- 监控数据收集延迟 < 30秒
- 系统整体可用性 > 99%

---

## 🎯 **下一步计划**

### **Week 3-4: CI Pipeline构建**
完成基础设施搭建后，将进入：
1. GitLab CI配置文件编写
2. 自动化测试集成
3. 代码质量检查集成  
4. 安全扫描集成

### **与现有监控系统集成**
确保新的CI/CD基础设施与immediate-action-plan.md中建立的监控系统完美集成：
- 复用现有的MetricsRegistry和MetricsCollector
- 扩展现有的错误处理机制
- 保持现有的质量门禁标准

---

## 📞 **支持和帮助**

### **遇到问题时**
1. **查看日志**: 使用docker logs和kubectl logs查看详细错误信息
2. **检查资源**: 确保CPU、内存、磁盘空间充足
3. **网络诊断**: 检查端口占用和防火墙配置
4. **参考文档**: 查看官方文档和社区解决方案

### **紧急联系**
- 技术支持：查看项目issue和文档
- 社区支持：GitLab、Harbor、K3s官方社区

---

## 🎉 **开始执行**

现在可以开始执行阶段一的实施计划：

```bash
# 1. 克隆或进入项目目录
cd smart-travel-assistant

# 2. 检查前置条件
./infrastructure/deploy-infrastructure.sh

# 3. 开始部署
# 选择 "1) 全部部署"

# 4. 跟踪进度
# 参考 week1-2-implementation-checklist.md
```

**预计完成时间**: 2周（80工时）
**预期成果**: 完整的云原生CI/CD基础设施
**下一阶段**: Week 3-4 CI Pipeline构建

---

**🚀 立即开始，让我们将智游助手v6.2的CI/CD体系提升到云原生水平！**
