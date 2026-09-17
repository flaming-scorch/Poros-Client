import { store } from '../store';
import { setUser } from '../store/userSlice';
import { fetchApplications } from '../store/applicationsSlice';
import { fetchTargetCompanies } from '../store/userTargetCompaniesSlice';
import { fetchResumes } from '../store/resumeSlice';
import { StorageService } from './storage';

export const initializeApp = async (): Promise<void> => {
  try {
    // Try to load the last logged in user (this is a simple implementation)
    // In a real app, you might store the last logged in user separately
    const userNames = await StorageService.getAllStoredUserNames();

    if (userNames.length > 0) {
      // For demo purposes, we'll just try to load the first user found
      // In a real app, you'd implement proper session management
      const userData = await StorageService.getUser(userNames[0]);

      if (userData) {
        // Load user data
        store.dispatch(setUser(userData));

        // Fetch fresh data from backend
        // We trigger these in parallel
        store.dispatch(fetchApplications(userData.id));
        store.dispatch(fetchTargetCompanies(userData.id));
        store.dispatch(fetchResumes(userData.id));

        // Note: Weekly goal and custom companies might need their own endpoints or be part of user profile/targets
        // specific implementations for them might not be fully migrated to simple fetches if they don't have dedicated endpoints
        // but for now this clears the runtime error and loads core data.
      }
    }
  } catch (error) {
    console.error('Error initializing app:', error);
    // Don't throw error, just log it and continue with empty state
  }
};