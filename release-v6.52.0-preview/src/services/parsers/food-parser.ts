/**
 * 智游助手v5.0 - 美食体验解析器（第二阶段重构版）
 * 重构目标：
 * - 专注于LLM响应的美食文本解析
 * - 移除外部API调用，简化解析流程
 * - 优化解析性能和准确性
 * - 保持数据结构向后兼容
 */

import { BaseParser, ParseResult } from './base-parser';
import { FoodExperienceData, FoodOption, FoodDistrict } from '../../types/travel-plan';

export class FoodParser extends BaseParser<FoodExperienceData> {
  private readonly foodKeywords = [
    '美食', '餐厅', '小吃', '特色菜', '料理', 'food', 'restaurant', 'cuisine'
  ];

  private readonly endKeywords = [
    '交通', '住宿', '贴士', '建议', 'transport', 'accommodation', 'tips'
  ];

  /**
   * 解析美食信息（第二阶段重构版）
   * 专注于LLM响应的美食文本解析，不再调用外部API
   */
  parse(): ParseResult<FoodExperienceData> {
    this.reset();
    const startTime = Date.now();

    try {
      console.log('🍽️ 开始解析美食信息 (专注LLM响应解析)...');

      const foodSection = this.extractSection(
        this.foodKeywords,
        this.endKeywords
      );

      if (!foodSection) {
        this.addWarning('未找到美食相关信息，将使用默认数据');
        return this.createResult(this.createDefaultFoodData());
      }

      // 专注于LLM响应的结构化解析
      const data: FoodExperienceData = {
        specialties: this.extractSpecialties(foodSection),
        recommendedRestaurants: this.extractRestaurants(foodSection),
        foodDistricts: this.extractFoodDistricts(foodSection),
        budgetGuide: this.extractBudgetGuide(foodSection),
        diningEtiquette: this.extractDiningEtiquette(foodSection),
      };

      const duration = Date.now() - startTime;
      console.log(`✅ 美食信息解析完成 (${duration}ms)`);

      return this.createResult(data);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 美食信息解析失败 (${duration}ms):`, error);
      this.addError(`解析美食信息时出错: ${error.message}`);
      return this.createResult(this.createDefaultFoodData());
    }
  }

  private extractOverview(text: string): string {
    const lines = text.split('\n');
    const overviewLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (this.isListItem(trimmedLine) || this.isSubheading(trimmedLine)) {
        break;
      }

      overviewLines.push(trimmedLine);
      if (overviewLines.length >= 3) break;
    }

    return overviewLines.join(' ') || '探索当地特色美食文化';
  }

  private extractSpecialties(text: string): string[] {
    const specialtyKeywords = ['特色', '招牌', '必吃', '特产', 'specialty', 'signature'];
    const specialties: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (specialtyKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const items = this.extractListItems(line);
        specialties.push(...items);
        
        // 如果这一行本身就是特色菜名
        if (items.length === 0 && !this.isListItem(trimmedLine)) {
          const cleanedLine = trimmedLine.replace(/.*(?:特色|招牌|必吃)[：:]\s*/i, '');
          if (cleanedLine) {
            specialties.push(cleanedLine);
          }
        }
      }
    }

    return specialties.length > 0 ? specialties : ['当地特色美食'];
  }

  private extractRestaurants(text: string): FoodOption[] {
    const restaurants: FoodOption[] = [];
    const lines = text.split('\n');
    let currentRestaurant: Partial<FoodOption> | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (this.isRestaurantName(trimmedLine)) {
        if (currentRestaurant) {
          restaurants.push(this.finalizeRestaurant(currentRestaurant));
        }
        currentRestaurant = {
          name: this.cleanRestaurantName(trimmedLine),
          type: this.detectRestaurantType(trimmedLine),
          specialties: [],
        };
      } else if (currentRestaurant) {
        this.parseRestaurantDetails(trimmedLine, currentRestaurant);
      }
    }

    if (currentRestaurant) {
      restaurants.push(this.finalizeRestaurant(currentRestaurant));
    }

    if (restaurants.length === 0) {
      restaurants.push(this.createDefaultRestaurant());
    }

    return restaurants;
  }

  private isRestaurantName(line: string): boolean {
    const patterns = [
      /^\d+\.\s*(.+(?:餐厅|酒楼|饭店|小吃|店))/,
      /^[-*•]\s*(.+(?:餐厅|酒楼|饭店|小吃|店))/,
      /.+(restaurant|cafe|bar|bistro)/i,
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  private cleanRestaurantName(line: string): string {
    return line
      .replace(/^\d+\.\s*/, '')
      .replace(/^[-*•]\s*/, '')
      .replace(/：.*$/, '')
      .trim();
  }

  private detectRestaurantType(name: string): FoodOption['type'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('cafe') || lowerName.includes('咖啡')) return 'cafe';
    if (lowerName.includes('bar') || lowerName.includes('酒吧')) return 'bar';
    if (lowerName.includes('小吃') || lowerName.includes('摊')) return 'street_food';
    if (lowerName.includes('市场') || lowerName.includes('market')) return 'market';
    
    return 'restaurant';
  }

  private parseRestaurantDetails(line: string, restaurant: Partial<FoodOption>): void {
    const lowerLine = line.toLowerCase();

    // 提取价格信息
    const prices = this.extractPrices(line);
    if (prices.length > 0) {
      restaurant.averagePrice = prices[0];
    }

    // 提取评分
    const ratings = this.extractRatings(line);
    if (ratings.length > 0) {
      restaurant.rating = ratings[0];
    }

    // 提取菜系信息
    if (lowerLine.includes('菜系') || lowerLine.includes('cuisine')) {
      restaurant.cuisine = line.replace(/.*(?:菜系|cuisine)[：:]\s*/i, '').trim();
    }

    // 提取招牌菜
    if (lowerLine.includes('招牌') || lowerLine.includes('推荐') || lowerLine.includes('必点')) {
      const dishes = this.extractListItems(line);
      if (dishes.length > 0) {
        restaurant.mustTryDishes = dishes;
      }
    }

    // 提取营业时间
    const timeInfo = this.extractTimeInfo(line);
    if (timeInfo.times.length > 0) {
      restaurant.openingHours = timeInfo.times.join(' - ');
    }

    // 提取地址
    if (lowerLine.includes('地址') || lowerLine.includes('位于')) {
      restaurant.address = line.replace(/.*(?:地址|位于)[：:]\s*/i, '').trim();
    }
  }

  private finalizeRestaurant(restaurant: Partial<FoodOption>): FoodOption {
    return {
      name: restaurant.name || '推荐餐厅',
      type: restaurant.type || 'restaurant',
      cuisine: restaurant.cuisine || '当地菜系',
      specialties: restaurant.specialties || [],
      address: restaurant.address,
      rating: restaurant.rating,
      averagePrice: restaurant.averagePrice,
      priceRange: this.calculatePriceRange(restaurant.averagePrice),
      openingHours: restaurant.openingHours,
      mustTryDishes: restaurant.mustTryDishes,
    };
  }

  private calculatePriceRange(price?: number): string {
    if (!price) return '价格适中';
    
    if (price < 50) return '经济实惠';
    if (price < 150) return '价格适中';
    if (price < 300) return '稍贵';
    return '高端消费';
  }

  private extractFoodDistricts(text: string): FoodDistrict[] {
    const districtKeywords = ['美食街', '小吃街', '夜市', '市场', 'food street', 'market'];
    const districts: FoodDistrict[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (districtKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const district: FoodDistrict = {
          name: this.extractDistrictName(trimmedLine),
          description: this.extractDistrictDescription(trimmedLine),
          highlights: this.extractListItems(trimmedLine),
        };
        districts.push(district);
      }
    }

    return districts;
  }

  private extractDistrictName(line: string): string {
    const match = line.match(/(.+(?:街|市场|夜市))/);
    return match ? match[1].trim() : '美食区域';
  }

  private extractDistrictDescription(line: string): string {
    return line.replace(/^[^：:]*[：:]\s*/, '').trim() || '当地知名美食聚集地';
  }

  private extractLocalTips(text: string): string[] {
    const tipKeywords = ['建议', '提醒', '注意', '小贴士', 'tip', 'advice'];
    const tips: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (tipKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const items = this.extractListItems(line);
        tips.push(...items);
        
        if (items.length === 0) {
          tips.push(this.cleanText(trimmedLine));
        }
      }
    }

    return tips.length > 0 ? tips : ['尝试当地特色菜肴'];
  }

  private extractDietaryConsiderations(text: string): string[] {
    const dietaryKeywords = ['素食', '清真', '过敏', '忌口', 'vegetarian', 'halal', 'allergy'];
    const considerations: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      if (dietaryKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        considerations.push(this.cleanText(line));
      }
    }

    return considerations;
  }

  private isListItem(line: string): boolean {
    return /^[-*•]\s+|^\d+\.\s+/.test(line);
  }

  private isSubheading(line: string): boolean {
    return /^#{1,6}\s+|^[一二三四五六七八九十]\s*[、.]\s*/.test(line);
  }

  private createDefaultRestaurant(): FoodOption {
    return {
      name: '当地特色餐厅',
      type: 'restaurant',
      cuisine: '当地菜系',
      specialties: ['当地特色菜'],
      priceRange: '价格适中',
    };
  }

  /**
   * 提取预算指南（第二阶段重构新增）
   */
  private extractBudgetGuide(section: string): string {
    const lines = section.split('\n');

    for (const line of lines) {
      if (line.includes('预算') || line.includes('价格') || line.includes('消费') || line.includes('人均')) {
        return line.trim();
      }
    }

    return '人均消费: 50-150元，根据餐厅档次有所不同';
  }

  /**
   * 提取用餐礼仪（第二阶段重构新增）
   */
  private extractDiningEtiquette(section: string): string {
    const lines = section.split('\n');

    for (const line of lines) {
      if (line.includes('礼仪') || line.includes('注意') || line.includes('文化') || line.includes('习俗')) {
        return line.trim();
      }
    }

    return '尊重当地饮食文化，注意用餐礼仪，适量点餐避免浪费';
  }

  private createDefaultFoodData(): FoodExperienceData {
    return {
      specialties: ['当地特色美食', '传统小吃', '特色饮品'],
      recommendedRestaurants: [this.createDefaultRestaurant()],
      foodDistricts: [],
      budgetGuide: '人均消费: 50-150元，根据餐厅档次有所不同',
      diningEtiquette: '尊重当地饮食文化，注意用餐礼仪，适量点餐避免浪费',
    };
  }
}
