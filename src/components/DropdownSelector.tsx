import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';

interface DropdownSelectorProps {
  label: string;
  options: string[];
  value: string | string[];
  onValueChange: (value: string | string[]) => void;
  placeholder?: string;
  multiSelect?: boolean;
  allowOther?: boolean;
  required?: boolean;
}

export default function DropdownSelector({
  label,
  options,
  value,
  onValueChange,
  placeholder = 'Select an option',
  multiSelect = false,
  allowOther = true,
  required = false,
}: DropdownSelectorProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState('');

  const handleOptionSelect = (option: string) => {
    if (option === 'Other' && allowOther) {
      setShowOtherInput(true);
      return;
    }

    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      if (currentValues.includes(option)) {
        onValueChange(currentValues.filter(v => v !== option));
      } else {
        onValueChange([...currentValues, option]);
      }
    } else {
      onValueChange(option);
      setModalVisible(false);
    }
  };

  const handleOtherSubmit = () => {
    if (!otherValue.trim()) {
      Alert.alert('Error', 'Please enter a value for "Other"');
      return;
    }

    if (multiSelect) {
      const currentValues = Array.isArray(value) ? value : [];
      if (!currentValues.includes(otherValue)) {
        onValueChange([...currentValues, otherValue]);
      }
    } else {
      onValueChange(otherValue);
    }

    setOtherValue('');
    setShowOtherInput(false);
    setModalVisible(false);
  };

  const getDisplayValue = () => {
    if (multiSelect) {
      const values = Array.isArray(value) ? value : [];
      if (values.length === 0) return placeholder;
      if (values.length === 1) return values[0];
      return `${values.length} selected`;
    }
    return value || placeholder;
  };

  const isSelected = (option: string) => {
    if (multiSelect) {
      return Array.isArray(value) && value.includes(option);
    }
    return value === option;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>
        {label}
        {required && <Text style={styles.required}> *</Text>}
      </Text>

      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.selectorText, !value && styles.placeholder]}>
          {getDisplayValue()}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{label}</Text>
            {multiSelect && (
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.doneButton}>Done</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView style={styles.optionsList}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.option,
                  isSelected(option) && styles.selectedOption
                ]}
                onPress={() => handleOptionSelect(option)}
              >
                <Text style={[
                  styles.optionText,
                  isSelected(option) && styles.selectedOptionText
                ]}>
                  {option}
                </Text>
                {isSelected(option) && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>

          {showOtherInput && (
            <View style={styles.otherInputContainer}>
              <Text style={styles.otherInputLabel}>Enter custom value:</Text>
              <TextInput
                style={styles.otherInput}
                value={otherValue}
                onChangeText={setOtherValue}
                placeholder="Type here..."
                autoFocus
              />
              <View style={styles.otherInputActions}>
                <TouchableOpacity
                  style={styles.otherCancelButton}
                  onPress={() => {
                    setShowOtherInput(false);
                    setOtherValue('');
                  }}
                >
                  <Text style={styles.otherCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.otherSubmitButton}
                  onPress={handleOtherSubmit}
                >
                  <Text style={styles.otherSubmitText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  required: {
    color: '#ef4444',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'white',
  },
  selectorText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  placeholder: {
    color: '#9ca3af',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelButton: {
    fontSize: 16,
    color: '#6b7280',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  doneButton: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  optionsList: {
    flex: 1,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  selectedOption: {
    backgroundColor: '#eff6ff',
  },
  optionText: {
    fontSize: 16,
    color: '#1f2937',
    flex: 1,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  otherInputContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  otherInputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  otherInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  otherInputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  otherCancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  otherCancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  otherSubmitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  otherSubmitText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
  },
});