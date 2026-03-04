// Виджет Почты России (widget.pochta.ru) ожидает глобальный $ — выставляем до всего приложения
import $ from 'jquery';
(window as unknown as { $: typeof $; jQuery: typeof $ }).$ = (window as unknown as { jQuery: typeof $ }).jQuery = $;

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { SpotifyProvider } from './context/SpotifyContext';
import { AuthProvider } from './context/AuthContext';
import { PersonalDiscountProvider } from './context/PersonalDiscountContext';
import { CartProvider } from './context/CartContext';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <SpotifyProvider>
        <AuthProvider>
          <PersonalDiscountProvider>
            <CartProvider>
              <App />
            </CartProvider>
          </PersonalDiscountProvider>
        </AuthProvider>
      </SpotifyProvider>
    </BrowserRouter>
  </StrictMode>
);
