/**
 * 表单测试页面 - 用于验证表单输入功能
 */

import React from 'react';
import { useForm } from 'react-hook-form';

interface TestFormData {
  destination: string;
  startDate: string;
  endDate: string;
  groupSize: number;
}

export default function TestFormPage() {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<TestFormData>({
    defaultValues: {
      destination: '',
      startDate: '',
      endDate: '',
      groupSize: 2,
    }
  });

  const watchedValues = watch();

  const onSubmit = (data: TestFormData) => {
    console.log('表单提交数据:', data);
    alert('表单提交成功！检查控制台查看数据。');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">表单输入测试</h1>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目的地
            </label>
            <input
              type="text"
              placeholder="输入城市或国家名称"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('destination', { required: '请输入目的地' })}
            />
            {errors.destination && (
              <p className="mt-1 text-sm text-red-600">{errors.destination.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                出发日期
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('startDate', { required: '请选择出发日期' })}
              />
              {errors.startDate && (
                <p className="mt-1 text-sm text-red-600">{errors.startDate.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                返回日期
              </label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register('endDate', { required: '请选择返回日期' })}
              />
              {errors.endDate && (
                <p className="mt-1 text-sm text-red-600">{errors.endDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              旅行人数
            </label>
            <input
              type="number"
              min={1}
              max={20}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              {...register('groupSize', { 
                required: '请输入人数',
                valueAsNumber: true,
                min: { value: 1, message: '人数至少为1' },
                max: { value: 20, message: '人数不能超过20' }
              })}
            />
            {errors.groupSize && (
              <p className="mt-1 text-sm text-red-600">{errors.groupSize.message}</p>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-900 mb-2">实时表单值：</h3>
            <pre className="text-xs text-gray-600">
              {JSON.stringify(watchedValues, null, 2)}
            </pre>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            提交测试
          </button>
        </form>
      </div>
    </div>
  );
}
