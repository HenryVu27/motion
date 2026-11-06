// Builds the index from each page's meta.json, so a new drill or lesson needs no edit here.
const drills = import.meta.glob('/drills/*/meta.json', { eager: true, import: 'default' });
const lessons = import.meta.glob('/lessons/*/meta.json', { eager: true, import: 'default' });
const films = import.meta.glob('/films/*/meta.json', { eager: true, import: 'default' });

function render(listId, entries) {
  const list = document.getElementById(listId);
  const items = Object.entries(entries)
    .map(([path, meta]) => ({ href: '.' + path.replace(/meta\.json$/, ''), ...meta }))
    .sort((a, b) => a.href.localeCompare(b.href));
  items.forEach((m, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${m.href}"><span class="n">${String(i + 1).padStart(2, '0')}</span>
      <span class="t">${m.title}</span><span class="d">${m.summary}</span></a>`;
    list.append(li);
  });
}

render('films', films);
render('lessons', lessons);
render('drills', drills);
