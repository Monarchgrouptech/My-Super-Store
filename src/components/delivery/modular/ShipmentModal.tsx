import React, { useState } from 'react';
import { X, Truck, Globe, Hash, AlertCircle } from 'lucide-react';

interface ShipmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (data: { carrierName: string; trackingNumber: string; trackingUrl: string }) => void;
}

export function ShipmentModal({ isOpen, onClose, onConfirm }: ShipmentModalProps) {
    const [carrierName, setCarrierName] = useState('');
    const [trackingNumber, setTrackingNumber] = useState('');
    const [trackingUrl, setTrackingUrl] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!carrierName.trim() || !trackingNumber.trim()) {
            setError('Carrier name and tracking number are required.');
            return;
        }
        const fallbackUrl = `https://www.google.com/search?q=${encodeURIComponent(carrierName.trim() + ' tracking ' + trackingNumber.trim())}`;
        const finalTrackingUrl = trackingUrl.trim() || fallbackUrl;
        onConfirm({ carrierName: carrierName.trim(), trackingNumber: trackingNumber.trim(), trackingUrl: finalTrackingUrl });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg border-2 border-black shadow-[20px_20px_0_0_rgba(0,0,0,0.2)]">
                <div className="p-8 border-b-2 border-black flex items-center justify-between bg-zinc-50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-black flex items-center justify-center">
                            <Truck size={24} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-[20px] font-black text-black tracking-tight uppercase">Confirm Shipment</h2>
                            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Enter logistics tracking details</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center border border-zinc-200 text-zinc-400 hover:text-black hover:border-black transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {error && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 text-red-600 text-[12px] font-bold uppercase tracking-tight">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="label-caps text-zinc-500">Carrier Name</label>
                            <div className="relative">
                                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                <input 
                                    type="text"
                                    value={carrierName}
                                    onChange={(e) => setCarrierName(e.target.value)}
                                    placeholder="e.g. FedEx, DHL, UPS"
                                    className="w-full bg-zinc-50 border-2 border-zinc-200 px-12 py-4 text-[14px] font-bold text-black focus:border-black focus:bg-white outline-none transition-all placeholder:text-zinc-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="label-caps text-zinc-500">Tracking Number</label>
                            <div className="relative">
                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                <input 
                                    type="text"
                                    value={trackingNumber}
                                    onChange={(e) => setTrackingNumber(e.target.value)}
                                    placeholder="Enter carrier tracking code"
                                    className="w-full bg-zinc-50 border-2 border-zinc-200 px-12 py-4 text-[14px] font-bold text-black focus:border-black focus:bg-white outline-none transition-all placeholder:text-zinc-300"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="label-caps text-zinc-500">Tracking URL (Optional)</label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                                <input 
                                    type="url"
                                    value={trackingUrl}
                                    onChange={(e) => setTrackingUrl(e.target.value)}
                                    placeholder="https://carrier.com/track/..."
                                    className="w-full bg-zinc-50 border-2 border-zinc-200 px-12 py-4 text-[14px] font-bold text-black focus:border-black focus:bg-white outline-none transition-all placeholder:text-zinc-300"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="prestige-btn-secondary flex-1"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="prestige-btn-primary flex-1"
                        >
                            Confirm Shipment
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
