import { useEffect, useState } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Category } from '../../types/vendor';

interface CategoryMultiSelectProps {
    selectedIds: string[];
    onChange: (ids: string[]) => void;
}

export function CategoryMultiSelect({ selectedIds, onChange }: CategoryMultiSelectProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name');

            if (error) throw error;
            setCategories(data || []);
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleCategory = (categoryId: string) => {
        if (selectedIds.includes(categoryId)) {
            onChange(selectedIds.filter((id) => id !== categoryId));
        } else {
            onChange([...selectedIds, categoryId]);
        }
    };

    const removeCategory = (categoryId: string) => {
        onChange(selectedIds.filter((id) => id !== categoryId));
    };

    const selectedCategories = categories.filter((cat) =>
        selectedIds.includes(cat.id)
    );

    return (
        <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
                Categories
            </label>

            {/* Selected Categories */}
            {selectedCategories.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                    {selectedCategories.map((category) => (
                        <div
                            key={category.id}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#D4AF37]/10 text-[#D4AF37] rounded-full text-sm font-medium"
                        >
                            {category.name}
                            <button
                                type="button"
                                onClick={() => removeCategory(category.id)}
                                className="hover:bg-[#D4AF37]/20 rounded-full p-0.5"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Dropdown */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="w-full px-4 py-2 text-left border border-gray-300 rounded-lg bg-white hover:border-gray-400 focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent transition flex items-center justify-between"
                >
                    <span className="text-gray-700">
                        {selectedIds.length > 0
                            ? `${selectedIds.length} selected`
                            : 'Select categories'}
                    </span>
                    <ChevronDown
                        className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''
                            }`}
                        size={20}
                    />
                </button>

                {isOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {loading && (
                            <div className="px-4 py-3 text-sm text-gray-500">
                                Loading categories...
                            </div>
                        )}

                        {!loading && categories.length === 0 && (
                            <div className="px-4 py-3 text-sm text-gray-500">
                                No categories available
                            </div>
                        )}

                        {!loading &&
                            categories.map((category) => {
                                const isSelected = selectedIds.includes(category.id);
                                return (
                                    <label
                                        key={category.id}
                                        className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer transition"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleCategory(category.id)}
                                            className="w-4 h-4 text-[#D4AF37] border-gray-300 rounded focus:ring-[#D4AF37]"
                                        />
                                        <span className="ml-3 text-sm text-gray-700">
                                            {category.name}
                                        </span>
                                    </label>
                                );
                            })}
                    </div>
                )}
            </div>

            {selectedIds.length === 0 && (
                <p className="text-xs text-gray-500">
                    Select at least one category for your product
                </p>
            )}
        </div>
    );
}
