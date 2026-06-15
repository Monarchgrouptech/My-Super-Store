import { ShoppingCart, User, Menu, Gem, ChevronDown, LogOut, Home } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { SearchBar } from './SearchBar';
import { MobileDrawer } from './MobileDrawer';
import { MobileSearch } from './MobileSearch';
import { useAuth } from '../context/AuthContext';

interface HeaderProps {
  cartItemCount: number;
}

export function Header({ cartItemCount }: HeaderProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isShopDropdownOpen, setIsShopDropdownOpen] = useState(false);
  const [user, setUser] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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
    { name: 'Login', path: '/login' }
  ];

  const isAccountPage = location.pathname.startsWith('/account');
  const isAdminPage = location.pathname.startsWith('/admin');
  const isDeliveryPage = location.pathname.startsWith('/delivery');

  // Header styling based on page
  const headerClass = isAdminPage
    ? 'sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm'
    : (isAccountPage || isDeliveryPage)
    ? 'sticky top-0 z-50 w-full bg-[#0A0A0A] border-b border-white/10'
    : 'sticky top-0 z-50 w-full bg-white/30 backdrop-blur-md border-b border-[#f0f0f0]';

  const textColorClass = isAdminPage ? 'text-slate-900' : (isAccountPage || isDeliveryPage) ? 'text-white' : 'text-slate-900';
  const textMutedClass = isAdminPage ? 'text-slate-700' : (isAccountPage || isDeliveryPage) ? 'text-white/60' : 'text-slate-900/70';
  const hoverBgClass = isAdminPage ? 'hover:bg-gray-100' : (isAccountPage || isDeliveryPage) ? 'hover:bg-white/10' : 'hover:bg-slate-100';
  const linkHoverClass = isAdminPage ? 'hover:text-slate-900' : (isAccountPage || isDeliveryPage) ? 'hover:text-white' : 'hover:text-black';

  return (
    <header className={headerClass}>
      <div className="flex justify-center w-full">
        <div className="flex justify-between w-full max-w-[1280px] items-center px-4 sm:px-6 md:px-8 lg:px-10 py-5 gap-4 sm:gap-6 md:gap-8">
          {/* Logo Area - Left */}
          <Link to="/" className="flex items-center gap-2 cursor-pointer no-underline flex-shrink-0">
            <div className={`flex items-center justify-center size-8 rounded-full transition-colors ${isAdminPage ? 'bg-black' : isAccountPage ? 'bg-white/10' : 'bg-black'
              }`}>
              <Gem size={20} strokeWidth={2} className={isAdminPage ? 'text-white' : isAccountPage ? 'text-white' : 'text-white'} />
            </div>
            <h2 className={`${textColorClass} text-lg sm:text-xl font-extrabold tracking-tight transition-colors whitespace-nowrap`} style={{ fontFamily: 'Flowmery' }}>My Super Store</h2>
          </Link>

          {/* Desktop Nav Links - Between Logo and Icons */}
          <nav className="hidden md:flex items-center relative gap-6 ml-12">
            {isAdminPage ? (
              <>
                <Link to="/admin/dashboard" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Dashboard</Link>
                <Link to="/admin/users" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Users</Link>
                <Link to="/admin/products" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Products</Link>
                <Link to="/admin/vendors" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Vendors</Link>
                <Link to="/admin/orders" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Orders</Link>
                <Link to="/admin/categories" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Categories</Link>
                <Link to="/admin/settings" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Settings</Link>
              </>
            ) : isDeliveryPage ? (
              <>
                <Link to="/delivery/dashboard" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Operations</Link>
                <Link to="/delivery/orders" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Active Shipments</Link>
                <Link to="/delivery/history" className={`text-sm font-semibold transition-colors ${textMutedClass} ${linkHoverClass}`}>Logistics History</Link>
              </>
            ) : (
              <>
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`transition-all text-sm font-semibold tracking-wide no-underline ${isAccountPage
                      ? 'text-white 70 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] hover:text-white hover:drop-shadow-[0_0_16px_rgba(255,255,255,0.8)]'
                      : `${textMutedClass} ${linkHoverClass} text-slate-900 drop-shadow-[0_0_8px_rgba(15,23,42,0.3)] hover:drop-shadow-[0_0_16px_rgba(15,23,42,0.6)]`
                      }`}
                  >
                    {item.name}
                  </Link>
                ))}

                {/* Shop Dropdown */}
                <div
                  className="relative group"
                  onMouseEnter={() => setIsShopDropdownOpen(true)}
                  onMouseLeave={() => setIsShopDropdownOpen(false)}
                >
                  <button className={`flex items-center gap-1 ${textMutedClass} ${linkHoverClass} transition-colors text-sm font-semibold tracking-wide`}>
                    Shop
                    <ChevronDown size={16} className={`transition-transform duration-300 ${isShopDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {isShopDropdownOpen && (
                    <div className={`absolute top-full left-0 mt-2 w-56 rounded-lg shadow-lg z-50 backdrop-blur-md ${isAccountPage
                      ? 'bg-[#0A0A0A]/80 border border-white/10'
                      : 'bg-white/30 border border-white/20'
                      }`}>
                      {shopCategories.map((category) => {
                        const slug = category.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
                        const toUrl = category.value === 'All' ? '/shop' : `/categories/${slug}`;
                        return (
                          <Link
                            key={category.value}
                            to={toUrl}
                            onClick={() => setIsShopDropdownOpen(false)}
                            className={`w-full block text-left px-4 py-3 transition-all no-underline ${isAccountPage
                              ? 'text-white/70 hover:text-white hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg'
                              : 'text-slate-900/70 hover:text-slate-900 hover:bg-slate-100/20 first:rounded-t-lg last:rounded-b-lg'
                              } text-sm font-medium`}
                          >
                            {category.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </nav>

          {/* Icons / Actions - Right */}
          <div className="hidden md:flex items-center gap-3 sm:gap-4 md:gap-5 ml-auto">
            {isAdminPage || isDeliveryPage ? (
              <>
                <Link 
                  to="/" 
                  className={`flex items-center gap-2 px-3 py-2 rounded transition-colors text-sm font-semibold ${textMutedClass} ${linkHoverClass}`}
                >
                  <Home size={18} />
                  <span>Store</span>
                </Link>

                <button
                  onClick={async () => {
                    await signOut();
                    navigate('/');
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded hover:bg-red-50 transition-colors text-sm font-semibold text-red-600"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => navigate(user ? '/account' : '/login')}
                  className={`flex items-center justify-center size-10 rounded-full ${hoverBgClass} transition-colors ${textColorClass}`}
                >
                  <User size={20} strokeWidth={2} />
                </button>
                <button
                  onClick={() => navigate('/cart')}
                  className={`flex items-center justify-center size-10 rounded-full ${hoverBgClass} transition-colors ${textColorClass} relative`}
                >
                  <ShoppingCart size={20} strokeWidth={2} />
                  {cartItemCount > 0 && (
                    <span className="absolute top-2 right-2 size-2 bg-[#d4af37] rounded-full"></span>
                  )}
                </button>
              </>
            )}
          </div>

          {/* Mobile Menu Button - Only on Mobile */}
          <button
            className="flex md:hidden items-center justify-center ml-2 sm:ml-3"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open navigation menu"
          >
            <Menu size={24} className={textColorClass} />
          </button>
        </div>
      </div>

      {/* Mobile Search Bar - Below Header on Mobile Only */}
      {!isAdminPage && (
        <div className={`md:hidden w-full border-b ${isAccountPage ? 'border-white/10' : 'border-[#f0f0f0]'}`}>
          <div className="flex justify-center w-full">
            <div className="w-full max-w-[1280px] px-4 sm:px-6 py-3">
              <MobileSearch />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Search Bar Row - Below Header */}
      {!isAdminPage && (
        <div className={`hidden md:block w-full border-b ${isAccountPage ? 'border-white/10' : 'border-[#f0f0f0]'}`}>
          <div className="flex justify-center w-full">
            <div className="w-full max-w-[1280px] px-4 sm:px-6 md:px-8 lg:px-10 py-3">
              <div className="flex justify-center">
                <div className="w-full max-w-2xl">
                  <SearchBar />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Drawer */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </header>
  );
}
