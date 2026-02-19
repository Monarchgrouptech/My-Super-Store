
import { X, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LoginPromptProps {
    isOpen: boolean;
    onClose: () => void;
}

export function LoginPrompt({ isOpen, onClose }: LoginPromptProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative z-10 w-full max-w-md bg-[#0A0A0A] border border-[#D4AF37]/20 rounded-2xl p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-[#FFE55C] via-[#D4AF37] to-[#B8941F] rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#D4AF37]/20">
                        <LogIn size={32} className="text-black" strokeWidth={2.5} />
                    </div>

                    <h3 className="text-2xl font-serif font-bold text-white mb-2">
                        Login Required
                    </h3>

                    <p className="text-[#A3A3A3] mb-8">
                        Please log in to your account to add items to your cart and proceed with checkout.
                    </p>

                    <div className="space-y-3">
                        <Link
                            to="/login"
                            className="block w-full py-3 px-6 bg-gradient-to-r from-[#FFE55C] via-[#D4AF37] to-[#B8941F] text-black font-semibold rounded-xl hover:shadow-[0_8px_20px_rgba(212,175,55,0.3)] transition-all transform hover:-translate-y-0.5"
                        >
                            Log In Now
                        </Link>

                        <button
                            onClick={onClose}
                            className="block w-full py-3 px-6 bg-transparent border border-[#D4AF37]/30 text-[#D4AF37] font-semibold rounded-xl hover:bg-[#D4AF37]/10 transition-colors"
                        >
                            Continue Browsing
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
