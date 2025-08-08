/**
 * 智游助手v6.2 - Checkbox 组件
 */

import React from 'react';

export interface CheckboxProps {
  checked?: boolean;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  name?: string;
  id?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  required = false,
  className = '',
  name,
  id
}) => {
  const baseClasses = 'h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded';
  const disabledClasses = disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer';
  
  return (
    <div className={`flex items-center ${className}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`${baseClasses} ${disabledClasses}`}
        name={name}
        id={id}
      />
      {label && (
        <label 
          htmlFor={id} 
          className={`ml-2 text-sm text-gray-700 ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
