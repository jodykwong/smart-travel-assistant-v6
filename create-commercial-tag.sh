#!/bin/bash

# 智游助手v6.2 商业化就绪度评估标签创建脚本
# 为当前代码状态创建Git标签

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

# 标签信息
TAG_NAME="v6.2-commercial-ready-assessment"
TAG_MESSAGE="智游助手v6.2商业化就绪度评估版本

商业化就绪度: 45%完成
- 基础设施: 95%完成 ✅
- CI/CD Pipeline: 100%完成 ✅  
- 监控系统: 100%完成 ✅
- 用户管理系统: 30%完成 🔄
- 支付系统: 40%完成 🔄
- 核心业务功能: 20%完成 🔄

P0级关键缺失功能:
1. 用户认证系统完善 (预计2周)
2. 支付系统安全加固 (预计1周)  
3. 核心推荐算法实现 (预计3周)

预计商业化时间: 4-6周
评估时间: 2024年1月8日"

BRANCH_NAME="feature/commercialization"

main() {
    log_header "🏷️ 智游助手v6.2 商业化就绪度评估标签创建"
    log_header "============================================="
    echo ""
    
    # 检查Git状态
    log_info "1️⃣ 检查Git仓库状态..."
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "❌ 当前目录不是Git仓库"
        exit 1
    fi
    
    # 检查是否有未提交的更改
    if ! git diff-index --quiet HEAD --; then
        log_warning "⚠️ 检测到未提交的更改"
        echo ""
        git status --porcelain
        echo ""
        read -p "是否继续创建标签? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "操作已取消"
            exit 0
        fi
    fi
    
    # 显示当前分支
    current_branch=$(git branch --show-current)
    log_info "当前分支: $current_branch"
    
    # 创建并推送标签
    log_info "2️⃣ 创建Git标签..."
    
    # 检查标签是否已存在
    if git tag -l | grep -q "^$TAG_NAME$"; then
        log_warning "⚠️ 标签 $TAG_NAME 已存在"
        read -p "是否删除现有标签并重新创建? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git tag -d "$TAG_NAME"
            log_info "已删除现有标签"
        else
            log_info "操作已取消"
            exit 0
        fi
    fi
    
    # 创建带注释的标签
    git tag -a "$TAG_NAME" -m "$TAG_MESSAGE"
    log_success "✅ 标签 $TAG_NAME 创建成功"
    
    # 创建商业化开发分支
    log_info "3️⃣ 创建商业化开发分支..."
    
    if git branch -l | grep -q "$BRANCH_NAME"; then
        log_warning "⚠️ 分支 $BRANCH_NAME 已存在"
        read -p "是否切换到现有分支? (y/N): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git checkout "$BRANCH_NAME"
            log_success "✅ 已切换到分支 $BRANCH_NAME"
        fi
    else
        git checkout -b "$BRANCH_NAME"
        log_success "✅ 分支 $BRANCH_NAME 创建成功"
    fi
    
    # 显示标签信息
    log_info "4️⃣ 标签信息确认..."
    echo ""
    log_header "📋 标签详情:"
    echo "标签名称: $TAG_NAME"
    echo "创建时间: $(date)"
    echo "提交哈希: $(git rev-parse HEAD)"
    echo "当前分支: $(git branch --show-current)"
    echo ""
    
    log_header "📝 标签消息:"
    echo "$TAG_MESSAGE"
    echo ""
    
    # 推送选项
    log_info "5️⃣ 推送到远程仓库..."
    
    read -p "是否推送标签到远程仓库? (y/N): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # 检查远程仓库
        if git remote | grep -q origin; then
            git push origin "$TAG_NAME"
            log_success "✅ 标签已推送到远程仓库"
            
            # 推送分支
            read -p "是否推送商业化开发分支到远程仓库? (y/N): " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                git push origin "$BRANCH_NAME"
                log_success "✅ 分支已推送到远程仓库"
            fi
        else
            log_warning "⚠️ 未找到远程仓库 origin"
        fi
    fi
    
    # 生成标签报告
    log_info "6️⃣ 生成标签报告..."
    
    cat > "TAG_REPORT_${TAG_NAME}.md" << EOF
# Git标签报告: $TAG_NAME

## 📅 创建时间
$(date)

## 📊 项目状态
- **版本**: v6.2.0
- **商业化就绪度**: 45%
- **提交哈希**: $(git rev-parse HEAD)
- **分支**: $(git branch --show-current)

## ✅ 已完成功能
- 基础设施: 95%完成 (GitLab CE + Harbor + K3s + 监控系统)
- CI/CD Pipeline: 100%完成 (五阶段流水线 + 蓝绿部署 + 金丝雀发布)
- 监控系统: 100%完成 (Prometheus + Grafana + 完整告警体系)

## 🔄 进行中功能
- 用户管理系统: 30%完成 (MCP架构 + 基础API，缺JWT认证)
- 支付系统: 40%完成 (微信支付集成，缺支付宝和安全加固)
- 核心业务功能: 20%完成 (UI完整，缺推荐算法和实时数据)

## 🚨 P0级关键缺失功能
1. **用户认证系统完善** (预计2周)
   - JWT认证机制
   - 密码加密存储
   - 用户偏好管理

2. **支付系统安全加固** (预计1周)
   - 支付数据加密
   - 支付宝集成
   - 退款功能

3. **核心推荐算法实现** (预计3周)
   - 智能推荐引擎
   - 实时数据集成
   - 预订功能集成

## 🎯 下一步计划
- 立即开始P0级功能开发
- 预计4-6周达到95%商业化就绪度
- 目标正式商业化上线时间: 2024年2月

## 📋 相关文档
- PROJECT_STATUS.md - 详细项目状态分析
- immediate-action-plan-v6.2.md - 商业化开发路线图
- CHANGELOG.md - 完整更新日志

---
*报告生成时间: $(date)*
EOF
    
    log_success "✅ 标签报告已生成: TAG_REPORT_${TAG_NAME}.md"
    
    echo ""
    log_header "🎉 标签创建完成！"
    echo ""
    log_info "📋 创建的资源:"
    echo "   • Git标签: $TAG_NAME"
    echo "   • 开发分支: $BRANCH_NAME"
    echo "   • 标签报告: TAG_REPORT_${TAG_NAME}.md"
    echo ""
    log_info "🚀 下一步建议:"
    echo "   1. 查看标签报告了解详细状态"
    echo "   2. 开始执行商业化开发计划"
    echo "   3. 定期更新项目状态文档"
    echo ""
    log_success "智游助手v6.2商业化就绪度评估标签创建成功！"
}

# 执行主函数
main "$@"
