# Internal Developer Documentation

## 1. Architecture Overview
**Poros Client** is a React Native iOS application built with Expo. It follows a **Redux-First** architecture where the UI only interacts with the global store, and the store manages all asynchronous API calls via `createAsyncThunk`.

### Key Technologies
- **Framework**: React Native (Expo)
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation (Stack)
- **API Client**: Custom `ApiService` class (Fetch API)
- **Persistence**: `AsyncStorage` (legacy/cache) + **Cloud Sync** (Supabase)

---

## 2. API Service Layer (`src/services/apiService.ts`)
The `ApiService` class is a singleton that handles all HTTP communication with the backend. It manages the JWT authentication token automatically.

### Class: `ApiService`

#### `login(email, password)`
Authenticates an existing user and stores the JWT token.
- **param** `email` (string): User's email address.
- **param** `password` (string): User's password.
- **returns**: `Promise<ApiResponse<User>>`

#### `signup(userData)`
Registers a new user account.
- **param** `userData` (object): { name, email, password, confirmPassword, ... }
- **returns**: `Promise<ApiResponse<User>>`

#### `getResumes(userId)`
Fetches all resumes associated with the user.
- **param** `userId` (string): The UUID of the user.
- **returns**: `Promise<ApiResponse<Resume[]>>`

#### `uploadResume(userId, file)`
Uploads a standard PDF resume to Cloud Storage (Supabase BYTEA).
- **param** `userId` (string): The UUID of the user.
- **param** `file` (object): { uri, name, mimeType } from DocumentPicker.
- **returns**: `Promise<ApiResponse<Resume>>`

#### `tailorResume(request)`
Triggers the AI service to generate a tailored resume based on a job description.
- **param** `request` (object): { resumeId, jobDescription, companyName, ... }
- **returns**: `Promise<ApiResponse<TailoredResume>>`

#### `downloadFile(downloadUrl, localPath)`
Downloads a secure (authenticated) file from the backend to the local device file system.
- **param** `downloadUrl` (string): The /api/download endpoint.
- **param** `localPath` (string): The local file URI target.
- **returns**: `Promise<string>` (The local URI)

---

## 3. Data Models (`src/types/index.ts`)

### `User`
Primary user profile.
- `id`: UUID
- `targetCompanies`: Array of Company IDs (strings).

### `Resume`
Metadata for an uploaded resume file.
- `fileUri`: The *download* URL for the file (e.g., `/api/resumes/123/download`).
- `tailoredVersions`: Array of `TailoredResume` objects derived from this master resume.

### `TailoredResume`
A specific version of a resume customized for a job application.
- `jobDescription`: The text analysis used for tailoring.
- `processingStatus`: 'processing' | 'completed' | 'failed'.

### `Application`
A job application tracker item.
- `status`: 'Applied' | 'Interview' | 'Offer' | 'Rejected'.
- `timeline`: JSONB object tracking usage.

---

## 4. State Management (Redux)
Located in `src/store/`.

- **`userSlice`**: Manages Auth state (`token`, `currentUser`) and Profile data.
- **`resumeSlice`**: Manages the list of `resumes` and `tailoredResumes`. Handles uploading and tailoring thunks.
- **`applicationsSlice`**: CRUD operations for the Job Tracker board.
- **`checklistSlice`**: Tracks completion status of company preparation tasks.

---

## 5. Security Notes
- **JWT Tokens**: Stored in `AsyncStorage` securely.
- **File Access**: All download endpoints are protected; the client must send the `Authorization: Bearer` header (handled by `apiService`).
