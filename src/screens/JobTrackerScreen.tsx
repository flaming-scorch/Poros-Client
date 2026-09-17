import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  Linking,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  addApplicationThunk,
  updateApplicationThunk,
  deleteApplicationThunk,
  setWeeklyGoal,
  setFilterStatus,
  fetchApplications
} from '../store/applicationsSlice';
import { Application, ApplicationStatus } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import COLORS from '../constants/colors';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';

export default function JobTrackerScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation<NavigationProp<any>>();
  const { currentUser } = useSelector((state: RootState) => state.user);
  const { applications, weeklyGoal } = useSelector((state: RootState) => state.applications);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  const [filterStatus, setFilterStatus] = useState<ApplicationStatus | 'All'>('All');
  const [showHelp, setShowHelp] = useState(false);

  const [formData, setFormData] = useState({
    company: '',
    role: '',
    location: '',
    jobLink: '',
    notes: '',
  });

  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);

  // Application detail modal state
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const [goalInput, setGoalInput] = useState(weeklyGoal.toString());

  const helpContent = `
**Tracking Your Applications**

Keep track of all your job applications in one place.

**Adding an application:**
• Tap the blue + button at the bottom right
• Enter the company name and role (required)
• Add job link, location, and notes (optional)
• Tap "Save" to add it to your tracker

**Viewing applications:**
• Tap "All" to see everything
• Tap a status (Applied, Interview, etc.) to filter
• Tap any card to see full details

**Managing applications:**
• Long press any card to enter selection mode
• Select multiple applications to delete in bulk
• Tap a card in detail view to update its status

**Setting your weekly goal:**
Tap "Goal" in the header to set how many applications you want to submit each week.
`;

  const filteredApplications = applications.filter(app =>
    filterStatus === 'All' || app.status === filterStatus
  );

  const statusCounts = {
    Applied: applications.filter(app => app.status === 'Applied').length,
    Interview: applications.filter(app => app.status === 'Interview').length,
    Offer: applications.filter(app => app.status === 'Offer').length,
    Rejected: applications.filter(app => app.status === 'Rejected').length,
  };

  const handleAddApplication = () => {
    if (!formData.company || !formData.role) {
      Alert.alert('Error', 'Please fill in company and role fields');
      return;
    }

    const applicationData = {
      company: formData.company,
      role: formData.role,
      location: formData.location || 'Not specified',
      jobLink: formData.jobLink,
      notes: formData.notes,
    };

    if (editingApplication && currentUser?.id) {
      // Update existing application
      dispatch(updateApplicationThunk({
        userId: currentUser.id,
        applicationId: editingApplication.id,
        updates: {
          ...applicationData,
        }
      }));
      setEditingApplication(null);
    } else if (currentUser?.id) {
      // Create new application
      const newApplication: Application = {
        id: Date.now().toString(),
        ...applicationData,
        status: 'Applied',
        appliedDate: new Date().toISOString(),
      };
      dispatch(addApplicationThunk({ userId: currentUser.id, application: newApplication }));
    }

    setFormData({ company: '', role: '', location: '', jobLink: '', notes: '' });
    setShowAddModal(false);
  };

  const handleStatusChange = (id: string, newStatus: ApplicationStatus) => {
    if (currentUser?.id) {
      dispatch(updateApplicationThunk({
        userId: currentUser.id,
        applicationId: id,
        updates: {
          status: newStatus,
        }
      }));
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Application',
      'Are you sure you want to delete this application?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (currentUser?.id) {
              dispatch(deleteApplicationThunk({ userId: currentUser.id, applicationId: id }));
            }
          }
        },
      ]
    );
  };

  const handleUpdateGoal = () => {
    const newGoal = parseInt(goalInput);
    if (newGoal >= 1 && newGoal <= 50) {
      dispatch(setWeeklyGoal(newGoal));
      setShowGoalModal(false);
    } else {
      Alert.alert('Error', 'Weekly goal must be between 1 and 50');
    }
  };

  const handleLongPress = (applicationId: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
      setSelectedApplications([applicationId]);
    }
  };

  const handleCardPress = (applicationId: string) => {
    if (isSelectionMode) {
      toggleSelection(applicationId);
    } else {
      const application = applications.find(app => app.id === applicationId);
      if (application) {
        setSelectedApplication(application);
        setShowDetailModal(true);
      }
    }
  };

  const toggleSelection = (applicationId: string) => {
    setSelectedApplications(prev =>
      prev.includes(applicationId)
        ? prev.filter(id => id !== applicationId)
        : [...prev, applicationId]
    );
  };

  const selectAll = () => {
    setSelectedApplications(filteredApplications.map(app => app.id));
  };

  const deselectAll = () => {
    setSelectedApplications([]);
  };

  const exitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedApplications([]);
  };

  const handleBulkDelete = () => {
    Alert.alert(
      'Delete Applications',
      `Are you sure you want to delete ${selectedApplications.length} application(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            if (currentUser?.id) {
              selectedApplications.forEach(id => dispatch(deleteApplicationThunk({ userId: currentUser.id, applicationId: id })));
            }
            exitSelectionMode();
          },
        },
      ]
    );
  };

  const openJobLink = (jobLink: string) => {
    if (jobLink) {
      Linking.openURL(jobLink).catch(() => {
        Alert.alert('Error', 'Could not open job link');
      });
    }
  };

  const getStatusColor = (status: ApplicationStatus) => {
    switch (status) {
      case 'Applied': return COLORS.primary;
      case 'Interview': return '#059669';
      case 'Offer': return '#f59e0b';
      case 'Rejected': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getNextStatus = (currentStatus: ApplicationStatus): ApplicationStatus | null => {
    switch (currentStatus) {
      case 'Applied': return 'Interview';
      case 'Interview': return 'Offer';
      default: return null;
    }
  };

  const StatusDropdown = ({ currentStatus, onStatusChange }: {
    currentStatus: ApplicationStatus;
    onStatusChange: (status: ApplicationStatus) => void;
  }) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const statusOptions: ApplicationStatus[] = ['Applied', 'Interview', 'Offer', 'Rejected'];

    return (
      <View style={styles.statusDropdownContainer}>
        <TouchableOpacity
          style={[styles.statusDropdownButton, { backgroundColor: getStatusColor(currentStatus) }]}
          onPress={() => setShowDropdown(!showDropdown)}
        >
          <Text style={styles.statusDropdownText}>{currentStatus}</Text>
          <Ionicons name="chevron-down" size={16} color="white" />
        </TouchableOpacity>

        {showDropdown && (
          <View style={styles.statusDropdownMenu}>
            {statusOptions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusDropdownOption,
                  status === currentStatus && styles.statusDropdownOptionActive
                ]}
                onPress={() => {
                  onStatusChange(status);
                  setShowDropdown(false);
                }}
              >
                <Text style={[
                  styles.statusDropdownOptionText,
                  status === currentStatus && styles.statusDropdownOptionTextActive
                ]}>
                  {status}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const ApplicationCard = ({ application }: { application: Application }) => {
    const isSelected = selectedApplications.includes(application.id);

    return (
      <TouchableOpacity
        style={[
          styles.applicationCard,
          isSelected && styles.selectedCard,
        ]}
        onPress={() => handleCardPress(application.id)}
        onLongPress={() => handleLongPress(application.id)}
        activeOpacity={0.7}
      >
        {isSelectionMode && (
          <View style={styles.selectionIndicator}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={20}
              color={isSelected ? COLORS.primary : '#6b7280'}
            />
          </View>
        )}

        <View style={styles.compactCardContent}>
          <View style={styles.compactHeader}>
            <Text style={styles.compactCompanyName}>{application.company}</Text>
            <View style={[styles.compactStatusBadge, { backgroundColor: getStatusColor(application.status) }]}>
              <Text style={styles.compactStatusText}>{application.status}</Text>
            </View>
          </View>

          <Text style={styles.compactRoleName}>{application.role}</Text>

          <Text style={styles.compactDate}>
            Applied {format(new Date(application.appliedDate), 'MMM dd, yyyy')}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 12, 23) }]}>
          {isSelectionMode ? (
            <>
              <View style={styles.selectionHeader}>
                <TouchableOpacity
                  style={styles.exitSelectionButton}
                  onPress={exitSelectionMode}
                >
                  <Ionicons name="close" size={24} color="#1f2937" />
                </TouchableOpacity>
                <Text style={styles.selectionTitle}>
                  {selectedApplications.length} selected
                </Text>
                <View style={styles.selectionActions}>
                  <TouchableOpacity
                    style={styles.selectionActionButton}
                    onPress={selectedApplications.length === filteredApplications.length ? deselectAll : selectAll}
                  >
                    <Text style={styles.selectionActionText}>
                      {selectedApplications.length === filteredApplications.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                  {selectedApplications.length > 0 && (
                    <TouchableOpacity
                      style={styles.deleteSelectionButton}
                      onPress={handleBulkDelete}
                    >
                      <Ionicons name="trash-outline" size={20} color="#dc2626" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>Job Tracker</Text>
              <View style={styles.headerActions}>
                <HelpButton onPress={() => setShowHelp(true)} />
                <TouchableOpacity
                  style={styles.goalButton}
                  onPress={() => setShowGoalModal(true)}
                  accessibilityLabel="Set weekly application goal"
                  accessibilityRole="button"
                >
                  <Ionicons name="analytics-outline" size={20} color="#8b5cf6" />
                  <Text style={styles.goalButtonText}>Goal: {weeklyGoal}/week</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <HelpModal
          visible={showHelp}
          onClose={() => setShowHelp(false)}
          title="Job Tracker Help"
          content={helpContent}
        />


        <View style={styles.statsOverview}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
            <TouchableOpacity
              style={[styles.statChip, filterStatus === 'All' && styles.activeChip]}
              onPress={() => setFilterStatus('All')}
              accessibilityLabel={`Show all applications, ${applications.length} total`}
              accessibilityRole="tab"
              accessibilityState={{ selected: filterStatus === 'All' }}
            >
              <Text style={[styles.statChipText, filterStatus === 'All' && styles.activeChipText]}>
                All ({applications.length})
              </Text>
            </TouchableOpacity>
            {Object.entries(statusCounts).map(([status, count]) => (
              <TouchableOpacity
                key={status}
                style={[styles.statChip, filterStatus === status && styles.activeChip]}
                onPress={() => setFilterStatus(status as ApplicationStatus)}
                accessibilityLabel={`Show ${status.toLowerCase()} applications, ${count} total`}
                accessibilityRole="tab"
                accessibilityState={{ selected: filterStatus === status }}
              >
                <Text style={[styles.statChipText, filterStatus === status && styles.activeChipText]}>
                  {status} ({count})
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <ScrollView style={styles.applicationsList}>
          {filteredApplications.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="briefcase-outline" size={64} color="#9ca3af" />
              <Text style={styles.emptyStateTitle}>No applications yet</Text>
              <Text style={styles.emptyStateText}>
                {filterStatus === 'All'
                  ? 'Start tracking your job applications by adding your first one!'
                  : `No applications with status "${filterStatus}"`
                }
              </Text>
              {filterStatus === 'All' && (
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={() => setShowAddModal(true)}
                  accessibilityLabel="Add your first job application"
                  accessibilityRole="button"
                >
                  <Ionicons name="add" size={20} color="white" />
                  <Text style={styles.emptyStateButtonText}>Add Your First Application</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredApplications.map((application) => (
              <ApplicationCard key={application.id} application={application} />
            ))
          )}
        </ScrollView>

        {/* Floating Action Button */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setShowAddModal(true)}
          accessibilityLabel="Add new job application"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Add Application Modal */}
      <Modal visible={showAddModal} animationType="slide" presentationStyle="pageSheet">
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.select({ ios: 'padding', android: 'height' })}
          keyboardVerticalOffset={0}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {editingApplication ? 'Edit Application' : 'Add Application'}
            </Text>
            <TouchableOpacity onPress={handleAddApplication}>
              <Text style={styles.saveButton}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={styles.modalScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <Text style={styles.inputLabel}>Company *</Text>
            <TextInput
              style={styles.input}
              value={formData.company}
              onChangeText={(text) => setFormData({ ...formData, company: text })}
              placeholder="Enter company name"
            />

            <Text style={styles.inputLabel}>Role *</Text>
            <TextInput
              style={styles.input}
              value={formData.role}
              onChangeText={(text) => setFormData({ ...formData, role: text })}
              placeholder="Enter role title"
            />

            <Text style={styles.inputLabel}>Job Link</Text>
            <TextInput
              style={styles.input}
              value={formData.jobLink}
              onChangeText={(text) => setFormData({ ...formData, jobLink: text })}
              placeholder="Enter job posting URL"
              keyboardType="url"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput
              style={styles.input}
              value={formData.location}
              onChangeText={(text) => setFormData({ ...formData, location: text })}
              placeholder="Enter location"
            />

            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={formData.notes}
              onChangeText={(text) => setFormData({ ...formData, notes: text })}
              placeholder="Add any notes about this application"
              multiline
              numberOfLines={4}
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Weekly Goal Modal */}
      <Modal visible={showGoalModal} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.goalModal}>
            <Text style={styles.goalModalTitle}>Set Weekly Goal</Text>
            <Text style={styles.goalModalSubtitle}>How many applications per week?</Text>
            <TextInput
              style={styles.goalInput}
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="numeric"
              placeholder="Enter goal (1-50)"
            />
            <View style={styles.goalModalActions}>
              <TouchableOpacity
                style={styles.goalCancelButton}
                onPress={() => setShowGoalModal(false)}
              >
                <Text style={styles.goalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.goalSaveButton}
                onPress={handleUpdateGoal}
              >
                <Text style={styles.goalSaveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Application Detail Modal */}
      <Modal
        visible={showDetailModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedApplication && (
          <View style={styles.detailModalContainer}>
            <View style={styles.detailModalHeader}>
              <TouchableOpacity onPress={() => setShowDetailModal(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
              <Text style={styles.detailModalTitle}>Application Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setEditingApplication(selectedApplication);
                  setFormData({
                    company: selectedApplication.company,
                    role: selectedApplication.role,
                    location: selectedApplication.location,
                    jobLink: selectedApplication.jobLink || '',
                    notes: selectedApplication.notes || '',
                  });
                  setShowDetailModal(false);
                  setShowAddModal(true);
                }}
              >
                <Ionicons name="pencil" size={24} color={COLORS.primary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.detailModalContent}>
              <View style={styles.detailCompanyHeader}>
                <View style={[styles.detailCompanyAvatar, { backgroundColor: getAvatarColor(selectedApplication.company) }]}>
                  <Text style={styles.detailAvatarText}>
                    {selectedApplication.company.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.detailCompanyInfo}>
                  <Text style={styles.detailCompanyName}>{selectedApplication.company}</Text>
                  <Text style={styles.detailRoleName}>{selectedApplication.role}</Text>
                </View>
              </View>

              <View style={[styles.detailSection, styles.statusSection]}>
                <Text style={styles.detailSectionTitle}>Application Status</Text>
                <StatusDropdown
                  currentStatus={selectedApplication.status}
                  onStatusChange={(newStatus) => {
                    handleStatusChange(selectedApplication.id, newStatus);
                    setSelectedApplication({ ...selectedApplication, status: newStatus });
                  }}
                />
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Application Date</Text>
                <Text style={styles.detailText}>
                  {format(new Date(selectedApplication.appliedDate), 'MMMM dd, yyyy')}
                </Text>
              </View>

              {selectedApplication.location !== 'Not specified' && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Location</Text>
                  <Text style={styles.detailText}>{selectedApplication.location}</Text>
                </View>
              )}

              {selectedApplication.notes && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Notes</Text>
                  <Text style={styles.detailText}>{selectedApplication.notes}</Text>
                </View>
              )}

              {selectedApplication.jobLink && (
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Job Link</Text>
                  <TouchableOpacity
                    style={styles.detailJobLinkButton}
                    onPress={() => openJobLink(selectedApplication.jobLink!)}
                  >
                    <Ionicons name="link-outline" size={20} color={COLORS.primary} />
                    <Text style={styles.detailJobLinkText}>View Job Posting</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </>
  );
}

const getAvatarColor = (company: string) => {
  const colors = [COLORS.primary, '#059669', '#f59e0b', '#8b5cf6', '#dc2626', '#06b6d4'];
  const index = company.length % colors.length;
  return colors[index];
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 0,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    minHeight: 44,
    minWidth: 44,
  },
  goalButtonText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    bottom: 25, // Adjusted up from previous position
    right: 20,
    backgroundColor: COLORS.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  statsOverview: {
    backgroundColor: 'white',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  statsScroll: {
    paddingHorizontal: 20,
  },
  statChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  activeChip: {
    backgroundColor: COLORS.primary,
  },
  statChipText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeChipText: {
    color: 'white',
  },
  applicationsList: {
    flex: 1,
    padding: 20,
  },
  applicationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  applicationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  roleName: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 2,
  },
  locationText: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 2,
  },
  deleteButton: {
    padding: 12,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: {
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  appliedDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  notes: {
    fontSize: 14,
    color: '#374151',
    fontStyle: 'italic',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  rejectButton: {
    backgroundColor: '#fee2e2',
  },
  rejectButtonText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
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
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    gap: 8,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 100, // Extra padding for keyboard
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
    height: 100,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goalModal: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    margin: 20,
    minWidth: 280,
  },
  goalModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  goalModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  goalInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  goalModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  goalCancelButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  goalCancelText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '500',
  },
  goalSaveButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  goalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // Selection mode styles
  selectionHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exitSelectionButton: {
    padding: 8,
  },
  selectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    textAlign: 'center',
  },
  selectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  selectionActionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },
  selectionActionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  deleteSelectionButton: {
    padding: 8,
  },
  // Enhanced card styles
  selectedCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#f0f9ff',
  },
  expandedCard: {
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  selectionIndicator: {
    marginRight: 12,
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  jobLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  jobLinkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  // Status dropdown styles
  statusDropdownContainer: {
    position: 'relative',
    flex: 1,
  },
  statusDropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  statusDropdownText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  statusDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 1000,
  },
  statusDropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  statusDropdownOptionActive: {
    backgroundColor: '#f0f9ff',
  },
  statusDropdownOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  statusDropdownOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  // New expanded content styles
  expandedDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  expandedDetailText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
  },
  expandedActions: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  expandedActionsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  // Compact card styles
  compactCardContent: {
    flex: 1,
    padding: 16,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  compactCompanyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  compactStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactStatusText: {
    color: 'white',
    fontSize: 11,
    fontWeight: 'bold',
  },
  compactRoleName: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 6,
  },
  compactDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  // Detail modal styles
  detailModalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  detailModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  detailModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  detailModalContent: {
    flex: 1,
    padding: 20,
  },
  detailCompanyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  detailCompanyAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailAvatarText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  detailCompanyInfo: {
    flex: 1,
  },
  detailCompanyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  detailRoleName: {
    fontSize: 16,
    color: '#6b7280',
  },
  detailSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 16,
    color: '#1f2937',
    lineHeight: 24,
  },
  detailJobLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 8,
  },
  detailJobLinkText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '500',
  },
  statusSection: {
    zIndex: 1000,
    elevation: 1000,
  },
});