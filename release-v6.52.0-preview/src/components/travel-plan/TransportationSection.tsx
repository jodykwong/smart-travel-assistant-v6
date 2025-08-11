/**
 * 智游助手v5.0 - 交通指南组件
 * 专门展示交通相关信息的独立组件
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TransportationData, TransportOption, RouteInfo } from '../../types/travel-plan';

interface TransportationSectionProps {
  data: TransportationData;
  className?: string;
}

export const TransportationSection: React.FC<TransportationSectionProps> = ({
  data,
  className = '',
}) => {
  return (
    <motion.div
      id="transport"
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.4 }}
    >
      {/* 标题区域 */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
          <i className="fas fa-car text-white text-lg"></i>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">交通指南</h2>
          <p className="text-sm text-gray-600">出行方式和路线建议</p>
        </div>
      </div>

      {/* 概览信息 */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
          <p className="text-gray-700 leading-relaxed">{data.overview}</p>
        </div>
      </div>

      {/* 到达方式和当地交通 */}
      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* 到达方式 */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-6 rounded-xl border border-purple-100">
          <div className="flex items-center mb-4">
            <i className="fas fa-plane-arrival text-purple-600 text-lg mr-3"></i>
            <h3 className="text-lg font-semibold text-gray-900">到达方式</h3>
          </div>
          <div className="space-y-3">
            {data.arrivalOptions.map((option, index) => (
              <TransportOptionCard
                key={index}
                option={option}
                index={index}
                variant="arrival"
              />
            ))}
          </div>
        </div>

        {/* 当地交通 */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
          <div className="flex items-center mb-4">
            <i className="fas fa-subway text-blue-600 text-lg mr-3"></i>
            <h3 className="text-lg font-semibold text-gray-900">当地交通</h3>
          </div>
          <div className="space-y-3">
            {data.localTransport.map((option, index) => (
              <TransportOptionCard
                key={index}
                option={option}
                index={index}
                variant="local"
              />
            ))}
          </div>
        </div>
      </div>

      {/* 路线信息 */}
      {data.routes && data.routes.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">推荐路线</h3>
          <div className="space-y-4">
            {data.routes.map((route, index) => (
              <RouteCard
                key={index}
                route={route}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* 交通卡和贴士 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* 交通卡信息 */}
        {data.transportCards && data.transportCards.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
            <div className="flex items-center mb-3">
              <i className="fas fa-credit-card text-green-600 text-lg mr-3"></i>
              <h4 className="font-bold text-gray-900">交通卡</h4>
            </div>
            <div className="space-y-3">
              {data.transportCards.map((card, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">{card.name}</h5>
                    <span className="text-sm font-medium text-green-600">{card.cost}</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2">{card.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {card.benefits.map((benefit, benefitIndex) => (
                      <span
                        key={benefitIndex}
                        className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded"
                      >
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 交通贴士 */}
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100">
          <div className="flex items-center mb-3">
            <i className="fas fa-lightbulb text-yellow-600 text-lg mr-3"></i>
            <h4 className="font-bold text-gray-900">交通贴士</h4>
          </div>
          <div className="space-y-2">
            {data.tips.map((tip, index) => (
              <div key={index} className="flex items-start">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-sm text-gray-700">{tip}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

interface TransportOptionCardProps {
  option: TransportOption;
  index: number;
  variant: 'arrival' | 'local';
}

const TransportOptionCard: React.FC<TransportOptionCardProps> = ({
  option,
  index,
  variant,
}) => {
  const getTypeIcon = (type: TransportOption['type']) => {
    const icons = {
      flight: 'fas fa-plane',
      train: 'fas fa-train',
      bus: 'fas fa-bus',
      taxi: 'fas fa-taxi',
      metro: 'fas fa-subway',
      walking: 'fas fa-walking',
      bike: 'fas fa-bicycle',
    };
    return icons[type] || 'fas fa-car';
  };

  const getTypeColor = (type: TransportOption['type']) => {
    const colors = {
      flight: 'bg-blue-500',
      train: 'bg-green-500',
      bus: 'bg-orange-500',
      taxi: 'bg-yellow-500',
      metro: 'bg-purple-500',
      walking: 'bg-gray-500',
      bike: 'bg-emerald-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <motion.div
      className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-sm transition-shadow"
      initial={{ opacity: 0, x: variant === 'arrival' ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div className="flex items-start">
        <div className={`w-8 h-8 ${getTypeColor(option.type)} rounded-lg flex items-center justify-center mr-3 flex-shrink-0`}>
          <i className={`${getTypeIcon(option.type)} text-white text-sm`}></i>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{option.name}</h4>
          <p className="text-sm text-gray-600 mb-2">{option.description}</p>
          
          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
            {option.cost && (
              <div className="flex items-center">
                <i className="fas fa-tag mr-1"></i>
                <span>{option.cost}</span>
              </div>
            )}
            {option.duration && (
              <div className="flex items-center">
                <i className="fas fa-clock mr-1"></i>
                <span>{option.duration}</span>
              </div>
            )}
            {option.frequency && (
              <div className="flex items-center">
                <i className="fas fa-repeat mr-1"></i>
                <span>{option.frequency}</span>
              </div>
            )}
          </div>

          {option.tips && option.tips.length > 0 && (
            <div className="mt-2">
              {option.tips.map((tip, tipIndex) => (
                <div key={tipIndex} className="flex items-start mt-1">
                  <i className="fas fa-info-circle text-blue-400 text-xs mr-2 mt-0.5"></i>
                  <span className="text-xs text-gray-600">{tip}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface RouteCardProps {
  route: RouteInfo;
  index: number;
}

const RouteCard: React.FC<RouteCardProps> = ({
  route,
  index,
}) => {
  return (
    <motion.div
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div className="flex items-center mb-4">
        <div className="flex items-center flex-1">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <div className="flex-1 h-0.5 bg-gray-300 mx-3"></div>
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-900">{route.from}</span>
          <i className="fas fa-arrow-right text-gray-400 mx-3"></i>
          <span className="text-sm font-medium text-gray-900">{route.to}</span>
        </div>
        
        {route.estimatedTime && (
          <div className="flex items-center text-sm text-gray-600">
            <i className="fas fa-clock mr-1"></i>
            <span>{route.estimatedTime}</span>
          </div>
        )}
      </div>

      {route.estimatedCost && (
        <div className="flex items-center mb-4">
          <i className="fas fa-tag text-gray-400 text-sm mr-2"></i>
          <span className="text-sm text-gray-600">预计费用: ¥{route.estimatedCost}</span>
        </div>
      )}

      {route.options && route.options.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-800 mb-2">交通选择</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {route.options.map((option, optionIndex) => (
              <div
                key={optionIndex}
                className={`p-2 rounded-lg border ${
                  route.recommendedOption === option.name
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center">
                  <i className={`${getTypeIcon(option.type)} text-gray-600 text-xs mr-2`}></i>
                  <span className="text-sm font-medium text-gray-900">{option.name}</span>
                  {route.recommendedOption === option.name && (
                    <span className="ml-auto text-xs text-blue-600 font-medium">推荐</span>
                  )}
                </div>
                {option.cost && (
                  <div className="text-xs text-gray-600 mt-1">{option.cost}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

// 辅助函数
const getTypeIcon = (type: TransportOption['type']) => {
  const icons = {
    flight: 'fas fa-plane',
    train: 'fas fa-train',
    bus: 'fas fa-bus',
    taxi: 'fas fa-taxi',
    metro: 'fas fa-subway',
    walking: 'fas fa-walking',
    bike: 'fas fa-bicycle',
  };
  return icons[type] || 'fas fa-car';
};
