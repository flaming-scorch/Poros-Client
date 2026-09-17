import { configureStore, combineReducers, AnyAction, Reducer } from '@reduxjs/toolkit';
import userReducer from './userSlice';
import applicationsReducer from './applicationsSlice';
import userTargetCompaniesReducer from './userTargetCompaniesSlice';
import resumeReducer from './resumeSlice';
import checklistReducer from './checklistSlice';
import jobRecommendationsReducer from './jobRecommendationsSlice';
import { storageMiddleware } from './middleware';

const appReducer = combineReducers({
  user: userReducer,
  applications: applicationsReducer,
  userTargetCompanies: userTargetCompaniesReducer,
  resume: resumeReducer,
  checklist: checklistReducer,
  jobRecommendations: jobRecommendationsReducer,
});

export type RootState = ReturnType<typeof appReducer>;

const rootReducer: Reducer = (state: RootState | undefined, action: AnyAction) => {
  if (action.type === 'user/logout') {
    // Check for 'user/logout' action to reset the state
    // We return undefined to let reducers initialize with their default state
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }).concat(storageMiddleware),
});

export type AppDispatch = typeof store.dispatch;