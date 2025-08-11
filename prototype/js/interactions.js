/**
 * 智游助手v6.5 高保真原型交互脚本
 * 提供统一的交互效果和用户体验增强
 */

// 全局配置
const CONFIG = {
    animationDuration: 300,
    hoverScale: 1.02,
    clickScale: 0.98,
    glowIntensity: 0.7,
    particleCount: 20
};

// 工具函数
const Utils = {
    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // 节流函数
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // 获取随机数
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    // 创建元素
    createElement(tag, className, innerHTML) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (innerHTML) element.innerHTML = innerHTML;
        return element;
    }
};

// 动画效果类
class AnimationEffects {
    // 卡片悬停效果
    static initCardHover() {
        const cards = document.querySelectorAll('.card-hover, .day-card, .nav-card, .budget-card, .activity-card');
        
        cards.forEach(card => {
            card.addEventListener('mouseenter', (e) => {
                e.target.style.transform = `translateY(-4px) scale(${CONFIG.hoverScale})`;
                e.target.style.transition = `all ${CONFIG.animationDuration}ms ease`;
            });

            card.addEventListener('mouseleave', (e) => {
                e.target.style.transform = 'translateY(0) scale(1)';
            });

            card.addEventListener('mousedown', (e) => {
                e.target.style.transform = `translateY(-2px) scale(${CONFIG.clickScale})`;
            });

            card.addEventListener('mouseup', (e) => {
                e.target.style.transform = `translateY(-4px) scale(${CONFIG.hoverScale})`;
            });
        });
    }

    // 按钮点击粒子效果
    static initButtonParticles() {
        const buttons = document.querySelectorAll('.btn, .quick-button, .floating-action');
        
        buttons.forEach(button => {
            button.addEventListener('click', (e) => {
                this.createParticleEffect(e);
            });
        });
    }

    // 创建粒子效果
    static createParticleEffect(event) {
        const rect = event.target.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        for (let i = 0; i < CONFIG.particleCount; i++) {
            const particle = Utils.createElement('div', 'particle');
            particle.style.cssText = `
                position: absolute;
                left: ${x}px;
                top: ${y}px;
                width: 4px;
                height: 4px;
                background: rgba(255, 255, 255, 0.8);
                border-radius: 50%;
                pointer-events: none;
                z-index: 1000;
            `;

            event.target.style.position = 'relative';
            event.target.appendChild(particle);

            // 动画粒子
            const angle = (Math.PI * 2 * i) / CONFIG.particleCount;
            const velocity = Utils.random(50, 100);
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;

            particle.animate([
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${vx}px, ${vy}px) scale(0)`, opacity: 0 }
            ], {
                duration: 600,
                easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            }).onfinish = () => particle.remove();
        }
    }

    // 滚动动画
    static initScrollAnimations() {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }
            });
        }, observerOptions);

        // 观察所有需要动画的元素
        const animatedElements = document.querySelectorAll(
            '.timeline-item, .day-card, .stat-card, .budget-card'
        );

        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            el.style.transition = 'all 0.6s ease';
            observer.observe(el);
        });
    }

    // 光晕效果
    static initGlowEffects() {
        const glowElements = document.querySelectorAll('.glow-effect, .total-budget');
        
        glowElements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                element.style.boxShadow = `0 0 30px rgba(102, 126, 234, ${CONFIG.glowIntensity})`;
            });

            element.addEventListener('mouseleave', () => {
                element.style.boxShadow = '';
            });
        });
    }
}

// 搜索功能类
class SearchFunctionality {
    static init() {
        const searchInput = document.getElementById('searchInput');
        if (!searchInput) return;

        // 实时搜索
        searchInput.addEventListener('input', Utils.debounce((e) => {
            this.performSearch(e.target.value);
        }, 300));

        // 搜索建议
        this.initSearchSuggestions();
    }

    static performSearch(query) {
        const searchableElements = document.querySelectorAll('[data-searchable]');
        const lowerQuery = query.toLowerCase();

        searchableElements.forEach(element => {
            const text = element.textContent.toLowerCase();
            const isMatch = text.includes(lowerQuery) || query === '';
            
            element.style.opacity = isMatch ? '1' : '0.3';
            element.style.transform = isMatch ? 'scale(1)' : 'scale(0.95)';
        });

        // 高亮匹配文本
        if (query) {
            this.highlightMatches(query);
        } else {
            this.clearHighlights();
        }
    }

    static highlightMatches(query) {
        // 实现文本高亮逻辑
        const walker = document.createTreeWalker(
            document.body,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );

        const textNodes = [];
        let node;
        while (node = walker.nextNode()) {
            textNodes.push(node);
        }

        textNodes.forEach(textNode => {
            const text = textNode.textContent;
            if (text.toLowerCase().includes(query.toLowerCase())) {
                const highlightedText = text.replace(
                    new RegExp(query, 'gi'),
                    `<mark class="search-highlight">$&</mark>`
                );
                const wrapper = document.createElement('span');
                wrapper.innerHTML = highlightedText;
                textNode.parentNode.replaceChild(wrapper, textNode);
            }
        });
    }

    static clearHighlights() {
        const highlights = document.querySelectorAll('.search-highlight');
        highlights.forEach(highlight => {
            const parent = highlight.parentNode;
            parent.replaceChild(document.createTextNode(highlight.textContent), highlight);
            parent.normalize();
        });
    }

    static initSearchSuggestions() {
        const suggestions = [
            '乌鲁木齐', '新疆博物馆', 'RV租赁', '大盘鸡', 
            '赛里木湖', '独库公路', '哈萨克族', '野营',
            '费用', '预算', '住宿', '美食'
        ];

        // 创建搜索建议下拉框
        const searchContainer = document.querySelector('.search-container');
        if (!searchContainer) return;

        const suggestionsList = Utils.createElement('div', 'search-suggestions');
        suggestionsList.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;

        suggestions.forEach(suggestion => {
            const item = Utils.createElement('div', 'suggestion-item', suggestion);
            item.style.cssText = `
                padding: 12px 16px;
                cursor: pointer;
                transition: background-color 0.2s ease;
            `;
            item.addEventListener('click', () => {
                document.getElementById('searchInput').value = suggestion;
                SearchFunctionality.performSearch(suggestion);
                suggestionsList.style.display = 'none';
            });
            suggestionsList.appendChild(item);
        });

        searchContainer.appendChild(suggestionsList);

        // 显示/隐藏建议
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('focus', () => {
            suggestionsList.style.display = 'block';
        });

        document.addEventListener('click', (e) => {
            if (!searchContainer.contains(e.target)) {
                suggestionsList.style.display = 'none';
            }
        });
    }
}

// 导航功能类
class NavigationFeatures {
    static init() {
        this.initSmoothScroll();
        this.initKeyboardShortcuts();
        this.initBreadcrumbs();
    }

    static initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
            });
        });
    }

    static initKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + 数字键快速导航
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.navigateToPage('overview.html');
                        break;
                    case '2':
                        e.preventDefault();
                        this.navigateToPage('daily-detail.html');
                        break;
                    case '3':
                        e.preventDefault();
                        this.navigateToPage('budget-breakdown.html');
                        break;
                    case '4':
                        e.preventDefault();
                        this.navigateToPage('navigation.html');
                        break;
                    case 'f':
                        e.preventDefault();
                        const searchInput = document.getElementById('searchInput');
                        if (searchInput) searchInput.focus();
                        break;
                }
            }

            // ESC键关闭模态框或清除搜索
            if (e.key === 'Escape') {
                const searchInput = document.getElementById('searchInput');
                if (searchInput && searchInput.value) {
                    searchInput.value = '';
                    SearchFunctionality.performSearch('');
                }
            }
        });
    }

    static navigateToPage(url) {
        if (window.location.pathname.includes(url)) {
            window.location.reload();
        } else {
            window.open(url, '_blank');
        }
    }

    static initBreadcrumbs() {
        // 动态生成面包屑导航
        const breadcrumbContainer = document.querySelector('.breadcrumb');
        if (!breadcrumbContainer) return;

        const pathSegments = window.location.pathname.split('/').filter(segment => segment);
        const breadcrumbs = ['首页', ...pathSegments];

        breadcrumbContainer.innerHTML = breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return `
                <span class="breadcrumb-item ${isLast ? 'active' : ''}">
                    ${isLast ? crumb : `<a href="#">${crumb}</a>`}
                </span>
            `;
        }).join('<span class="breadcrumb-separator">/</span>');
    }
}

// 数据可视化类
class DataVisualization {
    static init() {
        this.initProgressBars();
        this.initCounters();
        this.initCharts();
    }

    static initProgressBars() {
        const progressBars = document.querySelectorAll('.progress-fill');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const bar = entry.target;
                    const targetWidth = bar.dataset.width || bar.style.width;
                    bar.style.width = '0%';
                    setTimeout(() => {
                        bar.style.transition = 'width 1.5s ease';
                        bar.style.width = targetWidth;
                    }, 200);
                }
            });
        });

        progressBars.forEach(bar => observer.observe(bar));
    }

    static initCounters() {
        const counters = document.querySelectorAll('.stat-number');
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.animateCounter(entry.target);
                }
            });
        });

        counters.forEach(counter => observer.observe(counter));
    }

    static animateCounter(element) {
        const target = parseInt(element.textContent.replace(/[^\d]/g, ''));
        const duration = 2000;
        const step = target / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            element.textContent = element.textContent.replace(/\d+/, Math.floor(current));
        }, 16);
    }

    static initCharts() {
        // 简单的饼图动画
        const pieCharts = document.querySelectorAll('.pie-chart');
        pieCharts.forEach(chart => {
            chart.style.transform = 'scale(0)';
            chart.style.transition = 'transform 0.8s ease';
            
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.style.transform = 'scale(1)';
                    }
                });
            });
            
            observer.observe(chart);
        });
    }
}

// 主初始化函数
function initializePrototype() {
    // 等待DOM加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        // 初始化所有功能模块
        AnimationEffects.initCardHover();
        AnimationEffects.initButtonParticles();
        AnimationEffects.initScrollAnimations();
        AnimationEffects.initGlowEffects();
        
        SearchFunctionality.init();
        NavigationFeatures.init();
        DataVisualization.init();

        // 添加加载完成类
        document.body.classList.add('loaded');
        
        console.log('🎉 智游助手v6.5 高保真原型已初始化完成');
    }
}

// 导出全局函数供HTML使用
window.openPage = function(url) {
    window.open(url, '_blank');
};

window.scrollToDay = function(day) {
    const dayElement = document.querySelector(`[data-day="${day}"]`);
    if (dayElement) {
        dayElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center'
        });
        // 添加高亮效果
        dayElement.style.transform = 'scale(1.05)';
        dayElement.style.boxShadow = '0 15px 40px rgba(99, 102, 241, 0.3)';
        setTimeout(() => {
            dayElement.style.transform = '';
            dayElement.style.boxShadow = '';
        }, 1000);
    }
};

// 启动初始化
initializePrototype();
