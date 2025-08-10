#!/usr/bin/env node

/**
 * GitHub认证自动修复脚本
 */

const { execSync } = require('child_process');
const readline = require('readline');

console.log('🔧 GitHub认证自动修复');
console.log('=====================================');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 询问用户确认
function askUser(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.toLowerCase().startsWith('y'));
    });
  });
}

// 检查GitHub CLI
function checkGitHubCLI() {
  try {
    execSync('gh --version', { stdio: 'pipe' });
    return true;
  } catch (error) {
    return false;
  }
}

// 安装GitHub CLI
async function installGitHubCLI() {
  console.log('📦 检测到GitHub CLI未安装');
  
  const shouldInstall = await askUser('是否自动安装GitHub CLI? (y/N): ');
  
  if (shouldInstall) {
    try {
      console.log('正在安装GitHub CLI...');
      execSync('brew install gh', { stdio: 'inherit' });
      console.log('✅ GitHub CLI安装成功');
      return true;
    } catch (error) {
      console.log('❌ 自动安装失败，请手动安装:');
      console.log('brew install gh');
      return false;
    }
  } else {
    console.log('请手动安装GitHub CLI: brew install gh');
    return false;
  }
}

// 重新认证GitHub
async function reAuthGitHub() {
  console.log('🔐 开始GitHub重新认证流程');
  
  try {
    // 先登出
    console.log('正在登出当前账户...');
    try {
      execSync('gh auth logout', { stdio: 'pipe' });
    } catch (error) {
      // 忽略登出错误
    }
    
    // 重新登录
    console.log('开始重新登录...');
    console.log('请在弹出的浏览器中完成认证');
    
    execSync('gh auth login --git-protocol https --web', { stdio: 'inherit' });
    
    // 验证认证
    const authStatus = execSync('gh auth status', { encoding: 'utf8' });
    console.log('✅ GitHub认证成功');
    console.log(authStatus);
    
    return true;
  } catch (error) {
    console.log('❌ GitHub认证失败:', error.message);
    return false;
  }
}

// 验证权限
function verifyPermissions() {
  try {
    console.log('🔍 验证GitHub权限...');
    
    // 检查用户信息
    const userInfo = execSync('gh api user --jq "{login: .login, name: .name}"', { encoding: 'utf8' });
    console.log('用户信息:', userInfo.trim());
    
    // 检查仓库权限
    execSync('gh repo list --limit 1', { stdio: 'pipe' });
    console.log('✅ 仓库访问权限正常');
    
    return true;
  } catch (error) {
    console.log('❌ 权限验证失败:', error.message);
    console.log('请确保GitHub账户有创建仓库的权限');
    return false;
  }
}

// 主修复流程
async function main() {
  try {
    console.log('开始GitHub CLI修复流程...\n');
    
    // 1. 检查GitHub CLI安装
    let cliInstalled = checkGitHubCLI();
    
    if (!cliInstalled) {
      cliInstalled = await installGitHubCLI();
      if (!cliInstalled) {
        rl.close();
        process.exit(1);
      }
    } else {
      console.log('✅ GitHub CLI已安装');
    }
    
    // 2. 重新认证
    const authSuccess = await reAuthGitHub();
    if (!authSuccess) {
      rl.close();
      process.exit(1);
    }
    
    // 3. 验证权限
    const permissionsOk = verifyPermissions();
    if (!permissionsOk) {
      rl.close();
      process.exit(1);
    }
    
    console.log('\n🎉 GitHub CLI修复完成！');
    console.log('现在可以继续Timeline解析架构v2.0的发布流程:');
    console.log('npm run release:complete');
    
    // 询问是否立即继续发布
    const shouldContinue = await askUser('\n是否立即继续发布流程? (y/N): ');
    
    if (shouldContinue) {
      console.log('\n🚀 开始Timeline解析架构v2.0发布流程...');
      rl.close();
      
      try {
        execSync('npm run release:complete', { stdio: 'inherit' });
      } catch (error) {
        console.log('❌ 发布流程失败:', error.message);
        process.exit(1);
      }
    } else {
      console.log('修复完成，请手动运行发布命令');
      rl.close();
    }
    
  } catch (error) {
    console.error('❌ 修复流程失败:', error);
    rl.close();
    process.exit(1);
  }
}

// 运行修复
if (require.main === module) {
  main();
}

module.exports = { main };
