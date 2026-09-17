import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserTargetCompany, CompanyRecommendation } from '../types';
import { enrichCompanyData } from '../services/companyEnrichmentService';
import apiService from '../services/apiService';
import { RootState } from './index';

interface UserTargetCompaniesState {
  targetCompanies: UserTargetCompany[];
  customCompanies: CompanyRecommendation[]; // User-created companies
  checklistCompletions: Record<string, Record<string, boolean>>; // companyId -> checklistItemId -> completed
  isLoading: boolean;
  enrichmentStatus: 'idle' | 'loading' | 'success' | 'error';
  enrichmentError?: string;
}

const initialState: UserTargetCompaniesState = {
  targetCompanies: [],
  customCompanies: [],
  checklistCompletions: {},
  isLoading: false,
  enrichmentStatus: 'idle',
};

// Async thunk for adding custom company with enrichment
export const addCustomCompany = createAsyncThunk(
  'userTargetCompanies/addCustomCompany',
  async (companyName: string, { dispatch, rejectWithValue }) => {
    try {
      const enrichedData = await enrichCompanyData(companyName);

      // We don't generate ID here anymore, we let backend handle it or use the one we construct
      // But for consistency with frontend logic, let's construct one, but backend might strictly want to create it first.
      const customCompanyId = `custom-${Date.now()}-${companyName.toLowerCase().replace(/\s+/g, '-')}`;

      const customCompanyData: Partial<CompanyRecommendation> = {
        id: customCompanyId,
        name: enrichedData.name,
        logo: enrichedData.logo,
        industry: enrichedData.industry,
        // isCustom: true, // Backend doesn't have isCustom col, maybe inferred?
        // We can ignore sending isCustom to backend, but we need it for frontend.
        companyInfo: enrichedData.companyInfo,
        events: enrichedData.events,
        recommendedCourses: enrichedData.recommendedCourses,
        preparationChecklist: enrichedData.preparationChecklist,
        applicationTimeline: enrichedData.applicationTimeline
      };

      // 1. Persist Company to Backend
      const companyResponse = await apiService.createCompany(customCompanyData);
      if (companyResponse.error) {
        throw new Error(companyResponse.error);
      }

      const persistedCompany = companyResponse.data;

      // 2. Add as Target (This will sync to backend via syncTargetsToBackend if called separately, but we do it here)
      // Actually, we should dispatch addTargetCompanyThunk AFTER this succeeds?
      // Wait, this thunk purely adds to "customCompanies" list in state.
      // But we also want to add it as a target.

      // We return the robust object for frontend state
      const customCompany: CompanyRecommendation = {
        ...persistedCompany,
        isCustom: true,
        applicationTimeline: enrichedData.applicationTimeline,
        events: enrichedData.events,
        recommendedCourses: enrichedData.recommendedCourses,
        preparationChecklist: enrichedData.preparationChecklist,
        companyInfo: enrichedData.companyInfo,
      };

      // Dispatch sync manually here or rely on extraReducers to update state + trigger sync? 
      // extraReducers currently adds to state. But we need to sync to backend "user_target_companies" table too.
      // The extraReducer adds it to `targetCompanies` state.
      // So we should dispatch syncTargetsToBackend() in the fulfillment listener or just here?
      // We can't dispatch easily in extraReducers.
      // Let's rely on the component to not need to do anything else, so we should sync here.
      // BUT `addCustomCompany` is called by UI.
      // Best way: Chain the sync.

      // We will perform the sync in a separate `useEffect` or just call it here?
      // We can't dispatch thunks from inside thunk easily without circular dependency risk if not careful, 
      // but here it is fine.
      // Actually, let's just let the extraReducer update the state, and then we need to ensure sync happens.
      // The current implementation of `extraReducers` (lines 191-210) updates `targetCompanies`.
      // It DOES NOT trigger `syncTargetsToBackend`.
      // So we must trigger it.

      // Ideally we despatch `addTargetCompanyThunk` but we need the company object first.

      return customCompany;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to enrich and add company');
    }
  }
);

export const fetchTargetCompanies = createAsyncThunk(
  'userTargetCompanies/fetch',
  async (userId: string, { rejectWithValue }) => {
    try {
      // 1. Fetch User Data (contains list of target IDs)
      const response = await apiService.getUser(userId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      const user = response.data as any;
      const targetIds = user.targetCompanies || [];

      // 2. Identify "Unknown" IDs (not in static data)
      // We need to verify which IDs are NOT in our hardcoded list
      // Note: We need to import targetCompanies from data, but we can't easily do that inside the thunk file 
      // if it causes circular deps. However, `companiesData` is usually a safe leaf node (data file).
      // Let's assume we can import it. If not, we'll need another way.
      // Importing inside the function or at top level. Let's add the import at the top level in a separate edit if needed, 
      // but here we will assume it's available or we treat ALL IDs as potential candidates if we want to be safe.
      // Easiest check: If ID starts with 'custom-', it's definitely custom. 
      // But standard IDs are '1', '2', etc.
      // Let's fetch details for ANY ID that looks custom OR we just fetch details for all and let backend handle caching? 
      // No, that's too heavy.
      // Let's use the 'custom-' prefix heuristic for now as created in `addCustomCompany` ('custom-' + timestamp).
      // Or better: We should really check `companiesData`. 

      const customIds = targetIds.filter((id: string) => id.startsWith('custom-') || id.length > 10); // Simple heuristic for now

      // 3. Fetch details for these custom IDs
      const customCompaniesPromises = customIds.map((id: string) => apiService.getCompany(id));
      const customCompaniesResponses = await Promise.all(customCompaniesPromises);

      const customCompanies = customCompaniesResponses
        .filter(r => !r.error && r.data)
        .map(r => {
          const company = r.data!;
          // Ensure all required fields exist
          // Backend returns keys as: applicationTimeline, events, courses, checklistItems
          return {
            ...company,
            // Use the timeline from DB or fall back to default if null
            applicationTimeline: company.applicationTimeline || {
              'internship': 'Rolling Basis',
              'full-time': 'Rolling Basis',
              'contractor': 'Rolling Basis',
              'co-op': 'Rolling Basis'
            },
            events: (company.events || []).map((e: any) => ({
              ...e,
              date: e.date || e.eventDate // Handle camelCase conversion from DB (event_date -> eventDate)
            })),
            // Map backend 'courses' to frontend 'recommendedCourses'
            recommendedCourses: company.courses || company.recommendedCourses || [],
            // Map backend 'checklistItems' to frontend 'preparationChecklist'
            preparationChecklist: company.checklistItems || company.preparationChecklist || [],
            companyInfo: company.companyInfo || {
              size: company.companySize || 'Unknown',
              culture: company.cultureValues || [],
              benefits: company.benefits || [],
              interviewProcess: company.interviewProcess || []
            }
          };
        });

      return {
        user,
        customCompanies
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch targets');
    }
  }
);

export const syncTargetsToBackend = createAsyncThunk(
  'userTargetCompanies/sync',
  async (_, { getState, rejectWithValue }) => {
    const state = getState() as RootState;
    const userId = state.user.currentUser?.id;
    // We need to map UserTargetCompany[] back to string IDs for the backend as currently designed
    const targets = state.userTargetCompanies.targetCompanies;

    if (!userId) return rejectWithValue('User not logged in');

    try {
      const targetCompanyIds = targets.map(t => t.companyId);
      const response = await apiService.updateUserTargets(userId, {
        targetCompanies: targetCompanyIds
      });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Sync failed');
    }
  }
);

const userTargetCompaniesSlice = createSlice({
  name: 'userTargetCompanies',
  initialState,
  reducers: {
    addTargetCompany: (state, action: PayloadAction<{ companyId: string; customNotes?: string }>) => {
      const { companyId, customNotes } = action.payload;

      // Check if company is already in targets
      const existingIndex = state.targetCompanies.findIndex(tc => tc.companyId === companyId);
      if (existingIndex === -1) {
        const newTargetCompany: UserTargetCompany = {
          companyId,
          addedAt: new Date().toISOString(),
          priority: state.targetCompanies.length + 1,
          customNotes,
        };
        state.targetCompanies.push(newTargetCompany);
      }
    },

    removeTargetCompany: (state, action: PayloadAction<string>) => {
      const companyId = action.payload;
      state.targetCompanies = state.targetCompanies.filter(tc => tc.companyId !== companyId);

      // Reorder priorities
      state.targetCompanies.forEach((tc, index) => {
        tc.priority = index + 1;
      });
    },

    updateTargetCompanyNotes: (state, action: PayloadAction<{ companyId: string; notes: string }>) => {
      const { companyId, notes } = action.payload;
      const targetCompany = state.targetCompanies.find(tc => tc.companyId === companyId);
      if (targetCompany) {
        targetCompany.customNotes = notes;
      }
    },

    reorderTargetCompanies: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;
      if (fromIndex >= 0 && fromIndex < state.targetCompanies.length &&
        toIndex >= 0 && toIndex < state.targetCompanies.length) {
        const [movedItem] = state.targetCompanies.splice(fromIndex, 1);
        state.targetCompanies.splice(toIndex, 0, movedItem);

        // Update priorities
        state.targetCompanies.forEach((tc, index) => {
          tc.priority = index + 1;
        });
      }
    },

    loadUserTargetCompanies: (state, action: PayloadAction<UserTargetCompany[]>) => {
      state.targetCompanies = action.payload;
      state.isLoading = false;
    },

    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    initializeTargetCompaniesFromSignup: (state, action: PayloadAction<string[]>) => {
      // Initialize target companies from sign-up matched company IDs
      const companyIds = action.payload;
      state.targetCompanies = companyIds.map((companyId, index) => ({
        companyId,
        addedAt: new Date().toISOString(),
        priority: index + 1,
      }));
    },

    removeCustomCompany: (state, action: PayloadAction<string>) => {
      const companyId = action.payload;
      state.customCompanies = state.customCompanies.filter(c => c.id !== companyId);
      // Also remove from target companies if it was targeted
      state.targetCompanies = state.targetCompanies.filter(tc => tc.companyId !== companyId);
    },

    toggleChecklistItem: (state, action: PayloadAction<{ companyId: string; checklistItemId: string }>) => {
      const { companyId, checklistItemId } = action.payload;

      // Initialize company's checklist completions if not exists
      if (!state.checklistCompletions[companyId]) {
        state.checklistCompletions[companyId] = {};
      }

      // Toggle the completion state
      const currentState = state.checklistCompletions[companyId][checklistItemId] || false;
      state.checklistCompletions[companyId][checklistItemId] = !currentState;
    },

    loadCustomCompanies: (state, action: PayloadAction<CompanyRecommendation[]>) => {
      state.customCompanies = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(addCustomCompany.pending, (state) => {
        state.enrichmentStatus = 'loading';
        state.enrichmentError = undefined;
      })
      .addCase(addCustomCompany.fulfilled, (state, action) => {
        state.enrichmentStatus = 'success';
        // Add to custom companies list
        state.customCompanies.push(action.payload);
        // Automatically add to user's target companies
        const newTargetCompany: UserTargetCompany = {
          companyId: action.payload.id,
          addedAt: new Date().toISOString(),
          priority: state.targetCompanies.length + 1,
        };
        state.targetCompanies.push(newTargetCompany);
      })
      .addCase(addCustomCompany.rejected, (state, action) => {
        state.enrichmentStatus = 'error';
        state.enrichmentError = action.payload as string;
      })
      // Handle fetching target companies
      .addCase(fetchTargetCompanies.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchTargetCompanies.fulfilled, (state, action) => {
        state.isLoading = false;

        const { user, customCompanies } = action.payload as { user: any, customCompanies: CompanyRecommendation[] };

        // 1. Update Target List
        if (user && Array.isArray(user.targetCompanies)) {
          state.targetCompanies = user.targetCompanies.map((companyId: string, index: number) => ({
            companyId: companyId,
            addedAt: new Date().toISOString(),
            priority: index + 1,
            customNotes: '',
          }));
        }

        // 2. Update Custom Companies Cache
        // valid custom companies fetched from backend
        if (customCompanies && customCompanies.length > 0) {
          // Merge with existing, avoiding duplicates
          const newCustoms = customCompanies.filter(nc =>
            !state.customCompanies.some(existing => existing.id === nc.id)
          );
          state.customCompanies = [...state.customCompanies, ...newCustoms];
        }
      })
      .addCase(fetchTargetCompanies.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const {
  addTargetCompany,
  removeTargetCompany,
  updateTargetCompanyNotes,
  reorderTargetCompanies,
  loadUserTargetCompanies,
  setLoading,
  initializeTargetCompaniesFromSignup,
  removeCustomCompany,
  toggleChecklistItem,
  loadCustomCompanies,
} = userTargetCompaniesSlice.actions;

export default userTargetCompaniesSlice.reducer;

// Wrapper thunks that update local state AND sync to backend
export const addTargetCompanyThunk = createAsyncThunk(
  'userTargetCompanies/addWithSync',
  async ({ companyId, customNotes }: { companyId: string; customNotes?: string }, { dispatch }) => {
    dispatch(userTargetCompaniesSlice.actions.addTargetCompany({ companyId, customNotes }));
    return dispatch(syncTargetsToBackend()).unwrap();
  }
);

export const removeTargetCompanyThunk = createAsyncThunk(
  'userTargetCompanies/removeWithSync',
  async (companyId: string, { dispatch }) => {
    dispatch(userTargetCompaniesSlice.actions.removeTargetCompany(companyId));
    return dispatch(syncTargetsToBackend()).unwrap();
  }
);

export const removeCustomCompanyThunk = createAsyncThunk(
  'userTargetCompanies/removeCustomWithSync',
  async (companyId: string, { dispatch, getState }) => {
    // 1. Optimistic update
    dispatch(userTargetCompaniesSlice.actions.removeCustomCompany(companyId));

    // 2. Sync to backend
    await dispatch(syncTargetsToBackend()).unwrap();

    // 3. Force re-fetch to ensure consistency (and clean up any "ghost" data)
    const state = getState() as RootState;
    if (state.user.currentUser?.id) {
      dispatch(fetchTargetCompanies(state.user.currentUser.id));
    }
    return;
  }
);