/**
 * Slug proposal for a new vocabulary item.
 *
 * Only ever runs at creation time. A slug is frozen once saved: it is what
 * URLs, seed data and saved filters point at, so letting a rename touch it
 * would quietly break every one of them.
 */

const TRANSLIT: Record<string, string> = {
  // Serbian latin
  č: "c", ć: "c", ž: "z", š: "s", đ: "dj",
  // Serbian cyrillic + Russian
  а: "a", б: "b", в: "v", г: "g", д: "d", ђ: "dj", е: "e", ё: "e", ж: "z",
  з: "z", и: "i", й: "i", ј: "j", к: "k", л: "l", љ: "lj", м: "m", н: "n",
  њ: "nj", о: "o", п: "p", р: "r", с: "s", т: "t", ћ: "c", у: "u", ф: "f",
  х: "h", ц: "c", ч: "c", џ: "dz", ш: "s", щ: "sc", ъ: "", ы: "y", ь: "",
  э: "e", ю: "yu", я: "ya",
};

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[\s\S]/g, (ch) => TRANSLIT[ch] ?? ch)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return value.length >= 2 && value.length <= 60 && SLUG_PATTERN.test(value);
}
