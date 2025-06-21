import React, { useState } from 'react';
import Select, { StylesConfig, components } from 'react-select';

interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

interface MobileSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  placeholder?: string;
}

export function MobileSelect({
  options,
  value,
  onChange,
  label,
  className = '',
  placeholder = 'Select an option'
}: MobileSelectProps) {
  // Find the selected option
  const selectedOption = options.find(option => option.value === value);
  
  // Custom styles for react-select
  const customStyles: StylesConfig<Option, false> = {
    control: (provided, state) => ({
      ...provided,
      borderColor: state.isFocused ? '#c1902f' : '#e5e7eb',
      borderWidth: '1px',
      boxShadow: state.isFocused ? '0 0 0 2px rgba(193, 144, 47, 0.2)' : 'none',
      '&:hover': {
        borderColor: state.isFocused ? '#c1902f' : '#d1d5db',
      },
      padding: '4px 8px',
      fontSize: '16px', // Prevent iOS zoom
      minHeight: '44px', // Better touch target for mobile
      '@media (min-width: 768px)': {
        minHeight: '52px', // Larger touch target for iPad
        padding: '6px 12px',
        fontSize: '17px',
      },
      '@media (min-width: 1024px)': {
        minHeight: '48px', // Standard size for desktop
        padding: '4px 8px',
        fontSize: '16px',
      },
      borderRadius: '6px',
      transition: 'all 0.2s ease',
      width: '100%', // Ensure full width
    }),
    menu: (provided) => ({
      ...provided,
      marginTop: '4px',
      borderRadius: '8px',
      overflow: 'hidden',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 50,
      border: '1px solid #e5e7eb',
      '@media (min-width: 768px)': {
        width: 'auto',
        minWidth: '220px', // Match the width from MultiSelectActionBar
      },
    }),
    menuList: (provided) => ({
      ...provided,
      padding: '0',
      maxHeight: '300px',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#c1902f' : state.isFocused ? 'rgba(193, 144, 47, 0.1)' : 'white',
      color: state.isSelected ? 'white' : state.isDisabled ? '#9ca3af' : '#111827',
      padding: '12px 16px',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      fontSize: '16px',
      fontWeight: state.isSelected ? '500' : '400',
      transition: 'background-color 0.15s ease',
      '&:active': {
        backgroundColor: state.isDisabled ? 'white' : state.isSelected ? '#c1902f' : 'rgba(193, 144, 47, 0.2)',
      },
      borderBottom: '1px solid #f3f4f6',
      '&:last-child': {
        borderBottom: 'none',
      },
      '@media (min-width: 768px)': {
        padding: '16px 20px', // Larger padding for iPad
        fontSize: '17px', // Slightly larger text for iPad
      },
      opacity: state.isDisabled ? 0.6 : 1,
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#111827',
      fontSize: '16px',
      fontWeight: '500',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#9ca3af',
      fontSize: '16px',
    }),
    indicatorSeparator: () => ({
      display: 'none',
    }),
    dropdownIndicator: (provided, state) => ({
      ...provided,
      color: state.isFocused ? '#c1902f' : '#9ca3af',
      padding: '0 8px',
      transition: 'transform 0.2s ease, color 0.2s ease',
      transform: state.selectProps.menuIsOpen ? 'rotate(180deg)' : 'rotate(0)',
      '&:hover': {
        color: '#c1902f',
      },
    }),
    valueContainer: (provided) => ({
      ...provided,
      padding: '2px 8px',
    }),
  };

  // Custom dropdown indicator (chevron)
  const DropdownIndicator = (props: any) => {
    return (
      <components.DropdownIndicator {...props}>
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
        </svg>
      </components.DropdownIndicator>
    );
  };

  // Custom Menu component to add animation
  const Menu = (props: any) => {
    return (
      <components.Menu {...props} className="animate-dropdown">
        {props.children}
      </components.Menu>
    );
  };

  // Handle change
  const handleChange = (selectedOption: Option | null) => {
    if (selectedOption) {
      onChange(selectedOption.value);
    }
  };

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-base font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <style>{`
        @keyframes dropdownFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-dropdown {
          animation: dropdownFadeIn 0.2s ease-out;
        }
      `}</style>
      
      <Select
        options={options}
        value={selectedOption}
        onChange={handleChange as any}
        placeholder={placeholder}
        styles={customStyles}
        components={{ DropdownIndicator, Menu }}
        isSearchable={false}
        menuPosition="fixed"
        menuPlacement="auto"
        classNamePrefix="mobile-select"
        closeMenuOnScroll={false}
        isOptionDisabled={(option: Option) => option.disabled || false}
      />
    </div>
  );
}
