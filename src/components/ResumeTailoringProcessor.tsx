import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';
import { tailorResume } from '../services/aiService';
import { createPdfFromHtml } from '../services/pdfService';

interface ResumeTailoringProcessorProps {
  visible: boolean;
  onComplete: (uri: string) => void;
  companyName: string;
  positionTitle: string;
  jobDescription: string;
  resumeUri: string;
  onClose: () => void;
}

// Helper function to create a delay
const delay = (ms: number) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorIcon: {
    backgroundColor: '#fee2e2',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  progressSection: {
    marginBottom: 24,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBackground: {
    height: 8,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    textAlign: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  stepsIndicator: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  stepIndicatorContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  stepIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepNumber: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 12,
  },
});

export default function ResumeTailoringProcessor({
  visible,
  onComplete,
  companyName,
  positionTitle,
  jobDescription,
  resumeUri,
  onClose,
}: ResumeTailoringProcessorProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const isProcessingRef = useRef(false);

  // Add icons here since they were removed in previous step (oops)
  const iconName = error ? 'alert-circle' : 'document-text';
  const iconColor = error ? '#dc2626' : COLORS.primary;

  const steps = [
    'Analyzing resume and job description...',
    'Generating tailored content with Claude...',
    'Creating PDF document...',
    'Finalizing...',
  ];

  const startTailoringProcess = async () => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    // Reset state
    setProgress(0);
    setCurrentStep(0);
    setError(null);
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);

    // Start entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      // Step 1: Analysis (Simulated quick start)
      setCurrentStep(0);
      setProgress(10);
      await delay(800); // Delay to show step

      // Step 2: AI Generation
      setCurrentStep(1);
      setProgress(30);

      const htmlContent = await tailorResume(resumeUri, {
        companyName,
        positionTitle,
        jobDescription,
      });

      setProgress(70);
      await delay(500); // Delay to show progress

      // Step 3: PDF Creation
      setCurrentStep(2);
      const pdfUri = await createPdfFromHtml(htmlContent);

      setProgress(90);
      await delay(500); // Delay to show progress

      // Step 4: Finalizing
      setCurrentStep(3);
      setProgress(100);

      // Delay to show 100% completion
      await delay(1000);

      // Close animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Prevent duplicate calls if component unmounts or rapid clicks
        // We can't easily check 'mounted' status in functional component without ref
        // But we can trust the parent to close us.
        onComplete(pdfUri);
      });
    } catch (err) {
      isProcessingRef.current = false;
      // eslint-disable-next-line no-console
      console.error('Tailoring failed:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      Alert.alert(
        'Tailoring Failed',
        `${err instanceof Error ? err.message : 'An unknown error occurred'}\n\nPlease check your API key and internet connection.`,
        [{
          text: 'Close', onPress: () => {
            isProcessingRef.current = false;
            onClose();
          }
        }],
      );
    }
  };

  useEffect(() => {
    if (visible) {
      startTailoringProcess();
    } else {
      // Reset ref when hidden
      isProcessingRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={[styles.overlay, StyleSheet.absoluteFillObject]} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View
        style={[
          styles.container,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={[styles.iconContainer, error ? styles.errorIcon : null]}>
            <Ionicons
              name={iconName}
              size={32}
              color={iconColor}
            />
          </View>
          <Text style={styles.title}>{error ? 'Failed' : 'Tailoring Resume'}</Text>
          <Text style={styles.subtitle}>
            {error ? 'Please try again later' : `Customizing for ${positionTitle} at ${companyName}`}
          </Text>
        </View>

        {!error && (
          <>
            {/* Progress Section */}
            <View style={styles.progressSection}>
              <View style={styles.progressContainer}>
                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressBar,
                      { width: `${progress}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{Math.round(progress)}%</Text>
              </View>

              {/* Current Step */}
              <View style={styles.stepContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.stepText}>
                  {steps[currentStep] || 'Processing...'}
                </Text>
              </View>
            </View>

            {/* Steps Indicator */}
            <View style={styles.stepsIndicator}>
              {steps.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                let stepContent;

                if (isCompleted) {
                  stepContent = <Ionicons name="checkmark" size={12} color="white" />;
                } else if (isCurrent) {
                  stepContent = <ActivityIndicator size="small" color="white" />;
                } else {
                  stepContent = <Text style={styles.stepNumber}>{index + 1}</Text>;
                }

                return (
                  <View key={`step-${index}`} style={styles.stepIndicatorContainer}>
                    <View
                      style={[
                        styles.stepIndicator,
                        {
                          backgroundColor: index <= currentStep ? COLORS.primary : '#e5e7eb',
                        },
                      ]}
                    >
                      {stepContent}
                    </View>
                    <Text
                      style={[
                        styles.stepLabel,
                        {
                          color: index <= currentStep ? '#374151' : '#9ca3af',
                        },
                      ]}
                    >
                      {step.replace('...', '')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}