import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { format } from 'date-fns';
import {
  deleteResumeThunk,
  deleteTailoredResumeThunk,
  setPrimaryResumeThunk,
  renameResumeThunk,
  completeTailoring,
  deleteTailoredResume,
  uploadResumeThunk,
  tailorResumeThunk,
  completeTailoringThunk,
  fetchResumes
} from '../store/resumeSlice';
import apiService from '../services/apiService';
import { Resume, TailoredResume } from '../types';
import ResumeTailoringProcessor from '../components/ResumeTailoringProcessor';
import COLORS from '../constants/colors';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';

export default function ResumeScreen() {
  const dispatch: AppDispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const { currentUser } = useSelector((state: RootState) => state.user);
  const { resumes, tailoredResumes, isProcessing } = useSelector((state: RootState) => state.resume);

  const [showTailoringModal, setShowTailoringModal] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [selectedResumeForRename, setSelectedResumeForRename] = useState<Resume | null>(null);
  const [newResumeName, setNewResumeName] = useState('');
  const [currentTailoredResumeId, setCurrentTailoredResumeId] = useState<string | null>(null);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  const [tailoringForm, setTailoringForm] = useState({
    selectedResumeId: '',
    companyName: '',
    positionTitle: '',
    jobDescription: '',
  });

  const [showHelp, setShowHelp] = useState(false);

  const helpContent = `
**Resume Management**

Manage multiple versions of your resume and tailor them for specific job applications.

**Uploading a Resume:**
• Tap the "Upload Resume (PDF)" button at the bottom of the screen.
• Select a PDF file from your device.
• This will become your newest resume version.

**Setting Primary Resume:**
• Your "Primary Resume" is the default one used for quick applications.
• Tap "Set as Primary" on any resume card to make it your default.

**Tailoring for a Job:**
Create a custom version of your resume optimized for a specific job:
• Tap "Tailor to Job" on any resume card.
• Paste the Job Description and enter Company/Role details.
• Our AI will re-write your resume to highlight relevant skills and keywords.
• The tailored version will appear in the "Tailored Resumes" section.

**Managing Resumes:**
• Tap the "..." menu on any resume card to Rename or Delete it.
• You can preview any resume by tapping "Preview".
`;

  const primaryResume = resumes.find(resume => resume.isPrimary);

  const handleUploadResume = async () => {
    try {
      console.log('[ResumeScreen] Starting document picker...');
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
        multiple: false,
      });

      console.log('[ResumeScreen] Picker result:', result.canceled ? 'Canceled' : 'Selected');

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log('[ResumeScreen] File selected:', file.name, file.uri);

        if (!currentUser) {
          Alert.alert('Error', 'User not found. Please log in again.');
          return;
        }

        // Show loading state (optimistic or just alert)
        Alert.alert('Uploading...', 'Please wait while we upload your resume.');

        // Dispatch upload thunk
        const actionResult = await dispatch(uploadResumeThunk({
          userId: currentUser.id,
          file: file,
          name: file.name.replace('.pdf', '')
        }));

        if (uploadResumeThunk.fulfilled.match(actionResult)) {
          console.log('[ResumeScreen] Upload success');
          Alert.alert('Success', 'Resume uploaded successfully!');
        } else if (uploadResumeThunk.rejected.match(actionResult)) {
          const errorMsg = actionResult.payload as string || 'Unknown error';
          console.error('[ResumeScreen] Upload failed:', errorMsg);
          Alert.alert('Upload Failed', `Could not upload resume: ${errorMsg}`);
        }
      } else {
        console.log('[ResumeScreen] No file selected or cancelled');
      }
    } catch (error) {
      console.error('Error in handleUploadResume:', error);
      Alert.alert('Error', 'An unexpected error occurred while selecting the file.');
    }
  };

  const handleDeleteResume = async (resumeId: string) => {
    const resume = resumes.find(r => r.id === resumeId);
    if (!resume) return;

    Alert.alert(
      'Delete Resume',
      `Are you sure you want to delete "${resume.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Delete the physical file
            try {
              const fileInfo = await FileSystem.getInfoAsync(resume.fileUri);
              if (fileInfo.exists) {
                await FileSystem.deleteAsync(resume.fileUri);
              }
            } catch (error) {
              console.error('Error deleting file:', error);
            }

            // Delete from Redux and Backend
            if (currentUser?.id) {
              dispatch(deleteResumeThunk({ userId: currentUser.id, resumeId }));
            }
          },
        },
      ]
    );
  };

  const handleSetPrimary = (resumeId: string) => {
    if (currentUser?.id) {
      dispatch(setPrimaryResumeThunk({ userId: currentUser.id, resumeId }));
    }
  };

  const handleRenameResume = () => {
    if (!selectedResumeForRename || !newResumeName.trim()) return;

    if (currentUser?.id) {
      dispatch(renameResumeThunk({
        userId: currentUser.id,
        resumeId: selectedResumeForRename.id,
        name: newResumeName.trim(),
      }));
    }

    setShowRenameModal(false);
    setSelectedResumeForRename(null);
    setNewResumeName('');
  };

  const openRenameModal = (resume: Resume) => {
    setSelectedResumeForRename(resume);
    setNewResumeName(resume.name);
    setShowRenameModal(true);
  };

  const handleStartTailoring = async () => {
    if (!tailoringForm.selectedResumeId || !tailoringForm.companyName.trim() ||
      !tailoringForm.positionTitle.trim() || !tailoringForm.jobDescription.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    const selectedResume = resumes.find(r => r.id === tailoringForm.selectedResumeId);

    if (currentUser?.id && selectedResume) {
      // Reset ID before starting
      setCurrentTailoredResumeId(null);

      const resultAction = await dispatch(tailorResumeThunk({
        userId: currentUser.id,
        resumeId: selectedResume.id,
        jobDescription: tailoringForm.jobDescription.trim(),
        jobTitle: tailoringForm.positionTitle.trim(),
        companyName: tailoringForm.companyName.trim()
      }));

      if (tailorResumeThunk.fulfilled.match(resultAction)) {
        const payload = resultAction.payload as any;
        if (payload.id) {
          setCurrentTailoredResumeId(payload.id);

          setShowTailoringModal(false);
          // Add a small delay to allow the first modal to close completely before opening the next one
          setTimeout(() => {
            setShowProcessingModal(true);
          }, 500);
        } else {
          Alert.alert('Error', 'Failed to start tailoring: Invalid response from server');
        }
      } else {
        const errorMsg = typeof resultAction.payload === 'string' ? resultAction.payload : 'Unknown error';
        Alert.alert('Error', `Failed to start tailoring: ${errorMsg}`);
      }
    }
  };

  const handleTailoringComplete = async (tempFileUri: string) => {
    try {
      // 1. Move file to persistent storage
      // 1. We NO LONGER move to permanent local storage manually.
      // We upload the temp file directly to the backend.
      // const fileName = `tailored-${Date.now()}.pdf`;
      // const permanentUri = `${FileSystem.documentDirectory}${fileName}`;
      // await FileSystem.moveAsync(...) <-- Removed

      const fileToUpload = tempFileUri; // Use the temp file generated by the PDF creator

      // 2. Update backend/redux (Uploads the file)
      if (currentUser?.id && currentTailoredResumeId) {
        await dispatch(completeTailoringThunk({
          userId: currentUser.id,
          tailoredResumeId: currentTailoredResumeId,
          fileUri: fileToUpload
        }));
      } else {
        console.error('Missing user ID or tailored resume ID');
      }

      setShowProcessingModal(false);
      setTailoringForm({
        selectedResumeId: '',
        companyName: '',
        positionTitle: '',
        jobDescription: '',
      });
      setCurrentTailoredResumeId(null);
      Alert.alert('Success', 'Resume tailored and saved successfully!');

    } catch (error) {
      console.error('Error saving tailored resume:', error);
      Alert.alert('Error', 'Failed to save generated resume.');
      setShowProcessingModal(false);
    }
  };

  const handlePreviewTailoredResume = async (resume: TailoredResume) => {
    if (!resume.fileUri) {
      Alert.alert('Preview Unavailable', 'The file for this tailored resume is missing.');
      return;
    }

    try {
      let previewUri = resume.fileUri;

      // Check if it's a remote URL (starts with /api or http)
      const isRemote = previewUri.startsWith('/api') || previewUri.startsWith('http');

      if (isRemote) {
        // Construct full URL
        const fullUrl = previewUri.startsWith('http') ? previewUri : `${apiService.getBaseURL()}${previewUri}`;
        const localFileName = `${resume.id}-tailored.pdf`;
        const localPath = `${FileSystem.documentDirectory}${localFileName}`;

        // Download using authenticated helper
        await apiService.downloadFile(fullUrl, localPath);
        previewUri = localPath;
      } else {
        // Legacy: Check local file existence
        const fileInfo = await FileSystem.getInfoAsync(previewUri);
        if (!fileInfo.exists) {
          Alert.alert('Error', 'File not found locally. It may have been deleted.');
          return;
        }
      }

      setPreviewUri(previewUri);
    } catch (error) {
      console.error('Error previewing resume:', error);
      Alert.alert('Error', 'Failed to download or open resume preview');
    }
  };

  const handleDeleteTailoredResume = (id: string) => {
    Alert.alert(
      'Delete Tailored Resume',
      'Are you sure you want to delete this tailored resume?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // Use the thunk to delete from backend AND redux
            if (currentUser?.id) {
              await dispatch(deleteTailoredResumeThunk({ userId: currentUser.id, tailoredResumeId: id }));
            }
          }
        }
      ]
    );

  };

  const handleShareTailoredResume = async (resume: TailoredResume) => {
    if (!resume.fileUri) {
      Alert.alert('Share Unavailable', 'The file for this tailored resume is missing.');
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Error', 'Sharing is not available on this device');
        return;
      }

      let shareUri = resume.fileUri;

      // Check if it's a remote URL (starts with /api or http)
      const isRemote = shareUri.startsWith('/api') || shareUri.startsWith('http');

      if (isRemote) {
        // Construct full URL
        const fullUrl = shareUri.startsWith('http') ? shareUri : `${apiService.getBaseURL()}${shareUri}`;

        // We need a local file to share
        const localFileName = `${resume.id}-tailored-share.pdf`;
        const localPath = `${FileSystem.documentDirectory}${localFileName}`;

        // Download using authenticated helper
        await apiService.downloadFile(fullUrl, localPath);
        shareUri = localPath;
      }

      await Sharing.shareAsync(shareUri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: `Share Tailored Resume - ${resume.positionTitle}`
      });

    } catch (error) {
      console.error('Error sharing resume:', error);
      Alert.alert('Error', 'Failed to share resume');
    }
  };

  const ResumeCard = ({ resume }: { resume: Resume }) => (
    <View style={styles.resumeCard}>
      <View style={styles.resumeHeader}>
        <View style={styles.resumeInfo}>
          <View style={styles.resumeNameContainer}>
            <Ionicons name="document-text" size={20} color={COLORS.primary} />
            <Text style={styles.resumeName}>{resume.name}</Text>
            {resume.isPrimary && (
              <View style={styles.primaryBadge}>
                <Text style={styles.primaryText}>Primary</Text>
              </View>
            )}
          </View>
          <Text style={styles.resumeDate}>
            Uploaded {format(new Date(resume.uploadedAt), 'MMM dd, yyyy')}
          </Text>
          {resume.tailoredVersions && resume.tailoredVersions.length > 0 && (
            <Text style={styles.tailoredCount}>
              {resume.tailoredVersions.length} tailored version{resume.tailoredVersions.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
        <View style={styles.resumeActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openRenameModal(resume)}
          >
            <Ionicons name="pencil" size={16} color="#6b7280" />
          </TouchableOpacity>
          {!resume.isPrimary && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSetPrimary(resume.id)}
            >
              <Ionicons name="star-outline" size={16} color="#f59e0b" />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleDeleteResume(resume.id)}
          >
            <Ionicons name="trash-outline" size={16} color="#dc2626" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const TailoredResumeCard = ({ tailored }: { tailored: TailoredResume }) => {
    const originalResume = resumes.find(r => r.id === tailored.originalResumeId);

    return (
      <TouchableOpacity
        style={styles.tailoredCard}
        onPress={() => handlePreviewTailoredResume(tailored)}
        activeOpacity={0.7}
      >
        <View style={styles.tailoredHeaderContainer}>
          <View style={styles.tailoredHeaderInfo}>
            <View style={styles.tailoredHeader}>
              <Ionicons name="document" size={20} color="#059669" />
              <Text style={styles.tailoredTitle}>
                {tailored.positionTitle} at {tailored.companyName}
              </Text>
            </View>
            <Text style={styles.tailoredSubtitle}>
              Based on: {originalResume?.name || 'Unknown Resume'}
            </Text>
            <Text style={styles.tailoredDate}>
              Tailored {(() => {
                if (!tailored.tailoredAt) return 'Just now';
                const date = new Date(tailored.tailoredAt);
                return !isNaN(date.getTime())
                  ? format(date, 'MMM dd, yyyy')
                  : 'Just now';
              })()}
            </Text>
          </View>

          <View style={styles.tailoredActions}>
            <TouchableOpacity
              style={styles.shareTailoredButton}
              onPress={() => handleShareTailoredResume(tailored)}
            >
              <Ionicons name="share-outline" size={20} color={COLORS.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteTailoredButton}
              onPress={() => handleDeleteTailoredResume(tailored.id)}
            >
              <Ionicons name="trash-outline" size={20} color="#ef4444" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderPreviewModal = () => (
    <Modal
      visible={!!previewUri}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setPreviewUri(null)}
    >
      <View style={styles.previewModalContainer}>
        <View style={styles.previewHeader}>
          <Text style={styles.previewTitle}>Resume Preview</Text>
          <TouchableOpacity onPress={() => setPreviewUri(null)} style={styles.closePreviewButton}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        {previewUri && (
          <WebView
            source={{ uri: previewUri }}
            style={styles.webview}
            originWhitelist={['*']}
            allowFileAccess={true}
            allowFileAccessFromFileURLs={true}
            startInLoadingState
            renderLoading={() => (
              <View style={styles.webviewLoading}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 2, 28) }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Resume Manager</Text>
          <HelpButton onPress={() => setShowHelp(true)} />
        </View>
        <Text style={styles.subtitle}>Upload and tailor your resumes for specific jobs</Text>
      </View>

      <HelpModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title="Resume Help"
        content={helpContent}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: 60 }}
      >

        {/* Primary Resume Section */}
        {primaryResume && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Primary Resume</Text>
            <ResumeCard resume={primaryResume} />
          </View>
        )}

        {/* Upload Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Resume</Text>
          <TouchableOpacity style={styles.uploadButton} onPress={handleUploadResume}>
            <Ionicons name="cloud-upload-outline" size={24} color={COLORS.primary} />
            <Text style={styles.uploadButtonText}>Upload PDF Resume</Text>
            <Text style={styles.uploadSubtext}>PDF files only</Text>
          </TouchableOpacity>
        </View>

        {/* All Resumes Section */}
        {resumes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>My Resumes ({resumes.length})</Text>
            {resumes.map((resume, index) => (
              <ResumeCard key={resume.id || `resume-val-${index}`} resume={resume} />
            ))}
          </View>
        )}

        {/* Resume Tailoring Section */}
        {resumes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resume Tailoring</Text>
            <TouchableOpacity
              style={styles.tailorButton}
              onPress={() => setShowTailoringModal(true)}
            >
              <Ionicons name="construct-outline" size={24} color="white" />
              <Text style={styles.tailorButtonText}>Tailor Resume for Job</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Tailoring History */}
        {tailoredResumes.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tailoring History ({tailoredResumes.length})</Text>
            {tailoredResumes.map((tailored, index) => (
              <TailoredResumeCard key={tailored.id || `tailored-val-${index}`} tailored={tailored} />
            ))}
          </View>
        )}

        {/* Empty State */}
        {resumes.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateTitle}>No resumes uploaded</Text>
            <Text style={styles.emptyStateText}>
              Upload your first resume to get started with resume tailoring
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Tailoring Modal */}
      <Modal
        visible={showTailoringModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTailoringModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Tailor Resume</Text>
            <TouchableOpacity onPress={handleStartTailoring}>
              <Text style={styles.saveButton}>Start Tailoring</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.inputLabel}>Select Resume *</Text>
            <View style={styles.resumeSelector}>
              {resumes.map((resume, index) => (
                <TouchableOpacity
                  key={resume.id || `resume-opt-${index}`}
                  style={[
                    styles.resumeOption,
                    tailoringForm.selectedResumeId === resume.id && styles.selectedResumeOption,
                  ]}
                  onPress={() => setTailoringForm({ ...tailoringForm, selectedResumeId: resume.id })}
                >
                  <Ionicons
                    name={tailoringForm.selectedResumeId === resume.id ? "radio-button-on" : "radio-button-off"}
                    size={20}
                    color={tailoringForm.selectedResumeId === resume.id ? COLORS.primary : "#9ca3af"}
                  />
                  <Text style={[
                    styles.resumeOptionText,
                    tailoringForm.selectedResumeId === resume.id && styles.selectedResumeOptionText,
                  ]}>
                    {resume.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Company Name *</Text>
            <TextInput
              style={styles.input}
              value={tailoringForm.companyName}
              onChangeText={(text) => setTailoringForm({ ...tailoringForm, companyName: text })}
              placeholder="Enter company name"
            />

            <Text style={styles.inputLabel}>Position Title *</Text>
            <TextInput
              style={styles.input}
              value={tailoringForm.positionTitle}
              onChangeText={(text) => setTailoringForm({ ...tailoringForm, positionTitle: text })}
              placeholder="Enter position title"
            />

            <Text style={styles.inputLabel}>Job Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={tailoringForm.jobDescription}
              onChangeText={(text) => setTailoringForm({ ...tailoringForm, jobDescription: text })}
              placeholder="Paste the job description here..."
              multiline
              numberOfLines={8}
            />
          </ScrollView>
        </View>
      </Modal>

      {/* Rename Modal */}
      <Modal
        visible={showRenameModal}
        animationType="fade"
        transparent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.renameModal}>
            <Text style={styles.renameModalTitle}>Rename Resume</Text>
            <TextInput
              style={styles.renameInput}
              value={newResumeName}
              onChangeText={setNewResumeName}
              placeholder="Enter new name"
              autoFocus
            />
            <View style={styles.renameModalActions}>
              <TouchableOpacity
                style={styles.cancelRenameButton}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.cancelRenameText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveRenameButton}
                onPress={handleRenameResume}
              >
                <Text style={styles.saveRenameText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Processing Modal */}
      <ResumeTailoringProcessor
        visible={showProcessingModal}
        onComplete={handleTailoringComplete}
        companyName={tailoringForm.companyName}
        positionTitle={tailoringForm.positionTitle}
        jobDescription={tailoringForm.jobDescription}
        resumeUri={resumes.find(r => r.id === tailoringForm.selectedResumeId)?.fileUri || ''}
        onClose={() => setShowProcessingModal(false)}
      />

      {/* Preview Modal */}
      {renderPreviewModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 0,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
    flexShrink: 1, // Prevent text from overlapping button
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    flexShrink: 1,
  },
  section: {
    margin: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  uploadButton: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginTop: 8,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  resumeCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  resumeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resumeInfo: {
    flex: 1,
  },
  resumeNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resumeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  primaryBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  primaryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#92400e',
  },
  resumeDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  tailoredCount: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '500',
  },
  loaderText: {
    marginTop: 12,
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resumeActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  tailorButton: {
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  tailorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tailoredCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  tailoredHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tailoredTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  tailoredSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  tailoredDate: {
    fontSize: 12,
    color: '#059669',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  saveButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  resumeSelector: {
    gap: 12,
  },
  resumeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  selectedResumeOption: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  resumeOptionText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  selectedResumeOptionText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  renameModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 280,
  },
  renameModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  renameInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 20,
  },
  renameModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelRenameButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  cancelRenameText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  saveRenameButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  saveRenameText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  tailoredHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tailoredHeaderInfo: {
    flex: 1,
  },
  deleteTailoredButton: {
    padding: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    marginLeft: 8,
  },
  tailoredActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shareTailoredButton: {
    padding: 8,
    backgroundColor: '#e0f2fe',
    borderRadius: 8,
    marginLeft: 8,
  },
  previewModalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closePreviewButton: {
    padding: 4,
  },
  webview: {
    flex: 1,
  },
  webviewLoading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
});
