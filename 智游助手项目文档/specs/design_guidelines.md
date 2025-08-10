# Apple & Google 设计规范完整指南

这份文档为 Augmented Code 学习提供了 Apple 和 Google 的核心设计规范资源。

## 🍎 Apple 设计规范

### 核心资源
- **Human Interface Guidelines (HIG)**: https://developer.apple.com/design/human-interface-guidelines/
  - Apple 官方设计指南，涵盖所有 Apple 平台的设计最佳实践

- **Apple Design Resources**: https://developer.apple.com/design/resources/
  - 官方设计模板、图标制作模板、颜色指南等

- **Apple Design 主页**: https://developer.apple.com/design/
  - 设计相关的最新功能和工具更新

### 平台特定指南
- **iOS 设计指南**: https://developer.apple.com/design/human-interface-guidelines/designing-for-ios/
  - 专门针对 iPhone 应用的设计规范

### Apple 设计核心原则
1. **清晰性 (Clarity)** - 界面应该清晰易懂
2. **一致性 (Consistency)** - 保持设计语言的统一性
3. **遵从性 (Deference)** - 内容为王，界面服务于内容

### 关键设计要素
- **颜色系统**: 支持浅色和深色模式
- **字体**: San Francisco 字体系统
- **布局**: 基于网格系统的响应式设计
- **无障碍**: WCAG 2.1 AA 标准

---

## 🎨 Google 设计规范

### 核心资源
- **Material Design 3**: https://m3.material.io/
  - Google 最新的开源设计系统

- **Material Design 2**: https://m2.material.io/design/guidelines-overview
  - 经典版本的 Material Design 指南

- **Google Design**: https://design.google/
  - Google 设计团队的资源和灵感

### 设计系统组件
- **Style Guide**: https://m3.material.io/foundations/content-design/style-guide
  - 内容设计和文本规范

### Material Design 核心原则

#### 1. 材料隐喻 (Material Metaphor)
- 基于纸张和墨水的物理世界概念
- 表面、边缘、接缝、阴影的真实感

#### 2. 粗体、图形化、有意图 (Bold, Graphic, Intentional)
- 大胆的颜色、字体和图像
- 创造清晰且引人入胜的设计

#### 3. 运动提供意义 (Motion Provides Meaning)
- 动画和过渡应该有意义
- 引导用户理解界面变化

### Material Design 3 新特性
- **动态颜色**: 基于用户壁纸生成配色方案
- **个性化**: 更强的个性化定制能力
- **可访问性**: 改进的对比度和可读性

---

## 🛠️ 技术实现资源

### Apple 开发工具
- **Xcode**: 官方 iOS/macOS 开发环境
- **SwiftUI**: 声明式 UI 框架
- **UIKit**: 传统的 iOS UI 框架

### Google 开发工具
- **Flutter**: 跨平台 UI 工具包，深度集成 Material Design
- **Material Components**: 各平台的 Material Design 组件库
  - Web: Material Components for Web
  - Android: Material Components for Android
  - Flutter: Material Components widgets

### 设计工具支持
- **Figma**: 两个平台都有官方设计组件库
- **Sketch**: Apple 平台设计模板
- **Adobe XD**: 支持两个设计系统的组件

---

## 📋 Augmented Code 学习重点

### 对于 Apple 平台
1. **学习 HIG 核心原则**: 理解 iOS 设计哲学
2. **掌握导航模式**: Tab Bar, Navigation Bar, Modal 等
3. **了解系统控件**: 按钮、输入框、列表等标准组件
4. **适配不同设备**: iPhone, iPad, Mac 的响应式设计

### 对于 Google 平台
1. **理解 Material Design 原理**: 材料隐喻和层级概念
2. **掌握组件系统**: Cards, FAB, Navigation Drawer 等
3. **学习动画原则**: Meaningful transitions 和 motion
4. **响应式设计**: 适配不同屏幕尺寸

### 跨平台考虑
1. **一致性 vs 平台特色**: 何时保持一致，何时遵循平台惯例
2. **设计令牌**: 颜色、字体、间距的系统化管理
3. **组件库**: 构建可复用的 UI 组件系统

---

## 📚 深入学习资源

### Apple
- Apple Developer WWDC 设计相关 sessions
- iOS Human Interface Guidelines 详细阅读
- Apple Design Awards 获奖应用分析

### Google
- Material Design 博客和案例研究
- Google I/O 设计相关内容
- Material Design 开源代码库

### 社区资源
- Dribbble 上的平台特定设计
- Medium 上的设计系统文章
- GitHub 上的开源设计系统实现

---

## 🎯 实践建议

1. **先理论后实践**: 深入理解设计原则再开始编码
2. **组件化思维**: 构建可复用的 UI 组件库
3. **保持更新**: 设计规范会定期更新，需要持续关注
4. **用户测试**: 设计规范是基础，用户反馈是关键
5. **跨平台一致性**: 在遵循平台惯例的同时保持品牌一致性

这些资源为 Augmented Code 提供了全面的设计规范基础，建议按照项目需求重点学习相关平台的设计指南。