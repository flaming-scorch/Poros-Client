import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, Application, UserTargetCompany, Resume, TailoredResume, CompanyRecommendation } from '../types';

const STORAGE_KEYS = {
  USER_PREFIX: 'user_',
  APPLICATIONS_PREFIX: 'applications_',
  WEEKLY_GOAL: 'weekly_goal',
  TARGET_COMPANIES_PREFIX: 'target_companies_',
  CUSTOM_COMPANIES_PREFIX: 'custom_companies_',
  RESUMES_PREFIX: 'resumes_',
  TAILORED_RESUMES_PREFIX: 'tailored_resumes_',
};

export const StorageService = {
  // User data operations
  async saveUser(user: User): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.USER_PREFIX}${user.name.toLowerCase()}`;
      await AsyncStorage.setItem(key, JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user data:', error);
      throw error;
    }
  },

  async getUser(name: string): Promise<User | null> {
    try {
      const key = `${STORAGE_KEYS.USER_PREFIX}${name.toLowerCase()}`;
      const userData = await AsyncStorage.getItem(key);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  async updateUser(user: User): Promise<void> {
    try {
      await this.saveUser(user);
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  },

  // Applications data operations
  async saveApplications(userId: string, applications: Application[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.APPLICATIONS_PREFIX}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(applications));
    } catch (error) {
      console.error('Error saving applications data:', error);
      throw error;
    }
  },

  async getApplications(userId: string): Promise<Application[]> {
    try {
      const key = `${STORAGE_KEYS.APPLICATIONS_PREFIX}${userId}`;
      const applicationsData = await AsyncStorage.getItem(key);
      return applicationsData ? JSON.parse(applicationsData) : [];
    } catch (error) {
      console.error('Error getting applications data:', error);
      return [];
    }
  },

  // Weekly goal operations
  async saveWeeklyGoal(userId: string, goal: number): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.WEEKLY_GOAL}_${userId}`;
      await AsyncStorage.setItem(key, goal.toString());
    } catch (error) {
      console.error('Error saving weekly goal:', error);
      throw error;
    }
  },

  async getWeeklyGoal(userId: string): Promise<number> {
    try {
      const key = `${STORAGE_KEYS.WEEKLY_GOAL}_${userId}`;
      const goal = await AsyncStorage.getItem(key);
      return goal ? parseInt(goal) : 5; // Default to 5
    } catch (error) {
      console.error('Error getting weekly goal:', error);
      return 5;
    }
  },

  // Target companies operations
  async saveUserTargetCompanies(userId: string, targetCompanies: UserTargetCompany[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.TARGET_COMPANIES_PREFIX}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(targetCompanies));
    } catch (error) {
      console.error('Error saving target companies:', error);
      throw error;
    }
  },

  async getUserTargetCompanies(userId: string): Promise<UserTargetCompany[]> {
    try {
      const key = `${STORAGE_KEYS.TARGET_COMPANIES_PREFIX}${userId}`;
      const targetCompaniesData = await AsyncStorage.getItem(key);
      return targetCompaniesData ? JSON.parse(targetCompaniesData) : [];
    } catch (error) {
      console.error('Error getting target companies:', error);
      return [];
    }
  },

  // Custom companies operations
  async saveCustomCompanies(userId: string, customCompanies: CompanyRecommendation[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.CUSTOM_COMPANIES_PREFIX}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(customCompanies));
    } catch (error) {
      console.error('Error saving custom companies:', error);
      throw error;
    }
  },

  async getCustomCompanies(userId: string): Promise<CompanyRecommendation[]> {
    try {
      const key = `${STORAGE_KEYS.CUSTOM_COMPANIES_PREFIX}${userId}`;
      const customCompaniesData = await AsyncStorage.getItem(key);
      return customCompaniesData ? JSON.parse(customCompaniesData) : [];
    } catch (error) {
      console.error('Error getting custom companies:', error);
      return [];
    }
  },

  // Utility methods
  async clearUserData(name: string): Promise<void> {
    try {
      const userKey = `${STORAGE_KEYS.USER_PREFIX}${name.toLowerCase()}`;
      const user = await this.getUser(name);
      if (user) {
        const applicationsKey = `${STORAGE_KEYS.APPLICATIONS_PREFIX}${user.id}`;
        const goalKey = `${STORAGE_KEYS.WEEKLY_GOAL}_${user.id}`;
        const targetCompaniesKey = `${STORAGE_KEYS.TARGET_COMPANIES_PREFIX}${user.id}`;
        const customCompaniesKey = `${STORAGE_KEYS.CUSTOM_COMPANIES_PREFIX}${user.id}`;
        const resumesKey = `${STORAGE_KEYS.RESUMES_PREFIX}${user.id}`;
        const tailoredKey = `${STORAGE_KEYS.TAILORED_RESUMES_PREFIX}${user.id}`;
        await AsyncStorage.multiRemove([userKey, applicationsKey, goalKey, targetCompaniesKey, customCompaniesKey, resumesKey, tailoredKey]);
      }
    } catch (error) {
      console.error('Error clearing user data:', error);
      throw error;
    }
  },

  async getAllStoredUserNames(): Promise<string[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const userKeys = keys.filter(key => key.startsWith(STORAGE_KEYS.USER_PREFIX));
      return userKeys.map(key => key.replace(STORAGE_KEYS.USER_PREFIX, ''));
    } catch (error) {
      console.error('Error getting all user names:', error);
      return [];
    }
  },

  // Resume data operations
  async saveUserResumes(userId: string, resumes: Resume[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.RESUMES_PREFIX}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(resumes));
    } catch (error) {
      console.error('Error saving resumes:', error);
      throw error;
    }
  },

  async getUserResumes(userId: string): Promise<Resume[]> {
    try {
      const key = `${STORAGE_KEYS.RESUMES_PREFIX}${userId}`;
      const resumesData = await AsyncStorage.getItem(key);
      return resumesData ? JSON.parse(resumesData) : [];
    } catch (error) {
      console.error('Error getting resumes:', error);
      return [];
    }
  },

  // Tailored resumes operations
  async saveTailoredResumes(userId: string, tailoredResumes: TailoredResume[]): Promise<void> {
    try {
      const key = `${STORAGE_KEYS.TAILORED_RESUMES_PREFIX}${userId}`;
      await AsyncStorage.setItem(key, JSON.stringify(tailoredResumes));
    } catch (error) {
      console.error('Error saving tailored resumes:', error);
      throw error;
    }
  },

  async getTailoredResumes(userId: string): Promise<TailoredResume[]> {
    try {
      const key = `${STORAGE_KEYS.TAILORED_RESUMES_PREFIX}${userId}`;
      const tailoredData = await AsyncStorage.getItem(key);
      return tailoredData ? JSON.parse(tailoredData) : [];
    } catch (error) {
      console.error('Error getting tailored resumes:', error);
      return [];
    }
  },

  // Clear resume data when clearing user data
  async clearResumeData(userId: string): Promise<void> {
    try {
      const resumesKey = `${STORAGE_KEYS.RESUMES_PREFIX}${userId}`;
      const tailoredKey = `${STORAGE_KEYS.TAILORED_RESUMES_PREFIX}${userId}`;
      await AsyncStorage.multiRemove([resumesKey, tailoredKey]);
    } catch (error) {
      console.error('Error clearing resume data:', error);
      throw error;
    }
  },
};