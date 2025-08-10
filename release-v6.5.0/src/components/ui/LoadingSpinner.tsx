/**
 * 智游助手v5.0 - 加载状态组件
 * 提供各种加载状态的视觉反馈
 */

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'pink' | 'blue' | 'gray' | 'white';
  text?: string;
  progress?: number; // 0-100
  showProgress?: boolean;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'pink',
  text,
  progress,
  showProgress = false,
  className = '',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'lg':
        return 'w-8 h-8';
      case 'xl':
        return 'w-12 h-12';
      default:
        return 'w-6 h-6';
    }
  };

  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'border-blue-600';
      case 'gray':
        return 'border-gray-600';
      case 'white':
        return 'border-white';
      default:
        return 'border-pink-600';
    }
  };

  const getTextSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'text-xs';
      case 'lg':
        return 'text-base';
      case 'xl':
        return 'text-lg';
      default:
        return 'text-sm';
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* 旋转加载器 */}
      <motion.div
        className={`${getSizeClasses()} border-2 ${getColorClasses()} border-t-transparent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* 进度条 */}
      {showProgress && typeof progress === 'number' && (
        <div className="mt-3 w-full max-w-xs">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>进度</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-pink-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
        </div>
      )}

      {/* 加载文本 */}
      {text && (
        <motion.p
          className={`mt-2 text-gray-600 ${getTextSizeClasses()} text-center`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
};

// 脉冲加载器组件
export const PulseLoader: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`flex space-x-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-pink-600 rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.7, 1, 0.7],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};

// 骨架屏加载器
export const SkeletonLoader: React.FC<{ 
  lines?: number; 
  className?: string;
  height?: string;
}> = ({ 
  lines = 3, 
  className = '',
  height = 'h-4'
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          className={`bg-gray-200 rounded ${height} ${i < lines - 1 ? 'mb-2' : ''}`}
          style={{
            width: i === lines - 1 ? '75%' : '100%',
          }}
        />
      ))}
    </div>
  );
};

// 卡片加载器
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      <div className="bg-gray-200 rounded-lg h-48 mb-4" />
      <div className="space-y-2">
        <div className="bg-gray-200 rounded h-4 w-3/4" />
        <div className="bg-gray-200 rounded h-4 w-1/2" />
        <div className="bg-gray-200 rounded h-4 w-5/6" />
      </div>
    </div>
  );
};

export default LoadingSpinner;
