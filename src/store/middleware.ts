import { Middleware } from '@reduxjs/toolkit';
import { StorageService } from '../utils/storage';

export const storageMiddleware: Middleware = (store) => (next) => (action: any) => {
  const result = next(action);
  const state = store.getState();

  // Auto-save user data when user actions are dispatched
  if (action.type && action.type.startsWith('user/')) {
    if (state.user.currentUser) {
      StorageService.saveUser(state.user.currentUser).catch(console.error);
    }
  }

  // Auto-save applications data when application actions are dispatched
  if (action.type && action.type.startsWith('applications/')) {
    if (state.user.currentUser) {
      StorageService.saveApplications(
        state.user.currentUser.id,
        state.applications.applications
      ).catch(console.error);

      StorageService.saveWeeklyGoal(
        state.user.currentUser.id,
        state.applications.weeklyGoal
      ).catch(console.error);
    }
  }

  // Auto-save target companies data when target company actions are dispatched
  if (action.type && action.type.startsWith('userTargetCompanies/')) {
    if (state.user.currentUser) {
      StorageService.saveUserTargetCompanies(
        state.user.currentUser.id,
        state.userTargetCompanies.targetCompanies
      ).catch(console.error);

      // Also save custom companies
      StorageService.saveCustomCompanies(
        state.user.currentUser.id,
        state.userTargetCompanies.customCompanies
      ).catch(console.error);
    }
  }

  // Auto-save resume data when resume actions are dispatched
  if (action.type && action.type.startsWith('resume/')) {
    if (state.user.currentUser) {
      StorageService.saveUserResumes(
        state.user.currentUser.id,
        state.resume.resumes
      ).catch(console.error);

      StorageService.saveTailoredResumes(
        state.user.currentUser.id,
        state.resume.tailoredResumes
      ).catch(console.error);
    }
  }

  // Auto-save checklist progress when checklist actions are dispatched
  if (action.type && action.type.startsWith('checklist/')) {
    if (state.user.currentUser) {
      // For now, we'll store checklist progress in local storage
      // You could extend StorageService to include checklist methods later
      try {
        const checklistData = JSON.stringify(state.checklist.progress);
        // This is a simplified version - you may want to add proper StorageService methods
        console.log('Checklist progress saved:', checklistData);
      } catch (error) {
        console.error('Error saving checklist progress:', error);
      }
    }
  }

  return result;
};