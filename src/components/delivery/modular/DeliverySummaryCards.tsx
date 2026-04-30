import React from 'react';
import { Truck, Package, Clock, CheckCircle } from 'lucide-react';

interface SummaryCardProps {
    label: string;
    count: number;
    icon: React.ElementType;
    description: string;
}

function SummaryCard({ label, count, icon: Icon, description }: SummaryCardProps) {
    return (
        <div className="bg-white border border-zinc-200 p-6 flex flex-col gap-4 shadow-sm">
            <div className="flex items-start justify-between">
                <div>
                    <p className="label-caps text-zinc-500 mb-1">{label}</p>
                    <h3 className="text-3xl font-black text-black">{count}</h3>
                </div>
                <div className="w-12 h-12 bg-zinc-50 border border-zinc-100 flex items-center justify-center">
                    <Icon size={24} className="text-zinc-400" />
                </div>
            </div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">{description}</p>
        </div>
    );
}

interface DeliverySummaryCardsProps {
    totalShipments: number;
    pickupReady: number;
    inMotion: number;
    deliveredToday: number;
}

export function DeliverySummaryCards({ 
    totalShipments, 
    pickupReady, 
    inMotion, 
    deliveredToday 
}: DeliverySummaryCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SummaryCard 
                label="Active Shipments" 
                count={totalShipments} 
                icon={Truck} 
                description="Currently in the delivery pipeline" 
            />
            <SummaryCard 
                label="Pickup Ready" 
                count={pickupReady} 
                icon={Package} 
                description="Waiting for partner collection" 
            />
            <SummaryCard 
                label="In Motion" 
                count={inMotion} 
                icon={Clock} 
                description="In transit or out for delivery" 
            />
            <SummaryCard 
                label="Delivered Today" 
                count={deliveredToday} 
                icon={CheckCircle} 
                description="Successfully completed handoffs" 
            />
        </div>
    );
}
