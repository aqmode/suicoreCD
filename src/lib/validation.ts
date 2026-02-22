/**
 * ФИО: ровно 3 слова, каждое минимум 2 символа.
 * Разрешены только буквы (в т.ч. ё), дефис, пробел, апостроф.
 * Запрещены цифры и прочие спецсимволы.
 */
export function isValidFullName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (/[0-9]/.test(trimmed)) return false;
  if (/[^\p{L}\p{M}\s\-']/u.test(trimmed)) return false;
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length !== 3) return false;
  return words.every((w) => w.length >= 2);
}

export function fullNameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Введите ФИО";
  if (/[0-9]/.test(trimmed)) return "ФИО не должно содержать цифры";
  if (/[^\p{L}\p{M}\s\-']/u.test(trimmed)) return "Допустимы только буквы, дефис, пробел и апостроф";
  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length !== 3) return "ФИО должно состоять из трёх слов (Фамилия Имя Отчество)";
  const short = words.find((w) => w.length < 2);
  if (short) return "Каждое слово должно быть не короче 2 символов";
  return null;
}
