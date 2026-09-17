import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Resume, TailoredResume, ResumeTailoringRequest } from '../types';
import apiService from '../services/apiService';
import { RootState } from './index';

interface ResumeState {
  resumes: Resume[];
  tailoredResumes: TailoredResume[];
  isProcessing: boolean;
  currentTailoringRequest: ResumeTailoringRequest | null;
  loading: boolean;
  error: string | null;
}

const initialState: ResumeState = {
  resumes: [],
  tailoredResumes: [],
  isProcessing: false,
  currentTailoringRequest: null,
  loading: false,
  error: null,
};

// Async Thunks
export const fetchResumes = createAsyncThunk(
  'resumes/fetch',
  async (userId: string, { rejectWithValue }) => {
    try {
      const [resumesResponse, tailoredResponse] = await Promise.all([
        apiService.getUserResumes(userId),
        apiService.getTailoredResumes(userId)
      ]);

      if (resumesResponse.error) {
        return rejectWithValue(resumesResponse.error);
      }

      // We don't fail hard if tailored fetch fails, just return empty list or log
      if (tailoredResponse.error) {
        console.error('[ResumeSlice] Fetch Tailored Failed:', tailoredResponse.error);
      }

      const tailoredResumes = !tailoredResponse.error && Array.isArray(tailoredResponse.data)
        ? tailoredResponse.data
        : [];

      console.log(`[ResumeSlice] Fetched ${resumesResponse.data?.length} resumes and ${(tailoredResumes as any[]).length} tailored resumes`);
      if (tailoredResumes.length > 0) {
        console.log('[ResumeSlice] Sample tailored:', tailoredResumes[0]);
      }

      return {
        resumes: resumesResponse.data as Resume[],
        tailoredResumes: tailoredResumes as TailoredResume[]
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Fetch failed');
    }
  }
);

export const uploadResumeThunk = createAsyncThunk(
  'resumes/upload',
  async ({ userId, file, name }: { userId: string, file: any, name: string }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);
      formData.append('name', name);
      formData.append('fileName', file.name);
      formData.append('isPrimary', 'false');

      const response = await apiService.uploadResume(formData);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Upload failed');
    }
  }
);

export const tailorResumeThunk = createAsyncThunk(
  'resumes/tailor',
  async ({ userId, resumeId, jobDescription, jobTitle, companyName }: { userId: string, resumeId: string, jobDescription: string, jobTitle: string, companyName: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.tailorResume(userId, {
        resumeId,
        jobDescription,
        companyName,
        positionTitle: jobTitle
      });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      // Add metadata from args since API result might just be the content/url
      const data = response.data as Partial<TailoredResume>;
      return {
        ...data,
        jobTitle,
        companyName
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Tailoring failed');
    }
  }
);

export const deleteResumeThunk = createAsyncThunk(
  'resumes/delete',
  async ({ userId, resumeId }: { userId: string, resumeId: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.deleteResume(userId, resumeId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return resumeId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Delete failed');
    }
  }
);

export const setPrimaryResumeThunk = createAsyncThunk(
  'resumes/setPrimary',
  async ({ userId, resumeId }: { userId: string, resumeId: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateResume(userId, resumeId, { isPrimary: true });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return resumeId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Set primary failed');
    }
  }
);

export const renameResumeThunk = createAsyncThunk(
  'resumes/rename',
  async ({ userId, resumeId, name }: { userId: string, resumeId: string, name: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.updateResume(userId, resumeId, { name });
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return { id: resumeId, name };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Rename failed');
    }
  }
);

export const completeTailoringThunk = createAsyncThunk(
  'resumes/completeTailoring',
  async ({ userId, tailoredResumeId, fileUri }: { userId: string, tailoredResumeId: string, fileUri: string }, { rejectWithValue }) => {
    try {
      // Create file object for upload
      const fileName = fileUri.split('/').pop() || 'tailored.pdf';
      const file = {
        uri: fileUri,
        name: fileName,
        type: 'application/pdf'
      };

      // Pass file in updates object
      const response = await apiService.updateTailoredResume(userId, tailoredResumeId, {
        processingStatus: 'completed',
        file: file
      });

      if (response.error) {
        return rejectWithValue(response.error);
      }
      return response.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Completion failed');
    }
  }
);

export const deleteTailoredResumeThunk = createAsyncThunk(
  'resumes/deleteTailored',
  async ({ userId, tailoredResumeId }: { userId: string, tailoredResumeId: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.deleteTailoredResume(userId, tailoredResumeId);
      if (response.error) {
        return rejectWithValue(response.error);
      }
      return tailoredResumeId;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Delete tailored resume failed');
    }
  }
);

const resumeSlice = createSlice({
  name: 'resume',
  initialState,
  reducers: {
    loadResumes: (state, action: PayloadAction<Resume[]>) => {
      state.resumes = action.payload;
    },

    addResume: (state, action: PayloadAction<Resume>) => {
      state.resumes.push(action.payload);
    },

    deleteResume: (state, action: PayloadAction<string>) => {
      state.resumes = state.resumes.filter(resume => resume.id !== action.payload);
      // Also remove any tailored versions of this resume
      state.tailoredResumes = state.tailoredResumes.filter(
        tailored => tailored.originalResumeId !== action.payload
      );
    },

    setPrimaryResume: (state, action: PayloadAction<string>) => {
      state.resumes.forEach(resume => {
        resume.isPrimary = resume.id === action.payload;
      });
    },

    updateResumeName: (state, action: PayloadAction<{ id: string; name: string }>) => {
      const resume = state.resumes.find(r => r.id === action.payload.id);
      if (resume) {
        resume.name = action.payload.name;
      }
    },

    startResumeTailoring: (state, action: PayloadAction<ResumeTailoringRequest>) => {
      state.isProcessing = true;
      state.currentTailoringRequest = action.payload;
    },

    completeTailoring: (state, action: PayloadAction<TailoredResume>) => {
      state.isProcessing = false;
      state.currentTailoringRequest = null;
      state.tailoredResumes.push(action.payload);

      // Add to the original resume's tailored versions
      const originalResume = state.resumes.find(r => r.id === action.payload.originalResumeId);
      if (originalResume) {
        if (!originalResume.tailoredVersions) {
          originalResume.tailoredVersions = [];
        }
        originalResume.tailoredVersions.push(action.payload);
      }
    },

    failTailoring: (state) => {
      state.isProcessing = false;
      state.currentTailoringRequest = null;
    },

    loadTailoredResumes: (state, action: PayloadAction<TailoredResume[]>) => {
      state.tailoredResumes = action.payload;

      // Update the tailored versions in the original resumes
      state.resumes.forEach(resume => {
        resume.tailoredVersions = state.tailoredResumes.filter(
          tailored => tailored.originalResumeId === resume.id
        );
      });
    },

    clearTailoringHistory: (state) => {
      state.tailoredResumes = [];
      state.resumes.forEach(resume => {
        resume.tailoredVersions = [];
      });
    },

    deleteTailoredResume: (state, action: PayloadAction<string>) => {
      const tailoredResume = state.tailoredResumes.find(t => t.id === action.payload);
      if (tailoredResume) {
        // Remove from tailored resumes array
        state.tailoredResumes = state.tailoredResumes.filter(t => t.id !== action.payload);

        // Remove from original resume's tailored versions
        const originalResume = state.resumes.find(r => r.id === tailoredResume.originalResumeId);
        if (originalResume && originalResume.tailoredVersions) {
          originalResume.tailoredVersions = originalResume.tailoredVersions.filter(
            t => t.id !== action.payload
          );
        }
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchResumes.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchResumes.fulfilled, (state, action) => {
        state.loading = false;

        // Handle the combined payload
        // The payload now is { resumes: Resume[], tailoredResumes: TailoredResume[] }
        const payload = action.payload as { resumes: Resume[], tailoredResumes: TailoredResume[] };

        // Sometimes payload might still be array if we missed something (fallback safety)
        if (Array.isArray(payload)) {
          state.resumes = payload;
          state.tailoredResumes = [];
        } else {
          state.resumes = payload.resumes || [];
          state.tailoredResumes = payload.tailoredResumes || [];
        }

        // Link tailored tailored versions to original resumes
        state.resumes.forEach(resume => {
          resume.tailoredVersions = state.tailoredResumes.filter(
            tailored => tailored.originalResumeId === resume.id
          );
        });
      })
      .addCase(fetchResumes.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Upload
      .addCase(uploadResumeThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(uploadResumeThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.resumes.push(action.payload);
      })
      .addCase(uploadResumeThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Tailor
      .addCase(tailorResumeThunk.pending, (state) => {
        state.isProcessing = true;
      })
      .addCase(tailorResumeThunk.fulfilled, (state, action) => {
        state.isProcessing = false;
        // Logic for handling tailored resume return (might need adjustment based on API response)
        // For now, trust the component or separate logic handles specific tailoring state
      })
      .addCase(tailorResumeThunk.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      // Delete
      .addCase(deleteResumeThunk.fulfilled, (state, action) => {
        state.resumes = state.resumes.filter(resume => resume.id !== action.payload);
        state.tailoredResumes = state.tailoredResumes.filter(
          tailored => tailored.originalResumeId !== action.payload
        );
      })
      // Set Primary
      .addCase(setPrimaryResumeThunk.fulfilled, (state, action) => {
        state.resumes.forEach(resume => {
          resume.isPrimary = resume.id === action.payload;
        });
      })
      // Rename
      .addCase(renameResumeThunk.fulfilled, (state, action) => {
        const resume = state.resumes.find(r => r.id === action.payload.id);
        if (resume) {
          resume.name = action.payload.name;
        }
      })
      // Complete Tailoring
      .addCase(completeTailoringThunk.fulfilled, (state, action) => {
        state.isProcessing = false;
        state.currentTailoringRequest = null;

        // Add or Update in the list
        const index = state.tailoredResumes.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.tailoredResumes[index] = action.payload;
        } else {
          // Check if we have any with the same processing status/ID to avoid duplicates?
          // Actually, if ID is unique timestamp, it won't match.
          // The issue might be that we have a 'processing' item locally that we need to replace?
          // But completeTailoringThunk returns the updated object.
          state.tailoredResumes.push(action.payload);
        }

        // Update original resume's list
        const originalResume = state.resumes.find(r => r.id === action.payload.originalResumeId);
        if (originalResume) {
          if (!originalResume.tailoredVersions) originalResume.tailoredVersions = [];
          const vIndex = originalResume.tailoredVersions.findIndex(t => t.id === action.payload.id);
          if (vIndex !== -1) {
            originalResume.tailoredVersions[vIndex] = action.payload;
          } else {
            originalResume.tailoredVersions.push(action.payload);
          }
        }
      })
      .addCase(completeTailoringThunk.rejected, (state, action) => {
        state.isProcessing = false;
        state.error = action.payload as string;
      })
      .addCase(deleteTailoredResumeThunk.fulfilled, (state, action) => {
        // Remove from tailored resumes array
        state.tailoredResumes = state.tailoredResumes.filter(t => t.id !== action.payload);

        // Update the tailored versions in the original resumes
        state.resumes.forEach(resume => {
          if (resume.tailoredVersions) {
            resume.tailoredVersions = resume.tailoredVersions.filter(
              tailored => tailored.id !== action.payload
            );
          }
        });
      });
  }
});

export const {
  loadResumes,
  addResume,
  deleteResume,
  setPrimaryResume,
  updateResumeName,
  startResumeTailoring,
  completeTailoring,
  failTailoring,
  loadTailoredResumes,
  clearTailoringHistory,
  deleteTailoredResume,
} = resumeSlice.actions;

export default resumeSlice.reducer;