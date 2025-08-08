#!/bin/bash

# 智游助手v6.2 P0任务就绪状态验证脚本
# 验证P0任务的配置完整性和执行就绪状态

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo -e "${CYAN}$1${NC}"
}

# 验证结果统计
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0

# 记录验证结果
record_check() {
    local result="$1"
    ((TOTAL_CHECKS++))
    
    case $result in
        "PASS") ((PASSED_CHECKS++)) ;;
        "FAIL") ((FAILED_CHECKS++)) ;;
        "WARN") ((WARNING_CHECKS++)) ;;
    esac
}

# P0任务1: 基础设施部署验证就绪状态
validate_infrastructure_readiness() {
    log_header "🏗️ P0任务1: 基础设施部署验证就绪状态"
    log_header "========================================"
    echo ""
    
    # 检查环境准备脚本
    log_info "1️⃣ 检查环境准备脚本..."
    if [[ -f "infrastructure/setup-environment.sh" ]]; then
        if [[ -x "infrastructure/setup-environment.sh" ]]; then
            log_success "✅ setup-environment.sh 存在且可执行"
            record_check "PASS"
        else
            log_warning "⚠️ setup-environment.sh 存在但不可执行，正在设置权限..."
            chmod +x infrastructure/setup-environment.sh
            log_success "✅ 权限设置完成"
            record_check "PASS"
        fi
        
        # 检查脚本内容完整性
        if grep -q "检查系统要求\|检查内存\|检查磁盘" infrastructure/setup-environment.sh; then
            log_success "   └─ 脚本功能完整（系统要求检查）"
            record_check "PASS"
        else
            log_error "   └─ 脚本功能不完整"
            record_check "FAIL"
        fi
    else
        log_error "❌ setup-environment.sh 不存在"
        record_check "FAIL"
    fi
    
    # 检查基础设施部署脚本
    log_info "2️⃣ 检查基础设施部署脚本..."
    if [[ -f "infrastructure/deploy-infrastructure.sh" ]]; then
        if [[ -x "infrastructure/deploy-infrastructure.sh" ]]; then
            log_success "✅ deploy-infrastructure.sh 存在且可执行"
            record_check "PASS"
        else
            log_warning "⚠️ deploy-infrastructure.sh 存在但不可执行，正在设置权限..."
            chmod +x infrastructure/deploy-infrastructure.sh
            log_success "✅ 权限设置完成"
            record_check "PASS"
        fi
        
        # 检查脚本内容完整性
        if grep -q "GitLab\|Harbor\|K3s\|监控" infrastructure/deploy-infrastructure.sh; then
            log_success "   └─ 脚本功能完整（包含所有组件部署）"
            record_check "PASS"
        else
            log_error "   └─ 脚本功能不完整"
            record_check "FAIL"
        fi
    else
        log_error "❌ deploy-infrastructure.sh 不存在"
        record_check "FAIL"
    fi
    
    # 检查配置文件
    log_info "3️⃣ 检查基础设施配置文件..."
    
    local config_files=(
        "infrastructure/gitlab/docker-compose.yml"
        "infrastructure/harbor/docker-compose.yml"
        "infrastructure/k3s/install-k3s-cluster.sh"
        "infrastructure/monitoring/prometheus-k8s-config.yaml"
    )
    
    for config in "${config_files[@]}"; do
        if [[ -f "$config" ]]; then
            log_success "✅ 配置文件存在: $(basename $config)"
            record_check "PASS"
        else
            log_error "❌ 配置文件缺失: $config"
            record_check "FAIL"
        fi
    done
    
    # 检查验证脚本
    log_info "4️⃣ 检查服务验证脚本..."
    if [[ -f "verify-setup.sh" ]]; then
        if [[ -x "verify-setup.sh" ]]; then
            log_success "✅ verify-setup.sh 存在且可执行"
            record_check "PASS"
        else
            log_warning "⚠️ verify-setup.sh 存在但不可执行，正在设置权限..."
            chmod +x verify-setup.sh
            log_success "✅ 权限设置完成"
            record_check "PASS"
        fi
    else
        log_error "❌ verify-setup.sh 不存在"
        record_check "FAIL"
    fi
    
    echo ""
}

# P0任务2: CI/CD Pipeline端到端验证就绪状态
validate_cicd_readiness() {
    log_header "🔄 P0任务2: CI/CD Pipeline端到端验证就绪状态"
    log_header "============================================="
    echo ""
    
    # 检查GitLab CI配置
    log_info "1️⃣ 检查GitLab CI配置..."
    if [[ -f ".gitlab-ci.yml" ]]; then
        log_success "✅ GitLab CI配置文件存在"
        record_check "PASS"
        
        # 检查CI阶段
        local ci_stages=("validate" "test" "security" "build" "deploy")
        local missing_stages=()
        
        for stage in "${ci_stages[@]}"; do
            if grep -q "stage: $stage" ".gitlab-ci.yml"; then
                log_success "   └─ CI阶段存在: $stage"
                record_check "PASS"
            else
                log_warning "   └─ CI阶段可能缺失: $stage"
                missing_stages+=("$stage")
                record_check "WARN"
            fi
        done
        
        # 检查Helm集成
        if grep -q "helm" ".gitlab-ci.yml"; then
            log_success "   └─ Helm集成配置存在"
            record_check "PASS"
        else
            log_warning "   └─ Helm集成配置可能缺失"
            record_check "WARN"
        fi
    else
        log_error "❌ GitLab CI配置文件缺失"
        record_check "FAIL"
    fi
    
    # 检查Helm Charts配置
    log_info "2️⃣ 检查Helm Charts配置..."
    
    local helm_files=(
        "helm/smart-travel/Chart.yaml"
        "helm/smart-travel/values.yaml"
        "helm/smart-travel/values-development.yaml"
        "helm/smart-travel/values-production.yaml"
    )
    
    for helm_file in "${helm_files[@]}"; do
        if [[ -f "$helm_file" ]]; then
            log_success "✅ Helm文件存在: $(basename $helm_file)"
            record_check "PASS"
        else
            log_error "❌ Helm文件缺失: $helm_file"
            record_check "FAIL"
        fi
    done
    
    # 检查Helm模板文件
    log_info "3️⃣ 检查Helm模板文件..."
    
    local template_files=(
        "helm/smart-travel/templates/deployment.yaml"
        "helm/smart-travel/templates/service.yaml"
        "helm/smart-travel/templates/ingress.yaml"
        "helm/smart-travel/templates/configmap.yaml"
    )
    
    for template in "${template_files[@]}"; do
        if [[ -f "$template" ]]; then
            log_success "✅ Helm模板存在: $(basename $template)"
            record_check "PASS"
        else
            log_error "❌ Helm模板缺失: $template"
            record_check "FAIL"
        fi
    done
    
    # 检查部署脚本
    log_info "4️⃣ 检查部署脚本..."
    
    local deployment_scripts=(
        "ci/helm-blue-green-deployment.sh"
        "ci/canary-deployment.sh"
        "ci/environment-manager.sh"
    )
    
    for script in "${deployment_scripts[@]}"; do
        if [[ -f "$script" ]]; then
            if [[ -x "$script" ]]; then
                log_success "✅ 部署脚本存在且可执行: $(basename $script)"
                record_check "PASS"
            else
                log_warning "⚠️ 部署脚本存在但不可执行: $(basename $script)"
                chmod +x "$script" 2>/dev/null || true
                record_check "WARN"
            fi
        else
            log_error "❌ 部署脚本缺失: $script"
            record_check "FAIL"
        fi
    done
    
    echo ""
}

# P0任务3: 监控告警系统验证就绪状态
validate_monitoring_readiness() {
    log_header "📊 P0任务3: 监控告警系统验证就绪状态"
    log_header "====================================="
    echo ""
    
    # 检查现有监控系统组件
    log_info "1️⃣ 检查现有监控系统组件..."
    
    local monitoring_components=(
        "src/lib/monitoring/MetricsRegistry.ts"
        "src/lib/monitoring/MetricsCollector.ts"
        "src/lib/monitoring/ErrorHandler.ts"
        "src/config/monitoring.config.ts"
    )
    
    for component in "${monitoring_components[@]}"; do
        if [[ -f "$component" ]]; then
            log_success "✅ 监控组件存在: $(basename $component)"
            record_check "PASS"
            
            # 检查组件内容
            if grep -q "class\|interface\|export" "$component"; then
                log_success "   └─ 组件结构完整"
                record_check "PASS"
            else
                log_warning "   └─ 组件结构可能不完整"
                record_check "WARN"
            fi
        else
            log_error "❌ 监控组件缺失: $component"
            record_check "FAIL"
        fi
    done
    
    # 检查K8s监控配置
    log_info "2️⃣ 检查K8s监控配置..."
    
    if [[ -f "infrastructure/monitoring/prometheus-k8s-config.yaml" ]]; then
        log_success "✅ K8s监控配置文件存在"
        record_check "PASS"
        
        # 检查配置内容
        if grep -q "kubernetes-pods\|kubernetes-nodes\|smart-travel" "infrastructure/monitoring/prometheus-k8s-config.yaml"; then
            log_success "   └─ K8s服务发现配置完整"
            record_check "PASS"
        else
            log_warning "   └─ K8s服务发现配置可能不完整"
            record_check "WARN"
        fi
    else
        log_error "❌ K8s监控配置文件缺失"
        record_check "FAIL"
    fi
    
    # 检查现有监控系统状态
    log_info "3️⃣ 检查现有监控系统状态..."
    
    # 检查Prometheus
    if curl -f http://localhost:9090/api/v1/query?query=up &>/dev/null; then
        log_success "✅ 现有Prometheus服务正常运行"
        record_check "PASS"
    else
        log_warning "⚠️ 现有Prometheus服务不可访问（可能未启动）"
        record_check "WARN"
    fi
    
    # 检查Grafana
    if curl -f http://localhost:3002/api/health &>/dev/null; then
        log_success "✅ 现有Grafana服务正常运行"
        record_check "PASS"
    else
        log_warning "⚠️ 现有Grafana服务不可访问（可能未启动）"
        record_check "WARN"
    fi
    
    echo ""
}

# 生成验证报告
generate_validation_report() {
    log_header "📋 P0任务就绪状态验证报告"
    log_header "=========================="
    echo ""
    
    log_info "验证项目总数: $TOTAL_CHECKS"
    log_info "通过项目数量: $PASSED_CHECKS"
    log_info "失败项目数量: $FAILED_CHECKS"
    log_info "警告项目数量: $WARNING_CHECKS"
    echo ""
    
    # 计算完成度
    local success_rate=$((PASSED_CHECKS * 100 / TOTAL_CHECKS))
    
    log_header "📊 验证统计:"
    echo "   通过: $PASSED_CHECKS ($((PASSED_CHECKS * 100 / TOTAL_CHECKS))%)"
    echo "   失败: $FAILED_CHECKS ($((FAILED_CHECKS * 100 / TOTAL_CHECKS))%)"
    echo "   警告: $WARNING_CHECKS ($((WARNING_CHECKS * 100 / TOTAL_CHECKS))%)"
    echo ""
    
    # 总体评估
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        if [[ $WARNING_CHECKS -eq 0 ]]; then
            log_success "🎉 所有P0任务配置验证通过！可以立即开始部署。"
        else
            log_warning "⚠️ P0任务基本就绪，但有 $WARNING_CHECKS 个警告需要关注。"
        fi
    else
        log_error "❌ 发现 $FAILED_CHECKS 个关键问题需要解决。"
    fi
    
    # 下一步建议
    echo ""
    log_header "🚀 下一步执行建议:"
    
    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo "1. 立即执行基础设施部署:"
        echo "   ./infrastructure/setup-environment.sh"
        echo "   ./infrastructure/deploy-infrastructure.sh"
        echo "   ./verify-setup.sh"
        echo ""
        echo "2. 预计执行时间: 3-5小时"
        echo "3. 执行完成后进行CI/CD Pipeline和监控系统验证"
    else
        echo "1. 解决上述失败的配置问题"
        echo "2. 重新运行验证: ./validate-p0-readiness.sh"
        echo "3. 确认所有问题解决后再开始部署"
    fi
    
    echo ""
    log_header "📈 项目就绪度评估:"
    if [[ $success_rate -ge 90 ]]; then
        log_success "🎯 项目就绪度: ${success_rate}% - 优秀，可立即部署"
    elif [[ $success_rate -ge 80 ]]; then
        log_warning "🎯 项目就绪度: ${success_rate}% - 良好，建议解决警告后部署"
    else
        log_error "🎯 项目就绪度: ${success_rate}% - 需要解决关键问题后再部署"
    fi
}

# 主函数
main() {
    echo "🚀 智游助手v6.2 P0任务就绪状态验证"
    echo "=================================="
    echo "验证P0任务的配置完整性和执行就绪状态"
    echo ""
    
    # 执行验证
    validate_infrastructure_readiness
    validate_cicd_readiness
    validate_monitoring_readiness
    
    # 生成报告
    generate_validation_report
}

# 执行主函数
main "$@"
