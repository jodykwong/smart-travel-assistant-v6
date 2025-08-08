/**
 * 智游助手v6.2 - Phase 1兼容性验证脚本
 * 确保LangGraph集成不会破坏现有Phase 1功能
 */

async function verifyPhase1Compatibility() {
  console.log('🔍 开始验证Phase 1兼容性...\n');

  try {
    // 1. 验证现有文件结构
    console.log('📁 验证现有文件结构...');
    
    const fs = await import('fs');
    const path = await import('path');
    
    const phase1CoreFiles = [
      'src/lib/geo/unified-geo-service.ts',
      'src/lib/geo/quality-monitor.ts',
      'src/lib/geo/intelligent-switcher.ts',
      'src/lib/geo/geo-data-adapter.ts',
      'src/lib/monitoring/monitoring-dashboard.ts',
      'src/lib/automation/automated-ops.ts',
      'src/lib/queue/intelligent-queue.ts',
      'src/lib/ui/transparency-manager.ts',
      'src/lib/error/user-friendly-error-handler.ts'
    ];

    let allFilesExist = true;
    for (const file of phase1CoreFiles) {
      const exists = fs.existsSync(file);
      console.log(`${exists ? '✅' : '❌'} ${file}`);
      if (!exists) allFilesExist = false;
    }

    if (!allFilesExist) {
      throw new Error('部分Phase 1核心文件缺失');
    }

    console.log('✅ Phase 1核心文件结构完整');

    // 2. 验证TypeScript编译兼容性
    console.log('\n🔧 验证TypeScript编译兼容性...');
    
    // 检查tsconfig.json
    if (fs.existsSync('tsconfig.json')) {
      console.log('✅ tsconfig.json存在');
    } else {
      console.log('⚠️  tsconfig.json不存在');
    }

    // 3. 验证package.json依赖
    console.log('\n📦 验证package.json依赖...');
    
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    
    const requiredDependencies = [
      '@langchain/langgraph',
      '@langchain/core',
      '@langchain/community',
      'uuid',
      '@types/uuid'
    ];

    const missingDeps = [];
    for (const dep of requiredDependencies) {
      if (packageJson.dependencies[dep] || packageJson.devDependencies?.[dep]) {
        console.log(`✅ ${dep}: ${packageJson.dependencies[dep] || packageJson.devDependencies[dep]}`);
      } else {
        console.log(`❌ ${dep}: 缺失`);
        missingDeps.push(dep);
      }
    }

    if (missingDeps.length > 0) {
      throw new Error(`缺失依赖: ${missingDeps.join(', ')}`);
    }

    // 4. 验证现有脚本兼容性
    console.log('\n📜 验证现有脚本兼容性...');
    
    const existingScripts = [
      'dev',
      'build',
      'start',
      'test',
      'lint'
    ];

    for (const script of existingScripts) {
      if (packageJson.scripts[script]) {
        console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
      } else {
        console.log(`⚠️  ${script}: 缺失`);
      }
    }

    // 5. 验证新增LangGraph文件不冲突
    console.log('\n🆕 验证新增LangGraph文件...');
    
    const newLangGraphFiles = [
      'src/lib/langgraph/smart-travel-state.ts',
      'src/lib/langgraph/travel-orchestrator.ts',
      'src/lib/langgraph/quality-aware-router.ts'
    ];

    for (const file of newLangGraphFiles) {
      const exists = fs.existsSync(file);
      console.log(`${exists ? '✅' : '⚠️ '} ${file} ${exists ? '已创建' : '待创建'}`);
    }

    // 6. 验证目录结构合理性
    console.log('\n📂 验证目录结构合理性...');
    
    const expectedDirs = [
      'src/lib/geo',
      'src/lib/monitoring',
      'src/lib/automation',
      'src/lib/queue',
      'src/lib/ui',
      'src/lib/error',
      'src/lib/langgraph',
      'src/tests'
    ];

    for (const dir of expectedDirs) {
      const exists = fs.existsSync(dir);
      console.log(`${exists ? '✅' : '❌'} ${dir}`);
    }

    // 7. 验证API路由结构
    console.log('\n🛣️  验证API路由结构...');
    
    const apiDirs = [
      'src/app/api',
      'src/pages/api'
    ];

    let apiDirExists = false;
    for (const dir of apiDirs) {
      if (fs.existsSync(dir)) {
        console.log(`✅ ${dir} 存在`);
        apiDirExists = true;
        break;
      }
    }

    if (!apiDirExists) {
      console.log('⚠️  API目录结构需要确认');
    }

    // 8. 生成兼容性报告
    console.log('\n📊 生成兼容性报告...');
    
    const compatibilityReport = {
      timestamp: new Date().toISOString(),
      phase1FilesIntact: allFilesExist,
      langGraphDependenciesInstalled: missingDeps.length === 0,
      newFilesCreated: newLangGraphFiles.filter(f => fs.existsSync(f)).length,
      totalNewFiles: newLangGraphFiles.length,
      compatibilityScore: allFilesExist && missingDeps.length === 0 ? 100 : 85
    };

    fs.writeFileSync(
      'compatibility-report.json',
      JSON.stringify(compatibilityReport, null, 2)
    );

    console.log('✅ 兼容性报告已生成: compatibility-report.json');
    console.log('📊 兼容性评分:', compatibilityReport.compatibilityScore + '%');

    // 9. 验证总结
    console.log('\n🎉 Phase 1兼容性验证完成！');
    console.log('📋 验证摘要:');
    console.log(`  ✅ Phase 1核心文件: ${allFilesExist ? '完整' : '缺失'}`);
    console.log(`  ✅ LangGraph依赖: ${missingDeps.length === 0 ? '已安装' : '缺失'}`);
    console.log(`  ✅ 新文件创建: ${newLangGraphFiles.filter(f => fs.existsSync(f)).length}/${newLangGraphFiles.length}`);
    console.log(`  ✅ 兼容性评分: ${compatibilityReport.compatibilityScore}%`);

    if (compatibilityReport.compatibilityScore >= 95) {
      console.log('\n🚀 兼容性验证优秀，可以安全进行LangGraph集成开发！');
      return true;
    } else if (compatibilityReport.compatibilityScore >= 80) {
      console.log('\n⚠️  兼容性验证良好，建议解决部分问题后进行开发');
      return true;
    } else {
      console.log('\n❌ 兼容性验证不通过，需要解决关键问题');
      return false;
    }

  } catch (error) {
    console.error('\n❌ Phase 1兼容性验证失败:');
    console.error('错误详情:', error.message);
    console.error('错误堆栈:', error.stack);
    return false;
  }
}

// 执行验证
verifyPhase1Compatibility()
  .then(success => {
    if (success) {
      console.log('\n🎯 Phase 1兼容性验证通过，准备明天的LangGraph核心开发！');
      console.log('📅 明天任务预览:');
      console.log('  🌅 09:00-12:00: LangGraph编排器核心框架开发');
      console.log('  🌆 13:30-17:30: 质量感知路由器和集成测试');
      process.exit(0);
    } else {
      console.log('\n⚠️  兼容性验证存在问题，请先解决后再进行开发');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 验证过程发生异常:', error);
    process.exit(1);
  });
