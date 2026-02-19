import { useState, useRef, DragEvent } from 'react';
import { Upload, Link as LinkIcon, X, GripVertical, Loader2 } from 'lucide-react';
import { uploadToImgBB, validateImageUrl } from '../../lib/imgbb';
import { ProductImage } from '../../types/vendor';

interface ImageUploaderProps {
    images: ProductImage[];
    onChange: (images: ProductImage[]) => void;
    maxImages?: number;
}

export function ImageUploader({ images, onChange, maxImages = 10 }: ImageUploaderProps) {
    const [mode, setMode] = useState<'url' | 'file'>('file');
    const [urlInput, setUrlInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const file = files[0];
        setUploading(true);
        setError(null);

        try {
            const result = await uploadToImgBB(file);
            const newImage: ProductImage = {
                url: result.displayUrl,
                alt_text: file.name.replace(/\.[^/.]+$/, ''),
                position: images.length,
            };
            onChange([...images, newImage]);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleUrlAdd = async () => {
        if (!urlInput.trim()) return;

        setUploading(true);
        setError(null);

        try {
            const isValid = await validateImageUrl(urlInput);
            if (!isValid) {
                throw new Error('Invalid image URL');
            }

            const newImage: ProductImage = {
                url: urlInput,
                alt_text: '',
                position: images.length,
            };
            onChange([...images, newImage]);
            setUrlInput('');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid URL');
        } finally {
            setUploading(false);
        }
    };

    const handleRemove = (index: number) => {
        const updated = images.filter((_, i) => i !== index);
        // Reindex positions
        const reindexed = updated.map((img, i) => ({ ...img, position: i }));
        onChange(reindexed);
    };

    const handleAltTextChange = (index: number, altText: string) => {
        const updated = [...images];
        updated[index] = { ...updated[index], alt_text: altText };
        onChange(updated);
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: DragEvent<HTMLDivElement>, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const updated = [...images];
        const draggedItem = updated[draggedIndex];
        updated.splice(draggedIndex, 1);
        updated.splice(index, 0, draggedItem);

        // Reindex positions
        const reindexed = updated.map((img, i) => ({ ...img, position: i }));
        onChange(reindexed);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const canAddMore = images.length < maxImages;

    return (
        <div className="space-y-4">
            <div className="flex gap-2 mb-4">
                <button
                    type="button"
                    onClick={() => setMode('file')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${mode === 'file'
                            ? 'bg-[#D4AF37] text-black'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Upload File
                </button>
                <button
                    type="button"
                    onClick={() => setMode('url')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${mode === 'url'
                            ? 'bg-[#D4AF37] text-black'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    Paste URL
                </button>
            </div>

            {canAddMore && (
                <>
                    {mode === 'file' && (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleFileUpload(e.target.files)}
                                className="hidden"
                            />
                            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <p className="text-gray-600 mb-2">
                                Drag & drop or click to upload
                            </p>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploading}
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <Loader2 className="animate-spin" size={16} />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={16} />
                                        Choose File
                                    </>
                                )}
                            </button>
                            <p className="text-sm text-gray-500 mt-2">
                                PNG, JPG, WEBP up to 5MB
                            </p>
                        </div>
                    )}

                    {mode === 'url' && (
                        <div className="flex gap-2">
                            <div className="flex-1">
                                <input
                                    type="url"
                                    value={urlInput}
                                    onChange={(e) => setUrlInput(e.target.value)}
                                    placeholder="https://example.com/image.jpg"
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    onKeyDown={(e) => e.key === 'Enter' && handleUrlAdd()}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleUrlAdd}
                                disabled={uploading || !urlInput.trim()}
                                className="btn-primary inline-flex items-center gap-2"
                            >
                                {uploading ? (
                                    <Loader2 className="animate-spin" size={16} />
                                ) : (
                                    <>
                                        <LinkIcon size={16} />
                                        Add URL
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}

            {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {images.length > 0 && (
                <div className="space-y-3">
                    <p className="text-sm font-medium text-gray-700">
                        Images ({images.length}/{maxImages})
                    </p>
                    {images.map((image, index) => (
                        <div
                            key={index}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragEnd={handleDragEnd}
                            className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-white hover:border-gray-300 transition cursor-move"
                        >
                            <GripVertical className="text-gray-400 mt-1 flex-shrink-0" size={20} />
                            <img
                                src={image.url}
                                alt={image.alt_text || 'Product image'}
                                className="w-20 h-20 object-cover rounded border border-gray-200 flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                                <input
                                    type="text"
                                    value={image.alt_text || ''}
                                    onChange={(e) => handleAltTextChange(index, e.target.value)}
                                    placeholder="Alt text (optional)"
                                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                />
                                <p className="text-xs text-gray-500 mt-1 truncate">
                                    Position: {index + 1}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded transition flex-shrink-0"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {!canAddMore && (
                <p className="text-sm text-gray-500 text-center">
                    Maximum {maxImages} images reached
                </p>
            )}
        </div>
    );
}
