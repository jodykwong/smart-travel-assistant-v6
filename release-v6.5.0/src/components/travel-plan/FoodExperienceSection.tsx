/**
 * 智游助手v5.0 - 美食体验组件
 * 专门展示美食相关信息的独立组件
 */

import React from 'react';
import { motion } from 'framer-motion';
import { FoodExperienceData, FoodOption, FoodDistrict } from '../../types/travel-plan';

interface FoodExperienceSectionProps {
  data: FoodExperienceData;
  className?: string;
}

export const FoodExperienceSection: React.FC<FoodExperienceSectionProps> = ({
  data,
  className = '',
}) => {
  return (
    <motion.div
      id="food"
      className={`bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-shadow duration-300 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
    >
      {/* 标题区域 */}
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
          <i className="fas fa-utensils text-white text-lg"></i>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">美食体验</h2>
          <p className="text-sm text-gray-600">当地特色美食和餐厅推荐</p>
        </div>
      </div>

      {/* 概览信息 */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
          <p className="text-gray-700 leading-relaxed">{data.overview}</p>
        </div>
      </div>

      {/* 特色美食 */}
      {data.specialties && data.specialties.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">必尝特色</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.specialties.map((specialty, index) => (
              <motion.div
                key={index}
                className="bg-gradient-to-br from-orange-50 to-red-50 p-3 rounded-lg border border-orange-100 text-center"
                whileHover={{ scale: 1.02 }}
                transition={{ duration: 0.2 }}
              >
                <span className="text-sm font-medium text-orange-800">{specialty}</span>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* 推荐餐厅 */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">推荐餐厅</h3>
        <div className="space-y-4">
          {data.recommendedRestaurants.map((restaurant, index) => (
            <RestaurantCard
              key={index}
              restaurant={restaurant}
              index={index}
            />
          ))}
        </div>
      </div>

      {/* 美食街区 */}
      {data.foodDistricts && data.foodDistricts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">美食街区</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {data.foodDistricts.map((district, index) => (
              <FoodDistrictCard
                key={index}
                district={district}
                index={index}
              />
            ))}
          </div>
        </div>
      )}

      {/* 美食贴士和饮食注意事项 */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl border border-yellow-100">
          <div className="flex items-center mb-3">
            <i className="fas fa-lightbulb text-yellow-600 text-lg mr-3"></i>
            <h4 className="font-bold text-gray-900">美食贴士</h4>
          </div>
          <div className="space-y-2">
            {data.localTips.map((tip, index) => (
              <div key={index} className="flex items-start">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                <span className="text-sm text-gray-700">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        {data.dietaryConsiderations && data.dietaryConsiderations.length > 0 && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
            <div className="flex items-center mb-3">
              <i className="fas fa-leaf text-green-600 text-lg mr-3"></i>
              <h4 className="font-bold text-gray-900">饮食注意</h4>
            </div>
            <div className="space-y-2">
              {data.dietaryConsiderations.map((consideration, index) => (
                <div key={index} className="flex items-start">
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  <span className="text-sm text-gray-700">{consideration}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

interface RestaurantCardProps {
  restaurant: FoodOption;
  index: number;
}

const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  index,
}) => {
  const getTypeIcon = (type: FoodOption['type']) => {
    const icons = {
      restaurant: 'fas fa-utensils',
      cafe: 'fas fa-coffee',
      bar: 'fas fa-cocktail',
      street_food: 'fas fa-hamburger',
      market: 'fas fa-store',
    };
    return icons[type] || 'fas fa-utensils';
  };

  const getTypeColor = (type: FoodOption['type']) => {
    const colors = {
      restaurant: 'bg-blue-500',
      cafe: 'bg-amber-600',
      bar: 'bg-purple-500',
      street_food: 'bg-orange-500',
      market: 'bg-green-500',
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
          <div className={`w-10 h-10 ${getTypeColor(restaurant.type)} rounded-lg flex items-center justify-center mr-3`}>
            <i className={`${getTypeIcon(restaurant.type)} text-white text-sm`}></i>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{restaurant.name}</h4>
            <p className="text-sm text-gray-600">{restaurant.cuisine}</p>
          </div>
        </div>
        
        {restaurant.rating && (
          <div className="flex items-center">
            <i className="fas fa-star text-yellow-400 text-sm mr-1"></i>
            <span className="text-sm font-medium text-gray-700">{restaurant.rating}</span>
          </div>
        )}
      </div>

      {restaurant.address && (
        <div className="flex items-center mb-3">
          <i className="fas fa-map-marker-alt text-gray-400 text-sm mr-2"></i>
          <span className="text-sm text-gray-600">{restaurant.address}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        {restaurant.averagePrice && (
          <div className="flex items-center">
            <i className="fas fa-tag text-gray-400 text-sm mr-2"></i>
            <span className="text-sm text-gray-600">
              人均¥{restaurant.averagePrice} ({restaurant.priceRange})
            </span>
          </div>
        )}
        
        {restaurant.openingHours && (
          <div className="flex items-center">
            <i className="fas fa-clock text-gray-400 text-sm mr-2"></i>
            <span className="text-sm text-gray-600">{restaurant.openingHours}</span>
          </div>
        )}
      </div>

      {restaurant.mustTryDishes && restaurant.mustTryDishes.length > 0 && (
        <div className="mb-3">
          <h5 className="text-sm font-medium text-gray-800 mb-2">必点菜品</h5>
          <div className="flex flex-wrap gap-2">
            {restaurant.mustTryDishes.slice(0, 4).map((dish, dishIndex) => (
              <span
                key={dishIndex}
                className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded-md"
              >
                {dish}
              </span>
            ))}
            {restaurant.mustTryDishes.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-md">
                +{restaurant.mustTryDishes.length - 4}更多
              </span>
            )}
          </div>
        </div>
      )}

      {restaurant.specialties && restaurant.specialties.length > 0 && (
        <div className="mt-4">
          <h5 className="text-sm font-medium text-gray-800 mb-2">特色推荐</h5>
          <div className="space-y-1">
            {restaurant.specialties.slice(0, 3).map((specialty, specialtyIndex) => (
              <div key={specialtyIndex} className="flex items-center">
                <i className="fas fa-star text-yellow-400 text-xs mr-2"></i>
                <span className="text-xs text-gray-600">{specialty}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

interface FoodDistrictCardProps {
  district: FoodDistrict;
  index: number;
}

const FoodDistrictCard: React.FC<FoodDistrictCardProps> = ({
  district,
  index,
}) => {
  return (
    <motion.div
      className="bg-gradient-to-br from-red-50 to-pink-50 p-6 rounded-xl border border-red-100 hover:shadow-md transition-shadow"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <div className="flex items-center mb-3">
        <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center mr-3">
          <i className="fas fa-map-marker-alt text-white text-sm"></i>
        </div>
        <h4 className="font-bold text-gray-900">{district.name}</h4>
      </div>
      
      <p className="text-sm text-gray-700 mb-3">{district.description}</p>
      
      {district.highlights && district.highlights.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-800 mb-2">特色亮点</h5>
          <div className="space-y-1">
            {district.highlights.map((highlight, highlightIndex) => (
              <div key={highlightIndex} className="flex items-start">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                <span className="text-xs text-gray-600">{highlight}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {district.bestTimeToVisit && (
        <div className="mt-3 p-2 bg-red-100 rounded-lg">
          <div className="flex items-center">
            <i className="fas fa-clock text-red-600 text-xs mr-2"></i>
            <span className="text-xs text-red-700">最佳时间: {district.bestTimeToVisit}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
};
