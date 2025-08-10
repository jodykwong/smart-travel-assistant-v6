/**
 * 智游助手v6.5 测试数据
 * 定义各种测试场景的数据
 */

export interface TripPlanData {
  destination: string;
  startDate: string;
  endDate: string;
  groupSize: number;
  budgetMin: number;
  budgetMax: number;
  transportation?: string;
  specialRequirements?: string;
}

export interface TestUser {
  name: string;
  email: string;
  preferences: {
    travelStyle: string;
    budget: string;
    interests: string[];
  };
}

/**
 * 新疆深度游测试数据
 */
export const xinjiangTripData: TripPlanData = {
  destination: '新疆',
  startDate: getDateString(30), // 30天后
  endDate: getDateString(43),   // 43天后 (13天行程)
  groupSize: 2,
  budgetMin: 15000,
  budgetMax: 20000,
  transportation: '飞机+自驾',
  specialRequirements: '希望包含独库公路、赛里木湖、喀纳斯湖等著名景点，体验新疆的自然风光和民族文化。希望安排维吾尔族文化体验和当地美食品尝。'
};

/**
 * 其他测试场景数据
 */
export const testScenarios: TripPlanData[] = [
  // 短途周末游
  {
    destination: '杭州',
    startDate: getDateString(7),
    endDate: getDateString(9),
    groupSize: 2,
    budgetMin: 1500,
    budgetMax: 2500,
    transportation: '高铁',
    specialRequirements: '希望体验西湖美景和当地茶文化'
  },
  
  // 中长途度假
  {
    destination: '云南',
    startDate: getDateString(15),
    endDate: getDateString(22),
    groupSize: 4,
    budgetMin: 8000,
    budgetMax: 12000,
    transportation: '飞机+包车',
    specialRequirements: '希望游览大理、丽江、香格里拉，体验多元民族文化'
  },
  
  // 海外旅行
  {
    destination: '日本',
    startDate: getDateString(60),
    endDate: getDateString(70),
    groupSize: 3,
    budgetMin: 25000,
    budgetMax: 35000,
    transportation: '飞机+JR Pass',
    specialRequirements: '希望体验日本传统文化，品尝正宗日料，参观历史古迹'
  },
  
  // 极简预算游
  {
    destination: '西安',
    startDate: getDateString(20),
    endDate: getDateString(23),
    groupSize: 1,
    budgetMin: 800,
    budgetMax: 1200,
    transportation: '火车',
    specialRequirements: '预算有限，希望重点游览兵马俑等历史景点'
  },
  
  // 豪华深度游
  {
    destination: '瑞士',
    startDate: getDateString(90),
    endDate: getDateString(104),
    groupSize: 2,
    budgetMin: 80000,
    budgetMax: 120000,
    transportation: '飞机+火车',
    specialRequirements: '希望体验阿尔卑斯山脉的自然美景，入住高端酒店，品尝米其林餐厅'
  }
];

/**
 * 边界测试数据
 */
export const boundaryTestData = {
  // 极长目的地名称
  longDestination: '新疆维吾尔自治区乌鲁木齐市天山区红山路街道办事处某某社区某某小区',
  
  // 极短行程
  shortTrip: {
    destination: '上海',
    startDate: getDateString(1),
    endDate: getDateString(1),
    groupSize: 1,
    budgetMin: 200,
    budgetMax: 500
  },
  
  // 极长行程
  longTrip: {
    destination: '环球旅行',
    startDate: getDateString(30),
    endDate: getDateString(395), // 365天
    groupSize: 2,
    budgetMin: 500000,
    budgetMax: 1000000
  },
  
  // 大团体
  largeGroup: {
    destination: '北京',
    startDate: getDateString(14),
    endDate: getDateString(17),
    groupSize: 50,
    budgetMin: 100000,
    budgetMax: 200000
  },
  
  // 极低预算
  lowBudget: {
    destination: '本地',
    startDate: getDateString(7),
    endDate: getDateString(8),
    groupSize: 1,
    budgetMin: 50,
    budgetMax: 100
  }
};

/**
 * 无效数据测试
 */
export const invalidTestData = {
  // 空目的地
  emptyDestination: {
    destination: '',
    startDate: getDateString(7),
    endDate: getDateString(9),
    groupSize: 2,
    budgetMin: 1000,
    budgetMax: 2000
  },
  
  // 过去的日期
  pastDate: {
    destination: '北京',
    startDate: '2020-01-01',
    endDate: '2020-01-03',
    groupSize: 2,
    budgetMin: 1000,
    budgetMax: 2000
  },
  
  // 结束日期早于开始日期
  invalidDateRange: {
    destination: '上海',
    startDate: getDateString(10),
    endDate: getDateString(5),
    groupSize: 2,
    budgetMin: 1000,
    budgetMax: 2000
  },
  
  // 零人数
  zeroPeople: {
    destination: '广州',
    startDate: getDateString(7),
    endDate: getDateString(9),
    groupSize: 0,
    budgetMin: 1000,
    budgetMax: 2000
  },
  
  // 预算范围错误
  invalidBudget: {
    destination: '深圳',
    startDate: getDateString(7),
    endDate: getDateString(9),
    groupSize: 2,
    budgetMin: 5000,
    budgetMax: 2000 // 最大值小于最小值
  }
};

/**
 * 测试用户数据
 */
export const testUsers: TestUser[] = [
  {
    name: '张三',
    email: 'zhangsan@example.com',
    preferences: {
      travelStyle: '深度游',
      budget: '中等',
      interests: ['历史文化', '自然风光', '美食体验']
    }
  },
  {
    name: '李四',
    email: 'lisi@example.com',
    preferences: {
      travelStyle: '休闲游',
      budget: '经济',
      interests: ['海滩度假', '购物', '摄影']
    }
  },
  {
    name: '王五',
    email: 'wangwu@example.com',
    preferences: {
      travelStyle: '探险游',
      budget: '高端',
      interests: ['户外运动', '极限挑战', '野生动物']
    }
  }
];

/**
 * 获取指定天数后的日期字符串
 */
function getDateString(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

/**
 * 获取随机测试数据
 */
export function getRandomTestScenario(): TripPlanData {
  const scenarios = [xinjiangTripData, ...testScenarios];
  return scenarios[Math.floor(Math.random() * scenarios.length)];
}

/**
 * 验证测试数据有效性
 */
export function validateTestData(data: TripPlanData): boolean {
  if (!data.destination || data.destination.trim().length === 0) {
    return false;
  }
  
  if (new Date(data.startDate) >= new Date(data.endDate)) {
    return false;
  }
  
  if (data.groupSize <= 0) {
    return false;
  }
  
  if (data.budgetMin >= data.budgetMax) {
    return false;
  }
  
  return true;
}
