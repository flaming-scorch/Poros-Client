import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, format, addDays } from 'date-fns';
import { targetCompanies } from '../data/companiesData';
import { UserTargetCompany, ChecklistItem, CompanyRecommendation, RoleType } from '../types';
import COLORS from '../constants/colors';
import { CompanyTargetCard } from '../components/CompanyTargetCard';
import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';
import { RootState, AppDispatch } from '../store';
import {
  addTargetCompany,
  removeTargetCompany,
  addCustomCompany,
  removeCustomCompany,
  toggleChecklistItem,
  addTargetCompanyThunk,
  removeTargetCompanyThunk,
  removeCustomCompanyThunk,
  syncTargetsToBackend
} from '../store/userTargetCompaniesSlice';
import { toggleChecklistThunk, fetchAllChecklistProgress } from '../store/checklistSlice';

export default function TargetCompaniesScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const { currentUser } = useSelector((state: RootState) => state.user);
  // Select checklist progress from the correct slice
  const { progress: checklistProgress } = useSelector((state: RootState) => state.checklist);

  // Fetch checklist progress when screen loads or userId changes
  useEffect(() => {
    if (currentUser?.id) {
      dispatch(fetchAllChecklistProgress(currentUser.id));
    }
  }, [dispatch, currentUser?.id]);
  // Restore the original selector for other data
  const { targetCompanies: userTargetCompanies, customCompanies, checklistCompletions } = useSelector((state: RootState) => state.userTargetCompanies);


  const [selectedCompany, setSelectedCompany] = useState<CompanyRecommendation | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleType>('Full-time');
  const [activeTab, setActiveTab] = useState<'timeline' | 'events' | 'courses' | 'checklist'>('timeline');
  const [showAddCompanyModal, setShowAddCompanyModal] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [isAddingCompany, setIsAddingCompany] = useState(false);
  const [selectedCompaniesToAdd, setSelectedCompaniesToAdd] = useState<string[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  const helpContent = `
**Researching Target Companies**

Build a list of companies you want to work for and access preparation materials.

**Adding companies:**
• Tap the blue + button at the bottom right
• Select from the list of companies, or
• Enter a custom company name
• Tap "Add" to save to your targets

**Viewing company details:**
Tap any company card to see:
• Application timeline (when to apply)
• Upcoming events and networking opportunities
• Recommended courses to prepare
• Preparation checklist

**Using the checklist:**
The checklist helps you prepare for each company:
• Interview prep tasks
• Portfolio requirements
• Culture study items
• Technical skills to develop

Tap the checkbox next to any item to mark it complete. Your progress is saved automatically.

**Role types:**
Switch between Internship, Full-time, Contractor, or Co-op to see relevant timelines for each role.

**Removing companies:**
Swipe left on any company card and tap "Delete" to remove it from your targets.
`;

  // Get user's target company IDs with safety checks
  const userTargetCompanyIds = React.useMemo(() => {
    if (!Array.isArray(userTargetCompanies)) return [];
    return userTargetCompanies
      .filter(tc => tc && typeof tc.companyId === 'string')
      .map(tc => tc.companyId);
  }, [userTargetCompanies]);

  // Merge predefined and custom companies, then filter by user's targets
  const myTargetCompanies = React.useMemo(() => {
    // Get predefined companies that user has targeted
    const predefinedTargets = Array.isArray(targetCompanies)
      ? targetCompanies.filter(company =>
        company &&
        company.id &&
        userTargetCompanyIds.includes(company.id)
      )
      : [];

    // Add all custom companies (they're automatically targeted when created)
    const allTargets = [...predefinedTargets, ...(customCompanies || [])];

    return allTargets;
  }, [targetCompanies, userTargetCompanyIds, customCompanies]);

  // Get available companies for the dropdown with safety checks
  const availableCompanies = React.useMemo(() => {
    if (!Array.isArray(targetCompanies)) return [];
    return targetCompanies.filter(company =>
      company &&
      company.id &&
      !userTargetCompanyIds.includes(company.id)
    );
  }, [targetCompanies, userTargetCompanyIds]);

  const companyOptions = React.useMemo(() => {
    if (!Array.isArray(availableCompanies)) return ['Other'];
    return availableCompanies
      .filter(company => company && company.name)
      .map(company => company.name)
      .concat(['Other']);
  }, [availableCompanies]);

  const handleToggleTarget = React.useCallback(async (companyId: string) => {
    try {
      // Validate companyId
      if (!companyId || typeof companyId !== 'string') {
        console.error('Invalid companyId:', companyId);
        return;
      }

      if (userTargetCompanyIds.includes(companyId)) {
        dispatch(removeTargetCompanyThunk(companyId));
      } else {
        dispatch(addTargetCompanyThunk({ companyId }));
      }

      // Small delay to allow state to update properly
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('Error toggling target company:', error);
      Alert.alert('Error', 'Failed to update target company. Please try again.');
    }
  }, [userTargetCompanyIds, dispatch]);

  const handleSelectionChange = (selectedCompanies: string | string[]) => {
    const companies = Array.isArray(selectedCompanies) ? selectedCompanies : [selectedCompanies];
    setSelectedCompaniesToAdd(companies.filter(c => c !== 'Other'));
  };

  const handleConfirmAddCompanies = async () => {
    // Prevent multiple simultaneous operations
    if (isAddingCompany) return;

    try {
      setIsAddingCompany(true);

      // Validate input
      if (!selectedCompaniesToAdd || selectedCompaniesToAdd.length === 0) {
        Alert.alert('Info', 'Please select at least one company to add.');
        return;
      }

      // Process companies sequentially to avoid race conditions
      for (const companyName of selectedCompaniesToAdd) {
        // Find the company in our target companies list with safety checks
        const company = Array.isArray(targetCompanies)
          ? targetCompanies.find(c => c && c.name && c.id && c.name === companyName)
          : null;

        if (company &&
          company.id &&
          !userTargetCompanyIds.includes(company.id)) {
          // Dispatch action and wait for it to complete
          dispatch(addTargetCompanyThunk({ companyId: company.id }));
          // Small delay to prevent overwhelming the state management
          await new Promise(resolve => setTimeout(resolve, 150));
        }
      }

      // Reset selection and close modal
      setSelectedCompaniesToAdd([]);
      await new Promise(resolve => setTimeout(resolve, 300));
      setShowAddCompanyModal(false);
    } catch (error) {
      console.error('Error adding companies:', error);
      Alert.alert('Error', 'Failed to add companies. Please try again.');
    } finally {
      setIsAddingCompany(false);
    }
  };

  const handleAddCustomCompany = async () => {
    try {
      if (!newCompanyName.trim()) {
        Alert.alert('Error', 'Please enter a company name');
        return;
      }

      setIsAddingCompany(true);

      // Dispatch the async thunk to enrich and add the company
      const result = await dispatch(addCustomCompany(newCompanyName.trim()) as any);

      if (addCustomCompany.fulfilled.match(result)) {
        // Success!
        // Sync to backend immediately
        dispatch(syncTargetsToBackend());

        Alert.alert('Success', `${newCompanyName} has been added to your target companies!`);
        setNewCompanyName('');
        setShowAddCompanyModal(false);
      } else if (addCustomCompany.rejected.match(result)) {
        // Error occurred
        Alert.alert(
          'Error',
          `Failed to add ${newCompanyName}. ${result.payload || 'Please try again.'}`
        );
      }
    } catch (error) {
      console.error('Error adding custom company:', error);
      Alert.alert('Error', 'Failed to add custom company. Please try again.');
    } finally {
      setIsAddingCompany(false);
    }
  };

  const handleDeleteCompany = (company: CompanyRecommendation) => {
    Alert.alert(
      'Remove Company',
      `Are you sure you want to remove ${company.name} from your target companies?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            if (company.isCustom) {
              // Remove custom company
              dispatch(removeCustomCompanyThunk(company.id));
            } else {
              // Remove predefined company from targets
              dispatch(removeTargetCompanyThunk(company.id));
            }

            // Close the details view if deleting the currently selected company
            if (selectedCompany?.id === company.id) {
              setSelectedCompany(null);
            }
          },
        },
      ]
    );
  };

  const renderMyTargetsSection = React.useCallback(() => {
    if (!Array.isArray(myTargetCompanies) || myTargetCompanies.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="star-outline" size={64} color="#9ca3af" />
          <Text style={styles.emptyStateTitle}>No Target Companies Yet</Text>
          <Text style={styles.emptyStateText}>
            Add companies to your target list to get personalized insights and preparation materials.
          </Text>
          <TouchableOpacity
            style={styles.discoverButton}
            onPress={() => setShowAddCompanyModal(true)}
          >
            <Text style={styles.discoverButtonText}>Add Companies</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView style={styles.companiesList}>
        {myTargetCompanies
          .filter(company => company && company.id) // Extra safety filter
          .map((company) => (
            <CompanyTargetCard
              key={company.id}
              company={company}
              selectedRole={selectedRole}
              isTargeted={true}
              onPress={() => setSelectedCompany(company)}
              onToggleTarget={() => handleToggleTarget(company.id)}
              onDelete={() => handleDeleteCompany(company)}
              showAddButton={false}
            />
          ))}
      </ScrollView>
    );
  }, [myTargetCompanies, selectedRole, handleToggleTarget]);


  const renderCompanyDetails = () => {
    if (!selectedCompany) return null;

    switch (activeTab) {
      case 'timeline':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Application Timeline</Text>
            {Object.entries(selectedCompany.applicationTimeline).map(([role, timeline]) => (
              <View key={role} style={styles.timelineItem}>
                <Text style={styles.roleType}>{role.charAt(0).toUpperCase() + role.slice(1)}</Text>
                <Text style={styles.timelineDate}>{timeline}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Company Information</Text>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Company Size</Text>
              <Text style={styles.infoValue}>{selectedCompany.companyInfo.size}</Text>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Culture & Values</Text>
              <View style={styles.tagContainer}>
                {selectedCompany.companyInfo.culture.map((value, index) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Benefits</Text>
              <View style={styles.tagContainer}>
                {selectedCompany.companyInfo.benefits.map((benefit, index) => (
                  <View key={index} style={[styles.tag, styles.benefitTag]}>
                    <Text style={[styles.tagText, styles.benefitTagText]}>{benefit}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.infoSection}>
              <Text style={styles.infoLabel}>Interview Process</Text>
              {selectedCompany.companyInfo.interviewProcess.map((step, index) => (
                <View key={index} style={styles.processStep}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          </View>
        );

      case 'events':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Upcoming Events & Programs</Text>
            {selectedCompany.events.length === 0 ? (
              <View style={styles.emptyEventsState}>
                <Ionicons name="calendar-outline" size={48} color="#9ca3af" />
                <Text style={styles.emptyEventsTitle}>No Events Available</Text>
                <Text style={styles.emptyEventsText}>
                  There are no upcoming events at this time. Check back later for new opportunities!
                </Text>
              </View>
            ) : (
              selectedCompany.events.map((event) => (
                <View key={event.id} style={styles.eventCard}>
                  <View style={styles.eventHeader}>
                    <View style={[styles.eventTypeTag, getEventTypeStyle(event.type)]}>
                      <Text style={[styles.eventTypeText, getEventTypeTextStyle(event.type)]}>
                        {event.type}
                      </Text>
                    </View>
                    <Text style={styles.eventDate}>
                      {Number.isNaN(new Date(event.date).getTime())
                        ? 'Date not listed'
                        : format(new Date(event.date), 'MMM dd, yyyy')}
                    </Text>
                  </View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDescription}>{event.description}</Text>
                  {event.registrationLink && (
                    <TouchableOpacity
                      style={styles.registerButton}
                      onPress={async () => {
                        try {
                          let url = event.registrationLink!;
                          if (!url.startsWith('http://') && !url.startsWith('https://')) {
                            url = 'https://' + url;
                          }
                          const canOpen = await Linking.canOpenURL(url);
                          if (canOpen) {
                            await Linking.openURL(url);
                          } else {
                            Alert.alert('Error', 'Cannot open this link.');
                          }
                        } catch (error) {
                          console.error('Error opening registration link:', error);
                          Alert.alert('Error', 'Could not open registration link.');
                        }
                      }}
                    >
                      <Text style={styles.registerButtonText}>See More</Text>
                      <Ionicons name="open-outline" size={16} color={COLORS.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              ))
            )}
          </View>
        );

      case 'courses':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Recommended Courses</Text>
            {selectedCompany.recommendedCourses.map((course) => (
              <View key={course.id} style={styles.courseCard}>
                <View style={styles.courseHeader}>
                  <Text style={styles.courseTitle}>{course.title}</Text>
                  <View style={[styles.levelBadge, getLevelStyle(course.level)]}>
                    <Text style={[styles.levelText, getLevelTextStyle(course.level)]}>
                      {course.level}
                    </Text>
                  </View>
                </View>
                <Text style={styles.courseProvider}>by {course.provider}</Text>
                <Text style={styles.courseDuration}>Duration: {course.duration}</Text>
                <View style={styles.skillsContainer}>
                  {course.skills.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text style={styles.skillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
                <TouchableOpacity
                  style={styles.courseButton}
                  onPress={async () => {
                    try {
                      let url = course.link;
                      if (!url.startsWith('http://') && !url.startsWith('https://')) {
                        url = 'https://' + url;
                      }
                      const canOpen = await Linking.canOpenURL(url);
                      if (canOpen) {
                        await Linking.openURL(url);
                      } else {
                        Alert.alert('Error', 'Cannot open this course link.');
                      }
                    } catch (error) {
                      console.error('Error opening course link:', error);
                      Alert.alert('Error', 'Could not open course link.');
                    }
                  }}
                >
                  <Text style={styles.courseButtonText}>View Course</Text>
                  <Ionicons name="open-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        );

      case 'checklist':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.sectionTitle}>Preparation Checklist</Text>
            {['Interview Prep', 'Portfolio', 'Culture Study', 'Technical Skills'].map((category) => {
              const items = selectedCompany.preparationChecklist.filter(item => item.category === category);
              if (items.length === 0) return null;

              return (
                <View key={category} style={styles.checklistCategory}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  {items.map((item) => {
                    // Get completion state from Redux
                    // Check both ID (for local session) and Title (for persisted state)
                    const isCompleted = checklistProgress[selectedCompany.id]?.[item.id] ||
                      checklistProgress[selectedCompany.id]?.[item.title] ||
                      false;

                    return (
                      <View key={item.id} style={styles.checklistItem}>
                        <TouchableOpacity
                          style={styles.checkbox}
                          onPress={() => {
                            if (selectedCompany.id) {
                              dispatch(toggleChecklistThunk({
                                companyId: selectedCompany.id,
                                itemId: item.id,
                                title: item.title,
                                category: item.category
                              }));
                            }
                          }}
                        >
                          {isCompleted && (
                            <Ionicons name="checkmark" size={16} color="#059669" />
                          )}
                        </TouchableOpacity>
                        <View style={styles.checklistContent}>
                          <Text style={[styles.checklistTitle, isCompleted && styles.completedTitle]}>
                            {item.title}
                          </Text>
                          <Text style={styles.checklistDescription}>{item.description}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top - 2, 28) }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Target Companies</Text>
          <HelpButton onPress={() => setShowHelp(true)} />
        </View>

        {/* Header info */}
        <View style={styles.headerInfo}>
          <Text style={styles.targetCount}>{myTargetCompanies.length} Target {myTargetCompanies.length === 1 ? 'Company' : 'Companies'}</Text>
        </View>

        {/* Role Selector */}
        <View style={styles.roleSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['Internship', 'Full-time', 'Contractor', 'Co-op'] as RoleType[]).map((role) => (
              <TouchableOpacity
                key={role}
                style={[styles.roleTab, selectedRole === role && styles.activeRoleTab]}
                onPress={() => setSelectedRole(role)}
              >
                <Text style={[styles.roleTabText, selectedRole === role && styles.activeRoleTabText]}>
                  {role}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      <HelpModal
        visible={showHelp}
        onClose={() => setShowHelp(false)}
        title="Target Companies Help"
        content={helpContent}
      />

      {/* My Targets Content */}
      {renderMyTargetsSection()}

      {/* Company Details Modal */}
      <Modal
        visible={selectedCompany !== null}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        {selectedCompany && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedCompany(null)}>
                <Text style={styles.closeButton}>Close</Text>
              </TouchableOpacity>
              <View style={styles.modalCompanyInfo}>
                <Text style={styles.modalCompanyLogo}>{selectedCompany.logo}</Text>
                <Text style={styles.modalCompanyName}>{selectedCompany.name}</Text>
              </View>
              <View style={styles.placeholder} />
            </View>

            <View style={styles.tabBar}>
              {[
                { key: 'timeline', label: 'Timeline', icon: 'calendar-outline' },
                { key: 'events', label: 'Events', icon: 'megaphone-outline' },
                { key: 'courses', label: 'Courses', icon: 'school-outline' },
                { key: 'checklist', label: 'Checklist', icon: 'checkmark-circle-outline' },
              ].map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.activeTab]}
                  onPress={() => setActiveTab(tab.key as any)}
                >
                  <Ionicons
                    name={tab.icon as any}
                    size={20}
                    color={activeTab === tab.key ? COLORS.primary : '#6b7280'}
                  />
                  <Text style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView style={styles.modalContent}>
              {renderCompanyDetails()}
            </ScrollView>
          </View>
        )}
      </Modal>

      {/* Floating Add Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => !isAddingCompany && setShowAddCompanyModal(true)}
        disabled={isAddingCompany}
        activeOpacity={isAddingCompany ? 0.3 : 0.7}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Add Company Modal */}
      <Modal
        visible={showAddCompanyModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.addCompanyModalContainer}>
          <View style={styles.addCompanyModalHeader}>
            <TouchableOpacity
              onPress={() => {
                if (!isAddingCompany) {
                  setSelectedCompaniesToAdd([]);
                  setNewCompanyName('');
                  setShowAddCompanyModal(false);
                }
              }}
              disabled={isAddingCompany}
            >
              <Text style={[styles.cancelButtonText, isAddingCompany && styles.disabledButtonText]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.addCompanyModalTitle}>Add Target Company</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.addCompanyModalContent}>


            <Text style={styles.customCompanyLabel}>Add Company</Text>
            <TextInput
              style={[styles.customCompanyInput, isAddingCompany && styles.disabledInput]}
              value={newCompanyName}
              onChangeText={setNewCompanyName}
              placeholder="Enter company name"
              editable={!isAddingCompany}
            />
            <TouchableOpacity
              style={[
                styles.addCustomButton,
                (!newCompanyName.trim() || isAddingCompany) && styles.disabledButton
              ]}
              onPress={handleAddCustomCompany}
              disabled={!newCompanyName.trim() || isAddingCompany}
            >
              <Text style={[
                styles.addCustomButtonText,
                (!newCompanyName.trim() || isAddingCompany) && styles.disabledButtonText
              ]}>
                {isAddingCompany ? 'Adding...' : 'Add Company'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getEventTypeStyle = (type: string) => {
  switch (type) {
    case 'Tech Talk': return { backgroundColor: '#dbeafe' };
    case 'Workshop': return { backgroundColor: '#d1fae5' };
    case 'Networking': return { backgroundColor: '#fef3c7' };
    case 'Info Session': return { backgroundColor: '#e0e7ff' };
    default: return { backgroundColor: '#f3f4f6' };
  }
};

const getEventTypeTextStyle = (type: string) => {
  switch (type) {
    case 'Tech Talk': return { color: '#1e40af' };
    case 'Workshop': return { color: '#065f46' };
    case 'Networking': return { color: '#92400e' };
    case 'Info Session': return { color: '#3730a3' };
    default: return { color: '#374151' };
  }
};

const getLevelStyle = (level: string) => {
  switch (level) {
    case 'Beginner': return { backgroundColor: '#d1fae5' };
    case 'Intermediate': return { backgroundColor: '#fef3c7' };
    case 'Advanced': return { backgroundColor: '#fee2e2' };
    default: return { backgroundColor: '#f3f4f6' };
  }
};

const getLevelTextStyle = (level: string) => {
  switch (level) {
    case 'Beginner': return { color: '#065f46' };
    case 'Intermediate': return { color: '#92400e' };
    case 'Advanced': return { color: '#b91c1c' };
    default: return { color: '#374151' };
  }
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9fafb'
  },
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#f9fafb',
    paddingHorizontal: 20,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  roleSelector: {
    marginBottom: 16,
  },
  roleTab: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  activeRoleTab: {
    backgroundColor: COLORS.primary,
  },
  roleTabText: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeRoleTabText: {
    color: 'white',
  },
  headerInfo: {
    marginBottom: 16,
  },
  targetCount: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  companiesList: {
    flex: 1,
    padding: 20,
  },
  discoverContainer: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyEventsState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyEventsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyEventsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
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
    lineHeight: 24,
    marginBottom: 24,
  },
  discoverButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  discoverButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  noResultsState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
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
  closeButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalCompanyInfo: {
    alignItems: 'center',
  },
  modalCompanyLogo: {
    fontSize: 24,
    marginBottom: 4,
  },
  modalCompanyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  placeholder: {
    width: 50,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeTabText: {
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  tabContent: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  timelineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  roleType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  timelineDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoSection: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  infoValue: {
    fontSize: 16,
    color: '#1f2937',
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    color: '#3730a3',
    fontWeight: '500',
  },
  benefitTag: {
    backgroundColor: '#d1fae5',
  },
  benefitTagText: {
    color: '#065f46',
  },
  processStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  eventCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  eventDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  registerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  registerButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  courseCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  courseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  courseTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    flex: 1,
    marginRight: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '600',
  },
  courseProvider: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  courseDuration: {
    fontSize: 12,
    color: '#9ca3af',
    marginBottom: 12,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  skillText: {
    fontSize: 10,
    color: '#374151',
  },
  courseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    paddingVertical: 8,
    borderRadius: 6,
    gap: 4,
  },
  courseButtonText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '500',
  },
  checklistCategory: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  checklistContent: {
    flex: 1,
  },
  checklistTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  completedTitle: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  checklistDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },
  floatingButton: {
    position: 'absolute',
    bottom: 25, // Adjusted up from previous position
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
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
  addCompanyModalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  addCompanyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#6b7280',
  },
  addCompanyModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  addCompanyModalContent: {
    padding: 20,
  },
  orText: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    marginVertical: 20,
    fontWeight: '500',
  },
  customCompanyLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  customCompanyInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: 'white',
    marginBottom: 16,
  },
  addCustomButton: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  addCustomButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#d1d5db',
  },
  disabledButtonText: {
    color: '#9ca3af',
  },
  disabledInput: {
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
  },
  confirmAddButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  confirmAddButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
