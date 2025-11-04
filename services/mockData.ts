
import type { RealEstateSale } from '../types';

const TOWNS = ['Brookfield', 'Danbury', 'Newtown', 'Ridgefield', 'Bethel', 'New Milford', 'Sherman'];
const PROPERTY_TYPES: RealEstateSale['property_type'][] = ['Residential', 'Commercial', 'Vacant Land', 'Apartments', 'Industrial'];
const RESIDENTIAL_TYPES: RealEstateSale['residential_type'][] = ['Single Family', 'Condo', 'Two Family', 'Three Family', 'NA'];

const getRandomElement = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getRandomNumber = (min: number, max: number) => Math.random() * (max - min) + min;

export const generateMockData = (count: number): RealEstateSale[] => {
  const data: RealEstateSale[] = [];
  for (let i = 0; i < count; i++) {
    const assessed_value = getRandomNumber(100000, 800000);
    const sale_amount = assessed_value * getRandomNumber(0.8, 1.3);
    const property_type = getRandomElement(PROPERTY_TYPES);
    
    data.push({
      id: i + 1,
      serial_number: 10000 + i,
      list_year: Math.floor(getRandomNumber(2015, 2024)),
      date_recorded: new Date(getRandomNumber(new Date(2015, 0, 1).getTime(), new Date().getTime())).toISOString().split('T')[0],
      town: getRandomElement(TOWNS),
      address: `${Math.floor(getRandomNumber(1, 500))} Main St`,
      assessed_value: parseFloat(assessed_value.toFixed(2)),
      sale_amount: parseFloat(sale_amount.toFixed(2)),
      sales_ratio: parseFloat((sale_amount / assessed_value).toFixed(4)),
      property_type: property_type,
      residential_type: property_type === 'Residential' ? getRandomElement(RESIDENTIAL_TYPES) : 'NA',
    });
  }
  return data;
};
