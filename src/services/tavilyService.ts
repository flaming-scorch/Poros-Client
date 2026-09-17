import apiService from './apiService';

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

interface TavilyResponse {
  results: TavilySearchResult[];
  query: string;
  error?: string;
}

export interface CompanyEvent {
  id: string;
  title: string;
  type: 'Tech Talk' | 'Workshop' | 'Networking' | 'Info Session';
  date: string;
  description: string;
  registrationLink?: string;
}

export interface CompanyCourse {
  id: string;
  title: string;
  provider: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  skills: string[];
  link: string;
}

async function researchCompany(
  companyName: string,
  kind: 'events' | 'courses',
): Promise<TavilySearchResult[]> {
  const authHeaders = await apiService.getAuthHeaders();
  const response = await fetch(`${apiService.getBaseURL()}/api/ai/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
    },
    body: JSON.stringify({ companyName, kind }),
  });

  const data = await response.json() as TavilyResponse;
  if (!response.ok) {
    throw new Error(data.error || 'Company research failed');
  }

  return data.results || [];
}

export async function searchCompanyEvents(companyName: string): Promise<CompanyEvent[]> {
  try {
    const results = await researchCompany(companyName, 'events');

    return results.slice(0, 3).map((result, index) => {
      const searchableText = `${result.title} ${result.content}`.toLowerCase();
      let type: CompanyEvent['type'] = 'Info Session';

      if (searchableText.includes('tech talk') || searchableText.includes('technical talk')) {
        type = 'Tech Talk';
      } else if (searchableText.includes('workshop') || searchableText.includes('hands-on')) {
        type = 'Workshop';
      } else if (searchableText.includes('networking') || searchableText.includes('mixer')) {
        type = 'Networking';
      }

      const dateMatch = result.content.match(
        /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/i,
      );
      const parsedDate = dateMatch ? new Date(dateMatch[0]) : null;
      const date = parsedDate && !Number.isNaN(parsedDate.getTime())
        ? parsedDate.toISOString().split('T')[0]
        : 'Date not listed';

      return {
        id: `search-event-${index + 1}`,
        title: result.title,
        type,
        date,
        description:
          result.content.substring(0, 200)
          + (result.content.length > 200 ? '...' : ''),
        registrationLink: result.url,
      };
    });
  } catch (error) {
    console.error('Error searching for company events:', error);
    return [];
  }
}

export async function searchCompanyCourses(companyName: string): Promise<CompanyCourse[]> {
  try {
    const results = await researchCompany(companyName, 'courses');

    return results.slice(0, 3).map((result, index) => {
      const searchableText = `${result.title} ${result.content}`.toLowerCase();
      let level: CompanyCourse['level'] = 'Intermediate';

      if (
        searchableText.includes('beginner')
        || searchableText.includes('introduction')
        || searchableText.includes('basics')
      ) {
        level = 'Beginner';
      } else if (
        searchableText.includes('advanced')
        || searchableText.includes('expert')
        || searchableText.includes('master')
      ) {
        level = 'Advanced';
      }

      let provider = 'Online Platform';
      if (result.url.includes('udemy')) provider = 'Udemy';
      else if (result.url.includes('coursera')) provider = 'Coursera';
      else if (result.url.includes('edx')) provider = 'edX';
      else if (result.url.includes('pluralsight')) provider = 'Pluralsight';
      else if (result.url.includes('linkedin')) provider = 'LinkedIn Learning';
      else if (result.url.includes('youtube')) provider = 'YouTube';

      const skills = [
        'python', 'javascript', 'react', 'java', 'sql', 'aws', 'cloud', 'data', 'api', 'web',
      ]
        .filter((skill) => searchableText.includes(skill))
        .map((skill) => skill.charAt(0).toUpperCase() + skill.slice(1))
        .slice(0, 3);

      return {
        id: `search-course-${index + 1}`,
        title:
          result.title.substring(0, 80)
          + (result.title.length > 80 ? '...' : ''),
        provider,
        duration: 'See course page',
        level,
        skills: skills.length ? skills : ['General Skills'],
        link: result.url,
      };
    });
  } catch (error) {
    console.error('Error searching for company courses:', error);
    return [];
  }
}
