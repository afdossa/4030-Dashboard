
export interface RealEstateSale {
  id: number;
  serial_number: number;
  list_year: number;
  date_recorded: string;
  town: string;
  address: string;
  assessed_value: number;
  sale_amount: number;
  sales_ratio: number;
  property_type: 'Residential' | 'Commercial' | 'Vacant Land' | 'Apartments' | 'Industrial';
  residential_type: 'Single Family' | 'Condo' | 'Two Family' | 'Three Family' | 'Four Family' | 'NA';
}

export type ChatRole = 'user' | 'model';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ChartSize = 'small' | 'medium' | 'large' | 'full';
export type ChartName = 'bar' | 'line' | 'scatter' | 'bar2';

export interface ChartInfo {
  size: ChartSize;
  title: string;
}

export type ChartConfig = Record<ChartName, ChartInfo>;

export interface FilterState {
  towns: string[];
  propertyTypes: string[];
}
