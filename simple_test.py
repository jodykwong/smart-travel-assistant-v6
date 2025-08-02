#!/usr/bin/env python3
"""
简化的环境测试脚本
验证基本功能而不依赖外部API密钥
"""

import os
import sys
import logging

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def test_python_environment():
    """测试Python环境"""
    logger.info("🐍 测试Python环境...")
    
    logger.info(f"Python版本: {sys.version}")
    logger.info(f"Python路径: {sys.executable}")
    
    return True

def test_required_packages():
    """测试必需的包"""
    logger.info("📦 测试必需的包...")
    
    required_packages = [
        'json',
        'time',
        'asyncio',
        'logging',
        'os',
        'sys'
    ]
    
    optional_packages = [
        'openai',
        'tiktoken'
    ]
    
    # 测试必需包
    for package in required_packages:
        try:
            __import__(package)
            logger.info(f"✅ {package}: 已安装")
        except ImportError:
            logger.error(f"❌ {package}: 未安装")
            return False
    
    # 测试可选包
    for package in optional_packages:
        try:
            __import__(package)
            logger.info(f"✅ {package}: 已安装")
        except ImportError:
            logger.warning(f"⚠️ {package}: 未安装（可选）")
    
    return True

def test_token_counting():
    """测试Token计数功能"""
    logger.info("🔢 测试Token计数功能...")
    
    try:
        import tiktoken
        
        # 使用cl100k_base编码器
        encoding = tiktoken.get_encoding("cl100k_base")
        
        test_text = "这是一个测试文本，用于验证Token计数功能。"
        tokens = encoding.encode(test_text)
        token_count = len(tokens)
        
        logger.info(f"✅ Token计数功能正常")
        logger.info(f"📝 测试文本: {test_text}")
        logger.info(f"🔢 Token数量: {token_count}")
        
        return True
        
    except ImportError:
        logger.warning("⚠️ tiktoken未安装，跳过Token计数测试")
        return True
    except Exception as e:
        logger.error(f"❌ Token计数测试失败: {e}")
        return False

def test_async_support():
    """测试异步支持"""
    logger.info("🔄 测试异步支持...")
    
    try:
        import asyncio
        
        async def async_test():
            await asyncio.sleep(0.1)
            return "异步测试成功"
        
        # 运行异步测试
        result = asyncio.run(async_test())
        logger.info(f"✅ 异步支持正常: {result}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 异步测试失败: {e}")
        return False

def test_json_processing():
    """测试JSON处理"""
    logger.info("📄 测试JSON处理...")
    
    try:
        import json
        
        # 测试数据
        test_data = {
            "region": "乌鲁木齐",
            "days": 3,
            "attractions": [
                {"name": "天山天池", "rating": 4.5},
                {"name": "新疆博物馆", "rating": 4.3}
            ]
        }
        
        # 序列化
        json_str = json.dumps(test_data, ensure_ascii=False, indent=2)
        
        # 反序列化
        parsed_data = json.loads(json_str)
        
        logger.info(f"✅ JSON处理正常")
        logger.info(f"📝 测试数据: {parsed_data['region']}, {parsed_data['days']}天")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ JSON处理测试失败: {e}")
        return False

def test_environment_variables():
    """测试环境变量读取"""
    logger.info("🔧 测试环境变量读取...")
    
    # 测试基本环境变量
    test_vars = ['PATH', 'HOME', 'USER']
    
    for var in test_vars:
        value = os.getenv(var)
        if value:
            logger.info(f"✅ {var}: 已设置")
        else:
            logger.warning(f"⚠️ {var}: 未设置")
    
    # 检查项目相关环境变量
    project_vars = ['DEEPSEEK_API_KEY', 'AMAP_MCP_API_KEY']
    
    for var in project_vars:
        value = os.getenv(var)
        if value:
            logger.info(f"✅ {var}: 已配置")
        else:
            logger.info(f"ℹ️ {var}: 未配置（将使用模拟模式）")
    
    return True

def test_file_operations():
    """测试文件操作"""
    logger.info("📁 测试文件操作...")
    
    try:
        # 测试文件写入
        test_file = "test_temp.txt"
        test_content = "这是一个测试文件"
        
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(test_content)
        
        # 测试文件读取
        with open(test_file, 'r', encoding='utf-8') as f:
            read_content = f.read()
        
        # 清理测试文件
        os.remove(test_file)
        
        if read_content == test_content:
            logger.info("✅ 文件操作正常")
            return True
        else:
            logger.error("❌ 文件内容不匹配")
            return False
            
    except Exception as e:
        logger.error(f"❌ 文件操作测试失败: {e}")
        return False

def run_comprehensive_test():
    """运行综合测试"""
    logger.info("🚀 开始智游助手v5.0 基础环境测试")
    logger.info("=" * 60)
    
    # 测试项目
    tests = [
        ("Python环境", test_python_environment),
        ("必需包", test_required_packages),
        ("Token计数", test_token_counting),
        ("异步支持", test_async_support),
        ("JSON处理", test_json_processing),
        ("环境变量", test_environment_variables),
        ("文件操作", test_file_operations)
    ]
    
    # 执行测试
    results = {}
    for test_name, test_func in tests:
        try:
            results[test_name] = test_func()
        except Exception as e:
            logger.error(f"❌ {test_name}测试异常: {e}")
            results[test_name] = False
    
    # 生成测试报告
    logger.info("=" * 60)
    logger.info("📊 测试结果汇总:")
    
    passed_tests = 0
    total_tests = len(results)
    
    for test_name, result in results.items():
        status = "✅ 通过" if result else "❌ 失败"
        logger.info(f"  {test_name}: {status}")
        if result:
            passed_tests += 1
    
    success_rate = (passed_tests / total_tests) * 100
    logger.info(f"📈 测试通过率: {success_rate:.1f}% ({passed_tests}/{total_tests})")
    
    if success_rate >= 85:
        logger.info("🎉 基础环境就绪，可以运行Notebook")
        logger.info("💡 建议：配置API密钥以启用完整功能")
    elif success_rate >= 70:
        logger.warning("⚠️ 基础环境基本可用，但存在一些问题")
        logger.info("💡 建议：检查失败的测试项并进行修复")
    else:
        logger.error("❌ 基础环境存在严重问题")
        logger.info("💡 建议：检查Python安装和依赖包")
    
    return results

if __name__ == "__main__":
    try:
        results = run_comprehensive_test()
        
        # 根据测试结果设置退出码
        success_count = sum(1 for result in results.values() if result)
        if success_count >= len(results) * 0.85:  # 85%通过率
            sys.exit(0)
        else:
            sys.exit(1)
            
    except KeyboardInterrupt:
        logger.info("🛑 测试被用户中断")
        sys.exit(130)
    except Exception as e:
        logger.error(f"💥 测试过程中发生异常: {e}")
        sys.exit(1)
