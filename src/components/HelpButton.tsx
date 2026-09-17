import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import COLORS from '../constants/colors';

interface HelpButtonProps {
    onPress: () => void;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onPress }) => {
    return (
        <TouchableOpacity
            style={styles.button}
            onPress={onPress}
            accessibilityLabel="Help"
            accessibilityRole="button"
            accessibilityHint="Opens help for the current screen"
        >
            <Ionicons name="help-circle-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 8,
        marginRight: -8, // Adjust for padding to align with other header elements if needed
    },
});

export default HelpButton;
