// ImgBB Image Upload Utility

const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = 'https://api.imgbb.com/1/upload';

export interface ImgBBUploadResult {
    url: string;
    displayUrl: string;
    deleteUrl: string;
}

/**
 * Upload an image file to ImgBB
 * @param file - The image file to upload
 * @returns Promise with the uploaded image URLs
 */
export async function uploadToImgBB(file: File): Promise<ImgBBUploadResult> {
    if (!IMGBB_API_KEY) {
        throw new Error('ImgBB API key is not configured');
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
        throw new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
        throw new Error('File size exceeds 5MB limit');
    }

    // Create form data
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', IMGBB_API_KEY);

    try {
        const response = await fetch(IMGBB_UPLOAD_URL, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error('ImgBB upload failed');
        }

        return {
            url: data.data.url,
            displayUrl: data.data.display_url,
            deleteUrl: data.data.delete_url,
        };
    } catch (error) {
        console.error('ImgBB upload error:', error);
        throw new Error(
            error instanceof Error ? error.message : 'Failed to upload image to ImgBB'
        );
    }
}

/**
 * Validate if a URL is a valid image URL
 * @param url - The URL to validate
 * @returns Promise<boolean> - True if valid image URL
 */
export async function validateImageUrl(url: string): Promise<boolean> {
    try {
        const response = await fetch(url, { method: 'HEAD' });
        const contentType = response.headers.get('content-type');
        return contentType?.startsWith('image/') ?? false;
    } catch {
        return false;
    }
}

/**
 * Get image dimensions from a file
 * @param file - The image file
 * @returns Promise with width and height
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(file);

        img.onload = () => {
            URL.revokeObjectURL(url);
            resolve({ width: img.width, height: img.height });
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Failed to load image'));
        };

        img.src = url;
    });
}
