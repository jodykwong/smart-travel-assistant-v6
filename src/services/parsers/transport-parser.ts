/**
 * 智游助手v5.0 - 交通信息解析器
 * 专门解析LLM响应中的交通相关信息
 */

import { BaseParser, ParseResult } from './base-parser';
import { TransportationData, TransportOption, RouteInfo } from '../../types/travel-plan';

export class TransportParser extends BaseParser<TransportationData> {
  private readonly transportKeywords = [
    '交通', '出行', '路线', '车票', '机票', 'transport', 'travel', 'route'
  ];

  private readonly endKeywords = [
    '住宿', '美食', '贴士', '建议', 'accommodation', 'food', 'tips'
  ];

  parse(): ParseResult<TransportationData> {
    this.reset();

    try {
      const transportSection = this.extractSection(
        this.transportKeywords,
        this.endKeywords
      );

      if (!transportSection) {
        this.addWarning('未找到交通相关信息');
        return this.createResult(this.createDefaultTransportData());
      }

      const data: TransportationData = {
        overview: this.extractOverview(transportSection),
        arrivalOptions: this.extractArrivalOptions(transportSection),
        localTransport: this.extractLocalTransport(transportSection),
        routes: this.extractRoutes(transportSection),
        transportCards: this.extractTransportCards(transportSection),
        tips: this.extractTransportTips(transportSection),
      };

      return this.createResult(data);
    } catch (error) {
      this.addError(`解析交通信息时出错: ${error.message}`);
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

    return overviewLines.join(' ') || '便捷的交通出行方案';
  }

  private extractArrivalOptions(text: string): TransportOption[] {
    const arrivalKeywords = ['到达', '抵达', '机场', '火车站', 'arrival', 'airport', 'station'];
    const options: TransportOption[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (arrivalKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const option = this.parseTransportOption(trimmedLine);
        if (option) {
          options.push(option);
        }
      }
    }

    if (options.length === 0) {
      options.push(this.createDefaultArrivalOption());
    }

    return options;
  }

  private extractLocalTransport(text: string): TransportOption[] {
    const localKeywords = ['市内', '当地', '本地', '地铁', '公交', 'local', 'metro', 'bus'];
    const options: TransportOption[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (localKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const option = this.parseTransportOption(trimmedLine);
        if (option) {
          options.push(option);
        }
      }
    }

    if (options.length === 0) {
      options.push(...this.createDefaultLocalOptions());
    }

    return options;
  }

  private parseTransportOption(line: string): TransportOption | null {
    const type = this.detectTransportType(line);
    if (!type) return null;

    const name = this.extractTransportName(line, type);
    const description = this.extractDescription(line);
    const cost = this.extractCostInfo(line);
    const duration = this.extractDurationInfo(line);
    const frequency = this.extractFrequencyInfo(line);

    return {
      type,
      name,
      description,
      cost,
      duration,
      frequency,
      tips: this.extractInlineTips(line),
    };
  }

  private detectTransportType(line: string): TransportOption['type'] | null {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('飞机') || lowerLine.includes('航班') || lowerLine.includes('flight')) return 'flight';
    if (lowerLine.includes('火车') || lowerLine.includes('高铁') || lowerLine.includes('train')) return 'train';
    if (lowerLine.includes('公交') || lowerLine.includes('巴士') || lowerLine.includes('bus')) return 'bus';
    if (lowerLine.includes('出租车') || lowerLine.includes('打车') || lowerLine.includes('taxi')) return 'taxi';
    if (lowerLine.includes('地铁') || lowerLine.includes('轻轨') || lowerLine.includes('metro')) return 'metro';
    if (lowerLine.includes('步行') || lowerLine.includes('走路') || lowerLine.includes('walk')) return 'walking';
    if (lowerLine.includes('自行车') || lowerLine.includes('单车') || lowerLine.includes('bike')) return 'bike';
    
    return null;
  }

  private extractTransportName(line: string, type: TransportOption['type']): string {
    const typeNames = {
      flight: '航班',
      train: '火车',
      bus: '公交',
      taxi: '出租车',
      metro: '地铁',
      walking: '步行',
      bike: '自行车',
    };

    return typeNames[type] || '交通方式';
  }

  private extractDescription(line: string): string {
    return this.cleanText(line.replace(/^[-*•]\s*|^\d+\.\s*/, ''));
  }

  private extractCostInfo(line: string): string | undefined {
    const prices = this.extractPrices(line);
    if (prices.length > 0) {
      return `约¥${prices[0]}`;
    }

    const costPatterns = [
      /费用[：:]?\s*([^，。\n]+)/i,
      /价格[：:]?\s*([^，。\n]+)/i,
      /票价[：:]?\s*([^，。\n]+)/i,
    ];

    for (const pattern of costPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractDurationInfo(line: string): string | undefined {
    const timeInfo = this.extractTimeInfo(line);
    if (timeInfo.durations.length > 0) {
      return timeInfo.durations[0];
    }

    const durationPatterns = [
      /时长[：:]?\s*([^，。\n]+)/i,
      /耗时[：:]?\s*([^，。\n]+)/i,
      /需要[：:]?\s*([^，。\n]+)/i,
    ];

    for (const pattern of durationPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractFrequencyInfo(line: string): string | undefined {
    const frequencyPatterns = [
      /频次[：:]?\s*([^，。\n]+)/i,
      /班次[：:]?\s*([^，。\n]+)/i,
      /每(\d+[分小时天])/i,
    ];

    for (const pattern of frequencyPatterns) {
      const match = line.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private extractInlineTips(line: string): string[] {
    const tipPatterns = [
      /建议[：:]?\s*([^，。\n]+)/i,
      /注意[：:]?\s*([^，。\n]+)/i,
      /提醒[：:]?\s*([^，。\n]+)/i,
    ];

    const tips: string[] = [];
    for (const pattern of tipPatterns) {
      const match = line.match(pattern);
      if (match) {
        tips.push(match[1].trim());
      }
    }

    return tips;
  }

  private extractRoutes(text: string): RouteInfo[] {
    const routeKeywords = ['路线', '线路', '从', '到', 'route', 'from', 'to'];
    const routes: RouteInfo[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (routeKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const route = this.parseRoute(trimmedLine);
        if (route) {
          routes.push(route);
        }
      }
    }

    return routes;
  }

  private parseRoute(line: string): RouteInfo | null {
    const routePattern = /从\s*(.+?)\s*到\s*(.+?)(?:[：:]|$)/i;
    const match = line.match(routePattern);
    
    if (match) {
      return {
        from: match[1].trim(),
        to: match[2].trim(),
        options: [this.parseTransportOption(line)].filter(Boolean) as TransportOption[],
      };
    }

    return null;
  }

  private extractTransportCards(text: string): TransportationData['transportCards'] {
    const cardKeywords = ['交通卡', '一卡通', '地铁卡', 'transport card', 'metro card'];
    const cards: NonNullable<TransportationData['transportCards']> = [];
    const lines = text.split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      if (cardKeywords.some(keyword => trimmedLine.toLowerCase().includes(keyword))) {
        const card = this.parseTransportCard(trimmedLine);
        if (card) {
          cards.push(card);
        }
      }
    }

    return cards.length > 0 ? cards : undefined;
  }

  private parseTransportCard(line: string): NonNullable<TransportationData['transportCards']>[0] | null {
    const nameMatch = line.match(/(.+?卡|.+?通)/);
    const name = nameMatch ? nameMatch[1] : '交通卡';
    
    const prices = this.extractPrices(line);
    const cost = prices.length > 0 ? `¥${prices[0]}` : '价格咨询';

    return {
      name,
      description: this.cleanText(line),
      cost,
      benefits: ['便捷出行', '优惠票价'],
    };
  }

  private extractTransportTips(text: string): string[] {
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

    return tips.length > 0 ? tips : ['选择合适的交通方式'];
  }

  private isListItem(line: string): boolean {
    return /^[-*•]\s+|^\d+\.\s+/.test(line);
  }

  private isSubheading(line: string): boolean {
    return /^#{1,6}\s+|^[一二三四五六七八九十]\s*[、.]\s*/.test(line);
  }

  private createDefaultArrivalOption(): TransportOption {
    return {
      type: 'flight',
      name: '航班',
      description: '便捷的到达方式',
    };
  }

  private createDefaultLocalOptions(): TransportOption[] {
    return [
      {
        type: 'metro',
        name: '地铁',
        description: '快速便捷的市内交通',
      },
      {
        type: 'bus',
        name: '公交',
        description: '经济实惠的出行选择',
      },
    ];
  }

  private createDefaultTransportData(): TransportationData {
    return {
      overview: '便捷的交通出行方案',
      arrivalOptions: [this.createDefaultArrivalOption()],
      localTransport: this.createDefaultLocalOptions(),
      routes: [],
      tips: ['选择合适的交通方式'],
    };
  }
}
