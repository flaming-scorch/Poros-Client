import * as FileSystem from 'expo-file-system/legacy';
import apiService from './apiService';

export interface JobDetails {
  companyName: string;
  positionTitle: string;
  jobDescription: string;
}

export const tailorResume = async (
  resumeUri: string,
  jobDetails: JobDetails,
): Promise<string> => {
  let resolvedResumeUri = resumeUri;
  let fileToRead = resolvedResumeUri;
  let temporaryFile: string | null = null;

  try {
    const hasScheme = resolvedResumeUri.startsWith('http')
      || resolvedResumeUri.startsWith('file:')
      || resolvedResumeUri.startsWith('content:');

    if (!hasScheme) {
      const cleanPath = resolvedResumeUri.startsWith('/')
        ? resolvedResumeUri
        : `/${resolvedResumeUri}`;
      resolvedResumeUri = `${apiService.getBaseURL()}${cleanPath}`;
    }

    if (resolvedResumeUri.startsWith('http')) {
      temporaryFile = `${FileSystem.cacheDirectory}resume_${Date.now()}.pdf`;
      // Never forward a Poros JWT to an external storage host.
      const isBackendDownload = new URL(resolvedResumeUri).origin
        === new URL(apiService.getBaseURL()).origin;
      const authHeaders = isBackendDownload ? await apiService.getAuthHeaders() : {};
      const download = await FileSystem.downloadAsync(
        resolvedResumeUri,
        temporaryFile,
        { headers: authHeaders },
      );
      if (download.status < 200 || download.status >= 300) {
        throw new Error('Resume download failed');
      }
      fileToRead = download.uri;
    }

    const resumeBase64 = await FileSystem.readAsStringAsync(fileToRead, {
      encoding: 'base64',
    });

    const authHeaders = await apiService.getAuthHeaders();
    const response = await fetch(
      `${apiService.getBaseURL()}/api/ai/tailor-resume`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
        },
        body: JSON.stringify({ resumeBase64, jobDetails }),
      },
    );

    const data = await response.json() as { html?: string; error?: string };

    if (!response.ok || !data.html) {
      throw new Error(data.error || 'Resume tailoring failed');
    }

    return data.html;
  } finally {
    if (temporaryFile) {
      await FileSystem.deleteAsync(temporaryFile, { idempotent: true });
    }
  }
};
