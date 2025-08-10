# 贡献指南

感谢您对智游助手v6.5项目的关注！我们欢迎所有形式的贡献，包括但不限于代码、文档、测试、反馈和建议。

## 🎯 贡献方式

### 1. 代码贡献
- 修复Bug
- 新增功能
- 性能优化
- 代码重构

### 2. 文档贡献
- 改进文档
- 翻译文档
- 添加示例
- 修正错误

### 3. 测试贡献
- 编写测试用例
- 报告Bug
- 性能测试
- 兼容性测试

## 🚀 开发环境搭建

### 前置要求
- Node.js v18.17.0+
- npm v9.0.0+
- Git

### 环境搭建
```bash
# 1. Fork并克隆仓库
git clone https://github.com/your-username/smart-travel-assistant-v6.git
cd smart-travel-assistant-v6

# 2. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env.local
# 编辑.env.local，填入必要的API密钥

# 4. 启动开发服务器
npm run dev

# 5. 运行测试
npm test
```

## 📝 开发规范

### 代码规范
- 使用TypeScript编写代码
- 遵循ESLint配置
- 使用Prettier格式化代码
- 编写有意义的注释

### 提交规范
使用[Conventional Commits](https://www.conventionalcommits.org/)规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型说明**：
- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建过程或辅助工具的变动

**示例**：
```
feat(timeline): 添加Timeline解析架构v2.0支持

- 实现可插拔解析器系统
- 添加Feature Flag支持
- 提升解析成功率到99%+

Closes #123
```

### 分支规范
- `main`: 主分支，保持稳定
- `develop`: 开发分支
- `feature/xxx`: 功能分支
- `fix/xxx`: 修复分支
- `docs/xxx`: 文档分支

## 🔄 贡献流程

### 1. 准备工作
```bash
# Fork项目到您的GitHub账户
# 克隆您的Fork
git clone https://github.com/your-username/smart-travel-assistant-v6.git

# 添加上游仓库
git remote add upstream https://github.com/original-org/smart-travel-assistant-v6.git

# 创建功能分支
git checkout -b feature/your-feature-name
```

### 2. 开发阶段
```bash
# 保持代码最新
git fetch upstream
git rebase upstream/main

# 进行开发
# ... 编写代码 ...

# 运行测试
npm test
npm run type-check
npm run lint

# 提交代码
git add .
git commit -m "feat: 添加新功能"
```

### 3. 提交PR
```bash
# 推送到您的Fork
git push origin feature/your-feature-name

# 在GitHub上创建Pull Request
# 填写PR模板，描述您的更改
```

## 📋 PR检查清单

在提交PR之前，请确保：

### 代码质量
- [ ] 代码通过所有测试
- [ ] 代码通过类型检查
- [ ] 代码通过Lint检查
- [ ] 新功能有对应的测试用例
- [ ] 代码有适当的注释

### 文档更新
- [ ] 更新相关文档
- [ ] 更新API文档（如适用）
- [ ] 更新README（如适用）
- [ ] 添加变更日志

### 兼容性
- [ ] 保持向后兼容性
- [ ] 测试在不同环境下的兼容性
- [ ] 确保不破坏现有功能

## 🧪 测试指南

### 运行测试
```bash
# 运行所有测试
npm test

# 运行特定测试
npm test -- --grep "Timeline"

# 运行E2E测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:coverage
```

### 编写测试
```typescript
// 示例：Timeline解析器测试
describe('TimelineOrchestrator', () => {
  it('should parse JSON format correctly', async () => {
    const raw = '{"days": [{"day": 1, "title": "Day 1"}]}';
    const context = createParseContext('北京', 3, 'test-session');
    
    const result = await timelineOrchestrator.parseTimeline(raw, context);
    
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].day).toBe(1);
  });
});
```

## 🐛 Bug报告

### 报告Bug
使用GitHub Issues报告Bug，请包含：

1. **Bug描述**: 清晰描述问题
2. **复现步骤**: 详细的复现步骤
3. **预期行为**: 期望的正确行为
4. **实际行为**: 实际发生的错误行为
5. **环境信息**: 操作系统、Node.js版本等
6. **错误日志**: 相关的错误信息和日志

### Bug报告模板
```markdown
## Bug描述
简要描述Bug的现象

## 复现步骤
1. 进入页面...
2. 点击按钮...
3. 看到错误...

## 预期行为
应该显示...

## 实际行为
实际显示...

## 环境信息
- OS: macOS 13.0
- Node.js: v18.17.0
- 浏览器: Chrome 120.0

## 错误日志
```
[错误日志内容]
```
```

## 💡 功能建议

### 提出建议
使用GitHub Issues提出功能建议，请包含：

1. **功能描述**: 详细描述建议的功能
2. **使用场景**: 说明功能的应用场景
3. **预期收益**: 功能带来的价值
4. **实现思路**: 可能的实现方案（可选）

## 🏆 贡献者认可

我们重视每一位贡献者的努力：

### 贡献者列表
- 代码贡献者将被添加到README的贡献者列表
- 重要贡献者将被邀请成为项目维护者
- 优秀贡献将在发布说明中特别感谢

### 贡献统计
- 使用[All Contributors](https://allcontributors.org/)记录贡献
- 包括代码、文档、测试、设计等各种贡献类型

## 📞 联系方式

### 获取帮助
- **GitHub Issues**: 报告Bug和功能建议
- **GitHub Discussions**: 技术讨论和问答
- **Email**: dev@smart-travel.ai

### 社区交流
- **微信群**: 扫描README中的二维码加入
- **QQ群**: 123456789
- **Discord**: https://discord.gg/smart-travel

## 📄 许可证

通过贡献代码，您同意您的贡献将在[MIT许可证](LICENSE)下发布。

---

再次感谢您的贡献！让我们一起打造更好的智游助手！ 🚀
