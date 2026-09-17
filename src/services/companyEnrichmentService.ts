import apiService from './apiService';
import { searchCompanyEvents, searchCompanyCourses } from './tavilyService';
import { Event, Course, ChecklistItem } from '../types';

export interface EnrichedCompanyData {
  name: string;
  industry: string;
  logo: string;
  companyInfo: {
    size: string;
    culture: string[];
    benefits: string[];
    interviewProcess: string[];
  };
  applicationTimeline: {
    internship: string;
    fullTime: string;
    contractor: string;
    coop: string;
  };
  events: Event[];
  recommendedCourses: Course[];
  preparationChecklist: ChecklistItem[];
}

export async function enrichCompanyData(companyName: string): Promise<EnrichedCompanyData> {
  try {
    const authHeaders = await apiService.getAuthHeaders();
    const [profileResponse, events, courses] = await Promise.all([
      fetch(`${apiService.getBaseURL()}/api/ai/company-profile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ companyName }),
      }),
      searchCompanyEvents(companyName),
      searchCompanyCourses(companyName),
    ]);

    const profile = await profileResponse.json() as
      | Omit<EnrichedCompanyData, 'events' | 'recommendedCourses'>
      | { error: string };

    if (!profileResponse.ok || 'error' in profile) {
      throw new Error('error' in profile ? profile.error : 'Company enrichment failed');
    }

    return {
      ...profile,
      events,
      recommendedCourses: courses,
    };
  } catch (error) {
    console.error('Error enriching company data:', error);
    // eslint-disable-next-line no-use-before-define
    const fallback = generateFallbackCompanyData(companyName);

    try {
      const [events, courses] = await Promise.all([
        searchCompanyEvents(companyName),
        searchCompanyCourses(companyName),
      ]);
      fallback.events = events;
      fallback.recommendedCourses = courses;
    } catch (researchError) {
      console.error('Error fetching fallback research:', researchError);
    }

    return fallback;
  }
}

export const generateFallbackCompanyData = (companyName: string): EnrichedCompanyData => ({
  name: companyName,
  industry: 'Information not available',
  logo: '🏢',
  companyInfo: {
    size: 'Information not available',
    culture: [],
    benefits: [],
    interviewProcess: [],
  },
  applicationTimeline: {
    internship: 'Check the company careers site',
    fullTime: 'Check the company careers site',
    contractor: 'Check the company careers site',
    coop: 'Check the company careers site',
  },
  events: [],
  recommendedCourses: [],
  preparationChecklist: [
    {
      id: '1',
      title: `Research ${companyName}`,
      description: 'Review the official careers site, products, mission, and recent engineering work.',
      completed: false,
      category: 'Culture Study',
    },
    {
      id: '2',
      title: 'Prepare project examples',
      description: 'Select two projects that demonstrate the skills required by the role.',
      completed: false,
      category: 'Portfolio',
    },
    {
      id: '3',
      title: 'Practice role-specific interviews',
      description: 'Use the published job requirements to guide technical and behavioral practice.',
      completed: false,
      category: 'Interview Prep',
    },
  ],
});
