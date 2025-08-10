#!/usr/bin/env node

/**
 * Timeline解析架构v2.0数据流向验证脚本
 * 验证从LLM输出到前端显示的完整数据流
 */

const { parseTimelineToLegacy, createParseContext } = require('./src/lib/timeline');
const { isTimelineV2Enabled } = require('./src/lib/feature-flags');

console.log('🔍 Timeline解析架构v2.0数据流向验证');
console.log('=====================================\n');

// 模拟LLM输出（包含问题案例）
const mockLLMResponse = `
## 青岛4日游行程安排

### Day 1 (2024-12-20): 抵达青岛，老城区探索
- 09:00-10:00: 抵达青岛流亭国际机场，前往酒店办理入住
- 10:30-12:00: 前往栈桥，青岛的标志性建筑，欣赏海景
- 12:00-13:30: 「开海红岛海鲜虾水饺」（万象城店），品尝青岛特色海鲜水饺
- 14:00-16:00: 游览青岛德国风情街，感受德式建筑风格
- 16:30-18:00: 信号山公园，俯瞰青岛全景
- 18:30-20:00: 台东夜市，体验青岛夜生活

### Day 2 (2024-12-21): 海滨风光与啤酒文化
- 08:00-09:00: 酒店早餐
- 09:30-11:30: 八大关风景区，欣赏各国建筑风格
- 12:00-13:30: 「船歌鱼水饺」（香港中路店），品尝青岛著名鱼水饺
- 14:00-16:00: 青岛啤酒博物馆，了解青岛啤酒历史
- 16:30-18:00: 第一海水浴场，海边休闲
- 18:30-20:00: 「青岛啤酒街」，品尝正宗青岛啤酒

### Day 3 (2024-12-22): 崂山自然风光
- 07:00-08:00: 酒店早餐，准备崂山一日游
- 08:30-10:00: 前往崂山风景区
- 10:00-12:00: 崂山太清宫，道教文化体验
- 12:00-13:30: 崂山农家乐午餐
- 14:00-16:30: 崂山巨峰景区，登山观景
- 17:00-18:30: 返回市区
- 19:00-20:30: 「小红楼牛肉灌汤包」，品尝青岛特色小吃

### Day 4 (2024-12-23): 购物与离别
- 09:00-10:00: 酒店早餐，整理行李
- 10:30-12:00: 青岛奥帆中心，2008年奥运会帆船比赛场地
- 12:00-13:30: 「王姐烧烤」，品尝青岛烧烤
- 14:00-16:00: 台东商业街购物，购买青岛特产
- 16:30-17:30: 前往机场
- 18:00: 离开青岛
`;

async function testDataFlow() {
  try {
    console.log('📋 第一步：Feature Flag检查');
    const sessionId = 'test-session-' + Date.now();
    const isV2Enabled = isTimelineV2Enabled(sessionId);
    console.log(`✅ Timeline v2.0启用状态: ${isV2Enabled}`);
    
    if (!isV2Enabled) {
      console.log('❌ Timeline v2.0未启用，跳过测试');
      return;
    }

    console.log('\n📋 第二步：创建解析上下文');
    const parseContext = createParseContext(
      '青岛',
      4,
      sessionId,
      '2024-12-20'
    );
    console.log('✅ 解析上下文创建成功', {
      destination: parseContext.destination,
      totalDays: parseContext.totalDays,
      sessionId: parseContext.sessionId
    });

    console.log('\n📋 第三步：Timeline解析');
    const startTime = Date.now();
    const legacyFormat = await parseTimelineToLegacy(mockLLMResponse, parseContext);
    const parseTime = Date.now() - startTime;
    
    console.log('✅ Timeline解析完成', {
      parseTime: `${parseTime}ms`,
      daysCount: legacyFormat.length,
      totalActivities: legacyFormat.reduce((sum, day) => sum + day.timeline.length, 0)
    });

    console.log('\n📋 第四步：数据结构验证');
    let allValid = true;
    
    legacyFormat.forEach((day, index) => {
      const dayValid = day.day && day.title && Array.isArray(day.timeline);
      if (!dayValid) {
        console.log(`❌ Day ${index + 1} 数据结构无效`, day);
        allValid = false;
      } else {
        console.log(`✅ Day ${day.day}: ${day.title} (${day.timeline.length} 活动)`);
        
        // 检查活动是否还是原始文本片段
        day.timeline.forEach((activity, actIndex) => {
          if (typeof activity === 'string' && activity.includes('「') && activity.includes('」')) {
            console.log(`⚠️  Day ${day.day} 活动 ${actIndex + 1} 仍为原始文本:`, activity.substring(0, 50) + '...');
          } else if (typeof activity === 'object' && activity.description) {
            console.log(`✅ Day ${day.day} 活动 ${actIndex + 1} 已格式化:`, activity.description.substring(0, 50) + '...');
          }
        });
      }
    });

    console.log('\n📋 第五步：前端组件数据格式验证');
    // 模拟前端组件的数据转换
    const frontendData = legacyFormat.map(legacyDay => ({
      day: legacyDay.day,
      date: legacyDay.date,
      title: legacyDay.title,
      activities: legacyDay.timeline.map(activity => {
        if (typeof activity === 'string') {
          return { description: activity, time: '', location: '' };
        } else if (typeof activity === 'object') {
          return {
            description: activity.description || activity.activity || '',
            time: activity.time || '',
            location: activity.location || ''
          };
        }
        return { description: '未知活动', time: '', location: '' };
      })
    }));

    console.log('✅ 前端数据转换完成', {
      daysCount: frontendData.length,
      sampleDay: frontendData[0] ? {
        day: frontendData[0].day,
        title: frontendData[0].title,
        activitiesCount: frontendData[0].activities.length
      } : null
    });

    console.log('\n📊 验证结果总结');
    console.log('=====================================');
    console.log(`✅ Timeline v2.0启用: ${isV2Enabled}`);
    console.log(`✅ 解析时间: ${parseTime}ms (目标: <500ms)`);
    console.log(`✅ 数据结构完整性: ${allValid ? '通过' : '失败'}`);
    console.log(`✅ 天数正确性: ${legacyFormat.length === 4 ? '通过' : '失败'} (${legacyFormat.length}/4)`);
    
    // 检查是否还有原始文本片段问题
    let hasRawTextIssue = false;
    legacyFormat.forEach(day => {
      day.timeline.forEach(activity => {
        if (typeof activity === 'string' && activity.includes('「') && activity.includes('」')) {
          hasRawTextIssue = true;
        }
      });
    });
    
    console.log(`${hasRawTextIssue ? '⚠️' : '✅'} 原始文本片段问题: ${hasRawTextIssue ? '仍存在' : '已解决'}`);
    
    if (parseTime < 500 && allValid && legacyFormat.length === 4 && !hasRawTextIssue) {
      console.log('\n🎉 Timeline解析架构v2.0验证通过！');
      console.log('所有核心功能正常工作，问题已修复。');
    } else {
      console.log('\n❌ Timeline解析架构v2.0验证失败');
      console.log('存在需要修复的问题。');
    }

  } catch (error) {
    console.error('❌ 数据流向验证失败:', error);
  }
}

// 运行测试
testDataFlow();
