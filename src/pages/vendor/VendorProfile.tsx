import { useState, useEffect, FormEvent } from 'react';
import { Save, Loader2, Upload } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { uploadToImgBB } from '../../lib/imgbb';
import { useVendor } from '../../hooks/useVendor';
import { Vendor } from '../../types/vendor';

export function VendorProfile() {
    const { vendor, loading: vendorLoading, refetch } = useVendor();
    const [formData, setFormData] = useState<Partial<Vendor>>({
        business_name: '',
        email: '',
        phone: '',
        country: '',
        city: '',
        address: '',
        bank_name: '',
        bank_account_number: '',
        bank_account_name: '',
        payout_currency: 'USD',
        logo_url: '',
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (vendor) {
            setFormData({
                business_name: vendor.business_name,
                email: vendor.email,
                phone: vendor.phone || '',
                country: vendor.country || '',
                city: vendor.city || '',
                address: vendor.address || '',
                bank_name: vendor.bank_name || '',
                bank_account_number: vendor.bank_account_number || '',
                bank_account_name: vendor.bank_account_name || '',
                payout_currency: vendor.payout_currency || 'USD',
                logo_url: vendor.logo_url || '',
            });
        }
    }, [vendor]);

    const handleLogoUpload = async (file: File) => {
        setUploading(true);
        setError(null);

        try {
            const result = await uploadToImgBB(file);
            setFormData({ ...formData, logo_url: result.displayUrl });
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Logo upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // Validate required fields
            if (!formData.business_name?.trim()) {
                throw new Error('Business name is required');
            }
            if (!formData.email?.trim()) {
                throw new Error('Email is required');
            }

            if (vendor) {
                // Update existing vendor
                const { error: updateError } = await supabase
                    .from('vendors')
                    .update({
                        business_name: formData.business_name,
                        email: formData.email,
                        phone: formData.phone,
                        country: formData.country,
                        city: formData.city,
                        address: formData.address,
                        bank_name: formData.bank_name,
                        bank_account_number: formData.bank_account_number,
                        bank_account_name: formData.bank_account_name,
                        payout_currency: formData.payout_currency,
                        logo_url: formData.logo_url,
                        updated_at: new Date().toISOString(),
                    })
                    .eq('id', vendor.id);

                if (updateError) throw updateError;
            } else {
                // Create new vendor profile
                const { data: { user }, error: authError } = await supabase.auth.getUser();

                if (authError) throw authError;
                if (!user) throw new Error('User not authenticated');

                // Check if user_profile exists manually to satisfy foreign key constraint
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('id')
                    .eq('user_id', user.id)
                    .maybeSingle(); // Use maybeSingle to avoid error if not found

                if (!profile) {
                    // Create user_profile if it doesn't exist
                    const { error: profileInsertError } = await supabase
                        .from('user_profiles')
                        .insert({
                            user_id: user.id,
                            email: user.email,
                            display_name: formData.business_name || 'Vendor',
                        });

                    if (profileInsertError) {
                        console.error('Error creating user profile:', profileInsertError);
                        // Verify if it was a race condition (already exists) before throwing
                        if (profileInsertError.code !== '23505') { // 23505 is unique_violation
                            throw new Error(`Failed to create base user profile: ${profileInsertError.message}`);
                        }
                    }
                }

                const { error: insertError } = await supabase.from('vendors').insert({
                    user_id: user.id,
                    business_name: formData.business_name!,
                    email: formData.email!,
                    phone: formData.phone,
                    country: formData.country,
                    city: formData.city,
                    address: formData.address,
                    bank_name: formData.bank_name,
                    bank_account_number: formData.bank_account_number,
                    bank_account_name: formData.bank_account_name,
                    payout_currency: formData.payout_currency,
                    logo_url: formData.logo_url,
                });

                if (insertError) throw insertError;
            }

            setSuccess(true);
            await refetch();
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving vendor profile:', err);
            setError(err instanceof Error ? err.message : 'Failed to save profile');
        } finally {
            setSaving(false);
        }
    };

    if (vendorLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader2 className="animate-spin text-[#D4AF37]" size={48} />
            </div>
        );
    }

    return (
        <section >
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8 flex flex-col items-center justify-center">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Vendor Profile</h1>
                    <p className="text-gray-600">
                        {vendor ? 'Update your vendor information' : 'Create your vendor profile'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-6">
                        Profile saved successfully!
                    </div>
                )}

                {vendor && !vendor.is_verified && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <p className="text-sm text-yellow-800">
                            <strong>Verification Pending:</strong> Your vendor account is under review. You can still manage products, but they may not be visible to customers until verified.
                        </p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8 flex flex-col  ">
                    {/* Business Information */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">
                            Business Information
                        </h2>

                        <div className="space-y-4">
                            {/* Logo */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Business Logo
                                </label>
                                <div className="flex items-center gap-4">
                                    {formData.logo_url && (
                                        <img
                                            src={formData.logo_url}
                                            alt="Business logo"
                                            className="w-24 h-24 object-cover rounded-lg border border-gray-200"
                                        />
                                    )}
                                    <label className="cursor-pointer">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => {
                                                if (e.target.files?.[0]) {
                                                    handleLogoUpload(e.target.files[0]);
                                                }
                                            }}
                                            className="hidden"
                                        />
                                        <div className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                                            {uploading ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={16} />
                                                    Uploading...
                                                </>
                                            ) : (
                                                <>
                                                    <Upload size={16} />
                                                    Upload Logo
                                                </>
                                            )}
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Business Name *
                                </label>
                                <input
                                    type="text"
                                    value={formData.business_name}
                                    onChange={(e) =>
                                        setFormData({ ...formData, business_name: e.target.value })
                                    }
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="Your business name"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="business@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Phone
                                </label>
                                <input
                                    type="tel"
                                    value={formData.phone || ''}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="+1 234 567 8900"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Country
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.country || ''}
                                        onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                        placeholder="United States"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        City
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.city || ''}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                        placeholder="New York"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Address
                                </label>
                                <textarea
                                    value={formData.address || ''}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="Full business address"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bank Details */}
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">
                            Bank Details
                        </h2>
                        <p className="text-sm text-gray-600 mb-6">
                            Required for receiving payments from sales
                        </p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bank Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.bank_name || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, bank_name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="e.g., Chase Bank"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Number
                                </label>
                                <input
                                    type="text"
                                    value={formData.bank_account_number || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, bank_account_number: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="Account number"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Holder Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.bank_account_name || ''}
                                    onChange={(e) =>
                                        setFormData({ ...formData, bank_account_name: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                    placeholder="Name on bank account"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Payout Currency
                                </label>
                                <select
                                    value={formData.payout_currency}
                                    onChange={(e) =>
                                        setFormData({ ...formData, payout_currency: e.target.value })
                                    }
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                                >
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound</option>
                                    <option value="NGN">NGN - Nigerian Naira</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={20} />
                                    Save Profile
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </section>
    );
}
