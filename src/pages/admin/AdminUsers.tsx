import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/StatCard';
import { Search, Trash2, Mail, Eye, Users } from 'lucide-react';

interface User {
    id: string;
    user_id: string;
    email: string;
    created_at: string;
    last_sign_in_at: string | null;
}

export function AdminUsers() {
    const navigate = useNavigate();
    const { isAdmin } = useAdmin();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

    useEffect(() => {
        if (isAdmin) {
            fetchUsers();
        }
    }, [isAdmin]);

    useEffect(() => {
        const filtered = users.filter(user =>
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
        setFilteredUsers(filtered);
    }, [searchTerm, users]);

    const fetchUsers = async () => {
        try {
            // Get the current session and access token
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                console.error('No auth token available');
                setLoading(false);
                return;
            }

            // Fetch user_profiles for non-admin users
            const { data: profiles, error: profileError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('is_admin', false)
                .order('created_at', { ascending: false });

            if (profileError) {
                console.error('Error fetching user profiles:', profileError);
                setLoading(false);
                return;
            }

            // Fetch all users from Edge Function to get last_sign_in_at
            const listRes = await fetch(
                'https://hoieogginmsfmoarubuu.supabase.co/functions/v1/manage-users?action=list',
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!listRes.ok) {
                console.error('Error fetching auth users from Edge Function');
                // Fallback to just profiles without last_sign_in_at
                setUsers(profiles || []);
                setFilteredUsers(profiles || []);
                setLoading(false);
                return;
            }

            const authUsers = await listRes.json();

            // Merge profile data with auth data
            const mergedUsers = (profiles || []).map(profile => {
                const authUser = authUsers?.find((au: any) => au.id === profile.user_id);
                return {
                    ...profile,
                    last_sign_in_at: authUser?.last_sign_in_at || null
                };
            });

            setUsers(mergedUsers);
            setFilteredUsers(mergedUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            try {
                // Get the current session and access token
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (!token) {
                    alert('Authentication error');
                    return;
                }

                // Find the user_id from auth (since we're storing the profile id)
                const userToDelete = users.find(u => u.id === userId);
                if (!userToDelete?.user_id) {
                    alert('User not found');
                    return;
                }

                // Delete user via Edge Function
                const deleteRes = await fetch(
                    `https://hoieogginmsfmoarubuu.supabase.co/functions/v1/manage-users?action=delete&user_id=${userToDelete.user_id}`,
                    {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );

                if (!deleteRes.ok) {
                    const errorData = await deleteRes.json();
                    alert(`Error deleting user: ${errorData.error || 'Unknown error'}`);
                    return;
                }

                // Also delete from user_profiles
                const { error } = await supabase
                    .from('user_profiles')
                    .delete()
                    .eq('id', userId);

                if (!error) {
                    setUsers(users.filter(u => u.id !== userId));
                    alert('User deleted successfully');
                } else {
                    alert('Error deleting user profile');
                }
            } catch (error) {
                console.error('Error deleting user:', error);
                alert('Error deleting user');
            }
        }
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
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                    <p className="text-gray-600">Manage all registered users</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Total Users"
                        value={users.length}
                        icon={Users}
                        color="blue"
                    />
                    <StatCard
                        title="Search Results"
                        value={filteredUsers.length}
                        icon={Search}
                        color="purple"
                    />
                    <StatCard
                        title="Filtered Out"
                        value={users.length - filteredUsers.length}
                        icon={Users}
                        color="gray"
                    />
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-2">
                        <Search size={20} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 outline-none text-gray-700"
                        />
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading users...</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No users found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Joined
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Last Active
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Mail size={16} className="text-gray-400" />
                                                    <span className="text-gray-900">{user.email}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {user.last_sign_in_at
                                                    ? new Date(user.last_sign_in_at).toLocaleDateString()
                                                    : 'Never'}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/users/${user.id}`)}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                        title="View user details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteUser(user.id)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                        title="Delete user"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Stats */}

            </div>
        </AdminLayout>
    );
}
