# 智游助手v6.2 监控系统故障排除指南

**项目**: 智游助手v6.2  
**版本**: v6.2.0  
**文档类型**: 故障排除指南  
**更新日期**: 2025年8月6日  

---

## 🚨 **紧急修正：端口冲突问题**

### **问题描述**
- **Grafana端口冲突**: 原配置使用3001端口，与智游助手v6.2应用端口冲突
- **AlertManager无法访问**: http://localhost:9093 返回"Unauthorized"或无法连接

### **解决方案**

#### **1. 立即修正端口冲突**
```bash
# 停止现有监控服务
docker-compose -f docker-compose.monitoring.yml down

# 运行修正脚本
chmod +x scripts/restart-monitoring-fixed.sh
./scripts/restart-monitoring-fixed.sh
```

#### **2. 验证修正结果**
```bash
# 检查端口占用情况
lsof -i :3001  # 应该为空（释放给应用使用）
lsof -i :3002  # Grafana新端口
lsof -i :9093  # AlertManager

# 验证服务访问
curl -f http://localhost:3002/api/health  # Grafana
curl -f http://localhost:9093/-/healthy   # AlertManager
```

---

## 🔧 **常见问题及解决方案**

### **问题1: AlertManager返回"Unauthorized"**

**症状**:
```
{"message":"Unauthorized"}
```

**原因**: AlertManager配置缺少监听地址设置

**解决方案**:
```bash
# 检查AlertManager配置
docker logs smart-travel-alertmanager

# 修正配置（已在docker-compose.monitoring.yml中修正）
# 添加了 '--web.listen-address=0.0.0.0:9093' 参数

# 重启AlertManager
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

### **问题2: Grafana端口冲突**

**症状**:
```
Error starting userland proxy: listen tcp4 0.0.0.0:3001: bind: address already in use
```

**解决方案**:
```bash
# 检查端口占用
lsof -i :3001

# 停止占用进程（如果是其他服务）
kill -9 <PID>

# 或使用修正后的配置（推荐）
# Grafana现在使用3002端口，释放3001给应用使用
```

### **问题3: Prometheus无法收集应用指标**

**症状**:
- Prometheus targets显示应用为DOWN状态
- 无法访问 http://localhost:3000/metrics

**解决方案**:
```bash
# 1. 检查应用是否运行
curl -f http://localhost:3000/health

# 2. 检查应用是否已集成监控代码
curl -f http://localhost:3000/metrics

# 3. 如果应用未集成监控，需要添加监控代码
# 参考 src/monitoring/metrics.service.ts 和 metrics.controller.ts
```

### **问题4: 容器启动失败**

**症状**:
```
Container exited with code 1
```

**解决方案**:
```bash
# 查看具体错误日志
docker-compose -f docker-compose.monitoring.yml logs prometheus
docker-compose -f docker-compose.monitoring.yml logs grafana
docker-compose -f docker-compose.monitoring.yml logs alertmanager

# 检查配置文件语法
docker run --rm -v $(pwd)/monitoring:/etc/prometheus \
  prom/prometheus:latest promtool check config /etc/prometheus/prometheus.yml

# 检查磁盘空间
df -h

# 检查权限
ls -la monitoring/
```

### **问题5: 网络连接问题**

**症状**:
- 容器间无法通信
- 外部无法访问服务

**解决方案**:
```bash
# 检查Docker网络
docker network ls
docker network inspect smart-travel-monitoring

# 检查容器网络连接
docker exec smart-travel-prometheus ping grafana
docker exec smart-travel-grafana ping prometheus

# 重建网络
docker-compose -f docker-compose.monitoring.yml down
docker network prune
docker-compose -f docker-compose.monitoring.yml up -d
```

---

## 🔍 **诊断命令集合**

### **快速诊断脚本**
```bash
#!/bin/bash
echo "=== 智游助手v6.2 监控系统诊断 ==="

echo "1. 检查容器状态:"
docker-compose -f docker-compose.monitoring.yml ps

echo "2. 检查端口占用:"
echo "端口9090 (Prometheus):" && lsof -i :9090
echo "端口3002 (Grafana):" && lsof -i :3002
echo "端口9093 (AlertManager):" && lsof -i :9093

echo "3. 检查服务健康状态:"
echo "Prometheus:" && curl -s http://localhost:9090/-/healthy
echo "Grafana:" && curl -s http://localhost:3002/api/health
echo "AlertManager:" && curl -s http://localhost:9093/-/healthy

echo "4. 检查磁盘空间:"
df -h

echo "5. 检查内存使用:"
free -h

echo "6. 检查Docker资源:"
docker system df
```

### **日志收集脚本**
```bash
#!/bin/bash
LOG_DIR="monitoring-logs-$(date +%Y%m%d-%H%M%S)"
mkdir -p $LOG_DIR

echo "收集监控系统日志到 $LOG_DIR/"

# 收集容器日志
docker-compose -f docker-compose.monitoring.yml logs > $LOG_DIR/all-services.log
docker logs smart-travel-prometheus > $LOG_DIR/prometheus.log 2>&1
docker logs smart-travel-grafana > $LOG_DIR/grafana.log 2>&1
docker logs smart-travel-alertmanager > $LOG_DIR/alertmanager.log 2>&1

# 收集系统信息
docker-compose -f docker-compose.monitoring.yml ps > $LOG_DIR/container-status.txt
docker system df > $LOG_DIR/docker-usage.txt
lsof -i :9090,:3002,:9093 > $LOG_DIR/port-usage.txt

# 收集配置文件
cp monitoring/prometheus.yml $LOG_DIR/
cp monitoring/alertmanager.yml $LOG_DIR/
cp docker-compose.monitoring.yml $LOG_DIR/

echo "日志收集完成: $LOG_DIR/"
```

---

## 🚀 **性能优化建议**

### **1. 资源限制优化**
```yaml
# 在docker-compose.monitoring.yml中添加资源限制
services:
  prometheus:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
        reservations:
          memory: 256M
          cpus: '0.25'
```

### **2. 存储优化**
```bash
# 清理旧的监控数据
docker exec smart-travel-prometheus \
  find /prometheus -name "*.tmp" -delete

# 配置数据保留策略（已在prometheus.yml中配置为15天）
```

### **3. 网络优化**
```yaml
# 使用自定义网络提高性能
networks:
  smart-travel-monitoring:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

---

## 📞 **获取帮助**

### **自助诊断步骤**
1. 运行验证脚本: `./scripts/verify-monitoring-setup.sh`
2. 检查容器日志: `docker-compose -f docker-compose.monitoring.yml logs`
3. 验证配置文件: 检查monitoring/目录下的配置文件
4. 重启服务: `./scripts/restart-monitoring-fixed.sh`

### **联系支持**
如果问题仍然存在，请提供以下信息：
- 错误日志（使用上面的日志收集脚本）
- 系统环境信息（OS版本、Docker版本）
- 具体的错误症状和重现步骤

---

## ✅ **修正确认清单**

完成以下检查确认监控系统正常运行：

- [ ] **端口冲突已解决**
  - [ ] 端口3001已释放给智游助手v6.2应用使用
  - [ ] Grafana已迁移到端口3002
  - [ ] AlertManager在端口9093正常工作

- [ ] **服务访问正常**
  - [ ] Prometheus: http://localhost:9090 ✅
  - [ ] Grafana: http://localhost:3002 ✅ (admin/admin123)
  - [ ] AlertManager: http://localhost:9093 ✅

- [ ] **功能验证通过**
  - [ ] Prometheus收集指标正常
  - [ ] Grafana显示监控数据
  - [ ] AlertManager告警规则加载
  - [ ] 容器间网络通信正常

- [ ] **应用集成就绪**
  - [ ] 应用可以使用端口3001
  - [ ] 监控代码集成准备完成
  - [ ] 支付监控埋点准备就绪

**🎉 全部检查通过后，监控系统即可正常使用！**
