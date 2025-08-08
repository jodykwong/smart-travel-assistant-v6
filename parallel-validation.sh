#!/bin/bash

# 智游助手v6.2 并行优化策略执行脚本
# 基于当前状态：阶段一95%完成，Week 3-4 CI Pipeline完成，Week 5-6 CD Pipeline完成

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

# 全局变量
VALIDATION_RESULTS=()
FAILED_VALIDATIONS=()
START_TIME=$(date +%s)

# 记录验证结果
record_result() {
    local test_name="$1"
    local result="$2"
    local details="$3"
    
    VALIDATION_RESULTS+=("$test_name:$result:$details")
    
    if [ "$result" = "FAIL" ]; then
        FAILED_VALIDATIONS+=("$test_name")
    fi
}

# 第一优先级：基础设施服务可用性验证
validate_infrastructure_readiness() {
    log_header "🏗️ 第一优先级：基础设施服务可用性验证"
    log_header "============================================="
    echo ""
    
    # 1. 检查基础设施配置文件完整性
    log_info "1️⃣ 检查基础设施配置文件完整性..."
    
    local config_files=(
        "infrastructure/gitlab/docker-compose.yml"
        "infrastructure/harbor/docker-compose.yml"
        "infrastructure/k3s/install-k3s-cluster.sh"
        "infrastructure/monitoring/prometheus-k8s-config.yaml"
    )
    
    local missing_configs=()
    for config in "${config_files[@]}"; do
        if [[ -f "$config" ]]; then
            log_success "✅ 配置文件存在: $config"
        else
            log_error "❌ 配置文件缺失: $config"
            missing_configs+=("$config")
        fi
    done
    
    if [[ ${#missing_configs[@]} -eq 0 ]]; then
        record_result "基础设施配置完整性" "PASS" "所有配置文件存在"
    else
        record_result "基础设施配置完整性" "FAIL" "缺失配置: ${missing_configs[*]}"
    fi
    
    # 2. 检查Docker和Docker Compose可用性
    log_info "2️⃣ 检查Docker环境..."
    
    if command -v docker &> /dev/null; then
        if docker info &> /dev/null; then
            log_success "✅ Docker服务运行正常"
            record_result "Docker服务" "PASS" "Docker daemon运行正常"
        else
            log_error "❌ Docker服务未运行"
            record_result "Docker服务" "FAIL" "Docker daemon未运行"
        fi
    else
        log_error "❌ Docker未安装"
        record_result "Docker安装" "FAIL" "Docker命令不存在"
    fi
    
    if command -v docker-compose &> /dev/null; then
        log_success "✅ Docker Compose可用"
        record_result "Docker Compose" "PASS" "命令可用"
    else
        log_error "❌ Docker Compose未安装"
        record_result "Docker Compose" "FAIL" "命令不存在"
    fi
    
    # 3. 检查系统资源
    log_info "3️⃣ 检查系统资源..."
    
    local available_memory=$(free -m | awk 'NR==2{printf "%.0f", $7}')
    local available_disk=$(df -h . | awk 'NR==2{print $4}' | sed 's/G//')
    
    if [[ $available_memory -gt 4096 ]]; then
        log_success "✅ 可用内存充足: ${available_memory}MB"
        record_result "系统内存" "PASS" "${available_memory}MB可用"
    else
        log_warning "⚠️ 可用内存不足: ${available_memory}MB (建议>4GB)"
        record_result "系统内存" "WARN" "${available_memory}MB可用，建议>4GB"
    fi
    
    if [[ ${available_disk%.*} -gt 20 ]]; then
        log_success "✅ 可用磁盘空间充足: ${available_disk}"
        record_result "磁盘空间" "PASS" "${available_disk}可用"
    else
        log_warning "⚠️ 可用磁盘空间不足: ${available_disk} (建议>20GB)"
        record_result "磁盘空间" "WARN" "${available_disk}可用，建议>20GB"
    fi
    
    echo ""
}

# 第二优先级：监控系统数据收集验证
validate_monitoring_integration() {
    log_header "📊 第二优先级：监控系统数据收集验证"
    log_header "======================================="
    echo ""
    
    # 1. 检查现有监控系统组件
    log_info "1️⃣ 检查现有监控系统组件..."
    
    local monitoring_components=(
        "src/lib/monitoring/MetricsRegistry.ts"
        "src/lib/monitoring/MetricsCollector.ts"
        "src/lib/monitoring/ErrorHandler.ts"
        "src/config/monitoring.config.ts"
    )
    
    local missing_components=()
    for component in "${monitoring_components[@]}"; do
        if [[ -f "$component" ]]; then
            log_success "✅ 监控组件存在: $(basename $component)"
            
            # 检查组件内容完整性
            if grep -q "class.*Registry\|interface.*Collector\|class.*Handler" "$component"; then
                log_success "   └─ 组件结构完整"
            else
                log_warning "   └─ 组件结构可能不完整"
            fi
        else
            log_error "❌ 监控组件缺失: $component"
            missing_components+=("$component")
        fi
    done
    
    if [[ ${#missing_components[@]} -eq 0 ]]; then
        record_result "监控组件完整性" "PASS" "所有监控组件存在"
    else
        record_result "监控组件完整性" "FAIL" "缺失组件: ${missing_components[*]}"
    fi
    
    # 2. 检查监控配置文件
    log_info "2️⃣ 检查监控配置文件..."
    
    if [[ -f "infrastructure/monitoring/prometheus-k8s-config.yaml" ]]; then
        log_success "✅ Prometheus K8s配置存在"
        
        # 检查配置内容
        if grep -q "kubernetes-pods\|kubernetes-nodes" "infrastructure/monitoring/prometheus-k8s-config.yaml"; then
            log_success "   └─ K8s服务发现配置完整"
            record_result "Prometheus K8s配置" "PASS" "配置完整"
        else
            log_warning "   └─ K8s服务发现配置可能不完整"
            record_result "Prometheus K8s配置" "WARN" "配置可能不完整"
        fi
    else
        log_error "❌ Prometheus K8s配置缺失"
        record_result "Prometheus K8s配置" "FAIL" "配置文件不存在"
    fi
    
    # 3. 检查监控端口配置
    log_info "3️⃣ 检查监控端口配置..."
    
    local monitoring_ports=("9090" "3002" "30901" "30301")
    for port in "${monitoring_ports[@]}"; do
        if netstat -tuln 2>/dev/null | grep -q ":$port "; then
            log_info "端口 $port 已被占用（可能是现有监控服务）"
        else
            log_info "端口 $port 可用"
        fi
    done
    
    record_result "监控端口检查" "PASS" "端口状态已检查"
    
    echo ""
}

# 第三优先级：CI/CD Pipeline端到端功能验证
validate_cicd_pipeline() {
    log_header "🔄 第三优先级：CI/CD Pipeline端到端功能验证"
    log_header "============================================="
    echo ""
    
    # 1. 检查CI Pipeline配置
    log_info "1️⃣ 检查CI Pipeline配置..."
    
    if [[ -f ".gitlab-ci.yml" ]]; then
        log_success "✅ GitLab CI配置文件存在"
        
        # 检查CI阶段配置
        local ci_stages=("validate" "test" "security" "build" "deploy")
        local missing_stages=()
        
        for stage in "${ci_stages[@]}"; do
            if grep -q "stage: $stage" ".gitlab-ci.yml"; then
                log_success "   └─ CI阶段存在: $stage"
            else
                log_warning "   └─ CI阶段可能缺失: $stage"
                missing_stages+=("$stage")
            fi
        done
        
        if [[ ${#missing_stages[@]} -eq 0 ]]; then
            record_result "CI Pipeline阶段" "PASS" "所有阶段配置完整"
        else
            record_result "CI Pipeline阶段" "WARN" "可能缺失阶段: ${missing_stages[*]}"
        fi
        
        # 检查Helm集成
        if grep -q "helm" ".gitlab-ci.yml"; then
            log_success "   └─ Helm集成配置存在"
            record_result "Helm CI集成" "PASS" "Helm配置存在"
        else
            log_warning "   └─ Helm集成配置可能缺失"
            record_result "Helm CI集成" "WARN" "Helm配置可能缺失"
        fi
        
    else
        log_error "❌ GitLab CI配置文件缺失"
        record_result "GitLab CI配置" "FAIL" "配置文件不存在"
    fi
    
    # 2. 检查Helm Charts配置
    log_info "2️⃣ 检查Helm Charts配置..."
    
    local helm_files=(
        "helm/smart-travel/Chart.yaml"
        "helm/smart-travel/values.yaml"
        "helm/smart-travel/values-development.yaml"
        "helm/smart-travel/values-production.yaml"
    )
    
    local missing_helm_files=()
    for helm_file in "${helm_files[@]}"; do
        if [[ -f "$helm_file" ]]; then
            log_success "✅ Helm文件存在: $(basename $helm_file)"
        else
            log_error "❌ Helm文件缺失: $helm_file"
            missing_helm_files+=("$helm_file")
        fi
    done
    
    if [[ ${#missing_helm_files[@]} -eq 0 ]]; then
        record_result "Helm Charts配置" "PASS" "所有Helm文件存在"
    else
        record_result "Helm Charts配置" "FAIL" "缺失文件: ${missing_helm_files[*]}"
    fi
    
    # 3. 检查部署脚本
    log_info "3️⃣ 检查部署脚本..."
    
    local deployment_scripts=(
        "ci/helm-blue-green-deployment.sh"
        "ci/canary-deployment.sh"
        "ci/environment-manager.sh"
        "ci/payment-system-protection.sh"
    )
    
    local missing_scripts=()
    for script in "${deployment_scripts[@]}"; do
        if [[ -f "$script" ]]; then
            log_success "✅ 部署脚本存在: $(basename $script)"
            
            # 检查脚本可执行权限
            if [[ -x "$script" ]]; then
                log_success "   └─ 脚本具有执行权限"
            else
                log_warning "   └─ 脚本缺少执行权限"
            fi
        else
            log_error "❌ 部署脚本缺失: $script"
            missing_scripts+=("$script")
        fi
    done
    
    if [[ ${#missing_scripts[@]} -eq 0 ]]; then
        record_result "部署脚本配置" "PASS" "所有部署脚本存在"
    else
        record_result "部署脚本配置" "FAIL" "缺失脚本: ${missing_scripts[*]}"
    fi
    
    echo ""
}

# 集成测试执行
execute_integration_tests() {
    log_header "🧪 集成测试执行"
    log_header "==============="
    echo ""
    
    # 1. 测试配置文件语法
    log_info "1️⃣ 测试配置文件语法..."
    
    # 测试Docker Compose文件语法
    if [[ -f "infrastructure/gitlab/docker-compose.yml" ]]; then
        if docker-compose -f infrastructure/gitlab/docker-compose.yml config &> /dev/null; then
            log_success "✅ GitLab Docker Compose语法正确"
            record_result "GitLab Compose语法" "PASS" "语法验证通过"
        else
            log_error "❌ GitLab Docker Compose语法错误"
            record_result "GitLab Compose语法" "FAIL" "语法验证失败"
        fi
    fi
    
    if [[ -f "infrastructure/harbor/docker-compose.yml" ]]; then
        if docker-compose -f infrastructure/harbor/docker-compose.yml config &> /dev/null; then
            log_success "✅ Harbor Docker Compose语法正确"
            record_result "Harbor Compose语法" "PASS" "语法验证通过"
        else
            log_error "❌ Harbor Docker Compose语法错误"
            record_result "Harbor Compose语法" "FAIL" "语法验证失败"
        fi
    fi
    
    # 2. 测试Helm Charts语法
    log_info "2️⃣ 测试Helm Charts语法..."
    
    if command -v helm &> /dev/null && [[ -d "helm/smart-travel" ]]; then
        if helm lint helm/smart-travel/ &> /dev/null; then
            log_success "✅ Helm Charts语法正确"
            record_result "Helm Charts语法" "PASS" "语法验证通过"
        else
            log_error "❌ Helm Charts语法错误"
            record_result "Helm Charts语法" "FAIL" "语法验证失败"
        fi
    else
        log_warning "⚠️ Helm未安装或Charts目录不存在，跳过语法检查"
        record_result "Helm Charts语法" "SKIP" "Helm未安装或目录不存在"
    fi
    
    # 3. 测试脚本语法
    log_info "3️⃣ 测试脚本语法..."
    
    local scripts_to_test=(
        "infrastructure/deploy-infrastructure.sh"
        "ci/helm-blue-green-deployment.sh"
        "ci/canary-deployment.sh"
        "ci/environment-manager.sh"
    )
    
    local syntax_errors=()
    for script in "${scripts_to_test[@]}"; do
        if [[ -f "$script" ]]; then
            if bash -n "$script" &> /dev/null; then
                log_success "✅ 脚本语法正确: $(basename $script)"
            else
                log_error "❌ 脚本语法错误: $(basename $script)"
                syntax_errors+=("$script")
            fi
        fi
    done
    
    if [[ ${#syntax_errors[@]} -eq 0 ]]; then
        record_result "脚本语法检查" "PASS" "所有脚本语法正确"
    else
        record_result "脚本语法检查" "FAIL" "语法错误: ${syntax_errors[*]}"
    fi
    
    echo ""
}

# 生成验证报告
generate_validation_report() {
    local end_time=$(date +%s)
    local duration=$((end_time - START_TIME))
    
    log_header "📋 智游助手v6.2 并行验证报告"
    log_header "=============================="
    echo ""
    
    log_info "验证执行时间: ${duration}秒"
    log_info "验证项目总数: ${#VALIDATION_RESULTS[@]}"
    log_info "失败项目数量: ${#FAILED_VALIDATIONS[@]}"
    echo ""
    
    # 按类别显示结果
    log_header "📊 验证结果详情:"
    echo ""
    
    local pass_count=0
    local fail_count=0
    local warn_count=0
    local skip_count=0
    
    for result in "${VALIDATION_RESULTS[@]}"; do
        IFS=':' read -r test_name status details <<< "$result"
        
        case $status in
            "PASS")
                log_success "✅ $test_name: $details"
                ((pass_count++))
                ;;
            "FAIL")
                log_error "❌ $test_name: $details"
                ((fail_count++))
                ;;
            "WARN")
                log_warning "⚠️ $test_name: $details"
                ((warn_count++))
                ;;
            "SKIP")
                log_info "⏭️ $test_name: $details"
                ((skip_count++))
                ;;
        esac
    done
    
    echo ""
    log_header "📈 验证统计:"
    echo "   通过: $pass_count"
    echo "   失败: $fail_count"
    echo "   警告: $warn_count"
    echo "   跳过: $skip_count"
    echo ""
    
    # 总体评估
    if [[ $fail_count -eq 0 ]]; then
        if [[ $warn_count -eq 0 ]]; then
            log_success "🎉 所有验证项目通过！智游助手v6.2已准备就绪。"
        else
            log_warning "⚠️ 验证基本通过，但有 $warn_count 个警告项目需要关注。"
        fi
    else
        log_error "❌ 发现 $fail_count 个关键问题需要解决。"
    fi
    
    # 下一步建议
    echo ""
    log_header "🚀 下一步建议:"
    
    if [[ $fail_count -eq 0 ]]; then
        echo "1. 执行基础设施部署: ./infrastructure/deploy-infrastructure.sh"
        echo "2. 验证服务可用性: ./verify-setup.sh"
        echo "3. 开始CI/CD Pipeline测试"
    else
        echo "1. 解决上述失败项目"
        echo "2. 重新运行验证: ./parallel-validation.sh"
        echo "3. 确认所有问题解决后再进行部署"
    fi
}

# 主函数
main() {
    echo "🚀 智游助手v6.2 并行优化策略执行"
    echo "=================================="
    echo "基于当前状态：阶段一95%完成，Week 3-4 CI Pipeline完成，Week 5-6 CD Pipeline完成"
    echo ""
    
    # 执行验证
    validate_infrastructure_readiness
    validate_monitoring_integration
    validate_cicd_pipeline
    execute_integration_tests
    
    # 生成报告
    generate_validation_report
}

# 执行主函数
main "$@"
