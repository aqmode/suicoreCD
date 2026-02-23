import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import styles from './Header.module.css';

const Header = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { items } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  const navContent = (
    <>
      <NavLink
        to="/catalog"
        className={({ isActive }) =>
          `${styles.navLink} ${isActive ? styles.active : ''}`
        }
        onClick={closeMenu}
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
      >
        basket
        {items.length > 0 && (
          <span className={styles.cartCount}>{items.length}</span>
        )}
      </NavLink>
      {user ? (
        <>
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
            onClick={closeMenu}
          >
            profile
          </NavLink>
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
        </>
      ) : (
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
      )}
    </>
  );

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.logo} onClick={closeMenu}>
          suicore
        </NavLink>
        <nav className={styles.nav}>{navContent}</nav>
        <button
          type="button"
          className={styles.menuToggle}
          onClick={() => setMenuOpen((o) => !o)}
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
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
          >
            basket {items.length > 0 && `(${items.length})`}
          </NavLink>
          {user ? (
            <>
              <NavLink
                to="/profile"
                className={({ isActive }) =>
                  `${styles.dropdownLink} ${isActive ? styles.active : ''}`
                }
                onClick={closeMenu}
              >
                profile
              </NavLink>
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
            </>
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
