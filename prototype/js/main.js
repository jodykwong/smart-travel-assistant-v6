// 智游助手v6.0 - 高保真原型交互脚本

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeStatusBar();
    initializeTabBar();
    initializeInteractions();
    initializeAnimations();
});

// 初始化iOS状态栏
function initializeStatusBar() {
    const statusBar = document.getElementById('status-bar');
    if (statusBar) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        
        statusBar.innerHTML = `
            <div class="status-bar flex items-center justify-between px-4 h-full text-white text-sm font-medium">
                <div class="flex items-center gap-1">
                    <span>${timeString}</span>
                </div>
                <div class="flex items-center gap-1">
                    <i class="fas fa-signal text-xs"></i>
                    <i class="fas fa-wifi text-xs"></i>
                    <div class="flex items-center gap-1">
                        <span class="text-xs">100%</span>
                        <i class="fas fa-battery-full text-xs"></i>
                    </div>
                </div>
            </div>
        `;
    }
}

// 初始化底部导航栏
function initializeTabBar() {
    const tabBar = document.getElementById('tab-bar');
    if (tabBar) {
        tabBar.innerHTML = `
            <div class="tab-bar flex items-center justify-around h-full">
                <div class="flex flex-col items-center gap-1 py-2">
                    <i class="fas fa-home text-primary text-lg"></i>
                    <span class="text-xs text-primary font-medium">首页</span>
                </div>
                <div class="flex flex-col items-center gap-1 py-2">
                    <i class="fas fa-search text-gray-400 text-lg"></i>
                    <span class="text-xs text-gray-400">搜索</span>
                </div>
                <div class="flex flex-col items-center gap-1 py-2">
                    <i class="fas fa-heart text-gray-400 text-lg"></i>
                    <span class="text-xs text-gray-400">收藏</span>
                </div>
                <div class="flex flex-col items-center gap-1 py-2">
                    <i class="fas fa-user text-gray-400 text-lg"></i>
                    <span class="text-xs text-gray-400">我的</span>
                </div>
            </div>
        `;
    }
}

// 初始化交互效果
function initializeInteractions() {
    // 添加按钮点击波纹效果
    document.querySelectorAll('.btn-ripple').forEach(button => {
        button.addEventListener('click', createRippleEffect);
    });

    // 添加悬浮效果
    document.querySelectorAll('.hover-float').forEach(element => {
        element.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
            this.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        });
        
        element.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });

    // 添加聚焦光晕效果
    document.querySelectorAll('.focus-glow').forEach(element => {
        element.addEventListener('focus', function() {
            this.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.3)';
            this.style.transition = 'box-shadow 0.3s ease';
        });
        
        element.addEventListener('blur', function() {
            this.style.boxShadow = 'none';
        });
    });
}

// 创建波纹效果
function createRippleEffect(e) {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    
    const ripple = document.createElement('span');
    ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255, 255, 255, 0.5);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
    `;
    
    button.appendChild(ripple);
    
    setTimeout(() => {
        ripple.remove();
    }, 600);
}

// 创建粒子效果
function createParticleEffect(element) {
    const rect = element.getBoundingClientRect();
    const particleCount = 6;
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = `${rect.left + rect.width / 2}px`;
        particle.style.top = `${rect.top + rect.height / 2}px`;
        particle.style.animationDelay = `${i * 0.1}s`;
        
        document.body.appendChild(particle);
        
        setTimeout(() => {
            particle.remove();
        }, 1000);
    }
}

// 切换每日行程展开/收起
function toggleDay(dayNumber) {
    const content = document.getElementById(`day-${dayNumber}-content`);
    const arrow = document.getElementById(`arrow-${dayNumber}`);
    
    if (content && arrow) {
        const isHidden = content.classList.contains('hidden');
        
        if (isHidden) {
            content.classList.remove('hidden');
            content.style.animation = 'slide-up 0.3s ease-out';
            arrow.style.transform = 'rotate(180deg)';
        } else {
            content.style.animation = 'fade-out 0.3s ease-out';
            arrow.style.transform = 'rotate(0deg)';
            setTimeout(() => {
                content.classList.add('hidden');
            }, 300);
        }
    }
}

// 初始化动画
function initializeAnimations() {
    // 观察器用于触发滚动动画
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fade-in 0.6s ease-out';
            }
        });
    }, {
        threshold: 0.1
    });

    // 观察所有卡片元素
    document.querySelectorAll('.card-shadow-1, .card-shadow-2').forEach(card => {
        observer.observe(card);
    });
}

// 切换页面
function switchPage(page) {
    const iframe = document.querySelector('iframe');
    if (iframe) {
        iframe.src = page;
    }
}

// 模拟加载状态
function showLoading(element) {
    const originalContent = element.innerHTML;
    element.innerHTML = '<div class="loading-spinner mx-auto"></div>';
    
    setTimeout(() => {
        element.innerHTML = originalContent;
    }, 1500);
}

// 添加触摸反馈
function addTouchFeedback() {
    document.addEventListener('touchstart', function(e) {
        const target = e.target.closest('button, .hover-float');
        if (target) {
            target.style.transform = 'scale(0.95)';
            target.style.transition = 'transform 0.1s ease';
        }
    });

    document.addEventListener('touchend', function(e) {
        const target = e.target.closest('button, .hover-float');
        if (target) {
            setTimeout(() => {
                target.style.transform = 'scale(1)';
            }, 100);
        }
    });
}

// 初始化触摸反馈
addTouchFeedback();

// 平滑滚动
function smoothScrollTo(element) {
    element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 更新时间
setInterval(() => {
    const timeElement = document.querySelector('.status-bar span');
    if (timeElement) {
        const now = new Date();
        const timeString = now.toLocaleTimeString('zh-CN', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
        timeElement.textContent = timeString;
    }
}, 60000); // 每分钟更新一次
