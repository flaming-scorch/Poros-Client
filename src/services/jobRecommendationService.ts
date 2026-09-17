import AsyncStorage from '@react-native-async-storage/async-storage';
import { JobListing, UserJobPreferences, JobType } from '../types';

/**
 * Service for fetching and filtering job recommendations from GitHub repositories
 * Data sources:
 * - Internships: SimplifyJobs/Summer2026-Internships
 * - New Grad: SimplifyJobs/New-Grad-Positions
 */

const GITHUB_URLS = {
  internship: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json',
  newgrad: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json',
};


interface GitHubJob {
  company_name: string;
  title: string;
  locations: string[];
  url: string;
  date_posted: number;
  sponsorship: string;
  active: boolean;
  terms: string[];
  id: string;
}

export class JobRecommendationService {
  private static CACHE_KEY_PREFIX = 'job_recommendations_';

  private static CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

  /**
     * Get job recommendations based on user preferences
     */
  static async getRecommendations(
    preferences: UserJobPreferences,
  ): Promise<JobListing[]> {
    const allJobs = await this.fetchJobData(preferences.jobType);
    const filteredJobs = this.filterJobs(allJobs, preferences);

    // Sort by date_posted descending (newest first)
    return filteredJobs.sort((a, b) => {
      const dateA = new Date(a.date_posted).getTime();
      const dateB = new Date(b.date_posted).getTime();
      return dateB - dateA;
    });
  }

  /**
     * Fetch job data from GitHub with caching
     */
  private static async fetchJobData(
    jobType: JobType,
  ): Promise<JobListing[]> {
    // Check cache first
    const cached = await this.getCachedData(jobType);
    if (cached) {
      return cached;
    }

    // Fetch from GitHub
    const url = GITHUB_URLS[jobType];
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch job data: ${response.statusText}`);
    }

    const rawData: GitHubJob[] = await response.json();

    // Map GitHub data to JobListing format
    const data: JobListing[] = rawData.map(job => ({
      company: job.company_name,
      title: job.title,
      locations: job.locations,
      url: job.url,
      date_posted: new Date(job.date_posted * 1000).toISOString(),
      sponsorship: job.sponsorship,
      is_active: job.active,
      terms: job.terms,
      categories: this.deriveCategories(job.title),
    }));

    // Cache the data
    await this.cacheData(jobType, data);

    return data;
  }

  /**
   * Derive categories from job title
   */
  private static deriveCategories(title: string): string[] {
    const categories: string[] = [];
    const lowerTitle = title.toLowerCase();

    if (lowerTitle.includes('software') || lowerTitle.includes('developer') || lowerTitle.includes('engineer') || lowerTitle.includes('full stack') || lowerTitle.includes('backend') || lowerTitle.includes('frontend')) {
      categories.push('Software Engineering');
    }
    if (lowerTitle.includes('data') || lowerTitle.includes('analyst') || lowerTitle.includes('scientist') || lowerTitle.includes('learning')) {
      categories.push('Data Science');
    }
    if (lowerTitle.includes('product') || lowerTitle.includes('manager') || lowerTitle.includes('pm')) {
      categories.push('Product Management');
    }
    if (lowerTitle.includes('security') || lowerTitle.includes('cyber')) {
      categories.push('Cybersecurity');
    }
    if (lowerTitle.includes('hardware') || lowerTitle.includes('embedded') || lowerTitle.includes('electrical')) {
      categories.push('Hardware Engineering');
    }
    if (lowerTitle.includes('quant') || lowerTitle.includes('trading') || lowerTitle.includes('research')) {
      categories.push('Quantitative Finance');
    }

    // Default category if none matched
    if (categories.length === 0) {
      categories.push('Other');
    }

    return categories;
  }

  /**
     * Filter jobs based on user preferences
     */
  private static filterJobs(
    jobs: JobListing[],
    preferences: UserJobPreferences,
  ): JobListing[] {
    return jobs.filter((job) => {
      // Only active jobs
      if (!job.is_active) return false;

      // Match categories (if specified)
      const hasMatchingCategory = preferences.categories.length === 0
        || job.categories.some((cat) => preferences.categories.includes(cat));

      // Match location (if specified)
      const hasMatchingLocation = !preferences.locations
        || preferences.locations.length === 0
        || job.locations.some((loc) => preferences.locations!.includes(loc) || loc === 'Remote');

      // Match sponsorship (if required)
      const hasSponsorship = !preferences.requiresSponsorship
        || job.sponsorship === 'Offers Sponsorship';

      return hasMatchingCategory && hasMatchingLocation && hasSponsorship;
    });
  }

  /**
     * Get cached job data if available and not expired
     */
  private static async getCachedData(
    jobType: JobType,
  ): Promise<JobListing[] | null> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${jobType}`;
      const cached = await AsyncStorage.getItem(cacheKey);

      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < this.CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  /**
     * Cache job data with timestamp
     */
  private static async cacheData(
    jobType: JobType,
    data: JobListing[],
  ): Promise<void> {
    try {
      const cacheKey = `${this.CACHE_KEY_PREFIX}${jobType}`;
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        }),
      );
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }

  /**
     * Clear cached job data
     */
  static async clearCache(jobType?: JobType): Promise<void> {
    try {
      if (jobType) {
        const cacheKey = `${this.CACHE_KEY_PREFIX}${jobType}`;
        await AsyncStorage.removeItem(cacheKey);
      } else {
        // Clear all job caches
        await AsyncStorage.removeItem(`${this.CACHE_KEY_PREFIX}internship`);
        await AsyncStorage.removeItem(`${this.CACHE_KEY_PREFIX}newgrad`);
      }
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
     * Get available job categories from the data
     */
  static async getAvailableCategories(jobType: JobType): Promise<string[]> {
    const jobs = await this.fetchJobData(jobType);
    const categoriesSet = new Set<string>();

    jobs.forEach((job) => {
      job.categories.forEach((cat) => categoriesSet.add(cat));
    });

    return Array.from(categoriesSet).sort();
  }

  /**
     * Get available locations from the data
     */
  static async getAvailableLocations(jobType: JobType): Promise<string[]> {
    const jobs = await this.fetchJobData(jobType);
    const locationsSet = new Set<string>();

    jobs.forEach((job) => {
      job.locations.forEach((loc) => locationsSet.add(loc));
    });

    return Array.from(locationsSet).sort();
  }
}
