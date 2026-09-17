/* eslint-disable no-param-reassign */
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
    UserJobPreferences,
    JobRecommendationsState,
    JobType,
} from '../types';
import { JobRecommendationService } from '../services/jobRecommendationService';

const initialState: JobRecommendationsState = {
    jobs: [],
    loading: false,
    error: null,
    preferences: {
        jobType: 'internship',
        categories: [],
        locations: [],
        requiresSponsorship: false,
    },
    lastFetched: null,
};

/**
 * Async thunk to fetch job recommendations
 */
export const fetchJobRecommendations = createAsyncThunk(
    'jobRecommendations/fetch',
    async (preferences: UserJobPreferences) => {
        const jobs = await JobRecommendationService.getRecommendations(preferences);
        return jobs;
    },
);

/**
 * Async thunk to refresh job recommendations (bypasses cache)
 */
export const refreshJobRecommendations = createAsyncThunk(
    'jobRecommendations/refresh',
    async (preferences: UserJobPreferences) => {
        // Clear cache first
        await JobRecommendationService.clearCache(preferences.jobType);
        const jobs = await JobRecommendationService.getRecommendations(preferences);
        return jobs;
    },
);

/**
 * Async thunk to get available categories
 */
export const fetchAvailableCategories = createAsyncThunk(
    'jobRecommendations/fetchCategories',
    async (jobType: JobType) => JobRecommendationService.getAvailableCategories(jobType),
);

/**
 * Async thunk to get available locations
 */
export const fetchAvailableLocations = createAsyncThunk(
    'jobRecommendations/fetchLocations',
    async (jobType: JobType) => JobRecommendationService.getAvailableLocations(jobType),
);

const jobRecommendationsSlice = createSlice({
    name: 'jobRecommendations',
    initialState,
    reducers: {
        /**
             * Update user job preferences
             */
        updatePreferences: (state, action: PayloadAction<Partial<UserJobPreferences>>) => {
            state.preferences = { ...state.preferences, ...action.payload };
        },

        /**
             * Set job type (internship or newgrad)
             */
        setJobType: (state, action: PayloadAction<JobType>) => {
            state.preferences.jobType = action.payload;
            // Clear jobs when switching job type
            state.jobs = [];
            state.lastFetched = null;
        },

        /**
             * Toggle category in preferences
             */
        toggleCategory: (state, action: PayloadAction<string>) => {
            const category = action.payload;
            const index = state.preferences.categories.indexOf(category);

            if (index > -1) {
                state.preferences.categories.splice(index, 1);
            } else {
                state.preferences.categories.push(category);
            }
        },

        /**
             * Toggle location in preferences
             */
        toggleLocation: (state, action: PayloadAction<string>) => {
            const location = action.payload;
            const locations = state.preferences.locations || [];
            const index = locations.indexOf(location);

            if (index > -1) {
                locations.splice(index, 1);
            } else {
                locations.push(location);
            }

            state.preferences.locations = locations;
        },

        /**
             * Set sponsorship requirement
             */
        setRequiresSponsorship: (state, action: PayloadAction<boolean>) => {
            state.preferences.requiresSponsorship = action.payload;
        },

        /**
             * Clear all filters
             */
        clearFilters: (state) => {
            state.preferences.categories = [];
            state.preferences.locations = [];
            state.preferences.requiresSponsorship = false;
        },

        /**
             * Clear error
             */
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        // Fetch job recommendations
        builder
            .addCase(fetchJobRecommendations.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchJobRecommendations.fulfilled, (state, action) => {
                state.loading = false;
                state.jobs = action.payload;
                state.lastFetched = Date.now();
            })
            .addCase(fetchJobRecommendations.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to fetch job recommendations';
            });

        // Refresh job recommendations
        builder
            .addCase(refreshJobRecommendations.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(refreshJobRecommendations.fulfilled, (state, action) => {
                state.loading = false;
                state.jobs = action.payload;
                state.lastFetched = Date.now();
            })
            .addCase(refreshJobRecommendations.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || 'Failed to refresh job recommendations';
            });
    },
});

export const {
    updatePreferences,
    setJobType,
    toggleCategory,
    toggleLocation,
    setRequiresSponsorship,
    clearFilters,
    clearError,
} = jobRecommendationsSlice.actions;

export default jobRecommendationsSlice.reducer;
