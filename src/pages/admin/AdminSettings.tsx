import { useState } from 'react';
import { useAdmin } from '../../context/AdminContext';
import { AdminLayout } from '../../components/admin/AdminLayout';
import { Save, AlertCircle } from 'lucide-react';

interface SystemSettings {
    store_name: string;
    store_email: string;
    store_phone: string;
    store_address: string;
    store_city: string;
    store_country: string;
    commission_rate: number;
    tax_rate: number;
    maintenance_mode: boolean;
}

export function AdminSettings() {
    const { isAdmin } = useAdmin();
    const [settings, setSettings] = useState<SystemSettings>({
        store_name: 'My Super Store',
        store_email: 'admin@mysuperstore.com',
        store_phone: '+1 (555) 000-0000',
        store_address: '123 Main Street',
        store_city: 'New York',
        store_country: 'United States',
        commission_rate: 10,
        tax_rate: 8,
        maintenance_mode: false,
    });
    const [saved, setSaved] = useState(false);
    const [saving, setSaving] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setSettings({
            ...settings,
            [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
        });
        setSaved(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Simulate saving settings
            await new Promise(resolve => setTimeout(resolve, 500));
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setSaving(false);
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
                    <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
                    <p className="text-gray-600">Manage system settings and configuration</p>
                </div>

                {/* Alert */}
                {saved && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
                        <AlertCircle size={20} className="text-green-600" />
                        <span className="text-green-800">Settings saved successfully!</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Store Information */}
                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Store Information</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Store Name
                            </label>
                            <input
                                type="text"
                                name="store_name"
                                value={settings.store_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Store Email
                            </label>
                            <input
                                type="email"
                                name="store_email"
                                value={settings.store_email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Store Phone
                            </label>
                            <input
                                type="tel"
                                name="store_phone"
                                value={settings.store_phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Store Address
                            </label>
                            <input
                                type="text"
                                name="store_address"
                                value={settings.store_address}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    City
                                </label>
                                <input
                                    type="text"
                                    name="store_city"
                                    value={settings.store_city}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Country
                                </label>
                                <input
                                    type="text"
                                    name="store_country"
                                    value={settings.store_country}
                                    onChange={handleChange}
                                    className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Financial Settings */}
                    <div className="bg-white rounded-lg shadow p-6 space-y-4">
                        <h2 className="text-lg font-bold text-gray-900 mb-4">Financial Settings</h2>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Commission Rate (%)
                            </label>
                            <input
                                type="number"
                                name="commission_rate"
                                value={settings.commission_rate}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Percentage taken from each vendor sale</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Tax Rate (%)
                            </label>
                            <input
                                type="number"
                                name="tax_rate"
                                value={settings.tax_rate}
                                onChange={handleChange}
                                min="0"
                                max="100"
                                step="0.1"
                                className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Default tax rate for orders</p>
                        </div>

                        <div className="pt-4 border-t border-gray-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="maintenance_mode"
                                    checked={settings.maintenance_mode}
                                    onChange={handleChange}
                                    className="w-4 h-4 text-blue-600 rounded"
                                />
                                <span className="font-medium text-gray-700">Enable Maintenance Mode</span>
                            </label>
                            <p className="text-xs text-gray-500 mt-2">
                                When enabled, only admins can access the store
                            </p>
                        </div>
                    </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end gap-4">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400 transition-colors"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Save Settings'}
                    </button>
                </div>
            </div>
        </AdminLayout>
    );
}
