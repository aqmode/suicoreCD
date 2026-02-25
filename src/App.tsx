import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Header from './components/Header/Header';
import FloatingCharacter from './components/FloatingCharacter/FloatingCharacter';
import CursorFollower from './components/CursorFollower/CursorFollower';
import HomePage from './pages/HomePage/HomePage';
import CatalogPage from './pages/CatalogPage/CatalogPage';
import AboutPage from './pages/AboutPage/AboutPage';
import ContactPage from './pages/ContactPage/ContactPage';
import CheckoutPage from './pages/CheckoutPage/CheckoutPage';
import BasketPage from './pages/BasketPage/BasketPage';
import ProfilePage from './pages/ProfilePage/ProfilePage';
import GoogleRedirectPage from './pages/GoogleRedirectPage/GoogleRedirectPage';
import AdminPage from './pages/AdminPage/AdminPage';
import AuthRequiredPage, { getBrowseWithoutAuth } from './pages/AuthRequiredPage/AuthRequiredPage';
import OrderSuccessPage from './pages/OrderSuccessPage/OrderSuccessPage';
import OrderFailPage from './pages/OrderFailPage/OrderFailPage';
import OfferPage from './pages/OfferPage/OfferPage';
import TermsPage from './pages/TermsPage/TermsPage';
import Footer from './components/Footer/Footer';
import MobileInfoDrawer from './components/MobileInfoDrawer/MobileInfoDrawer';
import InfoPage from './pages/InfoPage/InfoPage';
import Onboarding from './components/Onboarding/Onboarding';
import './App.css';

function getAuthRedirectPath(): string {
  const uri =
    import.meta.env.VITE_AUTH_REDIRECT_URI ||
    (typeof window !== 'undefined' && window.location?.origin
      ? `${window.location.origin.replace(/\/$/, '')}/google/redirect`
      : import.meta.env.VITE_APP_ORIGIN
        ? `${String(import.meta.env.VITE_APP_ORIGIN).replace(/\/$/, '')}/google/redirect`
        : 'http://localhost:8080/google/redirect');
  try {
    return new URL(uri).pathname;
  } catch {
    return '/google/redirect';
  }
}
const AUTH_REDIRECT_PATH = getAuthRedirectPath();

function App() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const isAbout = pathname === '/about';
  const showFooter = !isAbout;

  const browseWithoutAuth = getBrowseWithoutAuth();
  const skipAuth =
    browseWithoutAuth ||
    pathname === AUTH_REDIRECT_PATH ||
    pathname === '/admin' ||
    pathname === '/order/success' ||
    pathname === '/order/fail' ||
    pathname === '/offer' ||
    pathname === '/terms' ||
    pathname === '/info';
  const showAuthRequired = !loading && !user && !skipAuth;

  if (showAuthRequired) {
    return <AuthRequiredPage />;
  }

  return (
    <div className="app">
      <Header />
      <CursorFollower />
      <FloatingCharacter />
      <div className="app-mobile-float" aria-hidden>
        <img src="/suicore.png" alt="" draggable={false} />
      </div>
      <main className="app-main">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/release/:releaseId" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/basket" element={<BasketPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order/success" element={<OrderSuccessPage />} />
        <Route path="/order/fail" element={<OrderFailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path={AUTH_REDIRECT_PATH} element={<GoogleRedirectPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/offer" element={<OfferPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/info" element={<InfoPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </main>
      {showFooter && <Footer />}
      <MobileInfoDrawer />
      <Onboarding />
    </div>
  );
}

export default App;
