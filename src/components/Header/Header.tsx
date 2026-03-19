import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useTheme } from '../../context/ThemeContext';
import styles from './Header.module.css';

const Header = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { items } = useCart();
  const { theme, toggle: toggleTheme } = useTheme();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isOrdersActive = location.pathname === '/profile' && location.search.includes('tab=orders');
  const isProfileActive = location.pathname === '/profile' && !location.search.includes('tab=orders');

  const closeMenu = () => setMenuOpen(false);

  const navContent = (
    <>
      <NavLink
        to="/catalog"
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={closeMenu}
        data-onboarding="nav-catalog"
      >
        catalog
      </NavLink>
      <NavLink
        to="/about"
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={closeMenu}
      >
        about
      </NavLink>
      <NavLink
        to="/contact"
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={closeMenu}
      >
        contact
      </NavLink>
      <NavLink
        to="/basket"
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={closeMenu}
        data-onboarding="nav-basket"
      >
        basket
        {items.length > 0 && (
          <span className={styles.cartCount}>{items.length}</span>
        )}
      </NavLink>
      {user ? (
        <span className={styles.navGroupAuth}>
          <NavLink
            to="/profile?tab=orders"
            className={`${styles.navLink} ${isOrdersActive ? styles.active : ''}`}
            onClick={closeMenu}
          >
            orders
          </NavLink>
          <NavLink
            to="/profile"
            className={`${styles.navLink} ${isProfileActive ? styles.active : ''}`}
            onClick={closeMenu}
          >
            profile
          </NavLink>
          {user && (
            <button
              type="button"
              className={styles.navLink}
              onClick={() => {
                signOut();
                closeMenu();
              }}
            >
              exit
            </button>
          )}
        </span>
      ) : (
        <span className={styles.navGroupAuth}>
          <button
            type="button"
            className={styles.navLink}
            onClick={() => {
              signInWithGoogle();
              closeMenu();
            }}
          >
            login
          </button>
        </span>
      )}
    </>
  );

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <div className={styles.logoGroup}>
          <NavLink to="/" className={styles.logo} onClick={closeMenu}>
            suicore
          </NavLink>
          <button
            type="button"
            className={styles.themeToggle}
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            <span className={theme === 'dark' ? styles.sunIcon : styles.moonIcon} />
          </button>
        </div>
        <nav className={styles.nav}>{navContent}</nav>
        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
          data-onboarding="nav-menu"
        >
          <span className={styles.hamburger} />
          <span className={styles.hamburger} />
          <span className={styles.hamburger} />
        </button>
      </div>
      {menuOpen && (
        <div className={styles.dropdown} role="menu">
          <NavLink
            to="/catalog"
            className={({ isActive }) =>
              `${styles.dropdownLink} ${isActive ? styles.active : ''}`
            }
            onClick={closeMenu}
            data-onboarding="nav-catalog-mobile"
          >
            catalog
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${styles.dropdownLink} ${isActive ? styles.active : ''}`
            }
            onClick={closeMenu}
          >
            about
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `${styles.dropdownLink} ${isActive ? styles.active : ''}`
            }
            onClick={closeMenu}
          >
            contact
          </NavLink>
          <NavLink
            to="/basket"
            className={({ isActive }) =>
              `${styles.dropdownLink} ${isActive ? styles.active : ''}`
            }
            onClick={closeMenu}
            data-onboarding="nav-basket-mobile"
          >
            basket {items.length > 0 && `(${items.length})`}
          </NavLink>
          {user ? (
            <div className={styles.dropdownGroupAuth}>
              <NavLink
                to="/profile?tab=orders"
                className={`${styles.dropdownLink} ${isOrdersActive ? styles.active : ''}`}
                onClick={closeMenu}
              >
                orders
              </NavLink>
              <NavLink
                to="/profile"
                className={`${styles.dropdownLink} ${isProfileActive ? styles.active : ''}`}
                onClick={closeMenu}
              >
                profile
              </NavLink>
              {user && (
                <button
                  type="button"
                  className={styles.dropdownLink}
                  onClick={() => {
                    signOut();
                    closeMenu();
                  }}
                >
                  exit
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              className={styles.dropdownLink}
              onClick={() => {
                signInWithGoogle();
                closeMenu();
              }}
            >
              login
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
