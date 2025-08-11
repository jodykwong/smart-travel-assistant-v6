/**
 * 智游助手v5.0 - 天气增强插件示例
 * 演示如何创建和使用插件系统
 */

import { TravelPlanPlugin } from '../config/travel-plan-config';
import { TravelTipsData } from '../types/travel-plan';

export const WeatherEnhancementPlugin: TravelPlanPlugin = {
  name: 'weather-enhancement',
  version: '1.0.0',
  description: '增强天气信息，集成实时天气数据',
  author: '智游助手团队',

  config: {
    apiKey: process.env.WEATHER_API_KEY,
    provider: 'openweathermap', // 或 'weatherapi'
    enableForecast: true,
    enableAlerts: true,
  },

  async onInit() {
    console.log('天气增强插件初始化...');
    
    // 检查API密钥
    if (!this.config?.apiKey) {
      console.warn('天气API密钥未配置，将使用默认天气信息');
    }
  },

  async onAfterParse(data: any) {
    if (!data.tips || !this.config?.apiKey) {
      return data;
    }

    try {
      // 增强天气信息
      const enhancedWeather = await this.enhanceWeatherData(
        data.destination,
        data.startDate,
        data.endDate
      );

      return {
        ...data,
        tips: {
          ...data.tips,
          weather: enhancedWeather,
          // 添加天气警告
          weatherAlerts: await this.getWeatherAlerts(data.destination),
        },
      };
    } catch (error) {
      console.error('天气数据增强失败:', error);
      return data;
    }
  },

  /**
   * 增强天气数据
   */
  async enhanceWeatherData(destination: string, startDate: string, endDate: string) {
    const { apiKey, provider } = this.config;
    
    try {
      // 获取地理坐标
      const coordinates = await this.getCoordinates(destination);
      
      // 获取天气预报
      const forecast = await this.getWeatherForecast(coordinates, startDate, endDate);
      
      // 转换为标准格式
      return this.formatWeatherData(forecast);
    } catch (error) {
      console.error('获取天气数据失败:', error);
      return [];
    }
  },

  /**
   * 获取地理坐标
   */
  async getCoordinates(destination: string) {
    const { apiKey } = this.config;
    const response = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(destination)}&limit=1&appid=${apiKey}`
    );
    
    const data = await response.json();
    if (data.length === 0) {
      throw new Error('未找到目的地坐标');
    }
    
    return {
      lat: data[0].lat,
      lon: data[0].lon,
    };
  },

  /**
   * 获取天气预报
   */
  async getWeatherForecast(coordinates: { lat: number; lon: number }, startDate: string, endDate: string) {
    const { apiKey } = this.config;
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${apiKey}&units=metric&lang=zh_cn`
    );
    
    return response.json();
  },

  /**
   * 格式化天气数据
   */
  formatWeatherData(forecast: any) {
    const weatherData = [];
    const dailyData = this.groupByDay(forecast.list);
    
    for (const [date, dayData] of Object.entries(dailyData)) {
      const avgTemp = this.calculateAverageTemp(dayData as any[]);
      const conditions = this.getMainCondition(dayData as any[]);
      const rainfall = this.calculateRainfall(dayData as any[]);
      
      weatherData.push({
        season: this.formatDate(date),
        temperature: `${Math.round(avgTemp.min)}°C - ${Math.round(avgTemp.max)}°C`,
        rainfall: rainfall > 0 ? `预计降雨 ${rainfall}mm` : '无降雨',
        clothing: this.getClothingAdvice(avgTemp.avg, conditions),
        conditions: conditions,
        humidity: this.calculateAverageHumidity(dayData as any[]),
        windSpeed: this.calculateAverageWindSpeed(dayData as any[]),
      });
    }
    
    return weatherData;
  },

  /**
   * 按天分组天气数据
   */
  groupByDay(forecastList: any[]) {
    const grouped: Record<string, any[]> = {};
    
    forecastList.forEach(item => {
      const date = item.dt_txt.split(' ')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });
    
    return grouped;
  },

  /**
   * 计算平均温度
   */
  calculateAverageTemp(dayData: any[]) {
    const temps = dayData.map(item => item.main.temp);
    return {
      avg: temps.reduce((sum, temp) => sum + temp, 0) / temps.length,
      min: Math.min(...temps),
      max: Math.max(...temps),
    };
  },

  /**
   * 获取主要天气状况
   */
  getMainCondition(dayData: any[]) {
    const conditions = dayData.map(item => item.weather[0].main);
    const conditionCounts: Record<string, number> = {};
    
    conditions.forEach(condition => {
      conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
    });
    
    return Object.keys(conditionCounts).reduce((a, b) => 
      conditionCounts[a] > conditionCounts[b] ? a : b
    );
  },

  /**
   * 计算降雨量
   */
  calculateRainfall(dayData: any[]) {
    return dayData.reduce((total, item) => {
      return total + (item.rain?.['3h'] || 0);
    }, 0);
  },

  /**
   * 获取穿衣建议
   */
  getClothingAdvice(avgTemp: number, condition: string) {
    const advice = [];
    
    if (avgTemp < 5) {
      advice.push('厚外套', '保暖内衣', '手套围巾');
    } else if (avgTemp < 15) {
      advice.push('外套', '长袖衣物', '薄毛衣');
    } else if (avgTemp < 25) {
      advice.push('轻薄外套', '长袖或短袖', '舒适鞋子');
    } else {
      advice.push('短袖衣物', '防晒帽', '凉鞋');
    }
    
    if (condition === 'Rain') {
      advice.push('雨具');
    }
    
    if (condition === 'Snow') {
      advice.push('防滑鞋');
    }
    
    return advice;
  },

  /**
   * 计算平均湿度
   */
  calculateAverageHumidity(dayData: any[]) {
    const humidities = dayData.map(item => item.main.humidity);
    return Math.round(humidities.reduce((sum, h) => sum + h, 0) / humidities.length);
  },

  /**
   * 计算平均风速
   */
  calculateAverageWindSpeed(dayData: any[]) {
    const windSpeeds = dayData.map(item => item.wind.speed);
    return Math.round(windSpeeds.reduce((sum, w) => sum + w, 0) / windSpeeds.length * 10) / 10;
  },

  /**
   * 格式化日期
   */
  formatDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  },

  /**
   * 获取天气警告
   */
  async getWeatherAlerts(destination: string) {
    try {
      const coordinates = await this.getCoordinates(destination);
      const { apiKey } = this.config;
      
      const response = await fetch(
        `https://api.openweathermap.org/data/2.5/onecall?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${apiKey}&exclude=minutely,hourly,daily`
      );
      
      const data = await response.json();
      
      if (data.alerts && data.alerts.length > 0) {
        return data.alerts.map((alert: any) => ({
          title: alert.event,
          description: alert.description,
          severity: alert.severity,
          start: new Date(alert.start * 1000).toLocaleString('zh-CN'),
          end: new Date(alert.end * 1000).toLocaleString('zh-CN'),
        }));
      }
      
      return [];
    } catch (error) {
      console.error('获取天气警告失败:', error);
      return [];
    }
  },
};

// 使用示例
export const registerWeatherPlugin = () => {
  const { pluginManager } = require('../config/travel-plan-config');
  pluginManager.register(WeatherEnhancementPlugin);
};
