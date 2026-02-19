import { useEffect, useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Category } from '../../types/vendor';

export function AdminCategories() {
    const { isAdmin } = useAdmin();
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', slug: '', parent_id: '' });

    useEffect(() => {
        if (isAdmin) {
            fetchCategories();
        }
    }, [isAdmin]);

    const fetchCategories = async () => {
        try {
            const { data, error } = await supabase
                .from('categories')
                .select('*')
                .order('name', { ascending: true });

            if (!error && data) {
                setCategories(data);
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name || !formData.slug) {
            alert('Name and slug are required');
            return;
        }

        try {
            if (editingId) {
                // Update existing
                const { error } = await supabase
                    .from('categories')
                    .update({
                        name: formData.name,
                        slug: formData.slug,
                        parent_id: formData.parent_id || null,
                    })
                    .eq('id', editingId);

                if (!error) {
                    fetchCategories();
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({ name: '', slug: '', parent_id: '' });
                } else {
                    alert('Error updating category');
                }
            } else {
                // Create new
                const { error } = await supabase
                    .from('categories')
                    .insert([
                        {
                            name: formData.name,
                            slug: formData.slug,
                            parent_id: formData.parent_id || null,
                        },
                    ]);

                if (!error) {
                    fetchCategories();
                    setShowForm(false);
                    setFormData({ name: '', slug: '', parent_id: '' });
                } else {
                    alert('Error creating category');
                }
            }
        } catch (error) {
            console.error('Error submitting form:', error);
        }
    };

    const handleDelete = async (categoryId: string) => {
        if (confirm('Are you sure you want to delete this category?')) {
            try {
                const { error } = await supabase
                    .from('categories')
                    .delete()
                    .eq('id', categoryId);

                if (!error) {
                    setCategories(categories.filter(c => c.id !== categoryId));
                } else {
                    alert('Error deleting category');
                }
            } catch (error) {
                console.error('Error deleting category:', error);
            }
        }
    };

    const handleEdit = (category: Category) => {
        setEditingId(category.id);
        setFormData({
            name: category.name,
            slug: category.slug,
            parent_id: category.parent_id || '',
        });
        setShowForm(true);
    };

    if (!isAdmin) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <p className="text-red-600 text-lg">Access Denied</p>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Categories</h1>
                        <p className="text-gray-600">Manage product categories</p>
                    </div>
                    <button
                        onClick={() => {
                            setShowForm(!showForm);
                            setEditingId(null);
                            setFormData({ name: '', slug: '', parent_id: '' });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={18} />
                        Add Category
                    </button>
                </div>

                {/* Form */}
                {showForm && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Category Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                    placeholder="Enter category name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Slug
                                </label>
                                <input
                                    type="text"
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                    placeholder="Enter slug (e.g., electronics)"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                                >
                                    {editingId ? 'Update' : 'Create'} Category
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowForm(false);
                                        setEditingId(null);
                                        setFormData({ name: '', slug: '', parent_id: '' });
                                    }}
                                    className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Categories Grid */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading categories...</div>
                    ) : categories.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No categories found</div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {categories.map((category) => (
                                <div
                                    key={category.id}
                                    className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                                >
                                    <div>
                                        <p className="font-medium text-gray-900">{category.name}</p>
                                        <p className="text-sm text-gray-600">/{category.slug}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleEdit(category)}
                                            className="text-blue-600 hover:text-blue-800 transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(category.id)}
                                            className="text-red-600 hover:text-red-800 transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AdminLayout>
    );
}
