# 🚀 智游助手v6.2 CI/CD阶段一快速启动指南

## ⚡ **立即开始执行**

基于immediate-action-plan.md的成功执行基础，现在立即开始阶段一的CI/CD基础设施搭建。

---

## 📋 **执行前检查清单**

### ✅ **前置条件确认**
- [x] immediate-action-plan.md已成功执行
- [x] 现有Prometheus+Grafana监控系统正常运行
- [x] MetricsRegistry和MetricsCollector架构已建立
- [x] 错误处理和降级机制已实现

### 🔧 **系统要求**
- **CPU**: ≥ 4核心
- **内存**: ≥ 8GB
- **磁盘**: ≥ 100GB可用空间
- **网络**: 稳定的互联网连接

---

## 🎯 **三步快速启动**

### **第一步: 环境准备** (5分钟)

```bash
# 1. 进入项目目录
cd smart-travel-assistant

# 2. 设置执行权限
chmod +x infrastructure/setup-environment.sh
chmod +x infrastructure/deploy-infrastructure.sh
chmod +x infrastructure/track-progress.sh

# 3. 运行环境准备
./infrastructure/setup-environment.sh
```

**预期结果**: 
- ✅ 系统要求检查通过
- ✅ 必要软件已安装
- ✅ 目录结构创建完成
- ✅ 环境配置文件生成

### **第二步: 一键部署** (4-6小时)

```bash
# 执行一键部署脚本
./infrastructure/deploy-infrastructure.sh

# 在菜单中选择: 1) 全部部署
```

**部署顺序**:
1. **SSL证书生成** (2分钟)
2. **GitLab CE部署** (30-60分钟)
3. **Harbor镜像仓库部署** (15-30分钟)
4. **K3s集群搭建** (30-60分钟)
5. **监控系统扩展** (15-30分钟)

### **第三步: 验证和配置** (1-2小时)

```bash
# 1. 检查所有服务状态
./infrastructure/track-progress.sh

# 2. 配置hosts文件 (Linux/Mac)
sudo echo "127.0.0.1 gitlab.smarttravel.local" >> /etc/hosts
sudo echo "127.0.0.1 harbor.smarttravel.local" >> /etc/hosts

# 3. 获取初始密码
docker exec smart-travel-gitlab grep 'Password:' /etc/gitlab/initial_root_password
```

---

## 🌐 **服务访问地址**

部署完成后，可以通过以下地址访问服务：

| 服务 | 地址 | 用户名 | 密码 |
|------|------|--------|------|
| **GitLab CE** | https://gitlab.smarttravel.local | root | 见容器日志 |
| **Harbor** | https://harbor.smarttravel.local | admin | Harbor12345 |
| **现有Grafana** | http://localhost:3002 | admin | admin123 |
| **K8s Prometheus** | http://localhost:30901 | - | - |
| **K8s Grafana** | http://localhost:30301 | admin | admin123 |

---

## 📊 **实时进度跟踪**

### **监控部署进度**
```bash
# 每30分钟运行一次，跟踪部署进度
./infrastructure/track-progress.sh
```

### **查看详细日志**
```bash
# GitLab日志
docker logs smart-travel-gitlab -f

# Harbor日志
docker logs harbor-core -f

# K3s日志
sudo journalctl -u k3s -f

# 监控系统日志
kubectl logs -n monitoring -l app.kubernetes.io/name=prometheus -f
```

### **检查服务状态**
```bash
# Docker容器状态
docker ps

# K8s集群状态
kubectl get nodes
kubectl get pods -A

# 监控系统状态
kubectl get pods -n monitoring
```

---

## 🚨 **常见问题和解决方案**

### **问题1: GitLab启动缓慢**
```bash
# 原因: GitLab首次启动需要初始化数据库
# 解决: 耐心等待，通常需要5-10分钟

# 检查启动进度
docker logs smart-travel-gitlab | tail -20
```

### **问题2: Harbor访问失败**
```bash
# 原因: SSL证书或端口冲突
# 解决: 检查证书和端口配置

# 重新生成证书
openssl req -x509 -newkey rsa:4096 -keyout infrastructure/ssl/harbor.key -out infrastructure/ssl/harbor.crt -days 365 -nodes
```

### **问题3: K3s节点NotReady**
```bash
# 原因: 网络或资源问题
# 解决: 检查系统资源和网络配置

# 重启K3s服务
sudo systemctl restart k3s
kubectl get nodes
```

### **问题4: 监控数据缺失**
```bash
# 原因: 配置或网络问题
# 解决: 检查Prometheus配置和目标

# 检查Prometheus目标
curl http://localhost:30901/api/v1/targets
```

---

## 📈 **成功指标**

### **部署成功标准**
- [ ] 所有Docker容器状态为"Up"
- [ ] K3s所有节点状态为"Ready"
- [ ] 所有Web界面可正常访问
- [ ] 监控指标正常收集

### **性能基准**
- GitLab响应时间 < 2秒
- Harbor镜像推拉速度 > 10MB/s
- K8s API响应时间 < 500ms
- 监控数据收集延迟 < 30秒

### **集成验证**
- [ ] 现有监控系统继续正常工作
- [ ] 新的K8s监控数据正常收集
- [ ] 监控数据联邦配置生效
- [ ] 告警规则正常触发

---

## 🎯 **完成后的下一步**

### **Week 3-4: CI Pipeline构建**
1. **GitLab CI配置**: 编写.gitlab-ci.yml
2. **自动化测试**: 集成单元测试和E2E测试
3. **代码质量检查**: ESLint、TypeScript检查
4. **安全扫描**: 依赖漏洞和代码安全扫描

### **配置和优化**
1. **用户和权限管理**: 创建开发团队账户
2. **项目配置**: 导入现有代码库
3. **监控仪表板**: 配置业务监控面板
4. **备份策略**: 配置自动备份和恢复

---

## 📞 **获取帮助**

### **实时状态检查**
```bash
# 一键状态检查
./infrastructure/track-progress.sh
```

### **问题排查步骤**
1. **查看执行状态**: `cat EXECUTION-STATUS.md`
2. **检查服务日志**: 使用上述日志命令
3. **重新运行部署**: `./infrastructure/deploy-infrastructure.sh`
4. **分步调试**: 选择单独部署选项

### **紧急联系**
- 查看项目文档和issue
- 参考官方文档: GitLab、Harbor、K3s
- 社区支持论坛

---

## 🎉 **立即开始**

现在一切准备就绪！执行以下命令开始部署：

```bash
# 🚀 开始执行阶段一实施计划
./infrastructure/setup-environment.sh && ./infrastructure/deploy-infrastructure.sh
```

**预计完成时间**: 2周（80工时）
**预期成果**: 完整的云原生CI/CD基础设施
**下一阶段**: Week 3-4 CI Pipeline构建

---

**🎯 让我们开始将智游助手v6.2提升到云原生CI/CD水平！**
