import React from 'react';
import {
    Modal,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';

interface HelpModalProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    content: string;
}

export const HelpModal: React.FC<HelpModalProps> = ({
    visible,
    onClose,
    title,
    content,
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                {/* Backdrop - Sibling element to prevent touch capture interference */}
                <Pressable
                    style={[StyleSheet.absoluteFill, styles.backdrop]}
                    onPress={onClose}
                />

                {/* Modal Content */}
                <View style={styles.modalContainer}>
                    <View style={styles.header}>
                        <View style={styles.titleContainer}>
                            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
                            <Text style={styles.title}>{title}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                            accessibilityLabel="Close help"
                            accessibilityRole="button"
                        >
                            <Ionicons name="close" size={24} color="#6b7280" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={true}
                    >
                        {content.split('\n').map((line, index) => {
                            const trimmedLine = line.trim();

                            // Handle headers (surrounded by **)
                            if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
                                const headerText = trimmedLine.replace(/\*\*/g, '');
                                return (
                                    <Text key={index} style={styles.sectionHeader}>
                                        {headerText}
                                    </Text>
                                );
                            }

                            // Handle bullet points
                            if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-')) {
                                return (
                                    <View key={index} style={styles.bulletItem}>
                                        <Text style={styles.bulletPoint}>•</Text>
                                        <Text style={styles.bulletText}>
                                            {trimmedLine.replace(/^[•-]\s*/, '')}
                                        </Text>
                                    </View>
                                );
                            }

                            // Handle regular paragraphs
                            if (trimmedLine.length > 0) {
                                return (
                                    <Text key={index} style={styles.text}>
                                        {trimmedLine}
                                    </Text>
                                );
                            }

                            // Handle empty lines (spacing)
                            return <View key={index} style={styles.spacer} />;
                        })}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    backdrop: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: 'white', // Ensure header has background
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        flexShrink: 1, // Allows ScrollView to shrink if content exceeds maxHeight
    },
    scrollContent: {
        padding: 20,
    },
    text: {
        fontSize: 15,
        lineHeight: 24,
        color: '#374151', // Dark text for readability
    },
    sectionHeader: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 8,
        marginTop: 8,
    },
    bulletItem: {
        flexDirection: 'row',
        marginBottom: 6,
        paddingLeft: 4,
    },
    bulletPoint: {
        fontSize: 15,
        lineHeight: 24,
        color: '#374151',
        marginRight: 8,
    },
    bulletText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 24,
        color: '#374151',
    },
    spacer: {
        height: 8,
    },
});

export default HelpModal;
