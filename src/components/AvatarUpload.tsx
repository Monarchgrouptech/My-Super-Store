import { useState, useRef } from 'react';
import { Upload, Loader2, X } from 'lucide-react';
import { uploadAvatar, getAvatarUrl } from '../lib/avatarUtils';

interface AvatarUploadProps {
    userId: string;
    currentAvatarUrl?: string | null;
    onAvatarChange?: (newUrl: string) => void;
}

export function AvatarUpload({ userId, currentAvatarUrl, onAvatarChange }: AvatarUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [preview, setPreview] = useState<string | null>(currentAvatarUrl || null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setError('Please select an image file');
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            setError('File size must be less than 5MB');
            return;
        }

        setError(null);
        setUploading(true);

        try {
            // Show preview
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);

            // Upload to Supabase
            const result = await uploadAvatar(file, userId);

            if (!result.success) {
                setError(result.error || 'Failed to upload avatar');
                return;
            }

            // Get the signed URL
            if (result.path) {
                const url = await getAvatarUrl(result.path);
                if (url) {
                    onAvatarChange?.(url);
                }
            }
        } catch (err) {
            setError('An error occurred while uploading');
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    const handleClear = () => {
        setPreview(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="space-y-3">
            <label className="block text-gray-500 text-[10px] uppercase tracking-widest font-bold">
                Profile Picture
            </label>

            <div className="flex items-center gap-4">
                {/* Preview */}
                <div className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-[#FFC92E]/30 bg-white/5 flex items-center justify-center flex-shrink-0">
                    {preview ? (
                        <>
                            <img src={preview} alt="Avatar preview" className="w-full h-full object-cover" />
                            {uploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <Loader2 className="animate-spin text-[#FFC92E]" size={20} />
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="text-gray-600 text-center text-xs">No image</div>
                    )}
                </div>

                {/* Upload button */}
                <div className="flex-1">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                        disabled={uploading}
                    />

                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={handleClick}
                            disabled={uploading}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#FFC92E]/10 border border-[#FFC92E]/30 text-[#FFC92E] text-xs font-bold uppercase tracking-widest hover:bg-[#FFC92E]/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {uploading ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" />
                                    Uploading...
                                </>
                            ) : (
                                <>
                                    <Upload size={16} />
                                    Choose Image
                                </>
                            )}
                        </button>

                        {preview && !uploading && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    {error && (
                        <p className="text-xs text-red-400 mt-2">{error}</p>
                    )}
                </div>
            </div>

            <p className="text-xs text-gray-600">
                Recommended: Square image, max 5MB (JPG, PNG, GIF)
            </p>
        </div>
    );
}
