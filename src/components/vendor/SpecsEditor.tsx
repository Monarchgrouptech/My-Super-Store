import { Plus, X } from 'lucide-react';
import { ProductSpec } from '../../types/vendor';

interface SpecsEditorProps {
    specs: ProductSpec[];
    onChange: (specs: ProductSpec[]) => void;
}

export function SpecsEditor({ specs, onChange }: SpecsEditorProps) {
    const handleAdd = () => {
        const newSpec: ProductSpec = {
            spec_key: '',
            spec_value: '',
        };
        onChange([...specs, newSpec]);
    };

    const handleRemove = (index: number) => {
        onChange(specs.filter((_, i) => i !== index));
    };

    const handleKeyChange = (index: number, key: string) => {
        const updated = [...specs];
        updated[index] = { ...updated[index], spec_key: key };
        onChange(updated);
    };

    const handleValueChange = (index: number, value: string) => {
        const updated = [...specs];
        updated[index] = { ...updated[index], spec_value: value };
        onChange(updated);
    };

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">
                    Product Specifications
                </label>
                <button
                    type="button"
                    onClick={handleAdd}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[#D4AF37] hover:bg-[#D4AF37]/10 rounded-lg transition"
                >
                    <Plus size={16} />
                    Add Spec
                </button>
            </div>

            {specs.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                    <p className="text-gray-500 text-sm">No specifications added yet</p>
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="mt-2 text-[#D4AF37] hover:underline text-sm font-medium"
                    >
                        Add your first specification
                    </button>
                </div>
            )}

            {specs.length > 0 && (
                <div className="space-y-2">
                    {specs.map((spec, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <input
                                type="text"
                                value={spec.spec_key}
                                onChange={(e) => handleKeyChange(index, e.target.value)}
                                placeholder="Key (e.g., Weight)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                            />
                            <input
                                type="text"
                                value={spec.spec_value || ''}
                                onChange={(e) => handleValueChange(index, e.target.value)}
                                placeholder="Value (e.g., 2.5kg)"
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#D4AF37] focus:border-transparent"
                            />
                            <button
                                type="button"
                                onClick={() => handleRemove(index)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                                aria-label="Remove specification"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {specs.length > 0 && (
                <p className="text-xs text-gray-500">
                    {specs.length} specification{specs.length !== 1 ? 's' : ''} added
                </p>
            )}
        </div>
    );
}
