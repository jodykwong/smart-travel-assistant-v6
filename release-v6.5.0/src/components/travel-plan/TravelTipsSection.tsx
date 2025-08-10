/**
 * 智游助手v5.0 - 实用贴士组件
 * 专门展示实用贴士信息的独立组件
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TravelTipsData, WeatherInfo, CulturalTip, SafetyTip, ShoppingInfo } from '../../types/travel-plan';

interface TravelTipsSectionProps {
  data: TravelTipsData;
  className?: string;
}

export const TravelTipsSection: React.FC<TravelTipsSectionProps> = ({
  data,
  className = '',
}) => {
  return (
    <motion.div
      id="tips"
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5 }}
    >
      {/* 标题区域 */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
          <i className="fas fa-lightbulb text-white text-lg"></i>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">实用贴士</h2>
          <p className="text-sm text-gray-600">旅行重要信息和实用建议</p>
        </div>
      </div>

      {/* 概览信息 */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
          <p className="text-gray-700 leading-relaxed">{data.overview}</p>
        </div>
      </div>

      {/* 贴士网格 */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* 天气信息 */}
        <div className="space-y-6">
          <WeatherInfoCard weather={data.weather} />
          
          {/* 文化贴士 */}
          {data.cultural && data.cultural.length > 0 && (
            <CulturalTipsCard cultural={data.cultural} />
          )}
        </div>

        {/* 安全和购物 */}
        <div className="space-y-6">
          {/* 安全贴士 */}
          {data.safety && data.safety.length > 0 && (
            <SafetyTipsCard safety={data.safety} />
          )}
          
          {/* 购物信息 */}
          {data.shopping && data.shopping.length > 0 && (
            <ShoppingInfoCard shopping={data.shopping} />
          )}
        </div>
      </div>

      {/* 预算贴士和打包清单 */}
      <div className="grid md:grid-cols-2 gap-6 mt-6">
        {/* 预算贴士 */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
          <div className="flex items-center mb-3">
            <i className="fas fa-calculator text-green-600 text-lg mr-3"></i>
            <h4 className="font-bold text-gray-900">预算贴士</h4>
          </div>
          <div className="space-y-2">
            {data.budgetTips.map((tip, index) => (
              <div key={index} className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-sm text-gray-700">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 打包清单 */}
        {data.packingList && data.packingList.length > 0 && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
            <div className="flex items-center mb-3">
              <i className="fas fa-suitcase text-blue-600 text-lg mr-3"></i>
              <h4 className="font-bold text-gray-900">打包清单</h4>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {data.packingList.map((item, index) => (
                <div key={index} className="flex items-center">
                  <i className="fas fa-check text-blue-500 text-xs mr-2"></i>
                  <span className="text-sm text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 紧急联系方式 */}
      {data.emergencyContacts && data.emergencyContacts.length > 0 && (
        <div className="mt-6">
          <div className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border border-red-100">
            <div className="flex items-center mb-4">
              <i className="fas fa-phone text-red-600 text-lg mr-3"></i>
              <h4 className="font-bold text-gray-900">紧急联系方式</h4>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.emergencyContacts.map((contact, index) => (
                <div key={index} className="bg-white p-4 rounded-lg border border-red-200">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-exclamation-triangle text-red-500 text-sm mr-2"></i>
                    <h5 className="font-medium text-gray-900">{contact.service}</h5>
                  </div>
                  <div className="text-lg font-bold text-red-600 mb-1">{contact.number}</div>
                  {contact.description && (
                    <p className="text-xs text-gray-600">{contact.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

interface WeatherInfoCardProps {
  weather: WeatherInfo[];
}

const WeatherInfoCard: React.FC<WeatherInfoCardProps> = ({ weather }) => {
  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-6 rounded-xl border border-blue-100">
      <div className="flex items-center mb-4">
        <i className="fas fa-cloud-sun text-blue-600 text-lg mr-3"></i>
        <h4 className="font-bold text-gray-900">天气提醒</h4>
      </div>
      <div className="space-y-4">
        {weather.map((info, index) => (
          <motion.div
            key={index}
            className="bg-white p-4 rounded-lg border border-blue-200"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-medium text-gray-900">{info.season}</h5>
              <span className="text-sm text-blue-600">{info.temperature}</span>
            </div>
            <div className="text-sm text-gray-600 mb-2">降雨: {info.rainfall}</div>
            <div className="flex flex-wrap gap-2">
              {info.clothing.map((item, clothingIndex) => (
                <span
                  key={clothingIndex}
                  className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface CulturalTipsCardProps {
  cultural: CulturalTip[];
}

const CulturalTipsCard: React.FC<CulturalTipsCardProps> = ({ cultural }) => {
  const getImportanceColor = (importance: CulturalTip['importance']) => {
    const colors = {
      high: 'text-red-600 bg-red-100',
      medium: 'text-yellow-600 bg-yellow-100',
      low: 'text-green-600 bg-green-100',
    };
    return colors[importance] || 'text-gray-600 bg-gray-100';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
      <div className="flex items-center mb-4">
        <i className="fas fa-users text-purple-600 text-lg mr-3"></i>
        <h4 className="font-bold text-gray-900">文化礼仪</h4>
      </div>
      <div className="space-y-3">
        {cultural.map((tip, index) => (
          <motion.div
            key={index}
            className="bg-white p-4 rounded-lg border border-purple-200"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <div className="flex items-start justify-between mb-2">
              <h5 className="font-medium text-gray-900">{tip.title}</h5>
              <span className={`px-2 py-1 text-xs rounded ${getImportanceColor(tip.importance)}`}>
                {tip.importance === 'high' ? '重要' : tip.importance === 'medium' ? '建议' : '了解'}
              </span>
            </div>
            <p className="text-sm text-gray-600">{tip.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface SafetyTipsCardProps {
  safety: SafetyTip[];
}

const SafetyTipsCard: React.FC<SafetyTipsCardProps> = ({ safety }) => {
  const getUrgencyColor = (urgency: SafetyTip['urgency']) => {
    const colors = {
      critical: 'text-red-600 bg-red-100 border-red-200',
      important: 'text-orange-600 bg-orange-100 border-orange-200',
      advisory: 'text-blue-600 bg-blue-100 border-blue-200',
    };
    return colors[urgency] || 'text-gray-600 bg-gray-100 border-gray-200';
  };

  return (
    <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-xl border border-red-100">
      <div className="flex items-center mb-4">
        <i className="fas fa-shield-alt text-red-600 text-lg mr-3"></i>
        <h4 className="font-bold text-gray-900">安全提醒</h4>
      </div>
      <div className="space-y-3">
        {safety.map((tip, index) => (
          <motion.div
            key={index}
            className={`p-4 rounded-lg border ${getUrgencyColor(tip.urgency)}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <div className="flex items-start justify-between mb-2">
              <h5 className="font-medium text-gray-900">{tip.title}</h5>
              <span className={`px-2 py-1 text-xs rounded ${getUrgencyColor(tip.urgency)}`}>
                {tip.urgency === 'critical' ? '紧急' : tip.urgency === 'important' ? '重要' : '建议'}
              </span>
            </div>
            <p className="text-sm text-gray-600">{tip.description}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

interface ShoppingInfoCardProps {
  shopping: ShoppingInfo[];
}

const ShoppingInfoCard: React.FC<ShoppingInfoCardProps> = ({ shopping }) => {
  return (
    <div className="bg-gradient-to-br from-orange-50 to-yellow-50 p-6 rounded-xl border border-orange-100">
      <div className="flex items-center mb-4">
        <i className="fas fa-shopping-bag text-orange-600 text-lg mr-3"></i>
        <h4 className="font-bold text-gray-900">购物建议</h4>
      </div>
      <div className="space-y-4">
        {shopping.map((info, index) => (
          <motion.div
            key={index}
            className="bg-white p-4 rounded-lg border border-orange-200"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: index * 0.1 }}
          >
            <h5 className="font-medium text-gray-900 mb-2">{info.category}</h5>
            
            <div className="mb-3">
              <h6 className="text-sm font-medium text-gray-800 mb-1">推荐商品</h6>
              <div className="flex flex-wrap gap-2">
                {info.items.map((item, itemIndex) => (
                  <span
                    key={itemIndex}
                    className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <h6 className="text-sm font-medium text-gray-800 mb-1">购买地点</h6>
              <div className="space-y-1">
                {info.locations.map((location, locationIndex) => (
                  <div key={locationIndex} className="flex items-center">
                    <i className="fas fa-map-marker-alt text-orange-500 text-xs mr-2"></i>
                    <span className="text-sm text-gray-600">{location}</span>
                  </div>
                ))}
              </div>
            </div>

            {info.bargainingTips && info.bargainingTips.length > 0 && (
              <div>
                <h6 className="text-sm font-medium text-gray-800 mb-1">砍价技巧</h6>
                <div className="space-y-1">
                  {info.bargainingTips.map((tip, tipIndex) => (
                    <div key={tipIndex} className="flex items-start">
                      <i className="fas fa-lightbulb text-yellow-500 text-xs mr-2 mt-0.5"></i>
                      <span className="text-xs text-gray-600">{tip}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {info.priceRange && (
              <div className="mt-2 p-2 bg-orange-50 rounded">
                <span className="text-xs text-orange-700">价格范围: {info.priceRange}</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};
