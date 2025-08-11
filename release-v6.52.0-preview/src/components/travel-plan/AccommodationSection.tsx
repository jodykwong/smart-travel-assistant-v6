/**
 * 智游助手v5.0 - 住宿推荐组件
 * 专门展示住宿相关信息的独立组件
 */

import React from 'react';
import { motion } from 'framer-motion';
import { AccommodationData, AccommodationOption } from '../../types/travel-plan';

interface AccommodationSectionProps {
  data: AccommodationData;
  className?: string;
}

export const AccommodationSection: React.FC<AccommodationSectionProps> = ({
  data,
  className = '',
}) => {
  return (
    <motion.div
      id="accommodation"
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 }}
    >
      {/* 标题区域 */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
          <i className="fas fa-bed text-white text-lg"></i>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">住宿推荐</h2>
          <p className="text-sm text-gray-600">精选酒店和住宿建议</p>
        </div>
      </div>

      {/* 概览信息 */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
          <p className="text-gray-700 leading-relaxed">{data.overview}</p>
        </div>
      </div>

      {/* 住宿推荐列表 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">推荐住宿</h3>
        <div className="space-y-4">
          {data.recommendations.map((accommodation, index) => (
            <AccommodationCard
              key={index}
              accommodation={accommodation}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* 预订建议和预算建议 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
          <div className="flex items-center mb-3">
            <i className="fas fa-hotel text-green-600 text-lg mr-3"></i>
            <h4 className="font-bold text-gray-900">预订建议</h4>
          </div>
          <div className="space-y-2">
            {data.bookingTips.map((tip, index) => (
              <div key={index} className="flex items-start">
                <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-sm text-gray-700">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
          <div className="flex items-center mb-3">
            <i className="fas fa-calculator text-blue-600 text-lg mr-3"></i>
            <h4 className="font-bold text-gray-900">预算建议</h4>
          </div>
          <p className="text-sm text-gray-700">{data.budgetAdvice}</p>
          
          {data.seasonalConsiderations && data.seasonalConsiderations.length > 0 && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-800 mb-2">季节性考虑</h5>
              <div className="space-y-1">
                {data.seasonalConsiderations.map((consideration, index) => (
                  <div key={index} className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                    <span className="text-xs text-gray-600">{consideration}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

interface AccommodationCardProps {
  accommodation: AccommodationOption;
  index: number;
}

const AccommodationCard: React.FC<AccommodationCardProps> = ({
  accommodation,
  index,
}) => {
  const getTypeIcon = (type: AccommodationOption['type']) => {
    const icons = {
      hotel: 'fas fa-building',
      hostel: 'fas fa-bed',
      apartment: 'fas fa-home',
      resort: 'fas fa-umbrella-beach',
      guesthouse: 'fas fa-house-user',
    };
    return icons[type] || 'fas fa-building';
  };

  const getTypeColor = (type: AccommodationOption['type']) => {
    const colors = {
      hotel: 'bg-blue-500',
      hostel: 'bg-green-500',
      apartment: 'bg-purple-500',
      resort: 'bg-orange-500',
      guesthouse: 'bg-pink-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <motion.div
      className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <div className={`w-10 h-10 ${getTypeColor(accommodation.type)} rounded-lg flex items-center justify-center mr-3`}>
            <i className={`${getTypeIcon(accommodation.type)} text-white text-sm`}></i>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{accommodation.name}</h4>
            <p className="text-sm text-gray-600 capitalize">{accommodation.type}</p>
          </div>
        </div>
        
        {accommodation.rating && (
          <div className="flex items-center">
            <i className="fas fa-star text-yellow-400 text-sm mr-1"></i>
            <span className="text-sm font-medium text-gray-700">{accommodation.rating}</span>
          </div>
        )}
      </div>

      {accommodation.address && (
        <div className="flex items-center mb-3">
          <i className="fas fa-map-marker-alt text-gray-400 text-sm mr-2"></i>
          <span className="text-sm text-gray-600">{accommodation.address}</span>
        </div>
      )}

      {accommodation.pricePerNight && (
        <div className="flex items-center mb-3">
          <i className="fas fa-tag text-gray-400 text-sm mr-2"></i>
          <span className="text-sm text-gray-600">
            ¥{accommodation.pricePerNight}/晚 ({accommodation.priceRange})
          </span>
        </div>
      )}

      {accommodation.amenities && accommodation.amenities.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-gray-800 mb-2">设施服务</h5>
          <div className="flex flex-wrap gap-2">
            {accommodation.amenities.slice(0, 4).map((amenity, amenityIndex) => (
              <span
                key={amenityIndex}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
              >
                {amenity}
              </span>
            ))}
            {accommodation.amenities.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                +{accommodation.amenities.length - 4}更多
              </span>
            )}
          </div>
        </div>
      )}

      {accommodation.bookingAdvice && (
        <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
          <div className="flex items-start">
            <i className="fas fa-lightbulb text-green-600 text-sm mr-2 mt-0.5"></i>
            <span className="text-sm text-green-700">{accommodation.bookingAdvice}</span>
          </div>
        </div>
      )}

      {accommodation.nearbyAttractions && accommodation.nearbyAttractions.length > 0 && (
        <div className="mt-4">
          <h5 className="text-sm font-medium text-gray-800 mb-2">周边景点</h5>
          <div className="space-y-1">
            {accommodation.nearbyAttractions.slice(0, 3).map((attraction, attractionIndex) => (
              <div key={attractionIndex} className="flex items-center">
                <i className="fas fa-map-pin text-gray-400 text-xs mr-2"></i>
                <span className="text-xs text-gray-600">{attraction}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};
