import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { CompanyRecommendation, RoleType } from '../types';
import COLORS from '../constants/colors';

interface CompanyTargetCardProps {
  company: CompanyRecommendation;
  selectedRole: RoleType;
  isTargeted: boolean;
  onPress: () => void;
  onToggleTarget: () => void;
  showAddButton?: boolean;
  onDelete?: () => void; // New prop for delete action
}

export const CompanyTargetCard: React.FC<CompanyTargetCardProps> = ({
  company,
  selectedRole,
  isTargeted,
  onPress,
  onToggleTarget,
  showAddButton = true,
  onDelete,
}) => {
  const getTargetButtonStyle = () => {
    if (isTargeted) {
      return [styles.targetButton, styles.targetButtonActive];
    }
    return styles.targetButton;
  };

  const getTargetButtonText = () => {
    return isTargeted ? 'In My Targets' : 'Add to Targets';
  };

  const getTargetIcon = () => {
    return isTargeted ? 'star' : 'star-outline';
  };

  const getTargetButtonTextStyle = () => {
    if (isTargeted) {
      return [styles.targetButtonText, styles.targetButtonTextActive];
    }
    return styles.targetButtonText;
  };

  // Render delete action when swiping left
  const renderRightActions = () => {
    if (!onDelete) return null;

    return (
      <TouchableOpacity style={styles.deleteAction} onPress={onDelete}>
        <Ionicons name="trash" size={24} color="white" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    );
  };

  const cardContent = (
    <TouchableOpacity style={styles.companyCard} onPress={onPress}>
      <View style={styles.cardHeader}>
        <Text style={styles.companyLogo}>{company.logo}</Text>
        <View style={styles.companyInfo}>
          <Text style={styles.companyName}>{company.name}</Text>
          <Text style={styles.companyIndustry}>{company.industry}</Text>
        </View>
        {showAddButton && (
          <TouchableOpacity
            style={getTargetButtonStyle()}
            onPress={onToggleTarget}
          >
            <Ionicons
              name={getTargetIcon()}
              size={16}
              color={isTargeted ? '#059669' : '#6b7280'}
            />
            <Text style={getTargetButtonTextStyle()}>
              {getTargetButtonText()}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.timelineText}>
          Next {selectedRole.toLowerCase()} applications: {company.applicationTimeline[selectedRole.toLowerCase() as keyof typeof company.applicationTimeline]}
        </Text>
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{company.events.length}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{company.recommendedCourses.length}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{company.preparationChecklist.length}</Text>
            <Text style={styles.statLabel}>Tasks</Text>
          </View>
        </View>
      </View>

      {isTargeted && (
        <View style={styles.targetIndicator}>
          <Ionicons name="star" size={16} color="#059669" />
          <Text style={styles.targetIndicatorText}>Target Company</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Only wrap in Swipeable if onDelete is provided
  if (onDelete) {
    return (
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
      >
        {cardContent}
      </Swipeable>
    );
  }

  return cardContent;
};

const styles = StyleSheet.create({
  companyCard: {
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
    borderLeftWidth: 4,
    borderLeftColor: '#e5e7eb',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  companyLogo: {
    fontSize: 32,
    marginRight: 12,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  companyIndustry: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 2,
  },
  cardBody: {
    marginLeft: 44,
  },
  timelineText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 20,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  targetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  targetButtonActive: {
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#059669',
  },
  targetButtonText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  targetButtonTextActive: {
    color: '#059669',
  },
  targetIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
    gap: 4,
  },
  targetIndicatorText: {
    fontSize: 11,
    color: '#059669',
    fontWeight: '600',
  },
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 12,
    marginBottom: 16,
  },
  deleteText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});