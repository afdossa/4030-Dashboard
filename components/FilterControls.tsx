
import React, { useState, useRef, useEffect } from 'react';
import type { FilterState } from '../types';

interface FilterControlsProps {
  towns: string[];
  propertyTypes: string[];
  activeFilters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const FilterDropdown: React.FC<{
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}> = ({ label, options, selected, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (option: string) => {
    const newSelected = selected.includes(option)
      ? selected.filter(item => item !== option)
      : [...selected, option];
    onChange(newSelected);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full md:w-64 bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-orange-500"
      >
        <span className="text-gray-200">{label} ({selected.length > 0 ? selected.length : 'All'})</span>
        <svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {options.map(option => (
            <label key={option} className="flex items-center px-4 py-2 text-gray-200 hover:bg-gray-700/80 cursor-pointer">
              <input
                type="checkbox"
                className="form-checkbox h-4 w-4 bg-gray-700 border-gray-600 rounded text-orange-600 focus:ring-orange-500"
                checked={selected.includes(option)}
                onChange={() => handleSelect(option)}
              />
              <span className="ml-3">{option}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};


const FilterControls: React.FC<FilterControlsProps> = ({ towns, propertyTypes, activeFilters, onFilterChange }) => {
  const handleTownChange = (selectedTowns: string[]) => {
    onFilterChange({ ...activeFilters, towns: selectedTowns });
  };

  const handlePropertyTypeChange = (selectedPropTypes: string[]) => {
    onFilterChange({ ...activeFilters, propertyTypes: selectedPropTypes });
  };
  
  const clearFilters = () => {
    onFilterChange({ towns: [], propertyTypes: [] });
  }

  return (
    <div className="bg-gray-800/30 p-4 rounded-lg flex flex-wrap gap-4 items-center">
      <FilterDropdown
        label="Towns"
        options={towns}
        selected={activeFilters.towns}
        onChange={handleTownChange}
      />
      <FilterDropdown
        label="Property Types"
        options={propertyTypes}
        selected={activeFilters.propertyTypes}
        onChange={handlePropertyTypeChange}
      />
      <button 
        onClick={clearFilters}
        className="px-4 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
        disabled={activeFilters.towns.length === 0 && activeFilters.propertyTypes.length === 0}
      >
        Clear Filters
      </button>
    </div>
  );
};

export default FilterControls;
