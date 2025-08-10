/**
 * 智游助手v5.0 - 旅行计划展示主组件
 * 集成所有模块组件的主容器
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TravelPlanData } from '../../types/travel-plan';
import { AccommodationSection } from './AccommodationSection';
import { FoodExperienceSection } from './FoodExperienceSection';
import { TransportationSection } from './TransportationSection';
import { TravelTipsSection } from './TravelTipsSection';
import { DailyItinerarySection } from './DailyItinerarySection';

interface TravelPlanDisplayProps {
  data: TravelPlanData;
  llmResponse?: string; // 保持向后兼容
  legacyFormat?: any[]; // 新增：Timeline解析架构v2.0的标准化数据
  className?: string;
}

export const TravelPlanDisplay: React.FC<TravelPlanDisplayProps> = ({
  data,
  llmResponse,
  legacyFormat,
  className = '',
}) => {
  return (
    <div className={`space-y-8 ${className}`}>
      {/* 行程概览 */}
      <motion.div
        id="overview"
        className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
            <i className="fas fa-map-marked-alt text-white text-lg"></i>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">行程概览</h2>
            <p className="text-sm text-gray-600">总体路线和时间安排</p>
          </div>
        </div>

        <div className="prose max-w-none">
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
            <div className="text-gray-700 leading-relaxed whitespace-pre-line">
              {data.overview}
            </div>
          </div>
        </div>

        {/* 基本信息卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl text-center border border-blue-100">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-calendar text-white text-sm"></i>
            </div>
            <div className="text-2xl font-bold text-blue-600">{data.totalDays}</div>
            <div className="text-sm text-gray-600">天数</div>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl text-center border border-green-100">
            <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-users text-white text-sm"></i>
            </div>
            <div className="text-2xl font-bold text-green-600">{data.groupSize}</div>
            <div className="text-sm text-gray-600">人数</div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-4 rounded-xl text-center border border-yellow-100">
            <div className="w-8 h-8 bg-yellow-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-wallet text-white text-sm"></i>
            </div>
            <div className="text-2xl font-bold text-yellow-600">¥{data.totalCost.toLocaleString()}</div>
            <div className="text-sm text-gray-600">预算</div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl text-center border border-purple-100">
            <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-map-pin text-white text-sm"></i>
            </div>
            <div className="text-lg font-bold text-purple-600">{data.destination}</div>
            <div className="text-sm text-gray-600">目的地</div>
          </div>
        </div>

        {/* 时间信息 */}
        <div className="mt-6 p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl border border-pink-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <i className="fas fa-plane-departure text-pink-600 mr-3"></i>
              <div>
                <div className="font-medium text-gray-900">出发时间</div>
                <div className="text-sm text-gray-600">{formatDate(data.startDate)}</div>
              </div>
            </div>
            
            <div className="hidden md:flex items-center">
              <div className="w-16 h-0.5 bg-pink-300"></div>
              <div className="w-3 h-3 bg-pink-500 rounded-full mx-2"></div>
              <div className="w-16 h-0.5 bg-pink-300"></div>
            </div>
            
            <div className="flex items-center">
              <i className="fas fa-plane-arrival text-pink-600 mr-3"></i>
              <div>
                <div className="font-medium text-gray-900">返回时间</div>
                <div className="text-sm text-gray-600">{formatDate(data.endDate)}</div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 每日行程安排 */}
      {(legacyFormat || llmResponse) && (
        <DailyItinerarySection
          legacyFormat={legacyFormat}
          llmResponse={llmResponse}
          startDate={data.startDate}
          totalDays={data.totalDays}
        />
      )}

      {/* 住宿推荐 */}
      <AccommodationSection data={data.accommodation} />

      {/* 美食体验 */}
      <FoodExperienceSection data={data.foodExperience} />

      {/* 交通指南 */}
      <TransportationSection data={data.transportation} />

      {/* 实用贴士 */}
      <TravelTipsSection data={data.tips} />

      {/* 计划信息 */}
      <motion.div
        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
      >
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center">
            <i className="fas fa-info-circle mr-2"></i>
            <span>计划ID: {data.id}</span>
          </div>
          <div className="flex items-center">
            <i className="fas fa-clock mr-2"></i>
            <span>创建时间: {formatDateTime(data.createdAt)}</span>
          </div>
          {data.updatedAt && (
            <div className="flex items-center">
              <i className="fas fa-edit mr-2"></i>
              <span>更新时间: {formatDateTime(data.updatedAt)}</span>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// 辅助函数
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  } catch {
    return dateString;
  }
};

const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
};

export default TravelPlanDisplay;
