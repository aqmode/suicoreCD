import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import styles from './Header.module.css';

const Header = () => {
  const { user, signInWithGoogle, signOut } = useAuth();
  const { items } = useCart();

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <NavLink to="/" className={styles.logo}>
          suicore
        </NavLink>
        <nav className={styles.nav}>
          <NavLink
            to="/catalog"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            catalog
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            about
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            contact
          </NavLink>
          <NavLink
            to="/basket"
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            basket
            {items.length > 0 && (
              <span className={styles.cartCount}>{items.length}</span>
            )}
          </NavLink>
          <span className={styles.authGroup}>
            {user ? (
              <>
                <NavLink
                  to="/profile"
                  className={({ isActive }) =>
                    `${styles.navLink} ${isActive ? styles.active : ''}`
                  }
                >
                  profile
                </NavLink>
                <button
                  type="button"
                  className={styles.navLink}
                  onClick={() => signOut()}
                >
                  exit
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.navLink}
                onClick={() => signInWithGoogle()}
              >
                login
              </button>
            )}
          </span>
        </nav>
      </div>
    </header>
  );
};

export default Header;
