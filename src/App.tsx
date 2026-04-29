import { Routes, Route, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { Home } from './pages/Home';
import { Shop } from './pages/Shop';
import { ProductDetail } from './pages/ProductDetail';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { OrderConfirmation } from './pages/OrderConfirmation';
import { Login } from './pages/Login';
import { Account } from './pages/Account';
import { About } from './pages/About';
import { AuthProvider } from './context/AuthContext';
import { AdminProvider } from './context/AdminContext';
import { CartProvider, useCart } from './context/CartContext';
import { SeasonProvider } from './context/SeasonContext';

import { GlobalNotifications } from './components/GlobalNotifications';
import { SeasonalOverlay } from './components/SeasonalOverlay';
import { GreetingModal } from './components/GreetingModal';
import { ChatWidget } from './components/chat/ChatWidget';

// Vendor Dashboard Imports
import { VendorLayout } from './components/vendor/VendorLayout';
import { VendorDashboard } from './pages/vendor/VendorDashboard';
import { ProductList } from './pages/vendor/ProductList';
import { ProductForm } from './pages/vendor/ProductForm';
import { ProductDetail as VendorProductDetail } from './pages/vendor/ProductDetail';
import { OrderList } from './pages/vendor/OrderList';
import { VendorProfile } from './pages/vendor/VendorProfile';

// Admin Dashboard Imports
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminUserDetail } from './pages/admin/AdminUserDetail';
import { AdminProducts } from './pages/admin/AdminProducts';
import { AdminVendors } from './pages/admin/AdminVendors';
import { AdminVendorDetail } from './pages/admin/AdminVendorDetail';
import { AdminOrders } from './pages/admin/AdminOrders';
import { AdminCategories } from './pages/admin/AdminCategories';
import { AdminSettings } from './pages/admin/AdminSettings';

// Header Wrapper to use Cart Context
const HeaderWrapper = () => {
  const { itemCount } = useCart();
  return <Header cartItemCount={itemCount} />;
};

export default function App() {
  const navigate = useNavigate();

  const handleNavigate = (page: string, payload?: any) => {
    switch (page) {
      case 'home':
        navigate('/');
        break;

      case 'shop':
        navigate('/shop', { state: payload });
        break;

      case 'product':
        if (payload) {
          navigate(`/product/${payload}`);
        }
        break;

      case 'vendor/dashboard':
        navigate('/vendor/dashboard');
        break;

      default:
        navigate(`/${page}`);
    }
  };


  return (
    <AuthProvider>
      <AdminProvider>
        <CartProvider>
          <SeasonProvider>
            <SeasonalOverlay />
            <GreetingModal />
            <GlobalNotifications />
            <div className="min-h-screen flex flex-col">
              <HeaderWrapper />

              <main className="grow px-0 sm:px-0 lg:px-0 pb-0 md:pb-0 mb-20 md:mb-0">
                <Routes>
                  {/* Customer Routes */}
                  <Route path="/" element={<Home />} />
                  <Route path="/shop" element={<Shop onNavigate={handleNavigate} />} />
                  <Route path="/products" element={<Shop onNavigate={handleNavigate} />} />
                  <Route path="/categories" element={<Shop onNavigate={handleNavigate} />} />
                  <Route path="/categories/:categorySlug" element={<Shop onNavigate={handleNavigate} />} />
                  <Route path="/product/:id" element={<ProductDetail />} />
                  <Route path="/products/:id" element={<ProductDetail />} />
                  <Route path="/cart" element={<Cart onNavigate={handleNavigate} />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/order-confirmation" element={<OrderConfirmation />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Login />} />
                  <Route path="/account" element={<Account />} />
                  <Route path="/about" element={<About onNavigate={handleNavigate} />} />

                  {/* Vendor Routes */}
                  <Route path="/vendor/*" element={
                    <VendorLayout>
                      <Routes>
                        <Route path="dashboard" element={<VendorDashboard />} />
                        <Route path="products" element={<ProductList />} />
                        <Route path="products/new" element={<ProductForm />} />
                        <Route path="products/:id" element={<VendorProductDetail />} />
                        <Route path="products/:id/edit" element={<ProductForm />} />
                        <Route path="orders" element={<OrderList />} />
                        <Route path="profile" element={<VendorProfile />} />
                      </Routes>
                    </VendorLayout>
                  } />

                  {/* Admin Routes */}
                  <Route path="/admin" element={
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  } />
                  <Route path="/admin/dashboard" element={
                    <AdminLayout>
                      <AdminDashboard />
                    </AdminLayout>
                  } />
                  <Route path="/admin/users" element={
                    <AdminLayout>
                      <AdminUsers />
                    </AdminLayout>
                  } />
                  <Route path="/admin/users/:id" element={
                    <AdminLayout>
                      <AdminUserDetail />
                    </AdminLayout>
                  } />
                  <Route path="/admin/products" element={
                    <AdminLayout>
                      <AdminProducts />
                    </AdminLayout>
                  } />
                  <Route path="/admin/vendors" element={
                    <AdminLayout>
                      <AdminVendors />
                    </AdminLayout>
                  } />
                  <Route path="/admin/vendors/:id" element={
                    <AdminLayout>
                      <AdminVendorDetail />
                    </AdminLayout>
                  } />
                  <Route path="/admin/orders" element={
                    <AdminLayout>
                      <AdminOrders />
                    </AdminLayout>
                  } />
                  <Route path="/admin/categories" element={
                    <AdminLayout>
                      <AdminCategories />
                    </AdminLayout>
                  } />
                  <Route path="/admin/settings" element={
                    <AdminLayout>
                      <AdminSettings />
                    </AdminLayout>
                  } />

                  <Route path="*" element={<Home />} />
                </Routes>
              </main>

              <Footer />
              <MobileBottomNav />
            </div>
            <ChatWidget />
          </SeasonProvider>
        </CartProvider>
      </AdminProvider>
    </AuthProvider>
  );
}
