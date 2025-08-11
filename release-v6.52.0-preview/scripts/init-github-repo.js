#!/usr/bin/env node

/**
 * GitHub仓库初始化脚本
 * 创建GitHub仓库并推送代码
 */

const { execSync } = require('child_process');
const fs = require('fs');

console.log('🏗️  GitHub仓库初始化');
console.log('=====================================');

const REPO_NAME = 'smart-travel-assistant-v6';
const REPO_DESCRIPTION = '智游助手v6.5 - 企业级AI旅行规划系统，集成Timeline解析架构v2.0';

// 检查GitHub CLI
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    console.log('❌ GitHub CLI未安装');
    console.log('请安装GitHub CLI: https://cli.github.com/');
    return false;
  }
}

// 检查GitHub认证
function checkGitHubAuth() {
  try {
    const authStatus = execSync('gh auth status', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ GitHub认证状态正常');
    return true;
  } catch (error) {
    console.log('❌ GitHub CLI未认证');
    console.log('请运行: gh auth login');
    return false;
  }
}

// 初始化Git仓库
function initGitRepo() {
  try {
    // 检查是否已经是Git仓库
    try {
      execSync('git rev-parse --git-dir', { stdio: 'pipe' });
      console.log('✅ Git仓库已存在');
      return true;
    } catch (error) {
      // 不是Git仓库，初始化
      console.log('📁 初始化Git仓库...');
      execSync('git init', { stdio: 'inherit' });
      console.log('✅ Git仓库初始化完成');
      return true;
    }
  } catch (error) {
    console.log('❌ Git仓库初始化失败:', error.message);
    return false;
  }
}

// 创建.gitignore文件
function createGitignore() {
  const gitignoreContent = `# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Next.js
.next/
out/
build/
dist/

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Database
*.db
*.sqlite
data/

# Logs
logs/
*.log

# Runtime data
pids/
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/
*.lcov

# nyc test coverage
.nyc_output

# Dependency directories
jspm_packages/

# Optional npm cache directory
.npm

# Optional eslint cache
.eslintcache

# Microbundle cache
.rpt2_cache/
.rts2_cache_cjs/
.rts2_cache_es/
.rts2_cache_umd/

# Optional REPL history
.node_repl_history

# Output of 'npm pack'
*.tgz

# Yarn Integrity file
.yarn-integrity

# parcel-bundler cache (https://parceljs.org/)
.cache
.parcel-cache

# Stores VSCode versions used for testing VSCode extensions
.vscode-test

# yarn v2
.yarn/cache
.yarn/unplugged
.yarn/build-state.yml
.yarn/install-state.gz
.pnp.*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Release
release/
release-package/
*.tar.gz

# Temporary files
tmp/
temp/
`;

  if (!fs.existsSync('.gitignore')) {
    fs.writeFileSync('.gitignore', gitignoreContent);
    console.log('✅ .gitignore文件已创建');
  } else {
    console.log('✅ .gitignore文件已存在');
  }
}

// 创建GitHub仓库
function createGitHubRepo() {
  try {
    console.log('🏗️  创建GitHub仓库...');
    
    const createCommand = `gh repo create ${REPO_NAME} \\
      --description "${REPO_DESCRIPTION}" \\
      --public \\
      --clone=false \\
      --add-readme=false`;
    
    execSync(createCommand, { stdio: 'inherit' });
    console.log('✅ GitHub仓库创建成功');
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log('ℹ️  GitHub仓库已存在');
      return true;
    }
    console.log('❌ GitHub仓库创建失败:', error.message);
    return false;
  }
}

// 添加远程仓库
function addRemoteOrigin() {
  try {
    // 检查是否已有远程仓库
    try {
      const remoteUrl = execSync('git remote get-url origin', { encoding: 'utf8', stdio: 'pipe' });
      console.log(`✅ 远程仓库已存在: ${remoteUrl.trim()}`);
      return true;
    } catch (error) {
      // 没有远程仓库，添加
      console.log('🔗 添加远程仓库...');
      const username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
      const repoUrl = `https://github.com/${username}/${REPO_NAME}.git`;
      
      execSync(`git remote add origin ${repoUrl}`, { stdio: 'inherit' });
      console.log(`✅ 远程仓库已添加: ${repoUrl}`);
      return true;
    }
  } catch (error) {
    console.log('❌ 添加远程仓库失败:', error.message);
    return false;
  }
}

// 推送代码到GitHub
function pushToGitHub() {
  try {
    console.log('📤 推送代码到GitHub...');
    
    // 添加所有文件
    execSync('git add .', { stdio: 'inherit' });
    
    // 创建初始提交
    try {
      execSync('git commit -m "🎉 Initial commit: 智游助手v6.5.0 - Timeline解析架构v2.0"', { stdio: 'inherit' });
    } catch (error) {
      if (error.message.includes('nothing to commit')) {
        console.log('ℹ️  没有需要提交的更改');
      } else {
        throw error;
      }
    }
    
    // 设置主分支
    execSync('git branch -M main', { stdio: 'inherit' });
    
    // 推送到远程仓库
    execSync('git push -u origin main', { stdio: 'inherit' });
    
    console.log('✅ 代码推送成功');
    return true;
  } catch (error) {
    console.log('❌ 代码推送失败:', error.message);
    return false;
  }
}

// 设置仓库配置
function configureRepo() {
  try {
    console.log('⚙️  配置GitHub仓库...');
    
    // 设置仓库主题
    const topics = [
      'ai',
      'travel',
      'planning',
      'nextjs',
      'typescript',
      'llm',
      'timeline-parser',
      'travel-assistant'
    ];
    
    execSync(`gh repo edit --add-topic ${topics.join(',')}`, { stdio: 'pipe' });
    console.log('✅ 仓库主题已设置');
    
    // 启用Issues和Wiki
    execSync('gh repo edit --enable-issues --enable-wiki', { stdio: 'pipe' });
    console.log('✅ Issues和Wiki已启用');
    
    return true;
  } catch (error) {
    console.log('⚠️  仓库配置部分失败:', error.message);
    return true; // 不影响主流程
  }
}

// 显示仓库信息
function showRepoInfo() {
  try {
    console.log('\n📋 仓库信息:');
    const repoInfo = execSync(`gh repo view ${REPO_NAME}`, { encoding: 'utf8' });
    console.log(repoInfo);
    
    console.log('\n🔗 仓库链接:');
    const username = execSync('gh api user --jq .login', { encoding: 'utf8' }).trim();
    const repoUrl = `https://github.com/${username}/${REPO_NAME}`;
    console.log(repoUrl);
    
    return repoUrl;
  } catch (error) {
    console.log('❌ 获取仓库信息失败:', error.message);
    return null;
  }
}

// 主执行函数
async function main() {
  try {
    console.log('开始GitHub仓库初始化...\n');
    
    // 1. 检查GitHub CLI
    if (!checkGitHubCLI()) {
      process.exit(1);
    }
    
    // 2. 检查GitHub认证
    if (!checkGitHubAuth()) {
      process.exit(1);
    }
    
    // 3. 初始化Git仓库
    if (!initGitRepo()) {
      process.exit(1);
    }
    
    // 4. 创建.gitignore
    createGitignore();
    
    // 5. 创建GitHub仓库
    if (!createGitHubRepo()) {
      process.exit(1);
    }
    
    // 6. 添加远程仓库
    if (!addRemoteOrigin()) {
      process.exit(1);
    }
    
    // 7. 推送代码
    if (!pushToGitHub()) {
      process.exit(1);
    }
    
    // 8. 配置仓库
    configureRepo();
    
    // 9. 显示仓库信息
    const repoUrl = showRepoInfo();
    
    console.log('\n🎉 GitHub仓库初始化完成！');
    console.log('=====================================');
    console.log(`✅ 仓库名称: ${REPO_NAME}`);
    console.log(`✅ 仓库描述: ${REPO_DESCRIPTION}`);
    console.log(`✅ 仓库地址: ${repoUrl}`);
    console.log('✅ 代码已推送到main分支');
    
    console.log('\n🚀 下一步操作:');
    console.log('1. 创建Git标签: npm run create-tag');
    console.log('2. 创建GitHub Release: npm run github-release');
    console.log('3. 验证仓库设置和文档');
    console.log('4. 邀请协作者和设置权限');
    
  } catch (error) {
    console.error('❌ GitHub仓库初始化失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  createGitHubRepo,
  pushToGitHub,
  REPO_NAME,
  REPO_DESCRIPTION
};
