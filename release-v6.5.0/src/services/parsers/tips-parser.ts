/**
 * 智游助手v5.0 - 实用贴士解析器
 * 专门解析LLM响应中的实用贴士信息
 */

import { BaseParser, ParseResult } from './base-parser';
import { TravelTipsData, WeatherInfo, CulturalTip, SafetyTip, ShoppingInfo } from '../../types/travel-plan';

export class TipsParser extends BaseParser<TravelTipsData> {
  private readonly tipsKeywords = [
    '贴士', '建议', '注意', '提醒', '小贴士', 'tips', 'advice', 'notice'
  ];

  private readonly endKeywords = [
    '住宿', '美食', '交通', '总结', 'accommodation', 'food', 'transport', 'summary'
  ];

  parse(): ParseResult<TravelTipsData> {
    this.reset();

    try {
      const tipsSection = this.extractSection(
        this.tipsKeywords,
        this.endKeywords
      );

      if (!tipsSection) {
        this.addWarning('未找到实用贴士信息');
        return this.createResult(this.createDefaultTipsData());
      }

      const data: TravelTipsData = {
        overview: this.extractOverview(tipsSection),
        weather: this.extractWeatherInfo(tipsSection),
        cultural: this.extractCulturalTips(tipsSection),
        safety: this.extractSafetyTips(tipsSection),
        shopping: this.extractShoppingInfo(tipsSection),
        emergencyContacts: this.extractEmergencyContacts(tipsSection),
        budgetTips: this.extractBudgetTips(tipsSection),
        packingList: this.extractPackingList(tipsSection),
      };

      return this.createResult(data);
    } catch (error) {
      this.addError(`解析实用贴士时出错: ${error.message}`);
      return this.createResult(null);
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

    return overviewLines.join(' ') || '实用的旅行贴士和建议';
  }

  private extractWeatherInfo(text: string): WeatherInfo[] {
    const weatherKeywords = ['天气', '气候', '温度', '降雨', 'weather', 'climate', 'temperature'];
    const weatherInfo: WeatherInfo[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (weatherKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const info = this.parseWeatherInfo(trimmedLine);
        if (info) {
          weatherInfo.push(info);
        }
      }
    }

    if (weatherInfo.length === 0) {
      weatherInfo.push(this.createDefaultWeatherInfo());
    }

    return weatherInfo;
  }

  private parseWeatherInfo(line: string): WeatherInfo | null {
    const season = this.extractSeason(line);
    const temperature = this.extractTemperature(line);
    const rainfall = this.extractRainfall(line);
    const clothing = this.extractClothingAdvice(line);

    if (season || temperature) {
      return {
        season: season || '全年',
        temperature: temperature || '适宜',
        rainfall: rainfall || '正常',
        clothing: clothing.length > 0 ? clothing : ['根据季节准备'],
      };
    }

    return null;
  }

  private extractSeason(line: string): string {
    const seasonPatterns = [
      /(春季|夏季|秋季|冬季)/,
      /(spring|summer|autumn|winter)/i,
      /(\d+月)/,
    ];

    for (const pattern of seasonPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '';
  }

  private extractTemperature(line: string): string {
    const tempPatterns = [
      /温度[：:]?\s*([^，。\n]+)/i,
      /气温[：:]?\s*([^，。\n]+)/i,
      /(\d+[-~]\d+°?[CF]?)/,
    ];

    for (const pattern of tempPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  private extractRainfall(line: string): string {
    const rainPatterns = [
      /降雨[：:]?\s*([^，。\n]+)/i,
      /雨量[：:]?\s*([^，。\n]+)/i,
      /(多雨|少雨|干燥|湿润)/,
    ];

    for (const pattern of rainPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  private extractClothingAdvice(line: string): string[] {
    const clothingKeywords = ['穿着', '服装', '衣物', 'clothing', 'wear'];
    const advice: string[] = [];

    if (clothingKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
      const items = this.extractListItems(line);
      advice.push(...items);
    }

    return advice;
  }

  private extractCulturalTips(text: string): CulturalTip[] {
    const culturalKeywords = ['文化', '礼仪', '习俗', '传统', 'culture', 'custom', 'etiquette'];
    const tips: CulturalTip[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (culturalKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const tip = this.parseCulturalTip(trimmedLine);
        if (tip) {
          tips.push(tip);
        }
      }
    }

    return tips;
  }

  private parseCulturalTip(line: string): CulturalTip | null {
    const category = this.detectCulturalCategory(line);
    const title = this.extractTipTitle(line);
    const description = this.cleanText(line);

    if (title || description) {
      return {
        category,
        title: title || '文化贴士',
        description: description || line,
        importance: this.detectImportance(line),
      };
    }

    return null;
  }

  private detectCulturalCategory(line: string): CulturalTip['category'] {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('礼仪') || lowerLine.includes('etiquette')) return 'etiquette';
    if (lowerLine.includes('语言') || lowerLine.includes('language')) return 'language';
    if (lowerLine.includes('宗教') || lowerLine.includes('religion')) return 'religion';
    if (lowerLine.includes('社交') || lowerLine.includes('social')) return 'social';
    
    return 'customs';
  }

  private extractSafetyTips(text: string): SafetyTip[] {
    const safetyKeywords = ['安全', '注意', '小心', '防范', 'safety', 'security', 'caution'];
    const tips: SafetyTip[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (safetyKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const tip = this.parseSafetyTip(trimmedLine);
        if (tip) {
          tips.push(tip);
        }
      }
    }

    return tips;
  }

  private parseSafetyTip(line: string): SafetyTip | null {
    const category = this.detectSafetyCategory(line);
    const title = this.extractTipTitle(line);
    const description = this.cleanText(line);

    if (title || description) {
      return {
        category,
        title: title || '安全提醒',
        description: description || line,
        urgency: this.detectUrgency(line),
      };
    }

    return null;
  }

  private detectSafetyCategory(line: string): SafetyTip['category'] {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('健康') || lowerLine.includes('health')) return 'health';
    if (lowerLine.includes('紧急') || lowerLine.includes('emergency')) return 'emergency';
    if (lowerLine.includes('诈骗') || lowerLine.includes('scam')) return 'scam';
    if (lowerLine.includes('交通') || lowerLine.includes('transport')) return 'transport';
    
    return 'general';
  }

  private extractShoppingInfo(text: string): ShoppingInfo[] {
    const shoppingKeywords = ['购物', '特产', '纪念品', 'shopping', 'souvenir'];
    const shoppingInfo: ShoppingInfo[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (shoppingKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const info = this.parseShoppingInfo(trimmedLine);
        if (info) {
          shoppingInfo.push(info);
        }
      }
    }

    return shoppingInfo;
  }

  private parseShoppingInfo(line: string): ShoppingInfo | null {
    const category = this.extractShoppingCategory(line);
    const items = this.extractListItems(line);
    const locations = this.extractShoppingLocations(line);
    const bargainingTips = this.extractBargainingTips(line);

    if (category || items.length > 0) {
      return {
        category: category || '特产购物',
        items: items.length > 0 ? items : ['当地特产'],
        locations: locations.length > 0 ? locations : ['商业区'],
        bargainingTips: bargainingTips.length > 0 ? bargainingTips : undefined,
      };
    }

    return null;
  }

  private extractShoppingCategory(line: string): string {
    const categoryPatterns = [
      /购买\s*([^，。\n]+)/,
      /特产[：:]?\s*([^，。\n]+)/,
      /纪念品[：:]?\s*([^，。\n]+)/,
    ];

    for (const pattern of categoryPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  private extractShoppingLocations(line: string): string[] {
    const locationPatterns = [
      /在\s*([^，。\n]+?)\s*购买/,
      /地点[：:]?\s*([^，。\n]+)/,
    ];

    const locations: string[] = [];
    for (const pattern of locationPatterns) {
      const match = line.match(pattern);
      if (match) {
        locations.push(match[1].trim());
      }
    }

    return locations;
  }

  private extractBargainingTips(line: string): string[] {
    const bargainKeywords = ['砍价', '讨价', '还价', 'bargain'];
    const tips: string[] = [];

    if (bargainKeywords.some(keyword => line.toLowerCase().includes(keyword))) {
      const items = this.extractListItems(line);
      tips.push(...items);
    }

    return tips;
  }

  private extractEmergencyContacts(text: string): TravelTipsData['emergencyContacts'] {
    const emergencyKeywords = ['紧急', '急救', '报警', 'emergency', 'police', 'hospital'];
    const contacts: NonNullable<TravelTipsData['emergencyContacts']> = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (emergencyKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const contact = this.parseEmergencyContact(trimmedLine);
        if (contact) {
          contacts.push(contact);
        }
      }
    }

    return contacts.length > 0 ? contacts : undefined;
  }

  private parseEmergencyContact(line: string): NonNullable<TravelTipsData['emergencyContacts']>[0] | null {
    const phonePattern = /(\d{3,4}[-\s]?\d{3,8})/;
    const match = line.match(phonePattern);
    
    if (match) {
      return {
        service: this.extractServiceName(line),
        number: match[1],
        description: this.cleanText(line),
      };
    }

    return null;
  }

  private extractServiceName(line: string): string {
    const servicePatterns = [
      /(报警|警察|police)/i,
      /(急救|医院|hospital)/i,
      /(消防|fire)/i,
    ];

    for (const pattern of servicePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return '紧急服务';
  }

  private extractBudgetTips(text: string): string[] {
    const budgetKeywords = ['预算', '省钱', '费用', 'budget', 'save', 'cost'];
    const tips: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (budgetKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const items = this.extractListItems(line);
        tips.push(...items);
        
        if (items.length === 0) {
          tips.push(this.cleanText(trimmedLine));
        }
      }
    }

    return tips.length > 0 ? tips : ['合理规划预算'];
  }

  private extractPackingList(text: string): string[] {
    const packingKeywords = ['行李', '打包', '携带', 'packing', 'luggage', 'bring'];
    const items: string[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (packingKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const listItems = this.extractListItems(line);
        items.push(...listItems);
      }
    }

    return items;
  }

  private extractTipTitle(line: string): string {
    const titlePatterns = [
      /^[-*•]\s*([^：:]+)[：:]/,
      /^\d+\.\s*([^：:]+)[：:]/,
    ];

    for (const pattern of titlePatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return '';
  }

  private detectImportance(line: string): CulturalTip['importance'] {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('重要') || lowerLine.includes('必须') || lowerLine.includes('important')) return 'high';
    if (lowerLine.includes('建议') || lowerLine.includes('推荐') || lowerLine.includes('recommend')) return 'medium';
    
    return 'low';
  }

  private detectUrgency(line: string): SafetyTip['urgency'] {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('危险') || lowerLine.includes('紧急') || lowerLine.includes('critical')) return 'critical';
    if (lowerLine.includes('重要') || lowerLine.includes('注意') || lowerLine.includes('important')) return 'important';
    
    return 'advisory';
  }

  private isListItem(line: string): boolean {
    return /^[-*•]\s+|^\d+\.\s+/.test(line);
  }

  private isSubheading(line: string): boolean {
    return /^#{1,6}\s+|^[一二三四五六七八九十]\s*[、.]\s*/.test(line);
  }

  private createDefaultWeatherInfo(): WeatherInfo {
    return {
      season: '全年',
      temperature: '适宜',
      rainfall: '正常',
      clothing: ['根据季节准备'],
    };
  }

  private createDefaultTipsData(): TravelTipsData {
    return {
      overview: '实用的旅行贴士和建议',
      weather: [this.createDefaultWeatherInfo()],
      cultural: [],
      safety: [],
      shopping: [],
      budgetTips: ['合理规划预算'],
    };
  }
}
