import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { ArrowLeft, Mail, Phone, MapPin, Building, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import { Vendor } from '../../types/vendor';

export function AdminVendorDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchVendorDetails();
        }
    }, [id]);

    const fetchVendorDetails = async () => {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('id', id)
                .single();

            if (!error && data) {
                setVendor(data);
            }
        } catch (error) {
            console.error('Error fetching vendor:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleVerification = async () => {
        if (!vendor) return;

        try {
            const { error } = await supabase
                .from('vendors')
                .update({ is_verified: !vendor.is_verified })
                .eq('id', vendor.id);

            if (!error) {
                setVendor({ ...vendor, is_verified: !vendor.is_verified });
            } else {
                alert('Error updating verification status');
            }
        } catch (error) {
            console.error('Error updating vendor:', error);
        }
    };

    if (loading) {
        return (
            <AdminLayout>
                <div className="flex items-center justify-center py-12">
                    <p className="text-gray-600">Loading vendor details...</p>
                </div>
            </AdminLayout>
        );
    }

    if (!vendor) {
        return (
            <AdminLayout>
                <div className="text-center py-12">
                    <p className="text-red-600 text-lg">Vendor not found</p>
                    <button
                        onClick={() => navigate('/admin/vendors')}
                        className="mt-4 text-blue-600 hover:text-blue-800"
                    >
                        Back to Vendors
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
                        onClick={() => navigate('/admin/vendors')}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-3xl font-bold text-gray-900">Vendor Details</h1>
                        <p className="text-gray-600">Complete vendor information</p>
                    </div>
                    <button
                        onClick={handleToggleVerification}
                        className={`px-6 py-3 rounded-lg font-semibold transition-colors ${vendor.is_verified
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-green-500 hover:bg-green-600 text-white'
                            }`}
                    >
                        {vendor.is_verified ? 'Revoke Verification' : 'Approve Vendor'}
                    </button>
                </div>

                {/* Vendor Information */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Business Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Building className="text-blue-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Business Information</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Business Name</label>
                                <p className="text-gray-900 font-semibold text-lg">{vendor.business_name}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Logo URL</label>
                                <p className="text-gray-700">{vendor.logo_url || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Verification Status</label>
                                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded text-sm font-semibold ${vendor.is_verified
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-yellow-100 text-yellow-800'
                                    }`}>
                                    {vendor.is_verified ? <CheckCircle size={16} /> : <XCircle size={16} />}
                                    {vendor.is_verified ? 'Verified' : 'Pending'}
                                </span>
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
                                    <p className="text-gray-900">{vendor.email}</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Phone className="text-gray-400 mt-1" size={18} />
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-1">Phone</label>
                                    <p className="text-gray-900">{vendor.phone || 'Not provided'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Location Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <MapPin className="text-purple-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Location</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Country</label>
                                <p className="text-gray-900">{vendor.country || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">City</label>
                                <p className="text-gray-900">{vendor.city || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Address</label>
                                <p className="text-gray-900">{vendor.address || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Banking Information */}
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <CreditCard className="text-orange-600" size={24} />
                            <h2 className="text-xl font-bold text-gray-900">Banking Information</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Bank Name</label>
                                <p className="text-gray-900">{vendor.bank_name || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Account Number</label>
                                <p className="text-gray-900 font-mono">{vendor.bank_account_number || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Account Name</label>
                                <p className="text-gray-900">{vendor.bank_account_name || 'Not provided'}</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-1">Payout Currency</label>
                                <p className="text-gray-900">{vendor.payout_currency}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metadata */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">User ID</label>
                            <p className="text-gray-900 font-mono text-sm">{vendor.user_id}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Vendor ID</label>
                            <p className="text-gray-900 font-mono text-sm">{vendor.id}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Created At</label>
                            <p className="text-gray-900">{new Date(vendor.created_at).toLocaleString()}</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-1">Updated At</label>
                            <p className="text-gray-900">{new Date(vendor.updated_at).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
