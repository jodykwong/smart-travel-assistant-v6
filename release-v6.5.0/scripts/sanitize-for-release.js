#!/usr/bin/env node

/**
 * 智游助手v6.5代码脱敏脚本
 * 移除敏感信息，准备开源发布
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 智游助手v6.5代码脱敏处理');
console.log('=====================================');

// 需要脱敏的文件模式
const sensitivePatterns = [
  // API密钥
  {
    pattern: /DEEPSEEK_API_KEY=your_deepseek_api_key_here
    replacement: 'DEEPSEEK_API_KEY=your_deepseek_api_key_here
    description: 'DeepSeek API密钥'
  },
  {
    pattern: /SILICONFLOW_API_KEY=your_siliconflow_api_key_here
    replacement: 'SILICONFLOW_API_KEY=your_siliconflow_api_key_here
    description: 'SiliconFlow API密钥'
  },
  {
    pattern: /AMAP_API_KEY=your_amap_api_key_here
    replacement: 'AMAP_API_KEY=your_amap_api_key_here
    description: '高德地图API密钥'
  },
  {
    pattern: /TENCENT_MAP_API_KEY=your_tencent_map_api_key_here
    replacement: 'TENCENT_MAP_API_KEY=your_tencent_map_api_key_here
    description: '腾讯地图API密钥'
  },
  
  // 数据库连接
  {
    pattern: /DATABASE_URL=sqlite:./data/smart-travel.db
    replacement: 'DATABASE_URL=sqlite:./data/smart-travel.db
    description: '数据库连接字符串'
  },
  {
    pattern: /REDIS_URL=redis://localhost:6379
    replacement: 'REDIS_URL=redis://localhost:6379
    description: 'Redis连接字符串'
  },
  
  // 其他敏感配置
  {
    pattern: /JWT_SECRET=your_jwt_secret_here
    replacement: 'JWT_SECRET=your_jwt_secret_here
    description: 'JWT密钥'
  },
  {
    pattern: /ENCRYPTION_KEY=your_encryption_key_here
    replacement: 'ENCRYPTION_KEY=your_encryption_key_here
    description: '加密密钥'
  },
  
  // 代码中的硬编码密钥
  {
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    replacement: 'sk-your_api_key_here',
    description: 'OpenAI格式API密钥'
  },
  {
    pattern: /Bearer [a-zA-Z0-9]{32,}/g,
    replacement: 'Bearer your_token_here',
    description: 'Bearer Token'
  }
];

// 需要处理的文件类型
const fileExtensions = ['.js', '.ts', '.tsx', '.jsx', '.env', '.env.local', '.env.example'];

// 需要跳过的目录
const skipDirectories = ['node_modules', '.git', '.next', 'dist', 'build', 'coverage'];

// 递归处理目录
function processDirectory(dirPath) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      if (!skipDirectories.includes(item)) {
        processDirectory(itemPath);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item);
      if (fileExtensions.includes(ext) || item.startsWith('.env')) {
        processFile(itemPath);
      }
    }
  }
}

// 处理单个文件
function processFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    for (const pattern of sensitivePatterns) {
      if (pattern.pattern.test(content)) {
        content = content.replace(pattern.pattern, pattern.replacement);
        modified = true;
        console.log(`🔒 ${filePath}: ${pattern.description}`);
      }
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  } catch (error) {
    console.error(`❌ 处理文件失败: ${filePath}`, error.message);
  }
}

// 创建示例环境变量文件
function createEnvExample() {
  const envExampleContent = `# 智游助手v6.5环境变量配置示例
# 复制此文件为.env.local并填入真实的API密钥

# LLM服务配置
DEEPSEEK_API_KEY=your_deepseek_api_key_here
SILICONFLOW_API_KEY=your_siliconflow_api_key_here

# 地图服务配置
AMAP_API_KEY=your_amap_api_key_here
TENCENT_MAP_API_KEY=your_tencent_map_api_key_here

# 数据库配置
DATABASE_URL=sqlite:./data/smart-travel.db
REDIS_URL=redis://localhost:6379

# 安全配置
JWT_SECRET=your_jwt_secret_here
ENCRYPTION_KEY=your_encryption_key_here

# Timeline解析架构v2.0配置
TIMELINE_V2_ENABLED=true
TIMELINE_V2_PERCENTAGE=100

# 开发环境配置
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# 监控和日志配置
LOG_LEVEL=info
ENABLE_PERFORMANCE_MONITORING=true
`;

  fs.writeFileSync('.env.example', envExampleContent, 'utf8');
  console.log('✅ 创建.env.example文件');
}

// 创建发布清单
function createReleaseManifest() {
  const manifest = {
    version: '6.5.0',
    releaseDate: new Date().toISOString(),
    features: [
      'Timeline解析架构v2.0',
      'LLM+Map双链路容错',
      '高性能缓存策略',
      'Feature Flag支持',
      '完整监控和告警'
    ],
    sanitized: true,
    sanitizedAt: new Date().toISOString(),
    sanitizedPatterns: sensitivePatterns.map(p => p.description)
  };
  
  fs.writeFileSync('RELEASE_MANIFEST.json', JSON.stringify(manifest, null, 2), 'utf8');
  console.log('✅ 创建发布清单');
}

// 验证脱敏效果
function validateSanitization() {
  console.log('\n🔍 验证脱敏效果...');
  
  const testPatterns = [
    /sk-[a-zA-Z0-9]{48}/,
    /DEEPSEEK_API_KEY=your_deepseek_api_key_here
    /Bearer [a-zA-Z0-9]{32,}/
  ];
  
  let foundSensitive = false;
  
  function checkFile(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const pattern of testPatterns) {
        if (pattern.test(content)) {
          console.log(`⚠️  发现可能的敏感信息: ${filePath}`);
          foundSensitive = true;
        }
      }
    } catch (error) {
      // 忽略读取错误
    }
  }
  
  function checkDirectory(dirPath) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
      const itemPath = path.join(dirPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory() && !skipDirectories.includes(item)) {
        checkDirectory(itemPath);
      } else if (stat.isFile()) {
        const ext = path.extname(item);
        if (fileExtensions.includes(ext)) {
          checkFile(itemPath);
        }
      }
    }
  }
  
  checkDirectory('.');
  
  if (!foundSensitive) {
    console.log('✅ 脱敏验证通过，未发现敏感信息');
  } else {
    console.log('❌ 脱敏验证失败，请检查上述文件');
  }
  
  return !foundSensitive;
}

// 主执行流程
async function main() {
  try {
    console.log('📁 开始处理文件...');
    processDirectory('.');
    
    console.log('\n📝 创建配置文件...');
    createEnvExample();
    createReleaseManifest();
    
    console.log('\n🔍 验证脱敏效果...');
    const isValid = validateSanitization();
    
    console.log('\n📊 脱敏处理完成');
    console.log('=====================================');
    
    if (isValid) {
      console.log('✅ 智游助手v6.5代码脱敏成功！');
      console.log('\n🎯 下一步操作:');
      console.log('1. 检查.env.example文件');
      console.log('2. 验证RELEASE_MANIFEST.json');
      console.log('3. 测试应用启动和基本功能');
      console.log('4. 准备GitHub发布');
    } else {
      console.log('❌ 脱敏处理存在问题，请手动检查');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 脱敏处理失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  processDirectory,
  processFile,
  validateSanitization
};
