import { readFileSync } from "node:fs";

/**
 * The three dictionaries must have exactly the same key tree.
 *
 * A missing key does not fail the build — it renders as `undefined` on a live
 * page, in one language, which is exactly the kind of thing nobody notices
 * until a user reports it. This turns that into an error.
 */

const LOCALES = ["sr", "en", "ru"];

function keysOf(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix.slice(0, -1)];
  }
  return Object.entries(value).flatMap(([key, child]) =>
    keysOf(child, `${prefix}${key}.`),
  );
}

const trees = Object.fromEntries(
  LOCALES.map((locale) => [
    locale,
    keysOf(JSON.parse(readFileSync(`src/dictionaries/${locale}.json`, "utf8"))).sort(),
  ]),
);

const [reference, ...rest] = LOCALES;
let failed = false;

for (const locale of rest) {
  const missing = trees[reference].filter((key) => !trees[locale].includes(key));
  const extra = trees[locale].filter((key) => !trees[reference].includes(key));

  for (const key of missing) {
    console.error(`${locale}.json is missing  ${key}`);
    failed = true;
  }
  for (const key of extra) {
    console.error(`${locale}.json has extra   ${key}`);
    failed = true;
  }
}

if (failed) process.exit(1);
console.log(`dictionaries match — ${trees[reference].length} keys in ${LOCALES.length} locales`);
