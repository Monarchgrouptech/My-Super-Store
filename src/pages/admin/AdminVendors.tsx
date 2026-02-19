import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { StatCard } from '../../components/admin/StatCard';
import { Search, Trash2, CheckCircle, Clock, Eye, Store } from 'lucide-react';
import { Vendor } from '../../types/vendor';

export function AdminVendors() {
    const navigate = useNavigate();
    const { isAdmin } = useAdmin();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
    const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified'>('all');

    useEffect(() => {
        if (isAdmin) {
            fetchVendors();
        }
    }, [isAdmin]);

    useEffect(() => {
        let filtered = vendors.filter(vendor =>
            vendor.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vendor.email.toLowerCase().includes(searchTerm.toLowerCase())
        );

        // Apply status filter
        if (statusFilter === 'pending') {
            filtered = filtered.filter(v => !v.is_verified);
        } else if (statusFilter === 'verified') {
            filtered = filtered.filter(v => v.is_verified);
        }

        setFilteredVendors(filtered);
    }, [searchTerm, vendors, statusFilter]);

    const fetchVendors = async () => {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && data) {
                setVendors(data);
                setFilteredVendors(data);
            }
        } catch (error) {
            console.error('Error fetching vendors:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveVendor = async (vendorId: string) => {
        try {
            const { error } = await supabase
                .from('vendors')
                .update({ is_verified: true })
                .eq('id', vendorId);

            if (!error) {
                setVendors(vendors.map(v =>
                    v.id === vendorId ? { ...v, is_verified: true } : v
                ));
            } else {
                alert('Error approving vendor');
            }
        } catch (error) {
            console.error('Error approving vendor:', error);
        }
    };

    const handleDeleteVendor = async (vendorId: string) => {
        if (confirm('Are you sure you want to delete this vendor?')) {
            try {
                const { error } = await supabase
                    .from('vendors')
                    .delete()
                    .eq('id', vendorId);

                if (!error) {
                    setVendors(vendors.filter(v => v.id !== vendorId));
                    alert('Vendor deleted successfully');
                } else {
                    alert('Error deleting vendor');
                }
            } catch (error) {
                console.error('Error deleting vendor:', error);
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
                    <h1 className="text-3xl font-bold text-gray-900">Vendor Management</h1>
                    <p className="text-gray-600">Manage all vendors and their verification status</p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard
                        title="Total Vendors"
                        value={vendors.length}
                        icon={Store}
                        color="green"
                    />
                    <StatCard
                        title="Verified"
                        value={vendors.filter(v => v.is_verified).length}
                        icon={CheckCircle}
                        color="green"
                    />
                    <StatCard
                        title="Pending Approval"
                        value={vendors.filter(v => !v.is_verified).length}
                        icon={Clock}
                        color="yellow"
                    />
                </div>


                {/* Filter Tabs */}
                <div className="bg-white rounded-lg shadow p-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setStatusFilter('all')}
                            className={`px-4 py-2 rounded transition-colors ${statusFilter === 'all'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All Vendors ({vendors.length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('pending')}
                            className={`px-4 py-2 rounded transition-colors ${statusFilter === 'pending'
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Pending Approval ({vendors.filter(v => !v.is_verified).length})
                        </button>
                        <button
                            onClick={() => setStatusFilter('verified')}
                            className={`px-4 py-2 rounded transition-colors ${statusFilter === 'verified'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Verified ({vendors.filter(v => v.is_verified).length})
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center gap-2">
                        <Search size={20} className="text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by business name or email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="flex-1 outline-none text-gray-700"
                        />
                    </div>
                </div>

                {/* Vendors Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading vendors...</div>
                    ) : filteredVendors.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No vendors found</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Business Name
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Email
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            City
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Status
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                                            Joined
                                        </th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredVendors.map((vendor) => (
                                        <tr key={vendor.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <span className="text-gray-900 font-medium">{vendor.business_name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {vendor.email}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {vendor.city || '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm">
                                                <span className={`px-2 py-1 rounded text-xs inline-flex items-center gap-1 ${vendor.is_verified
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {vendor.is_verified ? (
                                                        <>
                                                            <CheckCircle size={14} />
                                                            Verified
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Clock size={14} />
                                                            Pending
                                                        </>
                                                    )}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {new Date(vendor.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/admin/vendors/${vendor.id}`)}
                                                        className="text-blue-600 hover:text-blue-800 transition-colors"
                                                        title="View vendor details"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                    {!vendor.is_verified && (
                                                        <button
                                                            onClick={() => handleApproveVendor(vendor.id)}
                                                            className="text-green-600 hover:text-green-800 transition-colors text-sm px-2 py-1 rounded hover:bg-green-50"
                                                        >
                                                            Approve
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleDeleteVendor(vendor.id)}
                                                        className="text-red-600 hover:text-red-800 transition-colors"
                                                        title="Delete vendor"
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
