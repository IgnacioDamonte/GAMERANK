const CATEGORIAS = [
  { key: 'graficos', label: 'Gráficos' },
  { key: 'arte', label: 'Diseño artístico' },
  { key: 'musica', label: 'Música' },
  { key: 'animaciones', label: 'Animaciones' },
  { key: 'mecanicas', label: 'Mecánicas' },
  { key: 'historia', label: 'Historia' },
];

const el = {
  tabBtns: document.querySelectorAll('.tab-btn'),
  views: document.querySelectorAll('.view'),
  searchInput: document.getElementById('searchInput'),
  searchHint: document.getElementById('searchHint'),
  searchResults: document.getElementById('searchResults'),
  myList: document.getElementById('myList'),
  listEmpty: document.getElementById('listEmpty'),
  listCount: document.getElementById('listCount'),
  sheetOverlay: document.getElementById('sheetOverlay'),
  ratingSheet: document.getElementById('ratingSheet'),
  sheetImage: document.getElementById('sheetImage'),
  sheetName: document.getElementById('sheetName'),
  sheetAvgNumber: document.getElementById('sheetAvgNumber'),
  sliders: document.getElementById('sliders'),
  saveRatingBtn: document.getElementById('saveRatingBtn'),
  deleteRatingBtn: document.getElementById('deleteRatingBtn'),
  cancelSheetBtn: document.getElementById('cancelSheetBtn'),
  toast: document.getElementById('toast'),
};

let currentGame = null; // { rawgId, name, backgroundImage, released, existing? }
let myRatingsCache = [];

// ---------- Navegación por tabs ----------
el.tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-view');
    el.tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
    el.views.forEach((v) => v.classList.toggle('active', v.id === `view-${target}`));
    if (target === 'lista') loadMyList();
  });
});

// ---------- Toast ----------
let toastTimer = null;
function showToast(message) {
  el.toast.textContent = message;
  el.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 2400);
}

// ---------- API helpers ----------
async function apiGet(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

async function apiSend(path, method, body) {
  const res = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error de red');
  return data;
}

// ---------- Búsqueda ----------
let searchDebounce = null;
el.searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  const q = el.searchInput.value.trim();
  if (!q) {
    el.searchResults.innerHTML = '';
    el.searchHint.textContent = 'Escribí el nombre de un juego para empezar.';
    el.searchHint.classList.remove('is-hidden');
    return;
  }
  searchDebounce = setTimeout(() => runSearch(q), 400);
});

async function runSearch(q) {
  el.searchHint.textContent = 'Buscando...';
  el.searchHint.classList.remove('is-hidden');
  try {
    const data = await apiGet(`/api/games/search?q=${encodeURIComponent(q)}`);
    renderGameGrid(el.searchResults, data.results, { fromSearch: true });
    el.searchHint.classList.toggle('is-hidden', data.results.length > 0);
    if (data.results.length === 0) el.searchHint.textContent = 'No encontré resultados para esa búsqueda.';
  } catch (err) {
    el.searchResults.innerHTML = '';
    el.searchHint.textContent = err.message || 'No se pudo buscar. Probá de nuevo.';
    el.searchHint.classList.remove('is-hidden');
  }
}

// ---------- Render de grilla de juegos ----------
function renderGameGrid(container, games, { fromSearch }) {
  container.innerHTML = '';
  games.forEach((game) => {
    const saved = myRatingsCache.find((r) => r.rawg_id === game.rawgId);
    const card = document.createElement('button');
    card.className = 'game-card';
    const year = (game.released || '').slice(0, 4);
    const img = game.backgroundImage || game.background_image;
    const promedio = saved ? saved.promedio : null;

    card.innerHTML = `
      <div class="game-card-img">
        ${img ? `<img src="${img}" alt="${game.name}" loading="lazy">` : `<span class="game-card-img-placeholder">Sin imagen</span>`}
      </div>
      <div class="game-card-body">
        <p class="game-card-name">${game.name}</p>
        <div class="game-card-meta">
          <span class="game-card-year">${year || ''}</span>
          ${promedio !== null ? `<span class="game-card-score">★ ${promedio}</span>` : ''}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      openRatingSheet({
        rawgId: game.rawgId,
        name: game.name,
        backgroundImage: img,
        released: game.released,
        existing: saved || null,
      });
    });

    container.appendChild(card);
  });
}

// ---------- Mi lista ----------
async function loadMyList() {
  try {
    const data = await apiGet('/api/ratings');
    myRatingsCache = data.ratings;
    el.listCount.textContent = data.ratings.length ? `${data.ratings.length} juego${data.ratings.length === 1 ? '' : 's'}` : '';
    el.listEmpty.classList.toggle('is-hidden', data.ratings.length > 0);
    renderGameGrid(el.myList, data.ratings.map((r) => ({
      rawgId: r.rawg_id,
      name: r.name,
      backgroundImage: r.background_image,
      released: r.released,
    })), { fromSearch: false });
  } catch (err) {
    el.listEmpty.textContent = err.message || 'No se pudo cargar tu lista.';
    el.listEmpty.classList.remove('is-hidden');
  }
}

// ---------- Bottom sheet de puntaje ----------
function openRatingSheet(game) {
  currentGame = game;
  el.sheetImage.src = game.backgroundImage || '';
  el.sheetImage.style.visibility = game.backgroundImage ? 'visible' : 'hidden';
  el.sheetName.textContent = game.name;
  el.deleteRatingBtn.hidden = !game.existing;

  el.sliders.innerHTML = '';
  CATEGORIAS.forEach(({ key, label }) => {
    const startValue = game.existing ? game.existing[key] : 7;
    const row = document.createElement('div');
    row.className = 'slider-row';
    row.innerHTML = `
      <label>
        <span>${label}</span>
        <span class="slider-value" data-value-for="${key}">${startValue}</span>
      </label>
      <input type="range" min="1" max="10" step="0.5" value="${startValue}" data-slider="${key}">
    `;
    el.sliders.appendChild(row);
  });

  el.sliders.querySelectorAll('input[type="range"]').forEach((input) => {
    input.addEventListener('input', updateSheetAverage);
  });

  updateSheetAverage();

  el.sheetOverlay.classList.add('is-open');
  el.ratingSheet.classList.add('is-open');
  el.ratingSheet.setAttribute('aria-hidden', 'false');
}

function closeRatingSheet() {
  el.sheetOverlay.classList.remove('is-open');
  el.ratingSheet.classList.remove('is-open');
  el.ratingSheet.setAttribute('aria-hidden', 'true');
  currentGame = null;
}

function getSliderValues() {
  const values = {};
  el.sliders.querySelectorAll('input[type="range"]').forEach((input) => {
    values[input.getAttribute('data-slider')] = Number(input.value);
  });
  return values;
}

function updateSheetAverage() {
  const values = getSliderValues();
  Object.entries(values).forEach(([key, value]) => {
    const label = el.sliders.querySelector(`[data-value-for="${key}"]`);
    if (label) label.textContent = value;
  });
  const suma = Object.values(values).reduce((a, b) => a + b, 0);
  const promedio = Math.round((suma / CATEGORIAS.length) * 10) / 10;
  el.sheetAvgNumber.textContent = Number.isFinite(promedio) ? promedio : '—';
}

el.sheetOverlay.addEventListener('click', closeRatingSheet);
el.cancelSheetBtn.addEventListener('click', closeRatingSheet);

el.saveRatingBtn.addEventListener('click', async () => {
  if (!currentGame) return;
  const values = getSliderValues();

  try {
    await apiSend('/api/ratings', 'POST', {
      rawgId: currentGame.rawgId,
      name: currentGame.name,
      backgroundImage: currentGame.backgroundImage,
      released: currentGame.released,
      ...values,
    });
    showToast(`"${currentGame.name}" guardado en tu lista.`);
    closeRatingSheet();
    await loadMyList();
    if (el.searchInput.value.trim()) runSearch(el.searchInput.value.trim());
  } catch (err) {
    showToast(err.message || 'No se pudo guardar.');
  }
});

el.deleteRatingBtn.addEventListener('click', async () => {
  if (!currentGame) return;
  try {
    await apiSend(`/api/ratings/${currentGame.rawgId}`, 'DELETE');
    showToast(`"${currentGame.name}" se quitó de tu lista.`);
    closeRatingSheet();
    await loadMyList();
  } catch (err) {
    showToast(err.message || 'No se pudo quitar.');
  }
});

// Carga inicial
loadMyList();
