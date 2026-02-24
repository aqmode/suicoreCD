/** Вес одного CD-диска в граммах */
export const CD_WEIGHT_G = 85;

/** Потребительские свойства CD */
export const CD_CONSUMER_PROPERTIES =
  'Физический носитель CD, аудио высокого качества, коллекционный формат.';

/** Текст о наличии */
export const IN_STOCK_LABEL = 'В наличии';

/** Краткое описание для карточки: вес и наличие */
export function cdShortDescription(): string {
  return `${CD_WEIGHT_G} г · ${IN_STOCK_LABEL}`;
}
