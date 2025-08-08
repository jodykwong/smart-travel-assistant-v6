#!/usr/bin/env node

/**
 * 批量转换测试文件从 Vitest/Jest 格式到 Playwright 格式
 */

const fs = require('fs');
const path = require('path');

// 需要转换的文件模式
const testDirs = ['tests/unit', 'tests/integration', 'tests/performance'];

// 转换规则
const conversions = [
  // 导入语句转换
  {
    from: /import\s+{[^}]*}\s+from\s+['"]@jest\/globals['"];?\s*\n/g,
    to: "import { test, expect, describe, beforeEach, beforeAll, afterAll } from '../test-utils';\n"
  },
  {
    from: /import\s+{[^}]*}\s+from\s+['"]vitest['"];?\s*\n/g,
    to: "import { vi } from '../test-utils';\n"
  },
  {
    from: /import\s+{[^}]*}\s+from\s+['"]node-mocks-http['"];?\s*\n/g,
    to: "// node-mocks-http 功能需要在 Playwright 中重新实现\n"
  },
  
  // 路径修复
  {
    from: /from\s+['"]\.\.\/\.\.\/\.\.\/lib\//g,
    to: "from '../../lib/"
  },
  {
    from: /from\s+['"]\.\.\/services\//g,
    to: "from '../../services/"
  },
  {
    from: /from\s+['"]\.\.\/\.\.\/pages\//g,
    to: "from '../../pages/"
  },
  
  // 测试函数转换
  {
    from: /test\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*\)\s*=>/g,
    to: "test('$1', async ({ unitContext }) =>"
  },
  {
    from: /it\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*async\s*\(\s*\)\s*=>/g,
    to: "test('$1', async ({ unitContext }) =>"
  },
  
  // Jest mock 转换
  {
    from: /jest\.mock\(/g,
    to: "vi.mock("
  },
  {
    from: /jest\.fn\(/g,
    to: "vi.fn("
  },
  {
    from: /jest\.spyOn\(/g,
    to: "vi.spyOn("
  }
];

function convertFile(filePath) {
  console.log(`转换文件: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // 应用所有转换规则
  conversions.forEach(rule => {
    content = content.replace(rule.from, rule.to);
  });
  
  // 修复导入路径
  content = content.replace(/from\s+['"]\.\.\/test-utils['"];?/g, "from './test-utils';");

  // 特殊处理：确保有正确的导入
  if (!content.includes("from './test-utils'")) {
    const importLine = `import { test, expect, describe, beforeEach, beforeAll, afterAll, vi } from './test-utils';\n`;

    // 在第一个非注释行之前插入导入
    const lines = content.split('\n');
    let insertIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('/**') && !line.startsWith('*') && !line.startsWith('*/')) {
        insertIndex = i;
        break;
      }
    }

    lines.splice(insertIndex, 0, importLine);
    content = lines.join('\n');
  }
  
  fs.writeFileSync(filePath, content);
  console.log(`✅ 转换完成: ${filePath}`);
}

function processDirectory(dir) {
  if (!fs.existsSync(dir)) {
    console.log(`目录不存在: ${dir}`);
    return;
  }
  
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
      convertFile(filePath);
    }
  });
}

// 创建通用的 test-utils 文件
function createTestUtils(dir) {
  const testUtilsPath = path.join(dir, 'test-utils.ts');
  if (!fs.existsSync(testUtilsPath)) {
    const content = `/**
 * Playwright 测试工具
 */

import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  unitContext: async ({}, use) => {
    await use({});
  },
});

export { expect };
export const describe = test.describe;
export const it = test;
export const beforeAll = test.beforeAll;
export const afterAll = test.afterAll;
export const beforeEach = test.beforeEach;
export const afterEach = test.afterEach;

export const vi = {
  fn: (implementation?: any) => {
    const mockFn = (...args: any[]) => {
      mockFn.calls.push(args);
      if (implementation) return implementation(...args);
    };
    mockFn.calls = [];
    mockFn.mockReturnValue = (value: any) => { implementation = () => value; return mockFn; };
    mockFn.mockImplementation = (impl: any) => { implementation = impl; return mockFn; };
    return mockFn;
  },
  mock: (path: string) => console.warn(\`vi.mock('\${path}') - 功能有限\`),
  spyOn: (object: any, method: string) => {
    const original = object[method];
    const spy = vi.fn(original);
    object[method] = spy;
    spy.mockRestore = () => { object[method] = original; };
    return spy;
  },
};
`;
    fs.writeFileSync(testUtilsPath, content);
    console.log(`✅ 创建 test-utils: ${testUtilsPath}`);
  }
}

// 主执行逻辑
console.log('🔄 开始批量转换测试文件...');

testDirs.forEach(dir => {
  console.log(`\n处理目录: ${dir}`);
  createTestUtils(dir);
  processDirectory(dir);
});

console.log('\n🎉 所有测试文件转换完成！');
