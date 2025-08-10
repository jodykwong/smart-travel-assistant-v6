/**
 * 智游助手v5.0 - 错误提示组件
 * 提供友好的错误信息显示和重试功能
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ErrorAlertProps {
  error: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  retryable?: boolean;
  type?: 'error' | 'warning' | 'info';
  title?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onRetry,
  onDismiss,
  retryable = false,
  type = 'error',
  title,
}) => {
  if (!error) return null;

  const getAlertStyles = () => {
    switch (type) {
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-600',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          iconSymbol: '⚠️',
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-600',
          title: 'text-blue-800',
          message: 'text-blue-700',
          iconSymbol: 'ℹ️',
        };
      default:
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          iconSymbol: '❌',
        };
    }
  };

  const styles = getAlertStyles();

  const getErrorTitle = () => {
    if (title) return title;
    
    switch (type) {
      case 'warning':
        return '注意';
      case 'info':
        return '提示';
      default:
        return '出现错误';
    }
  };

  const getFriendlyErrorMessage = (errorMessage: string) => {
    // 将技术错误转换为用户友好的消息
    if (errorMessage.includes('timeout') || errorMessage.includes('超时')) {
      return '请求超时，请检查网络连接后重试';
    }
    if (errorMessage.includes('network') || errorMessage.includes('网络')) {
      return '网络连接异常，请检查网络后重试';
    }
    if (errorMessage.includes('API') || errorMessage.includes('服务')) {
      return '服务暂时不可用，请稍后重试';
    }
    if (errorMessage.includes('401') || errorMessage.includes('unauthorized')) {
      return '身份验证失败，请重新登录';
    }
    if (errorMessage.includes('403') || errorMessage.includes('forbidden')) {
      return '没有权限执行此操作';
    }
    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      return '请求的资源不存在';
    }
    if (errorMessage.includes('500') || errorMessage.includes('internal')) {
      return '服务器内部错误，请稍后重试';
    }
    
    // 如果是已经友好的消息，直接返回
    return errorMessage;
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className={`border rounded-lg p-4 ${styles.container} shadow-sm`}
      >
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            <span className="text-xl">{styles.iconSymbol}</span>
          </div>
          
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${styles.title}`}>
              {getErrorTitle()}
            </h3>
            <div className={`mt-1 text-sm ${styles.message}`}>
              {getFriendlyErrorMessage(error)}
            </div>
            
            {(retryable || onDismiss) && (
              <div className="mt-3 flex space-x-3">
                {retryable && onRetry && (
                  <button
                    onClick={onRetry}
                    className="bg-white px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                  >
                    <i className="fas fa-redo mr-1"></i>
                    重试
                  </button>
                )}
                
                {onDismiss && (
                  <button
                    onClick={onDismiss}
                    className="bg-white px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors"
                  >
                    <i className="fas fa-times mr-1"></i>
                    关闭
                  </button>
                )}
              </div>
            )}
          </div>
          
          {onDismiss && (
            <div className="ml-auto pl-3">
              <button
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${styles.icon} hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pink-500 transition-colors`}
              >
                <span className="sr-only">关闭</span>
                <i className="fas fa-times text-sm"></i>
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ErrorAlert;
