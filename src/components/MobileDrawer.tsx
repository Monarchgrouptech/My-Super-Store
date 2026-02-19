import { X, ChevronRight, ChevronDown } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSwipe } from '../hooks/TouchSwipe';
interface MobileDrawerProps {
    isOpen: boolean;
    onClose: () => void;
}

/**
 * MobileDrawer - Left sliding navigation drawer for mobile devices
 * 
 * Features:
 * - Horizontal scrollable menu
 * - Swipe-to-close gesture support
 * - Keyboard navigation (Esc to close)
 * - Focus trap for accessibility
 * - Click outside to close
 * 
 * @param isOpen - Controls drawer visibility
 * @param onClose - Callback when drawer should close
 */
export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const drawerRef = useRef<HTMLDivElement>(null);
    const [touchStartX, setTouchStartX] = useState(0);
    const [isShopExpanded, setIsShopExpanded] = useState(false);
    const swipeHandlers = useSwipe({
        onSwipe: (direction) => {
            switch (direction) {
                case 'left':
                    navigate('/next');
                    break;
                case 'right':
                    navigate('/previous');
                    break;
                case 'up':
                    navigate('/home');
                    break;
                case 'down':
                    navigate('/home');
                    break;
            }
        }
    });

    const shopCategories = [
        { label: 'All Products', value: 'All' },
        { label: 'Cosmetics', value: 'Cosmetics' },
        { label: 'Construction', value: 'Construction' },
        { label: 'Furniture', value: 'Furniture' },
        { label: 'Clothing and Fashion', value: 'Clothing and Fashion' },
        { label: 'Events Tools', value: 'Events Tools' },
        { label: 'Electrical Appliances', value: 'Electrical Appliances' }
    ];

    const navItems = [
        { name: 'Home', path: '/' },
        { name: 'About', path: '/about' },
        { name: 'Shop', path: '/shop', hasSubmenu: true },
        { name: 'Cart', path: '/cart' },
        { name: 'Account', path: '/account' },
        { name: 'Login', path: '/login' }
    ];

    // Prevent body scroll when drawer is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Set aria-hidden on main content
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.setAttribute('aria-hidden', 'true');
            }
        } else {
            document.body.style.overflow = '';
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.removeAttribute('aria-hidden');
            }
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    // Handle Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Handle click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                isOpen &&
                drawerRef.current &&
                !drawerRef.current.contains(e.target as Node)
            ) {
                onClose();
            }
        };

        // Add a small delay to prevent immediate close on open
        const timeoutId = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // Touch gesture handlers for swipe-to-close
    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        const touchEndX = e.changedTouches[0].clientX;
        const swipeDistance = touchStartX - touchEndX;

        // If swiped left more than 50px, close drawer
        if (swipeDistance > 50) {
            onClose();
        }
    };

    const handleNavigation = (path: string) => {
        navigate(path);
        onClose();
    };

    const handleCategoryClick = (categoryValue: string) => {
        navigate(`/shop?category=${categoryValue}`);
        onClose();
    };

    // if (!isOpen) return null; // Removed to allow animation

    return createPortal(
        <>
            {/* Backdrop overlay */}
            <div
                {...swipeHandlers}
                className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[99998] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                    }`}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Drawer */}
            <div
                ref={drawerRef}
                role="dialog"
                aria-label="Navigation menu"
                aria-modal="true"
                className={`fixed left-0 top-0 h-full w-[85%] max-w-[320px] bg-white shadow-2xl z-[99999] transform transition-transform duration-500 cubic-bezier(0.32,0.72,0,1) border-r border-slate-100 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    }`}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
            >
                {/* Header with close button */}
                <div className="flex items-center justify-between p-8 border-b border-black/5">
                    <h2 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">Menu</h2>
                    <button
                        onClick={onClose}
                        aria-label="Close menu"
                        className="flex items-center justify-center size-10 rounded-full hover:bg-black/5 transition-colors text-slate-900"
                    >
                        <X size={24} strokeWidth={1.5} />
                    </button>
                </div>

                {/* Vertical Menu */}
                <nav className="p-8 overflow-y-auto h-[calc(100%-180px)]">
                    <div className="flex flex-col gap-6">
                        {navItems.map((item) => (
                            <div key={item.name} className="group">
                                {item.hasSubmenu ? (
                                    <>
                                        <button
                                            onClick={() => setIsShopExpanded(!isShopExpanded)}
                                            className={`w-full flex items-center justify-between text-2xl transition-all duration-300 py-2 border-l-4 ${location.pathname === item.path || isShopExpanded
                                                    ? 'border-[#D4AF37] text-[#D4AF37] font-serif font-medium pl-4 bg-[#D4AF37]/5'
                                                    : 'border-transparent text-slate-800 font-serif pl-4 hover:text-[#D4AF37] hover:pl-6'
                                                }`}
                                        >
                                            <span>{item.name}</span>
                                            {isShopExpanded ? (
                                                <ChevronDown size={24} className="text-[#D4AF37]" />
                                            ) : (
                                                <ChevronRight size={24} className="opacity-50 group-hover:opacity-100 group-hover:text-[#D4AF37] transition-all" />
                                            )}
                                        </button>

                                        {/* Shop categories submenu */}
                                        <div className={`grid transition-all duration-300 ease-in-out overflow-hidden ${isShopExpanded ? 'grid-rows-[1fr] opacity-100 mt-2' : 'grid-rows-[0fr] opacity-0 mt-0'
                                            }`}>
                                            <div className="min-h-0 flex flex-col gap-3 py-2 pl-8">
                                                {shopCategories.map((category) => (
                                                    <button
                                                        key={category.value}
                                                        onClick={() => handleCategoryClick(category.value)}
                                                        className="text-left text-lg text-slate-500 hover:text-[#D4AF37] transition-colors py-1 font-medium font-serif"
                                                    >
                                                        {category.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => handleNavigation(item.path)}
                                        className={`w-full text-left text-2xl transition-all duration-300 font-serif py-2 border-l-4 ${location.pathname === item.path
                                                ? 'border-[#D4AF37] text-[#D4AF37] font-medium pl-4 bg-[#D4AF37]/5'
                                                : 'border-transparent text-slate-800 pl-4 hover:text-[#D4AF37] hover:pl-6'
                                            }`}
                                    >
                                        {item.name}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </nav>

                {/* Footer / Swipe Hint */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-linear-to-t from-white/50 to-transparent">
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-12 h-1 bg-slate-200 rounded-full mb-2"></div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Swipe left to close</p>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
}
