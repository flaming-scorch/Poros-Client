import { targetCompanies } from '../data/companiesData';
import { CompanyMatchResult } from '../types';

/**
 * Smart company matching utility to match user input text with our predefined companies
 */
export class CompanyMatcher {
  private static normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Match a single company name with our predefined companies
   */
  static matchCompany(companyText: string): CompanyMatchResult {
    const normalized = this.normalizeText(companyText);
    let bestMatch: CompanyMatchResult = {
      originalText: companyText,
      confidence: 0,
    };

    for (const company of targetCompanies) {
      const companyNormalized = this.normalizeText(company.name);

      // Exact match
      if (normalized === companyNormalized) {
        return {
          matchedCompanyId: company.id,
          originalText: companyText,
          confidence: 1.0,
        };
      }

      // Check if input contains company name or vice versa
      if (normalized.includes(companyNormalized) || companyNormalized.includes(normalized)) {
        const confidence = Math.max(
          normalized.length / companyNormalized.length,
          companyNormalized.length / normalized.length
        ) * 0.9; // Slightly lower than exact match

        if (confidence > bestMatch.confidence) {
          bestMatch = {
            matchedCompanyId: company.id,
            originalText: companyText,
            confidence,
          };
        }
      }

      // Similarity matching
      const similarity = this.calculateSimilarity(normalized, companyNormalized);
      if (similarity > bestMatch.confidence && similarity >= 0.7) {
        bestMatch = {
          matchedCompanyId: company.id,
          originalText: companyText,
          confidence: similarity,
        };
      }

      // Check common abbreviations/alternatives
      const alternatives = this.getCompanyAlternatives(company.name);
      for (const alt of alternatives) {
        const altNormalized = this.normalizeText(alt);
        if (normalized === altNormalized) {
          return {
            matchedCompanyId: company.id,
            originalText: companyText,
            confidence: 0.95,
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Get alternative names/abbreviations for companies
   */
  private static getCompanyAlternatives(companyName: string): string[] {
    const alternatives: { [key: string]: string[] } = {
      'Meta': ['Facebook', 'FB', 'Meta Platforms'],
      'Google': ['Alphabet', 'GOOGL', 'Google LLC'],
      'Amazon': ['AWS', 'Amazon Web Services', 'AMZN'],
      'Apple': ['AAPL', 'Apple Inc'],
      'TikTok': ['ByteDance', 'Tik Tok', 'TikTok Inc'],
    };

    return alternatives[companyName] || [];
  }

  /**
   * Match multiple company names from comma-separated input
   */
  static matchCompanies(companiesText: string): CompanyMatchResult[] {
    if (!companiesText.trim()) return [];

    const companyNames = companiesText
      .split(',')
      .map(name => name.trim())
      .filter(name => name.length > 0);

    return companyNames.map(name => this.matchCompany(name));
  }

  /**
   * Get matched company IDs from text input with minimum confidence threshold
   */
  static getMatchedCompanyIds(companiesText: string, minConfidence: number = 0.7): string[] {
    const matches = this.matchCompanies(companiesText);
    return matches
      .filter(match => match.matchedCompanyId && match.confidence >= minConfidence)
      .map(match => match.matchedCompanyId!);
  }

  /**
   * Get unmatched company names for future reference
   */
  static getUnmatchedCompanies(companiesText: string, minConfidence: number = 0.7): string[] {
    const matches = this.matchCompanies(companiesText);
    return matches
      .filter(match => !match.matchedCompanyId || match.confidence < minConfidence)
      .map(match => match.originalText);
  }
}