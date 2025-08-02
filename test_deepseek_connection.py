#!/usr/bin/env python3
"""
DeepSeek API连接测试脚本
验证API密钥配置和基本功能
"""

import os
import sys
import asyncio
import logging
from dotenv import load_dotenv
from openai import OpenAI
import time

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def load_environment():
    """加载环境变量"""
    load_dotenv()
    
    config = {
        'deepseek_api_key': os.getenv('DEEPSEEK_API_KEY'),
        'deepseek_base_url': os.getenv('DEEPSEEK_API_BASE_URL', 'https://api.deepseek.com/v1'),
        'deepseek_model': os.getenv('DEEPSEEK_MODEL', 'deepseek-chat'),
        'amap_api_key': os.getenv('AMAP_MCP_API_KEY'),
        'amap_base_url': os.getenv('AMAP_MCP_BASE_URL', 'http://localhost:8080/mcp')
    }
    
    return config

def test_environment_variables(config):
    """测试环境变量配置"""
    logger.info("🔍 检查环境变量配置...")
    
    issues = []
    
    if not config['deepseek_api_key']:
        issues.append("❌ DEEPSEEK_API_KEY 未设置")
    else:
        logger.info("✅ DEEPSEEK_API_KEY 已配置")
    
    if not config['amap_api_key']:
        issues.append("⚠️ AMAP_MCP_API_KEY 未设置（将使用模拟数据）")
    else:
        logger.info("✅ AMAP_MCP_API_KEY 已配置")
    
    logger.info(f"🔑 DeepSeek API端点: {config['deepseek_base_url']}")
    logger.info(f"🤖 AI模型: {config['deepseek_model']}")
    logger.info(f"🗺️ 高德MCP端点: {config['amap_base_url']}")
    
    if issues:
        for issue in issues:
            logger.warning(issue)
        return False
    
    return True

def test_deepseek_api_connection(config):
    """测试DeepSeek API连接"""
    logger.info("🤖 测试DeepSeek API连接...")
    
    if not config['deepseek_api_key']:
        logger.error("❌ DeepSeek API密钥未配置，跳过连接测试")
        return False
    
    try:
        # 初始化客户端
        client = OpenAI(
            api_key=config['deepseek_api_key'],
            base_url=config['deepseek_base_url']
        )
        
        # 测试简单的API调用
        start_time = time.time()
        
        response = client.chat.completions.create(
            model=config['deepseek_model'],
            messages=[
                {
                    "role": "system",
                    "content": "你是一个测试助手，请简短回复。"
                },
                {
                    "role": "user",
                    "content": "请回复'连接测试成功'来确认API工作正常。"
                }
            ],
            max_tokens=50,
            temperature=0.1
        )
        
        end_time = time.time()
        response_time = end_time - start_time
        
        # 检查响应
        if response.choices and response.choices[0].message:
            content = response.choices[0].message.content
            logger.info(f"✅ DeepSeek API连接成功")
            logger.info(f"📝 响应内容: {content}")
            logger.info(f"⏱️ 响应时间: {response_time:.2f}秒")
            logger.info(f"🔢 Token使用: {response.usage.total_tokens}")
            return True
        else:
            logger.error("❌ API响应格式异常")
            return False
            
    except Exception as e:
        logger.error(f"❌ DeepSeek API连接失败: {e}")
        return False

def test_token_counting():
    """测试Token计数功能"""
    logger.info("🔢 测试Token计数功能...")
    
    try:
        import tiktoken
        
        # 使用cl100k_base编码器（DeepSeek兼容）
        encoding = tiktoken.get_encoding("cl100k_base")
        
        test_text = "这是一个测试文本，用于验证Token计数功能是否正常工作。"
        tokens = encoding.encode(test_text)
        token_count = len(tokens)
        
        logger.info(f"✅ Token计数功能正常")
        logger.info(f"📝 测试文本: {test_text}")
        logger.info(f"🔢 Token数量: {token_count}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Token计数测试失败: {e}")
        return False

def test_travel_planning_prompt():
    """测试旅游规划提示词生成"""
    logger.info("🎯 测试旅游规划提示词生成...")
    
    try:
        # 模拟旅游规划数据
        region_data = {
            'region_name': '乌鲁木齐',
            'attractions': [
                {'name': '天山天池', 'description': '高山湖泊，风景秀丽'},
                {'name': '新疆博物馆', 'description': '了解新疆历史文化'}
            ],
            'restaurants': [
                {'name': '新疆大盘鸡', 'description': '正宗新疆大盘鸡'}
            ],
            'weather': [
                {'date': '2024-06-01', 'weather': '晴', 'temperature_high': 28}
            ]
        }
        
        user_preferences = {
            'budget_level': 'mid',
            'travel_style': ['文化', '自然'],
            'group_size': 2
        }
        
        # 生成提示词
        prompt = f"""
请为{region_data['region_name']}制定3天的详细旅游规划。

用户偏好：
- 预算等级：{user_preferences['budget_level']}
- 旅行风格：{', '.join(user_preferences['travel_style'])}
- 团队人数：{user_preferences['group_size']}人

可选景点：
{chr(10).join([f"- {attr['name']}: {attr['description']}" for attr in region_data['attractions']])}

推荐餐厅：
{chr(10).join([f"- {rest['name']}: {rest['description']}" for rest in region_data['restaurants']])}

天气情况：
{chr(10).join([f"- {w['date']}: {w['weather']}, {w['temperature_high']}°C" for w in region_data['weather']])}

请生成JSON格式的详细规划，包含每日行程、景点安排、用餐建议、住宿推荐和交通方式。
"""
        
        # 计算Token数量
        import tiktoken
        encoding = tiktoken.get_encoding("cl100k_base")
        token_count = len(encoding.encode(prompt))
        
        logger.info(f"✅ 提示词生成成功")
        logger.info(f"📝 提示词长度: {len(prompt)}字符")
        logger.info(f"🔢 Token数量: {token_count}")
        
        if token_count > 3000:
            logger.warning(f"⚠️ 提示词Token数量较大: {token_count}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ 提示词生成测试失败: {e}")
        return False

def run_comprehensive_test():
    """运行综合测试"""
    logger.info("🚀 开始智游助手v5.0 API连接综合测试")
    logger.info("=" * 60)
    
    # 加载配置
    config = load_environment()
    
    # 测试结果
    test_results = {
        'environment': False,
        'deepseek_api': False,
        'token_counting': False,
        'prompt_generation': False
    }
    
    # 1. 环境变量测试
    test_results['environment'] = test_environment_variables(config)
    
    # 2. DeepSeek API连接测试
    if config['deepseek_api_key']:
        test_results['deepseek_api'] = test_deepseek_api_connection(config)
    
    # 3. Token计数测试
    test_results['token_counting'] = test_token_counting()
    
    # 4. 提示词生成测试
    test_results['prompt_generation'] = test_travel_planning_prompt()
    
    # 生成测试报告
    logger.info("=" * 60)
    logger.info("📊 测试结果汇总:")
    
    passed_tests = 0
    total_tests = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ 通过" if result else "❌ 失败"
        logger.info(f"  {test_name}: {status}")
        if result:
            passed_tests += 1
    
    success_rate = (passed_tests / total_tests) * 100
    logger.info(f"📈 测试通过率: {success_rate:.1f}% ({passed_tests}/{total_tests})")
    
    if success_rate >= 75:
        logger.info("🎉 系统基本就绪，可以运行Notebook测试")
    else:
        logger.warning("⚠️ 系统配置存在问题，请检查环境变量和API密钥")
    
    return test_results

if __name__ == "__main__":
    try:
        results = run_comprehensive_test()
        
        # 根据测试结果设置退出码
        if all(results.values()):
            sys.exit(0)  # 所有测试通过
        else:
            sys.exit(1)  # 存在失败的测试
            
    except KeyboardInterrupt:
        logger.info("🛑 测试被用户中断")
        sys.exit(130)
    except Exception as e:
        logger.error(f"💥 测试过程中发生异常: {e}")
        sys.exit(1)
