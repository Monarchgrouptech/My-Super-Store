import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

export function Login() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/account`,
                }
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (activeTab === 'login') {
                // Sign in user
                const { data: authData, error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;

                // Check admin status from user_profiles
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('is_admin')
                    .eq('user_id', authData.user.id)
                    .single();

                // Route based on role
                if (profile?.is_admin === true) {
                    navigate('/admin');
                    return;
                }

                // Check for delivery partner role
                const { data: partner } = await supabase
                    .from('delivery_partners')
                    .select('id')
                    .eq('user_id', authData.user.id)
                    .maybeSingle();

                if (partner) {
                    navigate('/delivery/dashboard');
                    return;
                }

                navigate('/account');
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: fullName,
                        },
                    },
                });
                if (error) throw error;
                alert('Registration successful! Please check your email to confirm your account.');
                setActiveTab('login');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-fade section flex items-center justify-center min-h-[70vh]">
            <div className="card-black max-w-md w-full p-8 border border-[#FFC92E]/20 shadow-[0_0_40px_rgba(255,201,46,0.1)]">
                <div className="flex border-b border-white/10 mb-8">
                    <button
                        className={`flex-1 pb-4 text-center font-serif text-lg transition-colors relative ${activeTab === 'login' ? 'text-[var(--gold-primary)]' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setActiveTab('login')}
                    >
                        Login
                        {activeTab === 'login' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D]" />
                        )}
                    </button>
                    <button
                        className={`flex-1 pb-4 text-center font-serif text-lg transition-colors relative ${activeTab === 'register' ? 'text-[var(--gold-primary)]' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setActiveTab('register')}
                    >
                        Register
                        {activeTab === 'register' && (
                            <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-[#FFC92E] to-[#DE9D0D]" />
                        )}
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-200 text-sm">
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {activeTab === 'login' ? (
                    <form className="space-y-6" onSubmit={handleEmailAuth}>
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider font-medium">Email Address</label>
                            <input
                                type="email"
                                className="w-full  bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider font-medium">Password</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div className="flex justify-between items-center text-sm">
                            <label className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-white transition-colors">
                                <input type="checkbox" className="accent-[#FFC92E]" />
                                <span>Remember me</span>
                            </label>
                            <a href="#" className="text-[#FFC92E] hover:text-[#FFE55C] transition-colors">Forgot Password?</a>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-gold"
                        >
                            {loading && <Loader2 className="animate-spin inline mr-2" size={16} />}
                            Sign In
                        </button>

                        <div>
                            <p className="text-center text-gray-500 text-sm">
                                Don't have an account?{' '}
                                <span
                                    className="text-[#FFC92E] hover:text-[#FFE55C] cursor-pointer font-medium"
                                    onClick={() => setActiveTab('register')}
                                >
                                    Register
                                </span>
                            </p>
                        </div>
                    </form>
                ) : (
                    <form className="space-y-6" onSubmit={handleEmailAuth}>
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider font-medium">Full Name</label>
                            <input
                                type="text"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider font-medium">Email Address</label>
                            <input
                                type="email"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-400 mb-2 text-sm uppercase tracking-wider font-medium">Password</label>
                            <input
                                type="password"
                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#FFC92E]/50 transition-colors"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-gold2"
                        >
                            {loading && <Loader2 className="animate-spin inline mr-2" size={16} />}
                            Create Account
                        </button>

                        <p className="text-center text-gray-500 text-sm">
                            Already have an account?{' '}
                            <span
                                className="text-[#FFC92E] hover:text-[#FFE55C] cursor-pointer font-medium"
                                onClick={() => setActiveTab('login')}
                            >
                                Login
                            </span>
                        </p>
                    </form>
                )}
                <div className="mt-6 flex items-center justify-center gap-2">
                    <div className="h-px w-12 bg-gradient-to-r from-transparent to-[#FFC92E]/30" />
                    <span className="text-xs uppercase tracking-widest text-[#FFC92E]/50 font-medium">Or</span>
                    <div className="h-px w-12 bg-gradient-to-l from-transparent to-[#FFC92E]/30" />
                </div>

                <div className="mt-8 pt-6 border-t border-white/10">
                    <button
                        onClick={handleGoogleLogin}
                        type="button"
                        className="group w-full relative overflow-hidden bg-[#000] border border-[#333] hover:border-[#FFC92E]/50 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,201,46,0.15)]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-[#FFC92E]/0 via-[#FFC92E]/10 to-[#FFC92E]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        <span className="text-gray-300 group-hover:text-white transition-colors">Sign in with Google</span>
                    </button>

                </div>
            </div>
        </div>
    );
}
