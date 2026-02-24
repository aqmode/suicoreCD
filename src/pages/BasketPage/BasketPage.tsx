import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { formatRub } from '../../lib/prices';
import styles from './BasketPage.module.css';

export default function BasketPage() {
  const { items, loading, removeItem, setQuantity, totalRub, getEffectivePrice, hasAlbumDiscount } = useCart();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <div className={styles.loading}>Загрузка...</div>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.inner}>
          <h1 className={styles.title}>Корзина</h1>
          <p className={styles.empty}>Корзина пуста</p>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => navigate('/catalog')}
          >
            В каталог
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <h1 className={styles.title}>Корзина</h1>

        <ul className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.row}>
              <div className={styles.cover}>
                <img src={item.cover_url} alt={item.release_name} />
              </div>
              <div className={styles.info}>
                <span className={styles.name}>
                  {item.track_name ? `${item.release_name} — ${item.track_name}` : item.release_name}
                </span>
                <span className={styles.price}>
                  {hasAlbumDiscount(item) && (
                    <span className={styles.discountBadge}>−15%</span>
                  )}
                  {formatRub(getEffectivePrice(item))}
                  {hasAlbumDiscount(item) && item.price_rub !== getEffectivePrice(item) && (
                    <span className={styles.priceWas}> {formatRub(item.price_rub)}</span>
                  )}
                </span>
              </div>
              <div className={styles.quantity}>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  onClick={() => setQuantity(item.id, item.quantity - 1)}
                >
                  −
                </button>
                <span className={styles.qtyNum}>{item.quantity}</span>
                <button
                  type="button"
                  className={styles.qtyBtn}
                  onClick={() => setQuantity(item.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => removeItem(item.id)}
                aria-label="Удалить"
              >
                ×
              </button>
            </li>
          ))}
        </ul>

        <div className={styles.footer}>
          <span className={styles.total}>Итого: {formatRub(totalRub)}</span>
          <div className={styles.footerBtns}>
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => navigate('/checkout')}
            >
              Оформить заказ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
