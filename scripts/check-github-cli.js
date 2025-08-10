#!/usr/bin/env node

/**
 * GitHub CLI状态检查和自动修复脚本
 */

const { execSync } = require('child_process');

console.log('🔍 GitHub CLI状态检查');
console.log('=====================================');

// 检查GitHub CLI安装
function checkGitHubCLI() {
  try {
    const version = execSync('gh --version', { encoding: 'utf8' });
    console.log('✅ GitHub CLI已安装');
    console.log(version.trim());
    return true;
  } catch (error) {
    console.log('❌ GitHub CLI未安装');
    console.log('请运行: brew install gh');
    return false;
  }
}

// 检查GitHub认证状态
function checkGitHubAuth() {
  try {
    const authStatus = execSync('gh auth status', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ GitHub认证正常');
    console.log(authStatus.trim());
    return true;
  } catch (error) {
    console.log('❌ GitHub认证失败');
    console.log('错误信息:', error.message);
    return false;
  }
}

// 获取用户信息
function getUserInfo() {
  try {
    const userInfo = execSync('gh api user --jq "{login: .login, name: .name}"', { encoding: 'utf8' });
    console.log('👤 用户信息:');
    console.log(userInfo.trim());
    return true;
  } catch (error) {
    console.log('❌ 无法获取用户信息');
    return false;
  }
}

// 检查仓库权限
function checkRepoPermissions() {
  try {
    const repos = execSync('gh repo list --limit 1', { encoding: 'utf8' });
    console.log('✅ 仓库访问权限正常');
    return true;
  } catch (error) {
    console.log('❌ 仓库访问权限不足');
    console.log('请确保有创建仓库的权限');
    return false;
  }
}

// 提供修复建议
function provideFix(cliInstalled, authWorking, userInfoWorking, repoPermWorking) {
  console.log('\n🔧 修复建议');
  console.log('=====================================');
  
  if (!cliInstalled) {
    console.log('1. 安装GitHub CLI:');
    console.log('   brew install gh');
    console.log('');
  }
  
  if (!authWorking) {
    console.log('2. 重新认证GitHub:');
    console.log('   gh auth logout');
    console.log('   gh auth login');
    console.log('   选择: GitHub.com → HTTPS → 浏览器登录');
    console.log('');
  }
  
  if (!repoPermWorking) {
    console.log('3. 检查GitHub权限:');
    console.log('   - 确保账户可以创建公共仓库');
    console.log('   - 确保Token有repo权限');
    console.log('');
  }
  
  console.log('修复完成后，重新运行:');
  console.log('npm run release:complete');
}

// 主函数
function main() {
  console.log('开始检查GitHub CLI状态...\n');
  
  const cliInstalled = checkGitHubCLI();
  console.log('');
  
  let authWorking = false;
  let userInfoWorking = false;
  let repoPermWorking = false;
  
  if (cliInstalled) {
    authWorking = checkGitHubAuth();
    console.log('');
    
    if (authWorking) {
      userInfoWorking = getUserInfo();
      console.log('');
      
      repoPermWorking = checkRepoPermissions();
      console.log('');
    }
  }
  
  // 总结
  console.log('📊 检查结果');
  console.log('=====================================');
  console.log(`GitHub CLI安装: ${cliInstalled ? '✅' : '❌'}`);
  console.log(`GitHub认证: ${authWorking ? '✅' : '❌'}`);
  console.log(`用户信息: ${userInfoWorking ? '✅' : '❌'}`);
  console.log(`仓库权限: ${repoPermWorking ? '✅' : '❌'}`);
  
  const allGood = cliInstalled && authWorking && userInfoWorking && repoPermWorking;
  
  if (allGood) {
    console.log('\n🎉 GitHub CLI状态正常！');
    console.log('可以继续执行发布流程:');
    console.log('npm run release:complete');
  } else {
    provideFix(cliInstalled, authWorking, userInfoWorking, repoPermWorking);
  }
  
  return allGood;
}

// 运行检查
if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main };
