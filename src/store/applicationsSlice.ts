import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Application, ApplicationStatus } from '../types';
import apiService from '../services/apiService';
import { RootState } from './index';

interface ApplicationsState {
  applications: Application[];
  weeklyGoal: number;
  filterStatus: ApplicationStatus | 'All';
  loading: boolean;
  error: string | null;
}

const initialState: ApplicationsState = {
  applications: [],
  weeklyGoal: 5,
  filterStatus: 'All',
  loading: false,
  error: null,
};

// Async Thunks
export const fetchApplications = createAsyncThunk(
  'applications/fetch',
  async (userId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.getApplications(userId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Fetch failed');
    }
  }
);

export const addApplicationThunk = createAsyncThunk(
  'applications/add',
  async ({ userId, application }: { userId: string, application: Application }, { rejectWithValue }) => {
    try {
      const response = await apiService.createApplication(userId, application);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Add failed');
    }
  }
);

export const updateApplicationThunk = createAsyncThunk(
  'applications/update',
  async ({ userId, applicationId, updates }: { userId: string, applicationId: string, updates: Partial<Application> }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateApplication(userId, applicationId, updates);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { id: applicationId, updates: response.data };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Update failed');
    }
  }
);

export const deleteApplicationThunk = createAsyncThunk(
  'applications/delete',
  async ({ userId, applicationId }: { userId: string, applicationId: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.deleteApplication(userId, applicationId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return applicationId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Delete failed');
    }
  }
);

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {
    setWeeklyGoal: (state, action: PayloadAction<number>) => {
      state.weeklyGoal = action.payload;
    },
    setFilterStatus: (state, action: PayloadAction<ApplicationStatus | 'All'>) => {
      state.filterStatus = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchApplications.fulfilled, (state, action) => {
        state.loading = false;
        if (Array.isArray(action.payload)) {
          state.applications = action.payload;
        }
      })
      .addCase(fetchApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Add
      .addCase(addApplicationThunk.fulfilled, (state, action) => {
        state.applications.push(action.payload as Application);
      })
      // Update
      .addCase(updateApplicationThunk.fulfilled, (state, action) => {
        // Backend returns updated object or we use the payload updates
        const index = state.applications.findIndex(app => app.id === action.payload.id);
        if (index !== -1 && action.payload.updates) {
          // Merge updates or replace
          state.applications[index] = { ...state.applications[index], ...(action.payload.updates as Partial<Application>) };
        }
      })
      // Delete
      .addCase(deleteApplicationThunk.fulfilled, (state, action) => {
        state.applications = state.applications.filter(app => app.id !== action.payload);
      });
  }
});

export const {
  setFilterStatus,
  setWeeklyGoal,
} = applicationsSlice.actions;
export default applicationsSlice.reducer;