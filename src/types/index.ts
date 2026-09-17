export interface User {
  id: string;
  name: string;
  linkedinProfile?: string;
  university: string;
  major: string;
  graduationYear: number;
  targetCompanies: string[];
  targetRoles: string[];
  targetIndustries: string[];
  targetLocations: string[];
  resumeUri?: string;
  weeklyGoal: number;
  createdAt: string;
}

export type ApplicationStatus = 'Applied' | 'Interview' | 'Offer' | 'Rejected';

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  status: ApplicationStatus;
  appliedDate: string;
  notes?: string;
  jobLink?: string;
  companyLogo?: string;
}

export interface CompanyRecommendation {
  id: string;
  name: string;
  logo: string;
  industry: string;
  isCustom?: boolean; // Flag to identify user-created companies
  applicationTimeline: {
    internship: string;
    fullTime: string;
    contractor: string;
    coop: string;
  };
  events: Event[];
  recommendedCourses: Course[];
  preparationChecklist: ChecklistItem[];
  companyInfo: {
    size: string;
    culture: string[];
    benefits: string[];
    interviewProcess: string[];
  };
}

export interface Event {
  id: string;
  title: string;
  type: 'Tech Talk' | 'Workshop' | 'Networking' | 'Info Session';
  date: string;
  description: string;
  registrationLink?: string;
}

export interface Course {
  id: string;
  title: string;
  provider: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  skills: string[];
  link: string;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  category: 'Interview Prep' | 'Portfolio' | 'Culture Study' | 'Technical Skills';
}

export interface DashboardStats {
  totalApplications: number;
  pendingApplications: number;
  interviews: number;
  weeklyProgress: number;
  weeklyGoal: number;
  trendingUp: boolean;
}

export type RoleType = 'Internship' | 'Full-time' | 'Contractor' | 'Co-op';

export interface UserTargetCompany {
  companyId: string;
  addedAt: string;
  priority?: number;
  customNotes?: string;
}

export interface CompanyMatchResult {
  matchedCompanyId?: string;
  originalText: string;
  confidence: number;
}

export interface Resume {
  id: string;
  name: string;
  fileName: string;
  fileUri: string;
  uploadedAt: string;
  isPrimary: boolean;
  tailoredVersions?: TailoredResume[];
}

export interface TailoredResume {
  id: string;
  originalResumeId: string;
  jobDescription: string;
  companyName: string;
  positionTitle: string;
  tailoredAt: string;
  fileUri?: string; // Path to the generated PDF
  processingStatus: 'processing' | 'completed' | 'failed';
}

export interface ResumeTailoringRequest {
  resumeId: string;
  jobDescription: string;
  companyName: string;
  positionTitle: string;
}

// Job Recommendations Types
export type JobType = 'internship' | 'newgrad';

export interface JobListing {
  company: string;
  title: string;
  locations: string[];
  url: string;
  date_posted: string;
  sponsorship?: string;
  is_active: boolean;
  terms?: string[];
  categories: string[];
}

export interface UserJobPreferences {
  jobType: JobType;
  categories: string[];
  locations?: string[];
  requiresSponsorship?: boolean;
}

export interface JobRecommendationsState {
  jobs: JobListing[];
  loading: boolean;
  error: string | null;
  preferences: UserJobPreferences;
  lastFetched: number | null;
}
