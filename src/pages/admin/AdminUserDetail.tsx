import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Avatar } from '../../components/Avatar';
import { ArrowLeft, Mail, User as UserIcon, Calendar, Clock, Shield } from 'lucide-react';

interface UserDetail {
    id: string;
    user_id: string;
    email: string;
    display_name: string | null;
    avatar_url: string | null;
    is_admin: boolean;
    created_at: string;
    updated_at: string;
    last_sign_in_at: string | null;
}

export function AdminUserDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchUserDetails();
        }
    }, [id]);

    const fetchUserDetails = async () => {
        try {
            // Fetch user profile
            const { data: profile, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', id)
                .single();

            if (profileError) {
                console.error('Error fetching user profile:', profileError);
                setLoading(false);
                return;
            }

            // Fetch auth data to get last_sign_in_at
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (token) {
                const listRes = await fetch(
                    'https://hoieogginmsfmoarubuu.supabase.co/functions/v1/manage-users?action=list',
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (listRes.ok) {
                    const authUsers = await listRes.json();
                    const authUser = authUsers?.find((au: any) => au.id === profile.user_id);

                    setUser({
                        ...profile,
                        last_sign_in_at: authUser?.last_sign_in_at || null
                    });
                } else {
                    setUser({ ...profile, last_sign_in_at: null });
                }
            } else {
                setUser({ ...profile, last_sign_in_at: null });
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-12">
                    <p className="text-gray-600">Loading user details...</p>
                </div>
            </AdminLayout>
        );
    }

    if (!user) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <p className="text-red-600 text-lg">User not found</p>
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="mt-4 text-blue-600 hover:text-blue-800"
                    >
                        Back to Users
                    </button>
                </div>
            </AdminLayout>
        );
    }

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/users')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
                        <p className="text-gray-600">Complete user information</p>
                    </div>
                    <span className={`px-4 py-2 rounded-lg font-semibold ${user.is_admin
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                        {user.is_admin ? 'Admin User' : 'Regular User'}
                    </span>
                </div>

                {/* User Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Profile Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <UserIcon className="text-blue-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Profile Information</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Display Name</label>
                                <p className="text-gray-900 font-semibold text-lg">{user.display_name || 'Not set'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Avatar URL</label>
                                <div className="flex items-center gap-3">
                                    <Avatar
                                        src={user.avatar_url}
                                        displayName={user.display_name || user.email}
                                        className="w-16 h-16"
                                        fallbackClassName="bg-gray-100 border border-gray-300 text-gray-700 text-xl font-bold"
                                    />
                                    <p className="text-gray-700 text-sm break-all font-mono">
                                        {user.avatar_url || 'No external URL set'}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Role</label>
                                <div className="flex items-center gap-2">
                                    <Shield size={18} className={user.is_admin ? 'text-purple-600' : 'text-gray-400'} />
                                    <p className="text-gray-900">{user.is_admin ? 'Administrator' : 'Customer'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Mail className="text-green-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Mail className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Email</label>
                                    <p className="text-gray-900">{user.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Clock className="text-orange-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Activity</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <Calendar className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Account Created</label>
                                    <p className="text-gray-900">{new Date(user.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Last Updated</label>
                                    <p className="text-gray-900">{new Date(user.updated_at).toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Last Sign In</label>
                                    <p className="text-gray-900">
                                        {user.last_sign_in_at
                                            ? new Date(user.last_sign_in_at).toLocaleString()
                                            : 'Never'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Account IDs */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-purple-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Account Information</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Profile ID</label>
                                <p className="text-gray-900 font-mono text-sm">{user.id}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Auth User ID</label>
                                <p className="text-gray-900 font-mono text-sm">{user.user_id}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
