# 智游助手v6.5 设计系统

基于Apple HIG和Material Design规范的完整设计系统文档。

## 🎨 设计原则

### 核心价值观
1. **用户至上** - 所有设计决策以用户体验为中心
2. **简洁明了** - 界面清晰，信息层次分明
3. **一致性** - 跨平台保持统一的设计语言
4. **可访问性** - 确保所有用户都能使用我们的产品
5. **创新性** - 在遵循规范的基础上追求创新

### 设计哲学
- **内容优先** - 界面服务于内容，不喧宾夺主
- **渐进式披露** - 按需展示信息，避免认知过载
- **反馈及时** - 用户操作后立即给予明确反馈
- **容错设计** - 预防错误发生，帮助用户恢复

## 🎯 颜色系统

### 主色调 (Primary Colors)
```css
--md-sys-color-primary: #1976D2;           /* 主品牌色 */
--md-sys-color-on-primary: #FFFFFF;        /* 主色上的文字 */
--md-sys-color-primary-container: #D3E3FD; /* 主色容器 */
--md-sys-color-on-primary-container: #001C38; /* 主色容器上的文字 */
```

### 辅助色调 (Secondary Colors)
```css
--md-sys-color-secondary: #DC004E;         /* 辅助色 */
--md-sys-color-on-secondary: #FFFFFF;      /* 辅助色上的文字 */
--md-sys-color-secondary-container: #FFD9E2; /* 辅助色容器 */
--md-sys-color-on-secondary-container: #3E0014; /* 辅助色容器上的文字 */
```

### 表面色调 (Surface Colors)
```css
--md-sys-color-surface: #FFFFFF;           /* 表面色 */
--md-sys-color-on-surface: #1C1B1F;       /* 表面上的文字 */
--md-sys-color-surface-variant: #F4F4F4;  /* 表面变体 */
--md-sys-color-on-surface-variant: #49454F; /* 表面变体上的文字 */
```

### 语义色调 (Semantic Colors)
```css
--md-sys-color-error: #BA1A1A;            /* 错误色 */
--md-sys-color-success: #2E7D32;          /* 成功色 */
--md-sys-color-warning: #F57C00;          /* 警告色 */
--md-sys-color-info: #1976D2;             /* 信息色 */
```

### 使用指南
- **主色调**：用于主要操作按钮、链接、重要信息标识
- **辅助色调**：用于次要操作、强调元素、装饰性元素
- **表面色调**：用于卡片、对话框、底部导航等容器
- **语义色调**：用于状态提示、反馈信息、警告提醒

## 📝 字体系统

### Apple HIG 字体规范
```css
/* 大标题 - 页面主标题 */
.text-ios-large-title { font-size: 34px; line-height: 41px; font-weight: 700; }

/* 标题1 - 章节标题 */
.text-ios-title-1 { font-size: 28px; line-height: 34px; font-weight: 700; }

/* 标题2 - 子章节标题 */
.text-ios-title-2 { font-size: 22px; line-height: 28px; font-weight: 700; }

/* 标题3 - 小节标题 */
.text-ios-title-3 { font-size: 20px; line-height: 25px; font-weight: 600; }

/* 正文 - 主要内容文字 */
.text-ios-body { font-size: 17px; line-height: 22px; font-weight: 400; }

/* 说明文字 - 辅助信息 */
.text-ios-callout { font-size: 16px; line-height: 21px; font-weight: 400; }

/* 脚注 - 次要信息 */
.text-ios-footnote { font-size: 13px; line-height: 18px; font-weight: 400; }
```

### Material Design 字体规范
```css
/* 显示文字 - 最大标题 */
.text-md-display-large { font-size: 57px; line-height: 64px; font-weight: 400; }

/* 标题文字 - 页面标题 */
.text-md-headline-large { font-size: 32px; line-height: 40px; font-weight: 400; }

/* 正文文字 - 主要内容 */
.text-md-body-large { font-size: 16px; line-height: 24px; font-weight: 400; }

/* 标签文字 - 按钮和标签 */
.text-md-label-large { font-size: 14px; line-height: 20px; font-weight: 500; }
```

## 📏 间距系统

### 8pt 网格系统
```css
--spacing-xs: 4px;   /* 0.5 units - 最小间距 */
--spacing-sm: 8px;   /* 1 unit - 小间距 */
--spacing-md: 16px;  /* 2 units - 标准间距 */
--spacing-lg: 24px;  /* 3 units - 大间距 */
--spacing-xl: 32px;  /* 4 units - 超大间距 */
--spacing-2xl: 48px; /* 6 units - 章节间距 */
--spacing-3xl: 64px; /* 8 units - 页面间距 */
```

### 使用原则
- **内容间距**：使用 16px (md) 作为标准内容间距
- **组件间距**：使用 8px (sm) 作为组件内部间距
- **章节间距**：使用 24px (lg) 分隔不同章节
- **页面边距**：使用 16px (md) 作为页面左右边距

## 🔘 圆角系统

```css
--radius-xs: 4px;    /* 小圆角 - 输入框、标签 */
--radius-sm: 8px;    /* 标准圆角 - 按钮、卡片 */
--radius-md: 12px;   /* 中等圆角 - 大卡片 */
--radius-lg: 16px;   /* 大圆角 - 模态框 */
--radius-xl: 24px;   /* 超大圆角 - 特殊容器 */
--radius-full: 9999px; /* 完全圆角 - 头像、徽章 */
```

## 🌟 阴影系统

### Material Design Elevation
```css
--elevation-0: none; /* 无阴影 */
--elevation-1: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 1px 3px 1px rgba(0, 0, 0, 0.15);
--elevation-2: 0px 1px 2px rgba(0, 0, 0, 0.3), 0px 2px 6px 2px rgba(0, 0, 0, 0.15);
--elevation-3: 0px 1px 3px rgba(0, 0, 0, 0.3), 0px 4px 8px 3px rgba(0, 0, 0, 0.15);
--elevation-4: 0px 2px 3px rgba(0, 0, 0, 0.3), 0px 6px 10px 4px rgba(0, 0, 0, 0.15);
--elevation-5: 0px 4px 4px rgba(0, 0, 0, 0.3), 0px 8px 12px 6px rgba(0, 0, 0, 0.15);
```

### 使用指南
- **Elevation 1**：卡片、按钮的默认状态
- **Elevation 2**：悬停状态、选中状态
- **Elevation 3**：拖拽状态、重要卡片
- **Elevation 4**：导航抽屉、底部表单
- **Elevation 5**：模态对话框、菜单

## 🎬 动画系统

### 动画时长
```css
--duration-short: 100ms;      /* 微交互 */
--duration-medium: 200ms;     /* 标准过渡 */
--duration-long: 300ms;       /* 复杂动画 */
--duration-extra-long: 500ms; /* 页面切换 */
```

### 缓动函数
```css
--easing-standard: cubic-bezier(0.2, 0.0, 0, 1.0);    /* 标准缓动 */
--easing-decelerate: cubic-bezier(0.0, 0.0, 0.2, 1.0); /* 减速缓动 */
--easing-accelerate: cubic-bezier(0.4, 0.0, 1.0, 1.0); /* 加速缓动 */
```

### 动画原则
- **有意义的动画**：每个动画都应该有明确的目的
- **性能优先**：优先使用 transform 和 opacity 属性
- **尊重用户偏好**：支持减少动画的系统设置
- **一致性**：相同类型的动画使用相同的时长和缓动

## 🎯 组件规范

### 按钮 (Button)
```css
/* 主要按钮 */
.btn-primary {
  height: 44px;           /* iOS: 44pt 最小触控目标 */
  min-width: 64px;        /* Material: 64dp 最小宽度 */
  padding: 12px 24px;
  border-radius: 8px;     /* iOS 风格 */
  font-weight: 600;
  transition: all 200ms ease;
}

/* Material Design 按钮 */
.btn-md-filled {
  height: 40px;
  min-width: 64px;
  padding: 10px 24px;
  border-radius: 16px;    /* Material 风格 */
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.1px;
}
```

### 输入框 (Input)
```css
/* iOS 风格输入框 */
.input-ios {
  min-height: 44px;       /* 44pt 最小触控目标 */
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid rgba(0, 0, 0, 0.2);
  font-size: 17px;        /* iOS body 字体大小 */
}

/* Material Design 输入框 */
.input-md-outlined {
  min-height: 56px;       /* 56dp 标准高度 */
  padding: 16px;
  border-radius: 4px;
  border: 1px solid var(--md-sys-color-on-surface-variant);
  font-size: 16px;        /* Material body-large */
}
```

### 卡片 (Card)
```css
/* iOS 风格卡片 */
.card-ios {
  border-radius: 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: var(--md-sys-color-surface);
  transition: all 200ms ease;
}

.card-ios:hover {
  transform: translateY(-2px);
  box-shadow: var(--elevation-2);
}

/* Material Design 卡片 */
.card-md {
  border-radius: 12px;
  box-shadow: var(--elevation-1);
  background: var(--md-sys-color-surface);
  transition: box-shadow 200ms ease;
}

.card-md:hover {
  box-shadow: var(--elevation-2);
}
```

## 📱 响应式设计

### 断点系统
```css
/* 移动端 */
@media (max-width: 767px) {
  /* 单列布局，大字体，大触控目标 */
}

/* 平板端 */
@media (min-width: 768px) and (max-width: 1023px) {
  /* 两列布局，适中字体 */
}

/* 桌面端 */
@media (min-width: 1024px) {
  /* 多列布局，紧凑间距 */
}
```

### 触控目标
```css
--min-touch-target: 44px;    /* Apple HIG: 44pt 最小值 */
--md-min-touch-target: 48px; /* Material Design: 48dp 最小值 */
```

## ♿ 无障碍设计

### 对比度要求
- **正常文本**：对比度至少 4.5:1
- **大文本**：对比度至少 3:1
- **非文本元素**：对比度至少 3:1

### 语义化标记
```html
<!-- 使用语义化HTML -->
<main>
  <section>
    <h1>页面标题</h1>
    <article>
      <h2>文章标题</h2>
      <p>文章内容</p>
    </article>
  </section>
</main>

<!-- 表单标签关联 -->
<label for="email">邮箱地址</label>
<input id="email" type="email" required aria-describedby="email-error">
<div id="email-error" role="alert">请输入有效的邮箱地址</div>
```

### ARIA 属性
```html
<!-- 按钮状态 -->
<button aria-pressed="false">切换</button>

<!-- 加载状态 -->
<div aria-live="polite" aria-busy="true">正在加载...</div>

<!-- 错误提示 -->
<div role="alert" aria-live="assertive">操作失败，请重试</div>
```

## 🔧 实现指南

### CSS 变量使用
```css
/* 使用设计令牌 */
.component {
  color: var(--md-sys-color-on-surface);
  background: var(--md-sys-color-surface);
  padding: var(--spacing-md);
  border-radius: var(--radius-sm);
  transition: all var(--duration-medium) var(--easing-standard);
}
```

### Tailwind CSS 类名
```html
<!-- 使用设计系统类名 -->
<div class="bg-md-surface text-md-on-surface p-md rounded-sm shadow-elevation-1">
  <h2 class="text-md-headline-medium mb-sm">标题</h2>
  <p class="text-md-body-large text-md-on-surface-variant">内容</p>
</div>
```

### 组件开发规范
```tsx
// 组件接口设计
interface ComponentProps {
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  platform?: 'ios' | 'material' | 'auto';
  disabled?: boolean;
  children: React.ReactNode;
}

// 平台检测
const detectedPlatform = platform === 'auto' 
  ? (typeof window !== 'undefined' && /iPhone|iPad|iPod|Mac/.test(navigator.userAgent) ? 'ios' : 'material')
  : platform;
```

## 📚 资源链接

### 官方文档
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Material Design 3](https://m3.material.io/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### 设计工具
- [Figma Material Design Kit](https://www.figma.com/community/file/1035203688168086460)
- [Apple Design Resources](https://developer.apple.com/design/resources/)
- [Contrast Checker](https://webaim.org/resources/contrastchecker/)

### 开发工具
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [React Hook Form](https://react-hook-form.com/)

---

**维护说明**：
- 设计系统应定期更新以反映最新的平台规范
- 所有变更都应通过设计评审流程
- 新增组件必须符合现有的设计原则和规范
- 定期进行设计系统的可用性测试和优化
