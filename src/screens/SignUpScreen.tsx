import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { signupUser } from '../store/userSlice';
import { initializeTargetCompaniesFromSignup } from '../store/userTargetCompaniesSlice';
import { User } from '../types';
import { AppDispatch } from '../store';
import { CompanyMatcher } from '../utils/companyMatching';
import { targetCompanies } from '../data/companiesData';
import DropdownSelector from '../components/DropdownSelector';
import { MAJORS, TARGET_ROLES, TARGET_INDUSTRIES, TARGET_LOCATIONS } from '../constants/formOptions';
import * as DocumentPicker from 'expo-document-picker';
import COLORS from '../constants/colors';

interface PersonalInfo {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  linkedinProfile: string;
}

interface Education {
  university: string;
  major: string;
  graduationYear: string;
}

interface CareerPreferences {
  targetCompanies: string[];
  targetRoles: string[];
  targetIndustries: string[];
  targetLocations: string[];
}

export default function SignUpScreen({ navigation }: any) {
  const dispatch = useDispatch<AppDispatch>();
  const insets = useSafeAreaInsets();

  const [currentStep, setCurrentStep] = useState(1);
  const [resumeUri, setResumeUri] = useState<string | null>(null);

  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    linkedinProfile: '',
  });

  const [education, setEducation] = useState<Education>({
    university: '',
    major: '',
    graduationYear: '',
  });

  const [careerPreferences, setCareerPreferences] = useState<CareerPreferences>({
    targetCompanies: [],
    targetRoles: [],
    targetIndustries: [],
    targetLocations: [],
  });

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: false,
      });

      if (!result.canceled && result.assets[0]) {
        setResumeUri(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    if (!personalInfo.name || !personalInfo.email || !personalInfo.password || !education.university || !education.major) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (personalInfo.password !== personalInfo.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const companyTexts = careerPreferences.targetCompanies.join(', ');
    const matchedCompanyIds = CompanyMatcher.getMatchedCompanyIds(companyTexts);
    const unmatchedCompanies = CompanyMatcher.getUnmatchedCompanies(companyTexts);

    const newUser: any = {
      name: personalInfo.name,
      email: personalInfo.email.toLowerCase(),
      password: personalInfo.password,
      linkedinProfile: personalInfo.linkedinProfile,
      university: education.university,
      major: education.major,
      graduationYear: parseInt(education.graduationYear) || new Date().getFullYear(),
      targetCompanies: [...matchedCompanyIds, ...unmatchedCompanies],
      targetRoles: careerPreferences.targetRoles,
      targetIndustries: careerPreferences.targetIndustries,
      targetLocations: careerPreferences.targetLocations,
      resumeUri: resumeUri || undefined,
      weeklyGoal: 5,
    };

    dispatch(signupUser(newUser))
      .unwrap()
      .then(({ user }: { user: User }) => {
        if (matchedCompanyIds.length > 0) {
          dispatch(initializeTargetCompaniesFromSignup(matchedCompanyIds));
        }
        // Navigate or show success? The auth listener in App.tsx typically handles navigation on auth state change
      })
      .catch((error: any) => {
        Alert.alert('Signup Failed', error.toString());
      });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.inputLabel}>Name *</Text>
            <TextInput
              style={styles.input}
              value={personalInfo.name}
              onChangeText={(text) => setPersonalInfo({ ...personalInfo, name: text })}
              placeholder="Enter your full name"
            />

            <Text style={styles.inputLabel}>Email *</Text>
            <TextInput
              style={styles.input}
              value={personalInfo.email}
              onChangeText={(text) => setPersonalInfo({ ...personalInfo, email: text })}
              placeholder="Enter your email"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.inputLabel}>Password *</Text>
            <TextInput
              style={styles.input}
              value={personalInfo.password}
              onChangeText={(text) => setPersonalInfo({ ...personalInfo, password: text })}
              placeholder="Create a password"
              secureTextEntry
            />

            <Text style={styles.inputLabel}>Confirm Password *</Text>
            <TextInput
              style={styles.input}
              value={personalInfo.confirmPassword}
              onChangeText={(text) => setPersonalInfo({ ...personalInfo, confirmPassword: text })}
              placeholder="Confirm your password"
              secureTextEntry
            />

            <Text style={styles.inputLabel}>LinkedIn Profile</Text>
            <TextInput
              style={styles.input}
              value={personalInfo.linkedinProfile}
              onChangeText={(text) => setPersonalInfo({ ...personalInfo, linkedinProfile: text })}
              placeholder="linkedin.com/in/yourprofile"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Education</Text>
            <Text style={styles.inputLabel}>University *</Text>
            <TextInput
              style={styles.input}
              value={education.university}
              onChangeText={(text) => setEducation({ ...education, university: text })}
              placeholder="Enter your university"
            />
            <DropdownSelector
              label="Major"
              options={MAJORS}
              value={education.major}
              onValueChange={(value) => setEducation({ ...education, major: value as string })}
              placeholder="Select your major"
              multiSelect={false}
              allowOther={true}
              required={true}
            />
            <Text style={styles.inputLabel}>Graduation Year</Text>
            <TextInput
              style={styles.input}
              value={education.graduationYear}
              onChangeText={(text) => setEducation({ ...education, graduationYear: text })}
              placeholder="2024"
              keyboardType="numeric"
              maxLength={4}
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Resume Upload (Optional)</Text>
            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Text style={styles.uploadButtonText}>
                {resumeUri ? 'Resume Selected ✓' : 'Upload Resume (PDF)'}
              </Text>
            </TouchableOpacity>
            {resumeUri && <Text style={styles.uploadStatus}>Resume ready to upload</Text>}
            <Text style={styles.note}>
              You can upload your resume now or skip this step and add it later from your profile.
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.select({ ios: 'padding', android: 'height' })}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : insets.top}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: Math.max(insets.top - 12, 23) }]}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Step {currentStep} of 3</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progress, { width: `${(currentStep / 3) * 100}%` }]} />
          </View>
        </View>

        {renderStep()}

        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.backButton} onPress={handleBack}>
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          {currentStep < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Create Account</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.loginLinkText}>Already have an account? Sign In</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#fff' },

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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  progress: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 20,
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

  uploadButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  uploadStatus: {
    color: '#059669',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 20,
  },

  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#059669',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  loginLink: {
    padding: 20,
    alignItems: 'center',
  },
  loginLinkText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  loginButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  loginButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
