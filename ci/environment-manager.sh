#!/bin/bash

# 智游助手v6.2 环境管理脚本
# Week 5-6: CD Pipeline构建 - 环境管理和配置

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

# 环境配置
ENVIRONMENTS=("development" "staging" "production")
NAMESPACES=("smart-travel-dev" "smart-travel-staging" "smart-travel-production")
HARBOR_REGISTRY="harbor.smarttravel.local"
HARBOR_PROJECT="smart-travel"

# 创建命名空间
create_namespace() {
    local env=$1
    local namespace=$2
    
    log_info "创建命名空间: $namespace"
    
    # 创建命名空间
    kubectl create namespace "$namespace" --dry-run=client -o yaml | kubectl apply -f -
    
    # 添加标签
    kubectl label namespace "$namespace" \
        name="$namespace" \
        environment="$env" \
        app.kubernetes.io/name="smart-travel-assistant" \
        app.kubernetes.io/part-of="smart-travel-platform" \
        --overwrite
    
    log_success "✅ 命名空间 $namespace 已创建"
}

# 创建Harbor镜像拉取密钥
create_harbor_secret() {
    local namespace=$1
    
    log_info "创建Harbor镜像拉取密钥: $namespace"
    
    # 删除现有密钥（如果存在）
    kubectl delete secret harbor-registry-secret -n "$namespace" --ignore-not-found=true
    
    # 创建新密钥
    kubectl create secret docker-registry harbor-registry-secret \
        --docker-server="$HARBOR_REGISTRY" \
        --docker-username="${HARBOR_USERNAME:-admin}" \
        --docker-password="${HARBOR_PASSWORD:-Harbor12345}" \
        --docker-email="admin@smarttravel.com" \
        -n "$namespace"
    
    log_success "✅ Harbor密钥已创建: $namespace"
}

# 创建TLS证书密钥
create_tls_secret() {
    local env=$1
    local namespace=$2
    
    log_info "创建TLS证书密钥: $namespace"
    
    local cert_name="${env}-smart-travel-tls"
    local domain
    
    case $env in
        "development")
            domain="dev.smarttravel.local"
            ;;
        "staging")
            domain="staging.smarttravel.local"
            ;;
        "production")
            domain="api.smarttravel.com"
            ;;
    esac
    
    # 生成自签名证书（开发和测试环境）
    if [ "$env" != "production" ]; then
        openssl req -x509 -newkey rsa:4096 -keyout /tmp/tls.key -out /tmp/tls.crt -days 365 -nodes \
            -subj "/C=CN/ST=Beijing/L=Beijing/O=SmartTravel/OU=IT/CN=$domain"
        
        kubectl create secret tls "$cert_name" \
            --cert=/tmp/tls.crt \
            --key=/tmp/tls.key \
            -n "$namespace" \
            --dry-run=client -o yaml | kubectl apply -f -
        
        # 清理临时文件
        rm -f /tmp/tls.key /tmp/tls.crt
    fi
    
    log_success "✅ TLS证书已创建: $cert_name"
}

# 创建应用配置密钥
create_app_secrets() {
    local env=$1
    local namespace=$2
    
    log_info "创建应用配置密钥: $namespace"
    
    local secret_name="smart-travel-assistant-secret"
    
    # 根据环境设置不同的配置
    case $env in
        "development")
            kubectl create secret generic "$secret_name" \
                --from-literal=DATABASE_URL="postgresql://smart_travel_dev:dev_smart_travel123@postgres-dev:5432/smart_travel_dev" \
                --from-literal=REDIS_URL="redis://:dev_redis123@redis-dev:6379" \
                --from-literal=AMAP_API_KEY="${AMAP_API_KEY_DEV:-dev_key}" \
                --from-literal=JWT_SECRET="${JWT_SECRET_DEV:-dev_jwt_secret}" \
                -n "$namespace" \
                --dry-run=client -o yaml | kubectl apply -f -
            ;;
        "staging")
            kubectl create secret generic "$secret_name" \
                --from-literal=DATABASE_URL="postgresql://smart_travel_staging:staging_smart_travel123@postgres-staging:5432/smart_travel_staging" \
                --from-literal=REDIS_URL="redis://:staging_redis123@redis-staging:6379" \
                --from-literal=AMAP_API_KEY="${AMAP_API_KEY_STAGING:-staging_key}" \
                --from-literal=JWT_SECRET="${JWT_SECRET_STAGING:-staging_jwt_secret}" \
                -n "$namespace" \
                --dry-run=client -o yaml | kubectl apply -f -
            ;;
        "production")
            kubectl create secret generic "$secret_name" \
                --from-literal=DATABASE_URL="${DATABASE_URL_PROD}" \
                --from-literal=REDIS_URL="${REDIS_URL_PROD}" \
                --from-literal=AMAP_API_KEY="${AMAP_API_KEY_PROD}" \
                --from-literal=JWT_SECRET="${JWT_SECRET_PROD}" \
                --from-literal=PAYMENT_GATEWAY_KEY="${PAYMENT_GATEWAY_KEY_PROD}" \
                --from-literal=PAYMENT_GATEWAY_SECRET="${PAYMENT_GATEWAY_SECRET_PROD}" \
                -n "$namespace" \
                --dry-run=client -o yaml | kubectl apply -f -
            ;;
    esac
    
    log_success "✅ 应用密钥已创建: $secret_name"
}

# 创建网络策略
create_network_policy() {
    local env=$1
    local namespace=$2
    
    # 只在生产环境创建网络策略
    if [ "$env" != "production" ]; then
        return 0
    fi
    
    log_info "创建网络策略: $namespace"
    
    cat <<EOF | kubectl apply -f -
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: smart-travel-network-policy
  namespace: $namespace
spec:
  podSelector:
    matchLabels:
      app.kubernetes.io/name: smart-travel-assistant
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          name: monitoring
    - namespaceSelector:
        matchLabels:
          name: ingress-nginx
    ports:
    - protocol: TCP
      port: 3000
  egress:
  - to: []
    ports:
    - protocol: TCP
      port: 5432  # PostgreSQL
    - protocol: TCP
      port: 6379  # Redis
    - protocol: TCP
      port: 443   # HTTPS
    - protocol: TCP
      port: 80    # HTTP
    - protocol: TCP
      port: 53    # DNS
    - protocol: UDP
      port: 53    # DNS
EOF
    
    log_success "✅ 网络策略已创建: $namespace"
}

# 创建资源配额
create_resource_quota() {
    local env=$1
    local namespace=$2
    
    log_info "创建资源配额: $namespace"
    
    local cpu_limit
    local memory_limit
    local pod_limit
    
    case $env in
        "development")
            cpu_limit="2"
            memory_limit="4Gi"
            pod_limit="10"
            ;;
        "staging")
            cpu_limit="8"
            memory_limit="16Gi"
            pod_limit="20"
            ;;
        "production")
            cpu_limit="32"
            memory_limit="64Gi"
            pod_limit="50"
            ;;
    esac
    
    cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: ResourceQuota
metadata:
  name: smart-travel-quota
  namespace: $namespace
spec:
  hard:
    requests.cpu: "$cpu_limit"
    requests.memory: "$memory_limit"
    limits.cpu: "$(echo "$cpu_limit * 2" | bc)"
    limits.memory: "$(echo "$memory_limit" | sed 's/Gi/*2Gi/')"
    pods: "$pod_limit"
    persistentvolumeclaims: "10"
    services: "10"
    secrets: "20"
    configmaps: "20"
EOF
    
    log_success "✅ 资源配额已创建: $namespace"
}

# 创建监控配置
create_monitoring_config() {
    local env=$1
    local namespace=$2
    
    log_info "创建监控配置: $namespace"
    
    # 创建ServiceMonitor
    cat <<EOF | kubectl apply -f -
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: smart-travel-assistant-$env
  namespace: $namespace
  labels:
    app: smart-travel-assistant
    environment: $env
spec:
  selector:
    matchLabels:
      app.kubernetes.io/name: smart-travel-assistant
  endpoints:
  - port: http
    path: /api/metrics
    interval: 30s
    scrapeTimeout: 10s
EOF
    
    log_success "✅ 监控配置已创建: $namespace"
}

# 验证环境配置
verify_environment() {
    local env=$1
    local namespace=$2
    
    log_info "验证环境配置: $namespace"
    
    # 检查命名空间
    if ! kubectl get namespace "$namespace" > /dev/null 2>&1; then
        log_error "❌ 命名空间不存在: $namespace"
        return 1
    fi
    
    # 检查密钥
    local secrets=("harbor-registry-secret" "smart-travel-assistant-secret")
    for secret in "${secrets[@]}"; do
        if ! kubectl get secret "$secret" -n "$namespace" > /dev/null 2>&1; then
            log_error "❌ 密钥不存在: $secret"
            return 1
        fi
    done
    
    # 检查资源配额
    if ! kubectl get resourcequota smart-travel-quota -n "$namespace" > /dev/null 2>&1; then
        log_warning "⚠️ 资源配额不存在: $namespace"
    fi
    
    log_success "✅ 环境配置验证通过: $namespace"
    return 0
}

# 清理环境
cleanup_environment() {
    local env=$1
    local namespace=$2
    
    log_warning "清理环境: $namespace"
    
    # 删除所有资源
    kubectl delete all --all -n "$namespace"
    
    # 删除密钥和配置
    kubectl delete secrets --all -n "$namespace"
    kubectl delete configmaps --all -n "$namespace"
    
    # 删除命名空间
    kubectl delete namespace "$namespace"
    
    log_success "✅ 环境已清理: $namespace"
}

# 显示环境状态
show_environment_status() {
    log_header "🌍 环境状态概览"
    log_header "==============="
    echo ""
    
    for i in "${!ENVIRONMENTS[@]}"; do
        local env="${ENVIRONMENTS[$i]}"
        local namespace="${NAMESPACES[$i]}"
        
        echo "📋 环境: $env"
        echo "   命名空间: $namespace"
        
        # 检查命名空间状态
        if kubectl get namespace "$namespace" > /dev/null 2>&1; then
            echo "   状态: ✅ 活跃"
            
            # 显示Pod状态
            local pods=$(kubectl get pods -n "$namespace" --no-headers 2>/dev/null | wc -l)
            local running_pods=$(kubectl get pods -n "$namespace" --no-headers 2>/dev/null | grep "Running" | wc -l)
            echo "   Pods: $running_pods/$pods 运行中"
            
            # 显示服务状态
            local services=$(kubectl get services -n "$namespace" --no-headers 2>/dev/null | wc -l)
            echo "   服务: $services 个"
            
        else
            echo "   状态: ❌ 不存在"
        fi
        
        echo ""
    done
}

# 主函数
main() {
    local action=${1:-"status"}
    local target_env=${2:-"all"}
    
    echo "🌍 智游助手v6.2 环境管理器"
    echo "========================="
    echo "操作: $action"
    echo "目标环境: $target_env"
    echo ""
    
    case $action in
        "create")
            if [ "$target_env" = "all" ]; then
                for i in "${!ENVIRONMENTS[@]}"; do
                    local env="${ENVIRONMENTS[$i]}"
                    local namespace="${NAMESPACES[$i]}"
                    
                    log_header "创建环境: $env"
                    create_namespace "$env" "$namespace"
                    create_harbor_secret "$namespace"
                    create_tls_secret "$env" "$namespace"
                    create_app_secrets "$env" "$namespace"
                    create_network_policy "$env" "$namespace"
                    create_resource_quota "$env" "$namespace"
                    create_monitoring_config "$env" "$namespace"
                    echo ""
                done
            else
                # 创建单个环境
                local env_index=-1
                for i in "${!ENVIRONMENTS[@]}"; do
                    if [ "${ENVIRONMENTS[$i]}" = "$target_env" ]; then
                        env_index=$i
                        break
                    fi
                done
                
                if [ $env_index -ge 0 ]; then
                    local namespace="${NAMESPACES[$env_index]}"
                    log_header "创建环境: $target_env"
                    create_namespace "$target_env" "$namespace"
                    create_harbor_secret "$namespace"
                    create_tls_secret "$target_env" "$namespace"
                    create_app_secrets "$target_env" "$namespace"
                    create_network_policy "$target_env" "$namespace"
                    create_resource_quota "$target_env" "$namespace"
                    create_monitoring_config "$target_env" "$namespace"
                else
                    log_error "❌ 未知环境: $target_env"
                    exit 1
                fi
            fi
            ;;
            
        "verify")
            if [ "$target_env" = "all" ]; then
                for i in "${!ENVIRONMENTS[@]}"; do
                    local env="${ENVIRONMENTS[$i]}"
                    local namespace="${NAMESPACES[$i]}"
                    verify_environment "$env" "$namespace"
                done
            else
                local env_index=-1
                for i in "${!ENVIRONMENTS[@]}"; do
                    if [ "${ENVIRONMENTS[$i]}" = "$target_env" ]; then
                        env_index=$i
                        break
                    fi
                done
                
                if [ $env_index -ge 0 ]; then
                    local namespace="${NAMESPACES[$env_index]}"
                    verify_environment "$target_env" "$namespace"
                else
                    log_error "❌ 未知环境: $target_env"
                    exit 1
                fi
            fi
            ;;
            
        "cleanup")
            if [ "$target_env" = "all" ]; then
                log_warning "⚠️ 这将清理所有环境，请确认 (y/N):"
                read -r confirm
                if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                    for i in "${!ENVIRONMENTS[@]}"; do
                        local env="${ENVIRONMENTS[$i]}"
                        local namespace="${NAMESPACES[$i]}"
                        cleanup_environment "$env" "$namespace"
                    done
                fi
            else
                local env_index=-1
                for i in "${!ENVIRONMENTS[@]}"; do
                    if [ "${ENVIRONMENTS[$i]}" = "$target_env" ]; then
                        env_index=$i
                        break
                    fi
                done
                
                if [ $env_index -ge 0 ]; then
                    local namespace="${NAMESPACES[$env_index]}"
                    log_warning "⚠️ 这将清理环境 $target_env，请确认 (y/N):"
                    read -r confirm
                    if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
                        cleanup_environment "$target_env" "$namespace"
                    fi
                else
                    log_error "❌ 未知环境: $target_env"
                    exit 1
                fi
            fi
            ;;
            
        "status")
            show_environment_status
            ;;
            
        *)
            log_error "❌ 未知操作: $action"
            echo "用法: $0 [create|verify|cleanup|status] [environment|all]"
            echo "环境: development, staging, production"
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
