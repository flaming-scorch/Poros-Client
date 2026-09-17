// API Service for connecting to poros-data-service backend
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  User,
  Application,
  Resume,
  CompanyRecommendation,
  TailoredResume,
  ChecklistItem
} from '../types';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const TOKEN_STORAGE_KEY = 'auth_token';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async getToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async setToken(token: string): Promise<void> {
    try {
      await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
      console.log('[API] ✅ Token stored successfully');
    } catch (error) {
      console.error('[API] ❌ Error storing token:', error);
    }
  }

  async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Error clearing token:', error);
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = await this.getToken();
      const url = `${this.baseURL}${endpoint}`;

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Debug logging (remove in production)
      console.log(`[API] ${options.method || 'GET'} ${url}`);
      console.log(`[API] Full URL: ${this.baseURL}${endpoint}`);

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const responseText = await response.text();
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        // Response is not JSON, treat it as text
        console.log('[API] Response was not JSON:', responseText);
        if (!response.ok) {
          return {
            error: responseText || `HTTP error! status: ${response.status}`,
          };
        }
        // If success but not JSON, we might have an issue if the app expects an object
        // But let's assume if it's OK and not JSON, maybe it's just a success message?
        // For strict typing (ApiResponse<T>), T is usually an object. 
        // We'll return the text as data if T allows it (unlikely) or just return empty data?
        // Better to return it as is or warn.
        // For now, let's treat it as data if the generic T isn't strict, or just empty object if empty string.
        data = responseText ? { message: responseText } : {};
      }

      // Debug logging
      if (!response.ok) {
        const errorContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : data;
        if (response.status >= 400 && response.status < 500) {
          console.warn(`[API] Warning ${response.status} for ${options.method || 'GET'} ${endpoint}:`, errorContent);
        } else {
          console.error(`[API] Error ${response.status} for ${options.method || 'GET'} ${endpoint}:`, errorContent);
          console.error(`[API] Full URL that failed: ${url}`);
        }
      } else {
        console.log('[API] Success:', endpoint);
      }

      if (!response.ok) {
        // Handle validation errors from backend
        if (data && typeof data === 'object') {
          if (data.errors && Array.isArray(data.errors)) {
            const errorMessages = data.errors.map((err: any) => err.msg).join(', ');
            return {
              error: errorMessages || data.message || data.error || `HTTP error! status: ${response.status}`,
            };
          }
          return {
            error: data.message || data.error || `HTTP error! status: ${response.status}`,
          };
        }
        return {
          error: `HTTP error! status: ${response.status}`,
        };
      }

      return { data };
    } catch (error) {
      console.error('[API] Request failed:', error);
      return {
        error: error instanceof Error ? error.message : 'An unknown error occurred',
      };
    }
  }

  // Authentication endpoints
  async login(email: string, password: string) {
    const response = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.data?.token) {
      await this.setToken(response.data.token);
    }

    return response;
  }

  async loginByName(name: string) {
    const response = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });

    if (response.data?.token) {
      await this.setToken(response.data.token);
    }

    return response;
  }

  async signup(userData: any) {
    const response = await this.request<{ token: string; user: any }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    if (response.data?.token) {
      await this.setToken(response.data.token);
    }

    return response;
  }

  // User endpoints
  async getUser(userId: string) {
    return this.request(`/api/users/${userId}`);
  }

  async updateUser(userId: string, userData: Partial<any>) {
    return this.request(`/api/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async updateUserTargets(userId: string, targets: { targetCompanies?: string[]; targetRoles?: string[]; targetIndustries?: string[]; targetLocations?: string[] }) {
    return this.request(`/api/users/${userId}/targets`, {
      method: 'PUT',
      body: JSON.stringify(targets),
    });
  }

  // Company endpoints
  async getCompanies(): Promise<ApiResponse<CompanyRecommendation[]>> {
    return this.request<CompanyRecommendation[]>('/api/companies');
  }

  async getCompany(id: string): Promise<ApiResponse<CompanyRecommendation>> {
    return this.request<CompanyRecommendation>(`/api/companies/${id}`);
  }

  async createCompany(company: Partial<CompanyRecommendation>): Promise<ApiResponse<CompanyRecommendation>> {
    const response = await this.request<CompanyRecommendation>('/api/companies', {
      method: 'POST',
      body: JSON.stringify(company),
    });

    // If company already exists, try to find it in the list (or backend could return it, but for now we search)
    if (response.error && response.error.includes('Company already exists')) {
      console.log('[API] Company exists, fetching existing company...');
      // Ideally backend would return the ID in the 400 error, but we can search or just fail gracefully.
      // Better approach: Let's fetch all companies and find it by name.
      const companiesRes = await this.getCompanies();
      if (companiesRes.data) {
        const existing = companiesRes.data.find(c => c.name.toLowerCase() === company.name?.toLowerCase());
        if (existing) {
          return { data: existing };
        }
      }
    }

    return response;
  }

  // Checklist endpoints
  async getChecklistItems(userId: string): Promise<ApiResponse<ChecklistItem[]>> {
    return this.request<ChecklistItem[]>('/api/checklist');
  }

  // Applications endpoints
  // Note: userId is not needed in URL - backend gets it from JWT token
  async getApplications(userId: string) {
    return this.request(`/api/applications`);
  }

  async createApplication(userId: string, application: any) {
    return this.request(`/api/applications`, {
      method: 'POST',
      body: JSON.stringify(application),
    });
  }

  async updateApplication(userId: string, applicationId: string, application: any) {
    return this.request(`/api/applications/${applicationId}`, {
      method: 'PUT',
      body: JSON.stringify(application),
    });
  }

  async deleteApplication(userId: string, applicationId: string) {
    return this.request(`/api/applications/${applicationId}`, {
      method: 'DELETE',
    });
  }

  // Resume endpoints
  // Note: userId is not needed in URL - backend gets it from JWT token
  async getResumes(userId: string) {
    return this.request<Resume[]>(`/api/resumes`);
  }

  async uploadResume(formData: FormData) {
    // We can't use the standard JSON request wrapper for FormData
    const token = await this.getToken();
    const headers: HeadersInit = {
      // 'Content-Type': 'multipart/form-data', // Let fetch set boundary automatically
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/api/resumes`, {
      method: 'POST',
      headers,
      body: formData,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }

    if (!response.ok) {
      return { error: (typeof data === 'object' && data.error) || 'Upload failed' };
    }
    return { data };
  }

  // Helper to get download URL (public or authenticated?)
  // Since our download endpoints require auth, we can't just put them in an <Image> or <WebView> easily without token.
  // We might need to download the file to local temp storage first.

  getBaseURL() {
    return this.baseURL;
  }

  async downloadFile(downloadUrl: string, localPath: string): Promise<string> {
    const token = await this.getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    console.log(`[ApiService] Downloading from ${downloadUrl} to ${localPath}`);
    const downloadResumable = FileSystem.createDownloadResumable(
      downloadUrl,
      localPath,
      { headers }
    );

    try {
      const result = await downloadResumable.downloadAsync();
      if (result && result.uri) {
        return result.uri;
      }
      throw new Error('Download failed');
    } catch (e) {
      console.error('Download error:', e);
      throw e;
    }
  }

  // Update tailored resume (supports file upload now)
  async updateTailoredResume(userId: string, tailoredResumeId: string, updates: { fileUri?: string, processingStatus?: 'processing' | 'completed' | 'failed', file?: any }): Promise<ApiResponse<TailoredResume>> {
    // If we have a file or fileUri that is local, we should treat it as an upload if intended
    // Actually updates.fileUri is likely local path if we just generated it. 
    // If we want to simple update text fields, we use JSON.
    // If we want to upload, we use FormData.

    // We check if 'file' object is passed OR if we interpret fileUri as file path to load?
    // Better to pass explicit 'file' object like in uploadResume if we are uploading.

    if (updates.file) {
      const formData = new FormData();
      formData.append('file', {
        uri: updates.file.uri,
        name: updates.file.name || 'tailored.pdf',
        type: 'application/pdf'
      } as any);

      if (updates.processingStatus) {
        formData.append('processingStatus', updates.processingStatus);
      }

      const token = await this.getToken();
      const headers: HeadersInit = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${this.baseURL}/api/resumes/tailored/${tailoredResumeId}`, {
        method: 'PUT',
        headers,
        body: formData
      });

      const text = await response.text();
      const data = JSON.parse(text);
      if (!response.ok) return { error: data.error || 'Upload failed' };
      return { data };
    }

    return this.request<TailoredResume>(`/api/resumes/tailored/${tailoredResumeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  getAuthHeaders = async () => {
    const token = await this.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }


  async deleteResume(userId: string, resumeId: string) {
    return this.request(`/api/resumes/${resumeId}`, {
      method: 'DELETE',
    });
  }


  // Alias for legacy support or user specific fetch
  async getUserResumes(userId: string) {
    return this.getResumes(userId);
  }

  async updateResume(userId: string, resumeId: string, updates: Partial<Resume>): Promise<ApiResponse<Resume>> {
    return this.request<Resume>(`/api/resumes/${resumeId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async tailorResume(userId: string, data: { resumeId: string, jobDescription: string, companyName: string, positionTitle: string }) {
    return this.request(`/api/resumes/tailor`, {
      method: 'POST',
      body: JSON.stringify({
        originalResumeId: data.resumeId,
        jobDescription: data.jobDescription,
        companyName: data.companyName,
        positionTitle: data.positionTitle
      }),
    });
  }

  async getTailoredResumes(userId: string) {
    return this.request<TailoredResume[]>('/api/resumes/tailored');
  }



  async deleteTailoredResume(userId: string, tailoredResumeId: string) {
    return this.request<{ message: string; id: string }>(`/api/resumes/tailored/${tailoredResumeId}`, {
      method: 'DELETE',
    });
  }

  // Sync all applications for a user (not used - individual endpoints are used instead)
  async syncApplications(userId: string, applications: any[]) {
    return this.request(`/api/applications/sync`, {
      method: 'POST',
      body: JSON.stringify({ applications }),
    });
  }

  // Sync all resumes for a user (not used - individual endpoints are used instead)
  async syncResumes(userId: string, resumes: any[]) {
    return this.request(`/api/resumes/sync`, {
      method: 'POST',
      body: JSON.stringify({ resumes }),
    });
  }

  // Checklist endpoints
  async getChecklist(userId: string, companyId?: string) {
    const query = companyId ? `?companyId=${companyId}` : '';
    return this.request(`/api/checklist${query}`);
  }

  async createChecklistItem(userId: string, item: any) {
    return this.request(`/api/checklist`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  async updateChecklistItem(userId: string, itemId: string, updates: any) {
    return this.request(`/api/checklist/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteChecklistItem(userId: string, itemId: string) {
    return this.request(`/api/checklist/${itemId}`, {
      method: 'DELETE',
    });
  }
}

export const apiService = new ApiService(API_BASE_URL);
export default apiService;

