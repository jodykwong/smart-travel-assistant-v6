/**
 * 智游助手v5.0 - 住宿信息解析器（第二阶段重构版）
 * 重构目标：
 * - 专注于LLM响应的结构化解析
 * - 移除外部API调用逻辑
 * - 简化解析流程，提升性能
 * - 保持数据结构向后兼容
 */

import { BaseParser, ParseResult } from './base-parser';
import { AccommodationData, AccommodationOption } from '../../types/travel-plan';

export class AccommodationParser extends BaseParser<AccommodationData> {
  private readonly accommodationKeywords = [
    '住宿', '酒店', '旅馆', '民宿', '客栈', 'hotel', 'accommodation', 'lodging'
  ];

  private readonly endKeywords = [
    '美食', '交通', '贴士', '建议', 'food', 'transport', 'tips'
  ];

  /**
   * 解析住宿信息（第二阶段重构版）
   * 专注于LLM响应的结构化解析，不再调用外部API
   */
  parse(): ParseResult<AccommodationData> {
    this.reset();
    const startTime = Date.now();

    try {
      console.log('🏨 开始解析住宿信息 (专注LLM响应解析)...');

      const accommodationSection = this.extractSection(
        this.accommodationKeywords,
        this.endKeywords
      );

      if (!accommodationSection) {
        this.addWarning('未找到住宿相关信息，将使用默认数据');
        return this.createResult(this.createDefaultAccommodationData());
      }

      // 专注于LLM响应的结构化解析
      const data: AccommodationData = {
        recommendations: this.extractRecommendations(accommodationSection),
        bookingTips: this.extractBookingTips(accommodationSection),
        priceRanges: this.extractPriceRanges(accommodationSection),
        amenitiesComparison: this.extractAmenitiesComparison(accommodationSection),
      };

      const duration = Date.now() - startTime;
      console.log(`✅ 住宿信息解析完成 (${duration}ms)`);

      return this.createResult(data);
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ 住宿信息解析失败 (${duration}ms):`, error);
      this.addError(`解析住宿信息时出错: ${error.message}`);
      return this.createResult(this.createDefaultAccommodationData());
    }
  }

  private extractOverview(text: string): string {
    const lines = text.split('\n');
    const overviewLines: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // 跳过明显的列表项和标题
      if (this.isListItem(trimmedLine) || this.isSubheading(trimmedLine)) {
        break;
      }

      overviewLines.push(trimmedLine);
      
      // 限制概览长度
      if (overviewLines.length >= 3) break;
    }

    return overviewLines.join(' ') || '为您推荐优质住宿选择';
  }

  private extractRecommendations(text: string): AccommodationOption[] {
    const recommendations: AccommodationOption[] = [];
    const lines = text.split('\n');
    let currentRecommendation: Partial<AccommodationOption> | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      // 检测新的住宿推荐
      if (this.isAccommodationName(trimmedLine)) {
        if (currentRecommendation) {
          recommendations.push(this.finalizeRecommendation(currentRecommendation));
        }
        currentRecommendation = {
          name: this.cleanAccommodationName(trimmedLine),
          type: this.detectAccommodationType(trimmedLine),
          amenities: [],
        };
      } else if (currentRecommendation) {
        this.parseRecommendationDetails(trimmedLine, currentRecommendation);
      }
    }

    // 添加最后一个推荐
    if (currentRecommendation) {
      recommendations.push(this.finalizeRecommendation(currentRecommendation));
    }

    // 如果没有找到具体推荐，创建默认推荐
    if (recommendations.length === 0) {
      recommendations.push(this.createDefaultRecommendation());
    }

    return recommendations;
  }

  private isAccommodationName(line: string): boolean {
    const patterns = [
      /^\d+\.\s*(.+酒店|.+旅馆|.+民宿|.+客栈)/,
      /^[-*•]\s*(.+酒店|.+旅馆|.+民宿|.+客栈)/,
      /.+(hotel|resort|inn|lodge)/i,
    ];

    return patterns.some(pattern => pattern.test(line));
  }

  private cleanAccommodationName(line: string): string {
    return line
      .replace(/^\d+\.\s*/, '')
      .replace(/^[-*•]\s*/, '')
      .replace(/：.*$/, '')
      .trim();
  }

  private detectAccommodationType(name: string): AccommodationOption['type'] {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('resort') || lowerName.includes('度假')) return 'resort';
    if (lowerName.includes('hostel') || lowerName.includes('青旅')) return 'hostel';
    if (lowerName.includes('apartment') || lowerName.includes('公寓')) return 'apartment';
    if (lowerName.includes('民宿') || lowerName.includes('客栈')) return 'guesthouse';
    
    return 'hotel';
  }

  private parseRecommendationDetails(line: string, recommendation: Partial<AccommodationOption>): void {
    const lowerLine = line.toLowerCase();

    // 提取价格信息
    const prices = this.extractPrices(line);
    if (prices.length > 0) {
      recommendation.pricePerNight = prices[0];
    }

    // 提取评分
    const ratings = this.extractRatings(line);
    if (ratings.length > 0) {
      recommendation.rating = ratings[0];
    }

    // 提取设施信息
    if (lowerLine.includes('设施') || lowerLine.includes('amenities')) {
      const amenities = this.extractListItems(line);
      if (amenities.length > 0) {
        recommendation.amenities = [...(recommendation.amenities || []), ...amenities];
      }
    }

    // 提取地址信息
    if (lowerLine.includes('地址') || lowerLine.includes('位于') || lowerLine.includes('address')) {
      recommendation.address = line.replace(/.*(?:地址|位于|address)[：:]\s*/i, '').trim();
    }
  }

  private finalizeRecommendation(recommendation: Partial<AccommodationOption>): AccommodationOption {
    return {
      name: recommendation.name || '推荐住宿',
      type: recommendation.type || 'hotel',
      amenities: recommendation.amenities || [],
      address: recommendation.address,
      rating: recommendation.rating,
      pricePerNight: recommendation.pricePerNight,
      priceRange: this.calculatePriceRange(recommendation.pricePerNight),
    };
  }

  private calculatePriceRange(price?: number): string {
    if (!price) return '价格面议';
    
    if (price < 200) return '经济型';
    if (price < 500) return '舒适型';
    if (price < 1000) return '豪华型';
    return '奢华型';
  }

  private extractBookingTips(text: string): string[] {
    const tipKeywords = ['预订', '建议', '注意', 'booking', 'tip'];
    const tips: string[] = [];

    const lines = text.split('\n');
    let inTipsSection = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (tipKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        inTipsSection = true;
        continue;
      }

      if (inTipsSection && this.isListItem(trimmedLine)) {
        tips.push(this.cleanListItem(trimmedLine));
      }
    }

    return tips.length > 0 ? tips : ['建议提前预订以获得更好的价格'];
  }

  private extractBudgetAdvice(text: string): string {
    const budgetKeywords = ['预算', '费用', '价格', 'budget', 'cost'];
    const lines = text.split('\n');

    for (const line of lines) {
      if (budgetKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
        return this.cleanText(line);
      }
    }

    return '根据预算选择合适的住宿类型';
  }

  private extractSeasonalConsiderations(text: string): string[] {
    const seasonKeywords = ['季节', '淡季', '旺季', 'season', 'peak', 'off-peak'];
    const considerations: string[] = [];

    const lines = text.split('\n');
    for (const line of lines) {
      if (seasonKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
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

  private cleanListItem(line: string): string {
    return line.replace(/^[-*•]\s+|^\d+\.\s+/, '').trim();
  }

  private createDefaultRecommendation(): AccommodationOption {
    return {
      name: '推荐住宿',
      type: 'hotel',
      amenities: ['免费WiFi', '24小时前台'],
      priceRange: '根据预算选择',
    };
  }

  /**
   * 提取价格范围信息（第二阶段重构新增）
   */
  private extractPriceRanges(section: string): string[] {
    const priceRanges: string[] = [];
    const lines = section.split('\n');

    for (const line of lines) {
      // 匹配价格范围模式
      const priceMatch = line.match(/(\d+[-~]\d+元|经济型|舒适型|豪华型|预算|中档|高端)/gi);
      if (priceMatch) {
        priceRanges.push(...priceMatch);
      }
    }

    return priceRanges.length > 0 ? priceRanges : [
      '经济型: 200-400元',
      '舒适型: 400-800元',
      '豪华型: 800元以上'
    ];
  }

  /**
   * 提取设施对比信息（第二阶段重构新增）
   */
  private extractAmenitiesComparison(section: string): any[] {
    const comparison: any[] = [];
    const lines = section.split('\n');

    let currentHotel = '';
    let currentAmenities: string[] = [];

    for (const line of lines) {
      // 匹配酒店名称
      const hotelMatch = line.match(/(\d+\.\s*)?([^-]+(?:酒店|宾馆|旅馆|民宿|客栈))/);
      if (hotelMatch) {
        if (currentHotel && currentAmenities.length > 0) {
          comparison.push({
            name: currentHotel,
            amenities: currentAmenities,
          });
        }
        currentHotel = hotelMatch[2].trim();
        currentAmenities = [];
      }

      // 匹配设施信息
      const amenityMatch = line.match(/(WiFi|停车|健身|游泳|早餐|空调|电视|冰箱)/gi);
      if (amenityMatch && currentHotel) {
        currentAmenities.push(...amenityMatch);
      }
    }

    // 添加最后一个酒店
    if (currentHotel && currentAmenities.length > 0) {
      comparison.push({
        name: currentHotel,
        amenities: currentAmenities,
      });
    }

    return comparison;
  }

  private createDefaultAccommodationData(): AccommodationData {
    return {
      recommendations: [this.createDefaultRecommendation()],
      bookingTips: '建议提前预订以获得更好的价格，选择交通便利的位置',
      priceRanges: ['经济型: 200-400元', '舒适型: 400-800元', '豪华型: 800元以上'],
      amenitiesComparison: [],
    };
  }
}
