import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Linking,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { RootState, AppDispatch } from '../store';
import {
  fetchJobRecommendations,
  refreshJobRecommendations,
  setJobType,
  toggleCategory,
  toggleLocation,
  setRequiresSponsorship,
  clearFilters,
} from '../store/jobRecommendationsSlice';
import { JobListing, JobType } from '../types';
import COLORS from '../constants/colors';

import HelpButton from '../components/HelpButton';
import HelpModal from '../components/HelpModal';

export default function JobRecommendationsScreen() {
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch<AppDispatch>();
  const [showHelp, setShowHelp] = useState(false);
  const {
    jobs, loading, error, preferences, lastFetched,
  } = useSelector(
    (state: RootState) => state.jobRecommendations,
  );
  const { currentUser } = useSelector((state: RootState) => state.user);

  const [showFilters, setShowFilters] = useState(false);
  const [availableCategories] = useState([
    'Software Engineering',
    'Data Science',
    'Product Management',
    'Quantitative Finance',
    'Hardware Engineering',
    'AI & Machine Learning',
  ]);

  useEffect(() => {
    // Fetch recommendations on mount
    dispatch(fetchJobRecommendations(preferences));
  }, []);

  const handleRefresh = () => {
    dispatch(refreshJobRecommendations(preferences));
  };

  const handleJobTypeChange = (jobType: JobType) => {
    dispatch(setJobType(jobType));
    // Fetch new recommendations for the selected job type
    dispatch(fetchJobRecommendations({ ...preferences, jobType }));
  };

  const handleCategoryToggle = (category: string) => {
    dispatch(toggleCategory(category));
  };

  const handleApplyFilters = () => {
    setShowFilters(false);
    dispatch(fetchJobRecommendations(preferences));
  };

  const handleClearFilters = () => {
    dispatch(clearFilters());
  };

  const handleOpenJob = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Unable to open job link');
    });
  };

  const helpContent = `
**Finding Job Opportunities**

This screen shows personalized job recommendations based on your preferences.

**How to find jobs:**
• Choose between Internships or Full-Time positions
• Tap the filter icon to refine by category
• Pull down to refresh and see new opportunities
• Tap any job card to open the posting

**Using Filters:**
Tap the filter icon (⚙️) in the header to:
• Select job categories (Software, Data Science, etc.)
• Filter by visa sponsorship requirements
• Apply or clear all filters

**Active Filters:**
Selected filters appear as blue badges below the header. Tap the X on any badge to remove it.
`;

  const renderJobCard = ({ item }: { item: JobListing }) => (
    <TouchableOpacity
      style={styles.jobCard}
      onPress={() => handleOpenJob(item.url)}
      activeOpacity={0.7}
    >
      <View style={styles.jobHeader}>
        <View style={styles.companyBadge}>
          <Text style={styles.companyInitial}>
            {item.company.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.jobHeaderInfo}>
          <Text style={styles.companyName}>{item.company}</Text>
          <Text style={styles.jobTitle}>{item.title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
      </View>

      <View style={styles.jobDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {item.locations.slice(0, 2).join(', ')}
            {item.locations.length > 2 && ` +${item.locations.length - 2} more`}
          </Text>
        </View>

        {item.sponsorship && (
          <View style={styles.detailRow}>
            <Ionicons name="globe-outline" size={16} color="#059669" />
            <Text style={[styles.detailText, { color: '#059669' }]}>
              {item.sponsorship === 'Other' ? 'no info on sponsorship available' : item.sponsorship}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.categoriesContainer}>
        {item.categories.slice(0, 3).map((category, index) => (
          <View key={index} style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{category}</Text>
          </View>
        ))}
        {item.categories.length > 3 && (
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>+{item.categories.length - 3}</Text>
          </View>
        )}
      </View>

      <Text style={styles.datePosted}>
        Posted: {new Date(item.date_posted).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="briefcase-outline" size={64} color="#d1d5db" />
      <Text style={styles.emptyStateTitle}>No Jobs Found</Text>
      <Text style={styles.emptyStateText}>
        Try adjusting your filters or check back later for new opportunities
      </Text>
      <TouchableOpacity
        style={styles.clearFiltersButton}
        onPress={handleClearFilters}
      >
        <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFilterModal = () => (
    <View style={styles.filterModal}>
      <View style={[styles.filterHeader, { paddingTop: Math.max(insets.top, 20) }]}>
        <Text style={styles.filterTitle}>Filter Jobs</Text>
        <TouchableOpacity onPress={() => setShowFilters(false)}>
          <Ionicons name="close" size={24} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.filterContent}>
        <Text style={styles.filterSectionTitle}>Categories</Text>
        <View style={styles.filterOptions}>
          {availableCategories.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterOption,
                preferences.categories.includes(category) && styles.filterOptionActive,
              ]}
              onPress={() => handleCategoryToggle(category)}
            >
              <Text
                style={[
                  styles.filterOptionText,
                  preferences.categories.includes(category)
                  && styles.filterOptionTextActive,
                ]}
              >
                {category}
              </Text>
              {preferences.categories.includes(category) && (
                <Ionicons name="checkmark" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.filterSectionTitle}>Sponsorship</Text>
        <TouchableOpacity
          style={[
            styles.filterOption,
            preferences.requiresSponsorship && styles.filterOptionActive,
          ]}
          onPress={() => dispatch(setRequiresSponsorship(!preferences.requiresSponsorship))}
        >
          <Text
            style={[
              styles.filterOptionText,
              preferences.requiresSponsorship && styles.filterOptionTextActive,
            ]}
          >
            Requires Visa Sponsorship
          </Text>
          {preferences.requiresSponsorship && (
            <Ionicons name="checkmark" size={20} color={COLORS.primary} />
          )}
        </TouchableOpacity>
      </ScrollView>

      <View style={[styles.filterActions, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearFilters}
        >
          <Text style={styles.clearButtonText}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplyFilters}
        >
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.greeting}>Job Recommendations</Text>
            <Text style={styles.subtitle}>
              {jobs.length} opportunities found
            </Text>
          </View>
          <View style={styles.headerActions}>
            <HelpButton onPress={() => setShowHelp(true)} />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name="options-outline" size={20} color={COLORS.primary} />
              {(preferences.categories.length > 0 || preferences.requiresSponsorship) && (
                <View style={styles.filterBadge} />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <HelpModal
          visible={showHelp}
          onClose={() => setShowHelp(false)}
          title="Job Recommendations Help"
          content={helpContent}
        />


        {/* Job Type Selector */}
        <View style={styles.jobTypeSelector}>
          <TouchableOpacity
            style={[
              styles.jobTypeButton,
              preferences.jobType === 'internship' && styles.jobTypeButtonActive,
            ]}
            onPress={() => handleJobTypeChange('internship')}
          >
            <Text
              style={[
                styles.jobTypeButtonText,
                preferences.jobType === 'internship'
                && styles.jobTypeButtonTextActive,
              ]}
            >
              Internships
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.jobTypeButton,
              preferences.jobType === 'newgrad' && styles.jobTypeButtonActive,
            ]}
            onPress={() => handleJobTypeChange('newgrad')}
          >
            <Text
              style={[
                styles.jobTypeButtonText,
                preferences.jobType === 'newgrad' && styles.jobTypeButtonTextActive,
              ]}
            >
              New Grad
            </Text>
          </TouchableOpacity>
        </View>

        {/* Active Filters */}
        {preferences.categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.activeFilters}
          >
            {preferences.categories.map((category) => (
              <View key={category} style={styles.activeFilterBadge}>
                <Text style={styles.activeFilterText}>{category}</Text>
                <TouchableOpacity onPress={() => handleCategoryToggle(category)}>
                  <Ionicons name="close-circle" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Filter Modal */}
      {showFilters && renderFilterModal()}

      {/* Job List */}
      {loading && jobs.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading recommendations...</Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          renderItem={renderJobCard}
          keyExtractor={(item, index) => `${item.company}-${item.title}-${index}`}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 20) + 60 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={renderEmptyState}
        />
      )}
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
    paddingBottom: 16,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  filterButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  jobTypeSelector: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  jobTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  jobTypeButtonActive: {
    backgroundColor: COLORS.primary,
  },
  jobTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  jobTypeButtonTextActive: {
    color: 'white',
  },
  activeFilters: {
    marginTop: 8,
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0e7ff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
  },
  activeFilterText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
    marginRight: 6,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 8,
  },
  errorText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#dc2626',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  listContent: {
    padding: 20,
  },
  jobCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  jobHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInitial: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  jobHeaderInfo: {
    flex: 1,
    marginLeft: 12,
  },
  companyName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  jobTitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  jobDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 6,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 6,
    marginBottom: 6,
  },
  categoryText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  datePosted: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    marginBottom: 24,
  },
  clearFiltersButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  clearFiltersButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  filterModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'white',
    zIndex: 1000,
  },
  filterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  filterContent: {
    flex: 1,
    padding: 20,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
    marginTop: 8,
  },
  filterOptions: {
    marginBottom: 24,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#f9fafb',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterOptionActive: {
    backgroundColor: '#e0e7ff',
    borderColor: COLORS.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: COLORS.primary,
  },
  filterActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    gap: 12,
  },
  clearButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  clearButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
  },
  applyButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
