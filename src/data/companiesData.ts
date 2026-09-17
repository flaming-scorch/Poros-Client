import { CompanyRecommendation } from '../types';

export const targetCompanies: CompanyRecommendation[] = [];

/**
 * Merges predefined companies with custom companies from Redux store
 * @param customCompanies - Array of user-created custom companies
 * @returns Combined array of all companies
 */
export const getAllCompanies = (customCompanies: CompanyRecommendation[]): CompanyRecommendation[] => {
  return [...targetCompanies, ...customCompanies];
};