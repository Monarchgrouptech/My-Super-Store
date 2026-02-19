import { supabase } from './supabase';

/**
 * Get a signed URL for a user's avatar from Supabase Storage
 * Handles both direct URLs and storage paths
 */
export async function getAvatarUrl(avatarPath: string | null | undefined): Promise<string | null> {
    if (!avatarPath) return null;

    try {
        // If it's already a full URL, return it
        if (avatarPath.startsWith('http://') || avatarPath.startsWith('https://')) {
            return avatarPath;
        }

        // Otherwise, treat it as a path in Supabase Storage
        const { data } = supabase.storage
            .from('avatars') // Make sure this bucket exists in your Supabase project
            .getPublicUrl(avatarPath);

        return data?.publicUrl || null;
    } catch (error) {
        console.error('Error getting avatar URL:', error);
        return null;
    }
}

/**
 * Upload an avatar image to Supabase Storage
 */
export async function uploadAvatar(
    file: File,
    userId: string
): Promise<{ success: boolean; path?: string; error?: string }> {
    try {
        const fileExtension = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExtension}`;

        const { error } = await supabase.storage
            .from('avatars')
            .upload(fileName, file, {
                upsert: true,
                cacheControl: '3600',
            });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true, path: fileName };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}

/**
 * Delete an avatar from Supabase Storage
 */
export async function deleteAvatar(avatarPath: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!avatarPath || avatarPath.startsWith('http')) {
            return { success: false, error: 'Cannot delete external URLs' };
        }

        const { error } = await supabase.storage
            .from('avatars')
            .remove([avatarPath]);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        return { success: false, error: String(error) };
    }
}
