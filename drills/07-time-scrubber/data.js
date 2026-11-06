// Lifespans of 27 philosophers, checked 2026-11-05.
// Years are historical: negative is BCE, positive is CE, and there is no year 0.
// circa: the source itself marks the year as approximate (c.).
// traditional: the dates are those of a tradition about the figure, not of a documented life.
// dates: the dating as the source gives it, shown on the page as is.
// source: where the dating was checked. WP = English Wikipedia infobox and lead,
// SEP = Stanford Encyclopedia of Philosophy, IEP = Internet Encyclopedia of Philosophy.

const WP = (slug) => `https://en.wikipedia.org/wiki/${slug}`;

export const philosophers = [
  { name: 'Thales', region: 'Greek', born: -624, died: -546, bornCirca: true, diedCirca: true,
    dates: 'c. 626/623 to c. 548/545 BCE', note: 'Drawn at the midpoints of the two ranges.', source: WP('Thales_of_Miletus') },
  { name: 'Laozi', region: 'Chinese', born: -600, died: -501, traditional: true,
    dates: 'traditionally 6th century BCE', note: 'Historicity disputed. The bar spans the traditional century, not a known life.',
    source: 'https://plato.stanford.edu/entries/laozi/' },
  { name: 'Pythagoras', region: 'Greek', born: -570, died: -495, bornCirca: true, diedCirca: true,
    dates: 'c. 570 to c. 495 BCE', source: WP('Pythagoras') },
  { name: 'Confucius', region: 'Chinese', born: -551, died: -479, bornCirca: true, diedCirca: true,
    dates: 'c. 551 to c. 479 BCE', note: 'SEP gives 551 to 479 BCE without c.', source: WP('Confucius') },
  { name: 'Socrates', region: 'Greek', born: -470, died: -399, bornCirca: true,
    dates: 'c. 470 to 399 BCE', source: WP('Socrates') },
  { name: 'Mozi', region: 'Chinese', born: -470, died: -391, bornCirca: true, diedCirca: true,
    dates: 'c. 470 to c. 391 BCE', source: WP('Mozi') },
  { name: 'Plato', region: 'Greek', born: -428, died: -348, bornCirca: true, diedCirca: true,
    dates: 'c. 428/427 to 348/347 BCE', source: WP('Plato') },
  { name: 'Aristotle', region: 'Greek', born: -384, died: -322,
    dates: '384 to 322 BCE', source: WP('Aristotle') },
  { name: 'Mencius', region: 'Chinese', born: -371, died: -289, bornCirca: true, diedCirca: true,
    dates: 'c. 371 to c. 289 BCE', source: WP('Mencius') },
  { name: 'Zhuangzi', region: 'Chinese', born: -369, died: -298, bornCirca: true, diedCirca: true,
    dates: 'c. 369 to c. 298 BCE', note: 'IEP gives 369 to 298 BCE; Wikipedia and SEP give only the 4th century BCE.',
    source: 'https://iep.utm.edu/zhuangzi/' },
  { name: 'Epicurus', region: 'Greek', born: -341, died: -270,
    dates: '341 to 270 BCE', source: WP('Epicurus') },
  { name: 'Zeno of Citium', region: 'Greek', born: -334, died: -262, bornCirca: true, diedCirca: true,
    dates: 'c. 334 to c. 262 BCE', source: WP('Zeno_of_Citium') },
  { name: 'Nagarjuna', region: 'Indian', born: 150, died: 250, bornCirca: true, diedCirca: true,
    dates: 'c. 150 to c. 250 CE', source: WP('Nagarjuna') },
  { name: 'Augustine', region: 'Latin', born: 354, died: 430,
    dates: '354 to 430 CE', source: WP('Augustine_of_Hippo') },
  { name: 'Avicenna', region: 'Persian', born: 980, died: 1037, bornCirca: true,
    dates: 'c. 980 to 1037', source: WP('Avicenna') },
  { name: 'Zhu Xi', region: 'Chinese', born: 1130, died: 1200,
    dates: '1130 to 1200', source: WP('Zhu_Xi') },
  { name: 'Aquinas', region: 'Latin', born: 1225, died: 1274, bornCirca: true,
    dates: 'c. 1225 to 1274', source: WP('Thomas_Aquinas') },
  { name: 'Wang Yangming', region: 'Chinese', born: 1472, died: 1529,
    dates: '1472 to 1529', source: WP('Wang_Yangming') },
  { name: 'Descartes', region: 'European', born: 1596, died: 1650,
    dates: '1596 to 1650', source: WP('René_Descartes') },
  { name: 'Spinoza', region: 'European', born: 1632, died: 1677,
    dates: '1632 to 1677', source: WP('Baruch_Spinoza') },
  { name: 'Locke', region: 'European', born: 1632, died: 1704,
    dates: '1632 to 1704', source: WP('John_Locke') },
  { name: 'Hume', region: 'European', born: 1711, died: 1776,
    dates: '1711 to 1776', source: WP('David_Hume') },
  { name: 'Kant', region: 'European', born: 1724, died: 1804,
    dates: '1724 to 1804', source: WP('Immanuel_Kant') },
  { name: 'Hegel', region: 'European', born: 1770, died: 1831,
    dates: '1770 to 1831', source: WP('Georg_Wilhelm_Friedrich_Hegel') },
  { name: 'Kierkegaard', region: 'European', born: 1813, died: 1855,
    dates: '1813 to 1855', source: WP('Søren_Kierkegaard') },
  { name: 'Nietzsche', region: 'European', born: 1844, died: 1900,
    dates: '1844 to 1900', source: WP('Friedrich_Nietzsche') },
  { name: 'Wittgenstein', region: 'European', born: 1889, died: 1951,
    dates: '1889 to 1951', source: WP('Ludwig_Wittgenstein') },
];

// There is no year 0: 1 BCE is followed by 1 CE. Astronomical numbering (1 BCE = 0, 2 BCE = -1)
// makes the line continuous, so every scale and every subtraction uses it.
export const toAstro = (y) => {
  if (y === 0) throw new Error('There is no year 0');
  return y < 0 ? y + 1 : y;
};
export const fromAstro = (a) => (a <= 0 ? a - 1 : a);
export const label = (a) => (a <= 0 ? `${1 - a} BCE` : `${a} CE`);
