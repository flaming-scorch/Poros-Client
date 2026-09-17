import * as Print from 'expo-print';

export const createPdfFromHtml = async (htmlContent: string): Promise<string> => {
    try {
        const { uri } = await Print.printToFileAsync({
            html: htmlContent,
            base64: false,
        });
        return uri;
    } catch (error) {
        console.error('Error creating PDF:', error);
        throw error;
    }
};
