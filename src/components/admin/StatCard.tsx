import { LucideIcon } from 'lucide-react';

interface Breakdown {
    label: string;
    value: string | number;
    color?: string;
}

interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: 'purple' | 'blue' | 'green' | 'red' | 'yellow' | 'orange' | 'gray';
    breakdown?: Breakdown[];
    action?: {
        label: string;
        onClick: () => void;
    };
}

const colorStyles = {
    purple: {
        bg: 'bg-purple-50',
        text: 'text-purple-600',
        iconBg: 'bg-purple-100',
        border: 'border-purple-200',
    },
    blue: {
        bg: 'bg-blue-50',
        text: 'text-blue-600',
        iconBg: 'bg-blue-100',
        border: 'border-blue-200',
    },
    green: {
        bg: 'bg-green-50',
        text: 'text-green-600',
        iconBg: 'bg-green-100',
        border: 'border-green-200',
    },
    red: {
        bg: 'bg-red-50',
        text: 'text-red-600',
        iconBg: 'bg-red-100',
        border: 'border-red-200',
    },
    yellow: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-600',
        iconBg: 'bg-yellow-100',
        border: 'border-yellow-200',
    },
    orange: {
        bg: 'bg-orange-50',
        text: 'text-orange-600',
        iconBg: 'bg-orange-100',
        border: 'border-orange-200',
    },
    gray: {
        bg: 'bg-gray-50',
        text: 'text-gray-600',
        iconBg: 'bg-gray-100',
        border: 'border-gray-200',
    },
};

export function StatCard({ title, value, icon: Icon, color, breakdown, action }: StatCardProps) {
    const styles = colorStyles[color];

    return (
        <div className={`${styles.bg} rounded-xl p-6 border ${styles.border} hover:shadow-lg transition-shadow`}>
            <div className="flex items-start justify-between mb-4">
                <div className={`p-3 ${styles.iconBg} rounded-lg`}>
                    <Icon className={styles.text} size={24} />
                </div>
            </div>

            <div className="mb-2">
                <p className={`text-3xl font-bold ${styles.text}`}>{value}</p>
                <p className="text-sm text-gray-600 mt-1">{title}</p>
            </div>

            {breakdown && breakdown.length > 0 && (
                <div className="mt-4 space-y-2">
                    {breakdown.map((item, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                {item.color && (
                                    <div className={`w-2 h-2 rounded-full ${item.color}`}></div>
                                )}
                                <span className="text-gray-600">{item.label}</span>
                            </div>
                            <span className="font-semibold text-gray-900">{item.value}</span>
                        </div>
                    ))}
                </div>
            )}

            {action && (
                <button
                    onClick={action.onClick}
                    className={`w-full mt-4 py-2 px-4 ${styles.text} bg-white border ${styles.border} rounded-lg hover:${styles.iconBg} transition-colors font-medium text-sm`}
                >
                    {action.label}
                </button>
            )}
        </div>
    );
}
