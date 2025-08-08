# Week 1-2 基础设施搭建实施检查清单

## 📅 **时间安排：Week 1-2 (2024年1月8日 - 2024年1月19日)**

### **总体目标**
- 完成GitLab CE、Harbor、K3s集群、基础监控的部署
- 建立完整的CI/CD基础设施
- 与现有监控系统（immediate-action-plan.md成果）无缝集成

---

## 🔧 **任务1: GitLab CE部署和配置 (16小时)**

### **Day 1-2: GitLab CE基础部署**

#### **前置准备** ✅
- [ ] **服务器资源准备** (2小时)
  - [ ] 准备4核8G服务器，100G SSD存储
  - [ ] 确保Docker和Docker Compose已安装
  - [ ] 配置防火墙规则（80, 443, 2222端口）
  - [ ] 准备域名解析：gitlab.smarttravel.local

#### **SSL证书配置** ✅
- [ ] **生成SSL证书** (1小时)
  - [ ] 执行 `infrastructure/deploy-infrastructure.sh` 中的证书生成
  - [ ] 验证证书文件：`infrastructure/ssl/gitlab.crt` 和 `gitlab.key`
  - [ ] 设置正确的文件权限（600 for key, 644 for crt）

#### **GitLab服务部署** ✅
- [ ] **Docker Compose部署** (4小时)
  - [ ] 使用 `infrastructure/gitlab/docker-compose.yml` 部署
  - [ ] 验证所有容器正常启动：
    ```bash
    docker-compose -f infrastructure/gitlab/docker-compose.yml ps
    ```
  - [ ] 检查GitLab服务状态：
    ```bash
    curl -k https://gitlab.smarttravel.local/users/sign_in
    ```
  - [ ] 获取初始root密码：
    ```bash
    docker exec smart-travel-gitlab grep 'Password:' /etc/gitlab/initial_root_password
    ```

#### **GitLab基础配置** ✅
- [ ] **管理员配置** (2小时)
  - [ ] 使用root账户登录GitLab
  - [ ] 修改root密码为安全密码
  - [ ] 配置管理员邮箱
  - [ ] 禁用用户注册（Admin Area > Settings > Sign-up restrictions）

- [ ] **SMTP邮件配置** (1小时)
  - [ ] 配置SMTP服务器设置
  - [ ] 测试邮件发送功能
  - [ ] 验证邮件通知正常工作

#### **项目和用户管理** ✅
- [ ] **创建组织和项目** (2小时)
  - [ ] 创建 `smart-travel` 组织
  - [ ] 创建 `smart-travel-assistant` 项目
  - [ ] 设置项目可见性为Private
  - [ ] 配置项目描述和标签

- [ ] **用户权限配置** (1小时)
  - [ ] 创建开发团队用户账户
  - [ ] 分配适当的角色权限
  - [ ] 配置SSH密钥访问

#### **备份和安全配置** ✅
- [ ] **备份策略配置** (2小时)
  - [ ] 配置自动备份（每日凌晨2点）
  - [ ] 设置备份保留期（7天）
  - [ ] 测试备份和恢复流程
  - [ ] 验证备份文件完整性

- [ ] **安全加固** (1小时)
  - [ ] 启用两因素认证
  - [ ] 配置IP白名单（如需要）
  - [ ] 设置密码复杂度要求
  - [ ] 启用审计日志

### **验收标准**
- [ ] GitLab服务正常访问 (https://gitlab.smarttravel.local)
- [ ] HTTPS证书有效且无警告
- [ ] 邮件通知功能正常
- [ ] 用户注册和登录正常
- [ ] 项目创建和管理正常
- [ ] 备份恢复测试通过
- [ ] 安全配置生效

---

## 🐳 **任务2: Harbor镜像仓库搭建 (8小时)**

### **Day 3: Harbor部署和配置**

#### **Harbor服务部署** ✅
- [ ] **基础部署** (3小时)
  - [ ] 使用 `infrastructure/harbor/docker-compose.yml` 部署
  - [ ] 验证所有Harbor组件启动：
    ```bash
    docker-compose -f infrastructure/harbor/docker-compose.yml ps
    ```
  - [ ] 检查Harbor Web界面访问：
    ```bash
    curl -k https://harbor.smarttravel.local
    ```

#### **Harbor配置** ✅
- [ ] **管理员配置** (2小时)
  - [ ] 使用admin/Harbor12345登录
  - [ ] 修改管理员密码
  - [ ] 配置Harbor系统设置
  - [ ] 设置镜像保留策略

- [ ] **项目和用户管理** (1.5小时)
  - [ ] 创建 `smart-travel` 项目
  - [ ] 设置项目访问权限
  - [ ] 创建开发团队用户
  - [ ] 配置Robot账户用于CI/CD

#### **安全扫描配置** ✅
- [ ] **Trivy安全扫描** (1小时)
  - [ ] 验证Trivy服务正常运行
  - [ ] 配置自动安全扫描
  - [ ] 设置漏洞阻止策略
  - [ ] 测试镜像安全扫描功能

#### **集成测试** ✅
- [ ] **Docker客户端集成** (0.5小时)
  - [ ] 配置Docker客户端信任Harbor证书
  - [ ] 测试镜像推送：
    ```bash
    docker tag nginx:alpine harbor.smarttravel.local/smart-travel/nginx:test
    docker push harbor.smarttravel.local/smart-travel/nginx:test
    ```
  - [ ] 测试镜像拉取：
    ```bash
    docker pull harbor.smarttravel.local/smart-travel/nginx:test
    ```

### **验收标准**
- [ ] Harbor服务正常访问 (https://harbor.smarttravel.local)
- [ ] 镜像推送和拉取正常
- [ ] 安全扫描功能正常
- [ ] 权限控制有效
- [ ] 备份恢复测试通过

---

## ☸️ **任务3: K3s集群搭建 (12小时)**

### **Day 4-5: K3s集群部署**

#### **系统准备** ✅
- [ ] **环境检查** (1小时)
  - [ ] 执行 `infrastructure/k3s/install-k3s-cluster.sh` 中的系统检查
  - [ ] 验证内存≥2GB，磁盘≥20GB
  - [ ] 检查网络连通性
  - [ ] 禁用swap分区

#### **K3s主节点安装** ✅
- [ ] **主节点部署** (3小时)
  - [ ] 执行K3s安装脚本
  - [ ] 验证主节点状态：
    ```bash
    sudo k3s kubectl get nodes
    ```
  - [ ] 检查系统Pod状态：
    ```bash
    sudo k3s kubectl get pods -A
    ```
  - [ ] 获取节点token用于工作节点加入

#### **工作节点部署** ✅
- [ ] **工作节点加入** (2小时)
  - [ ] 在工作节点上执行加入命令
  - [ ] 验证所有节点Ready状态
  - [ ] 检查节点标签和污点配置

#### **网络和存储配置** ✅
- [ ] **网络插件配置** (2小时)
  - [ ] 验证Flannel网络正常工作
  - [ ] 测试Pod间网络通信
  - [ ] 配置网络策略（如需要）

- [ ] **存储类配置** (1小时)
  - [ ] 配置local-path存储类为默认
  - [ ] 测试PVC创建和挂载
  - [ ] 验证存储卷功能

#### **Ingress和证书管理** ✅
- [ ] **Nginx Ingress部署** (2小时)
  - [ ] 部署nginx-ingress控制器
  - [ ] 验证Ingress服务正常
  - [ ] 测试HTTP/HTTPS路由

- [ ] **cert-manager部署** (1小时)
  - [ ] 部署cert-manager
  - [ ] 配置Let's Encrypt ClusterIssuer
  - [ ] 测试自动证书签发

### **验收标准**
- [ ] 所有节点状态Ready
- [ ] Pod网络通信正常
- [ ] 存储卷创建和挂载正常
- [ ] Ingress路由正常
- [ ] SSL证书自动签发正常
- [ ] kubectl命令正常工作

---

## 📊 **任务4: 基础监控扩展 (8小时)**

### **Day 6: 监控系统集成**

#### **Prometheus配置扩展** ✅
- [ ] **K8s监控集成** (3小时)
  - [ ] 应用 `infrastructure/monitoring/prometheus-k8s-config.yaml`
  - [ ] 验证Kubernetes服务发现正常
  - [ ] 检查Pod、Node、Service监控指标
  - [ ] 确认与现有监控系统兼容

#### **Prometheus Operator部署** ✅
- [ ] **Operator安装** (2小时)
  - [ ] 使用Helm部署kube-prometheus-stack
  - [ ] 验证Prometheus、Grafana、AlertManager正常运行
  - [ ] 检查ServiceMonitor和PrometheusRule CRD

#### **监控规则配置** ✅
- [ ] **告警规则配置** (2小时)
  - [ ] 应用智游助手应用告警规则
  - [ ] 配置支付系统专项告警
  - [ ] 设置Kubernetes集群告警
  - [ ] 配置CI/CD流水线告警

#### **Grafana仪表板** ✅
- [ ] **仪表板配置** (1小时)
  - [ ] 导入Kubernetes集群仪表板
  - [ ] 配置智游助手应用仪表板
  - [ ] 设置支付系统监控仪表板
  - [ ] 验证数据源连接正常

### **验收标准**
- [ ] Prometheus正常收集K8s指标
- [ ] Grafana仪表板显示正常
- [ ] 告警规则触发正常
- [ ] 与现有监控系统无缝集成
- [ ] 监控数据持久化正常

---

## 🔗 **集成验证和测试**

### **Day 7: 端到端集成测试**

#### **服务间集成测试** ✅
- [ ] **GitLab + Harbor集成** (1小时)
  - [ ] 在GitLab中配置Harbor镜像仓库
  - [ ] 测试CI流水线推送镜像到Harbor
  - [ ] 验证镜像安全扫描集成

- [ ] **GitLab + K8s集成** (1小时)
  - [ ] 配置GitLab Runner连接K8s集群
  - [ ] 测试部署应用到K8s
  - [ ] 验证kubectl命令执行

- [ ] **监控系统集成** (1小时)
  - [ ] 验证所有服务监控指标正常
  - [ ] 测试告警规则触发
  - [ ] 检查监控数据完整性

#### **性能和负载测试** ✅
- [ ] **基础性能测试** (2小时)
  - [ ] 测试GitLab响应时间
  - [ ] 测试Harbor镜像推拉性能
  - [ ] 测试K8s集群资源使用
  - [ ] 验证监控系统性能影响

### **验收标准**
- [ ] 所有服务正常运行
- [ ] 服务间集成正常
- [ ] 性能指标满足要求
- [ ] 监控覆盖完整

---

## 📋 **Week 1-2 总体验收标准**

### **功能验收**
- [ ] GitLab CE服务正常，支持项目管理和用户认证
- [ ] Harbor镜像仓库正常，支持镜像推拉和安全扫描
- [ ] K3s集群正常，支持应用部署和服务发现
- [ ] 监控系统正常，支持指标收集和告警

### **性能验收**
- [ ] GitLab响应时间 < 2秒
- [ ] Harbor镜像推拉速度 > 10MB/s
- [ ] K8s API响应时间 < 500ms
- [ ] 监控数据收集延迟 < 30秒

### **安全验收**
- [ ] 所有服务使用HTTPS加密
- [ ] 用户认证和权限控制正常
- [ ] 镜像安全扫描无高危漏洞
- [ ] 网络访问控制有效

### **可用性验收**
- [ ] 所有服务可用性 > 99%
- [ ] 备份恢复流程测试通过
- [ ] 故障转移机制有效
- [ ] 监控告警及时准确

---

## 📊 **进度跟踪**

### **每日进度报告模板**
```
日期: ____年__月__日
完成任务: 
- [ ] 任务1
- [ ] 任务2

遇到问题:
- 问题描述
- 解决方案

明日计划:
- [ ] 计划任务1
- [ ] 计划任务2

风险评估:
- 风险点
- 缓解措施
```

### **里程碑检查点**
- **Day 2**: GitLab CE部署完成
- **Day 3**: Harbor部署完成  
- **Day 5**: K3s集群部署完成
- **Day 6**: 监控系统集成完成
- **Day 7**: 端到端测试完成

---

## 🚨 **风险控制**

### **技术风险**
- **风险**: 服务启动失败
- **缓解**: 详细日志分析，回滚机制
- **应急**: 使用备用配置

### **时间风险**  
- **风险**: 任务延期
- **缓解**: 每日进度检查，及时调整
- **应急**: 优先核心功能

### **资源风险**
- **风险**: 硬件资源不足
- **缓解**: 提前资源规划，监控使用情况
- **应急**: 临时扩容方案

---

**注意**: 此检查清单需要每日更新进度，遇到问题及时记录和解决。每个任务完成后都要进行验收确认。
