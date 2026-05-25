// ============================================================================
// MimoCard · AI Flashcard Generator
// 5-agent pipeline: Fetcher → Concept → Card → Scheduler → Library
// Free APIs: r.jina.ai (content extraction), Pollinations (MiMo V2.5), localStorage
// ============================================================================

// ---------- CONFIG ----------
const JINA = 'https://r.jina.ai';
const POLI = 'https://text.pollinations.ai/openai';
const REFERRER = 'mimocard';
const STORAGE_KEY = 'mimocard.decks.v1';

const EXAMPLES = [
  { label: 'Spaced repetition', url: 'https://en.wikipedia.org/wiki/Spaced_repetition' },
  { label: 'Transformer (deep learning)', url: 'https://en.wikipedia.org/wiki/Transformer_(deep_learning_architecture)' },
  { label: 'Photosynthesis', url: 'https://en.wikipedia.org/wiki/Photosynthesis' },
  { label: 'Quantum entanglement', url: 'https://en.wikipedia.org/wiki/Quantum_entanglement' },
];

// ---------- STATE ----------
const state = {
  lang: localStorage.getItem('mc-lang') || 'en',
  theme: localStorage.getItem('mc-theme') || 'dark',
  inputMode: 'url',
  decks: loadDecks(),
  studySession: null, // { deckId, queue: [cardIds], idx, gradeMap, startedAt }
};

// ---------- I18N ----------
const T = {
  en: {
    eyebrow: 'AI Flashcard Generator · MiMo V2.5',
    heroH1: "Paste an article. Study <em>tomorrow's</em> exam tonight.",
    heroSub: 'Five agents fetch the article, distill key concepts, write Q&A flashcards, schedule them with SM-2 spaced repetition, and turn passive reading into long-term memory you keep.',
    pill1: '🆓 No API key', pill2: '🧠 SM-2 SRS', pill3: '📚 Anki export', pill4: '💾 Saves locally',
    tabUrl: 'From URL', tabText: 'From text',
    lblUrl: 'Article URL', lblText: 'Paste your text or notes',
    lblCount: 'Cards to generate', lblStyle: 'Card style',
    cnt5: '5 cards · quick review', cnt10: '10 cards · standard',
    cnt15: '15 cards · deep study', cnt20: '20 cards · full mastery',
    styQa: 'Q&A · standard', styCloze: 'Cloze · fill-in-blank', styDef: 'Definition · term/meaning',
    ctaGen: 'Generate flashcards →', ctaGenWorking: 'Generating…',
    ag1: 'Fetcher agent · extracting content',
    ag2: 'Concept agent · distilling key ideas',
    ag3: 'Card agent · writing Q&A pairs',
    ag4: 'Scheduler agent · seeding SM-2 intervals',
    ag5: 'Library agent · saving deck',
    libTitle: 'Your decks',
    libMetaTpl: '{decks} decks · {cards} cards total · {due} due now',
    libEmpty: 'No decks yet. Generate your first one above.',
    studyDue: 'Study all due', exportAll: 'Export all (Anki)',
    footerLine: 'Made with 🔥 by <a href="https://github.com/gyoomei">@gyoomei</a> · Powered by <a href="https://www.xiaomimimo.com/">Xiaomi MiMo V2.5</a> via Pollinations · Reader by <a href="https://r.jina.ai">Jina AI</a>',
    statDecks: 'Decks', statCards: 'Cards', statDue: 'Due now', statStreak: 'Streak',
    deckCardsLabel: 'cards', deckDueLabel: 'due', deckLastStudied: 'last',
    actStudy: 'Study', actExport: 'Anki', actDelete: 'Delete',
    modalStudy: 'Studying',
    progressTpl: '{cur}/{total} · {acc}% correct',
    revealHint: 'Click or press Space to reveal',
    grade0: 'Again', grade3: 'Hard', grade4: 'Good', grade5: 'Easy',
    studyDoneTitle: 'Session complete 🎉',
    studyDoneSubTpl: 'You reviewed {n} cards. Next due: {next}.',
    studyDoneBtn: 'Back to library',
    studyAllDone: 'Nothing due right now.',
    studyAllDoneSub: 'Come back later or generate a new deck.',
    errEmpty: 'Paste a URL or some text first.',
    errFetch: 'Could not fetch that page. Check the URL or paste the text directly.',
    errMiMo: 'AI generation failed. Try again in a moment.',
    errParse: 'Could not parse cards. Try a different article.',
    deckNamePlaceholder: 'New deck',
    confirmDelete: 'Delete this deck and all its cards?',
    deleteAllPrompt: 'No decks selected to delete.',
    intervalNow: 'now', intervalSec: '<1m', intervalMin: '{n}m',
    intervalHr: '{n}h', intervalDay: '{n}d', intervalMo: '{n}mo',
    cardOf: 'Card {n} of {total}',
    backLabel: 'Show answer',
  },
  id: {
    eyebrow: 'Generator Flashcard AI · MiMo V2.5',
    heroH1: 'Paste artikel. Belajar buat ujian <em>besok</em> malam ini.',
    heroSub: 'Lima agent ngambil artikel, suling konsep utama, tulis flashcard Q&A, jadwalin pakai SM-2 spaced repetition, dan ubah baca pasif jadi memori jangka panjang.',
    pill1: '🆓 Tanpa API key', pill2: '🧠 SM-2 SRS', pill3: '📚 Export Anki', pill4: '💾 Simpan lokal',
    tabUrl: 'Dari URL', tabText: 'Dari teks',
    lblUrl: 'URL artikel', lblText: 'Paste teks atau catatan',
    lblCount: 'Jumlah card', lblStyle: 'Gaya card',
    cnt5: '5 card · review cepat', cnt10: '10 card · standar',
    cnt15: '15 card · belajar dalam', cnt20: '20 card · mastery penuh',
    styQa: 'Q&A · standar', styCloze: 'Cloze · isi titik-titik', styDef: 'Definisi · istilah/arti',
    ctaGen: 'Buat flashcard →', ctaGenWorking: 'Memproses…',
    ag1: 'Fetcher agent · ekstrak konten',
    ag2: 'Concept agent · suling ide utama',
    ag3: 'Card agent · tulis pasangan Q&A',
    ag4: 'Scheduler agent · seed SM-2 interval',
    ag5: 'Library agent · simpan deck',
    libTitle: 'Deck kamu',
    libMetaTpl: '{decks} deck · total {cards} card · {due} jatuh tempo',
    libEmpty: 'Belum ada deck. Buat yang pertama di atas.',
    studyDue: 'Belajar yang due', exportAll: 'Export semua (Anki)',
    footerLine: 'Dibuat dengan 🔥 oleh <a href="https://github.com/gyoomei">@gyoomei</a> · Powered by <a href="https://www.xiaomimimo.com/">Xiaomi MiMo V2.5</a> via Pollinations · Reader oleh <a href="https://r.jina.ai">Jina AI</a>',
    statDecks: 'Deck', statCards: 'Card', statDue: 'Due', statStreak: 'Streak',
    deckCardsLabel: 'card', deckDueLabel: 'due', deckLastStudied: 'terakhir',
    actStudy: 'Belajar', actExport: 'Anki', actDelete: 'Hapus',
    modalStudy: 'Sedang belajar',
    progressTpl: '{cur}/{total} · {acc}% benar',
    revealHint: 'Klik atau tekan Space untuk lihat jawaban',
    grade0: 'Ulang', grade3: 'Sulit', grade4: 'Bagus', grade5: 'Mudah',
    studyDoneTitle: 'Sesi selesai 🎉',
    studyDoneSubTpl: 'Kamu review {n} card. Due berikut: {next}.',
    studyDoneBtn: 'Kembali ke library',
    studyAllDone: 'Belum ada yang due.',
    studyAllDoneSub: 'Balik nanti atau buat deck baru.',
    errEmpty: 'Paste URL atau teks dulu.',
    errFetch: 'Gagal ambil halaman. Cek URL atau paste teks langsung.',
    errMiMo: 'Generate AI gagal. Coba lagi sebentar.',
    errParse: 'Gagal parse card. Coba artikel lain.',
    deckNamePlaceholder: 'Deck baru',
    confirmDelete: 'Hapus deck ini beserta semua card?',
    deleteAllPrompt: 'Belum ada deck yang dipilih.',
    intervalNow: 'sekarang', intervalSec: '<1m', intervalMin: '{n}m',
    intervalHr: '{n}j', intervalDay: '{n}h', intervalMo: '{n}bln',
    cardOf: 'Card {n} dari {total}',
    backLabel: 'Lihat jawaban',
  },
};
const t = (k) => T[state.lang][k] ?? k;

// ---------- UTILS ----------
const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
function escapeHtml(s) { return (s || '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

function loadDecks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveDecks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.decks));
}

// ---------- AGENT 1 — FETCHER (r.jina.ai) ----------
async function agentFetch(input, isUrl) {
  setStep(1, 'active');
  if (!isUrl) {
    setStep(1, 'done', `${input.length} chars`);
    return { title: deriveTitle(input), content: input, source: 'pasted' };
  }
  // r.jina.ai returns markdown directly
  const r = await fetch(`${JINA}/${input}`, { headers: { 'Accept': 'text/plain' } });
  if (!r.ok) throw new Error('fetch_failed');
  const md = await r.text();
  // Parse jina output: first lines have Title:, URL Source:, Markdown Content:
  const titleMatch = md.match(/^Title:\s*(.+)$/m);
  const title = (titleMatch?.[1] || deriveTitle(md)).trim();
  // Strip jina header
  const contentStart = md.indexOf('Markdown Content:');
  let content = contentStart >= 0 ? md.slice(contentStart + 'Markdown Content:'.length).trim() : md;
  // Cap at 12000 chars to fit Pollinations context comfortably
  if (content.length > 12000) content = content.slice(0, 12000);
  setStep(1, 'done', `${content.length} chars`);
  return { title, content, source: input };
}
function deriveTitle(text) {
  // first non-empty line, max 80 chars
  const line = (text.split(/\n+/).find(l => l.trim().length > 4) || 'Untitled').trim();
  return line.length > 80 ? line.slice(0, 77) + '…' : line;
}

// ---------- AGENT 2 + 3 — CONCEPT + CARD GEN (single MiMo call) ----------
async function agentGenerateCards(content, count, style, lang) {
  setStep(2, 'active');
  await new Promise(r => setTimeout(r, 350));
  setStep(2, 'done');

  setStep(3, 'active');
  const styleSpec = {
    qa: 'Standard Q&A. Front = a clear question. Back = a concise factual answer (1-2 sentences max).',
    cloze: 'Cloze deletion. Front = a sentence with the key term replaced by "______" (six underscores). Back = the answer that fills the blank.',
    def: 'Definition. Front = a term or concept name. Back = a precise definition in 1-2 sentences.',
  }[style] || 'Standard Q&A.';

  const langDir = lang === 'id'
    ? `WAJIB Bahasa Indonesia BAKU. DILARANG: mahu, sebab, kerana, awak, pula, tetapi, ialah. PAKAI: mau, karena, kamu, juga, tapi, adalah. Pertahankan istilah teknis asli (English) kalau itu nama resmi (DNA, mitosis, transformer, dll).`
    : `Reply in clear English. Do not mix in other languages.`;

  const sys = `You are an expert flashcard maker. Read the content and produce exactly ${count} high-quality flashcards covering the most testable, durable knowledge.

CARD STYLE: ${styleSpec}

RULES:
- Each card must be self-contained (don't reference "the article" or "above").
- Test understanding, not trivia. Pick ideas that matter long-term.
- Vary difficulty: ~30% easy facts, 50% medium concepts, 20% deeper synthesis.
- Front <= 200 chars. Back <= 280 chars. No markdown, no bullets.
- DO NOT include hashtags, IDs, or numbering inside front/back text.

OUTPUT: a single valid JSON array of ${count} objects, each with exactly two string keys: "front" and "back". NO commentary, NO code fences, NO extra text. Output starts with [ and ends with ].

${langDir}`;

  const user = `Source content:\n\n${content}`;

  let raw = '';
  try {
    const r = await fetch(`${POLI}?referrer=${REFERRER}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'openai-fast',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
        referrer: REFERRER,
        temperature: 0.5,
        response_format: { type: 'json_object' }, // hint, model may ignore
      }),
    });
    if (!r.ok) throw new Error('mimo_http_' + r.status);
    const json = await r.json();
    raw = json.choices?.[0]?.message?.content?.trim() || '';
  } catch (e) {
    console.warn('[gen]', e);
    throw new Error('mimo_call_failed');
  }

  const cards = parseCardsJson(raw);
  if (!cards.length) throw new Error('parse_failed');

  // Anti-Melayu safety net for Indonesian mode
  if (lang === 'id') {
    const fix = [
      [/\bmahu\b/gi, 'mau'], [/\bsebab\b/gi, 'karena'], [/\bkerana\b/gi, 'karena'],
      [/\bawak\b/gi, 'kamu'], [/\bpula\b/gi, 'juga'], [/\btetapi\b/gi, 'tapi'],
      [/\bialah\b/gi, 'adalah'],
    ];
    cards.forEach(c => {
      fix.forEach(([re, rep]) => {
        c.front = c.front.replace(re, rep);
        c.back = c.back.replace(re, rep);
      });
    });
  }

  // Cap to requested count
  const final = cards.slice(0, count).map(c => ({
    id: uid(),
    front: c.front.trim(),
    back: c.back.trim(),
  }));
  setStep(3, 'done', `${final.length} cards`);
  return final;
}

function parseCardsJson(raw) {
  // Try direct JSON parse
  let arr = null;
  try {
    const parsed = JSON.parse(raw);
    arr = Array.isArray(parsed) ? parsed : (parsed.cards || parsed.flashcards || null);
  } catch { /* try to extract */ }

  if (!arr) {
    // Extract first [...] block
    const m = raw.match(/\[[\s\S]*\]/);
    if (m) {
      try { arr = JSON.parse(m[0]); } catch { /* keep null */ }
    }
  }
  if (!Array.isArray(arr)) return [];

  return arr
    .filter(o => o && typeof o === 'object' && o.front && o.back)
    .map(o => ({
      front: String(o.front).replace(/\s+/g, ' ').trim(),
      back: String(o.back).replace(/\s+/g, ' ').trim(),
    }));
}

// ---------- AGENT 4 — SCHEDULER (SM-2 init) ----------
function agentSchedule(cards) {
  setStep(4, 'active');
  const now = Date.now();
  cards.forEach(c => {
    // SM-2 initial state: never reviewed
    c.ef = 2.5;          // ease factor
    c.interval = 0;      // days; 0 = brand new
    c.reps = 0;          // consecutive correct reviews
    c.dueAt = now;       // immediately due
    c.lastReviewed = null;
    c.lastGrade = null;
  });
  setStep(4, 'done', 'SM-2 ready');
  return cards;
}

// SM-2 grade update.
// q in {0,3,4,5}: again, hard, good, easy.
// Standard SM-2 sets reps 0/1 → 1d/6d for ALL pass grades, but that makes Hard
// and Easy preview the same interval, which is bad UX. We add a grade-aware
// multiplier on the FIRST review: hard=0.5d, good=1d, easy=2.5d. From rep 2 on,
// the standard EF-driven schedule takes over.
function sm2(card, q) {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  if (q < 3) {
    card.reps = 0;
    card.interval = 0;
    card.ef = Math.max(1.3, card.ef - 0.2);
    card.dueAt = now + 10 * 60 * 1000; // 10 min later
  } else {
    card.ef = Math.max(1.3, card.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    let nextInterval;
    if (card.reps === 0) {
      // first pass: 0.5d hard, 1d good, 2.5d easy
      nextInterval = q === 3 ? 0.5 : q === 4 ? 1 : 2.5;
    } else if (card.reps === 1) {
      // second pass: 3d hard, 6d good, 10d easy
      nextInterval = q === 3 ? 3 : q === 4 ? 6 : 10;
    } else {
      // standard SM-2: previous × EF, with grade modifier
      const mod = q === 3 ? 0.85 : q === 4 ? 1.0 : 1.3;
      nextInterval = Math.round(card.interval * card.ef * mod * 10) / 10;
    }
    card.interval = nextInterval;
    card.reps += 1;
    card.dueAt = now + nextInterval * day;
  }
  card.lastReviewed = now;
  card.lastGrade = q;
}

function intervalLabelMs(ms) {
  const lang = state.lang;
  if (ms <= 0) return T[lang].intervalNow;
  const sec = ms / 1000;
  if (sec < 60) return T[lang].intervalSec;
  const min = sec / 60;
  if (min < 60) return T[lang].intervalMin.replace('{n}', Math.round(min));
  const hr = min / 60;
  if (hr < 24) return T[lang].intervalHr.replace('{n}', Math.round(hr));
  const day = hr / 24;
  if (day < 30) return T[lang].intervalDay.replace('{n}', Math.round(day));
  const mo = day / 30;
  return T[lang].intervalMo.replace('{n}', Math.round(mo));
}

function previewInterval(card, q) {
  // Mirror the sm2() schedule without mutating
  if (q < 3) return 10 * 60 * 1000; // 10min
  let days;
  if (card.reps === 0) {
    days = q === 3 ? 0.5 : q === 4 ? 1 : 2.5;
  } else if (card.reps === 1) {
    days = q === 3 ? 3 : q === 4 ? 6 : 10;
  } else {
    const ef = Math.max(1.3, card.ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
    const mod = q === 3 ? 0.85 : q === 4 ? 1.0 : 1.3;
    days = Math.round(card.interval * ef * mod * 10) / 10;
  }
  return days * 24 * 60 * 60 * 1000;
}

// ---------- ORCHESTRATOR ----------
async function generate() {
  hideError();
  let input, isUrl;
  if (state.inputMode === 'url') {
    input = $('url-input').value.trim();
    if (!input) return showError(t('errEmpty'));
    if (!/^https?:\/\//i.test(input)) input = 'https://' + input;
    isUrl = true;
  } else {
    input = $('text-input').value.trim();
    if (!input) return showError(t('errEmpty'));
    if (input.length < 60) return showError(t('errEmpty'));
    isUrl = false;
  }
  const count = parseInt($('card-count').value, 10);
  const style = $('card-style').value;

  $('library').classList.remove('on');
  $('loading').classList.add('on');
  resetSteps();
  $('gen-btn').disabled = true;
  $('gen-btn').textContent = t('ctaGenWorking');

  try {
    const article = await agentFetch(input, isUrl);
    const cards = await agentGenerateCards(article.content, count, style, state.lang);
    agentSchedule(cards);

    setStep(5, 'active');
    const deck = {
      id: uid(),
      name: article.title,
      source: article.source,
      style,
      lang: state.lang,
      createdAt: Date.now(),
      lastStudied: null,
      cards,
    };
    state.decks.unshift(deck);
    saveDecks();
    setStep(5, 'done', 'saved');

    renderLibrary();
    setTimeout(() => $('library').scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
  } catch (e) {
    console.error('[gen]', e);
    if (e.message === 'fetch_failed') showError(t('errFetch'));
    else if (e.message === 'parse_failed') showError(t('errParse'));
    else if (e.message?.startsWith('mimo')) showError(t('errMiMo'));
    else showError(`${t('errMiMo')} (${e.message})`);
  } finally {
    $('loading').classList.remove('on');
    $('gen-btn').disabled = false;
    $('gen-btn').textContent = t('ctaGen');
  }
}

// ---------- LIBRARY RENDER ----------
function renderLibrary() {
  if (!state.decks.length) {
    $('library').classList.remove('on');
    return;
  }
  $('library').classList.add('on');

  const totalCards = state.decks.reduce((n, d) => n + d.cards.length, 0);
  const dueCards = state.decks.reduce((n, d) => n + d.cards.filter(c => c.dueAt <= Date.now()).length, 0);
  const totalReviews = state.decks.reduce((n, d) => n + d.cards.filter(c => c.lastReviewed).length, 0);

  $('libMeta').textContent = t('libMetaTpl')
    .replace('{decks}', state.decks.length)
    .replace('{cards}', totalCards)
    .replace('{due}', dueCards);

  $('stats').innerHTML = `
    <div class="stat"><div class="stat-label">${t('statDecks')}</div><div class="stat-val">${state.decks.length}</div></div>
    <div class="stat"><div class="stat-label">${t('statCards')}</div><div class="stat-val">${totalCards}</div></div>
    <div class="stat"><div class="stat-label">${t('statDue')}</div><div class="stat-val" style="color:${dueCards > 0 ? 'var(--warm)' : 'var(--good)'}">${dueCards}</div></div>
    <div class="stat"><div class="stat-label">${t('statStreak')}</div><div class="stat-val">${totalReviews}</div><div class="stat-sub">reviews</div></div>
  `;

  $('deckList').innerHTML = state.decks.map(d => {
    const due = d.cards.filter(c => c.dueAt <= Date.now()).length;
    const last = d.lastStudied ? `${t('deckLastStudied')} ${intervalLabelMs(Date.now() - d.lastStudied)}` : '';
    const isUrl = d.source && /^https?:\/\//.test(d.source);
    return `
      <div class="deck-card" data-id="${d.id}">
        <div class="deck-head">
          <div class="deck-name">${escapeHtml(d.name)}</div>
          <div class="deck-info">
            <span><strong>${d.cards.length}</strong> ${t('deckCardsLabel')}</span>
            ${due > 0 ? `<span class="due">${due} ${t('deckDueLabel')}</span>` : ''}
            ${last ? `<span>${last}</span>` : ''}
            <span style="text-transform:uppercase">${d.style}</span>
          </div>
        </div>
        ${isUrl ? `<div class="deck-info"><a href="${escapeHtml(d.source)}" target="_blank" rel="noopener" style="color:var(--acc); text-decoration:none">↗ ${escapeHtml(d.source.slice(0, 60))}${d.source.length > 60 ? '…' : ''}</a></div>` : ''}
        <div class="deck-actions">
          <button class="deck-action primary" data-act="study" data-id="${d.id}">▶ ${t('actStudy')}</button>
          <button class="deck-action" data-act="export" data-id="${d.id}">📥 ${t('actExport')}</button>
          <button class="deck-action danger" data-act="delete" data-id="${d.id}">🗑 ${t('actDelete')}</button>
        </div>
      </div>
    `;
  }).join('');
}

// ---------- STUDY MODE ----------
function startStudy(deckId) {
  const deck = state.decks.find(d => d.id === deckId);
  if (!deck) return;
  const dueCards = deck.cards.filter(c => c.dueAt <= Date.now());
  if (!dueCards.length) {
    state.studySession = { deckId, queue: [], idx: 0, gradeMap: {}, startedAt: Date.now(), allDone: true };
    openStudyModal(deck);
    return;
  }
  // shuffle
  const queue = dueCards.map(c => c.id).sort(() => Math.random() - 0.5);
  state.studySession = { deckId, queue, idx: 0, gradeMap: {}, startedAt: Date.now() };
  openStudyModal(deck);
}

function startStudyAllDue() {
  // build a virtual deck of all due cards across all decks
  const allDue = [];
  state.decks.forEach(d => {
    d.cards.forEach(c => {
      if (c.dueAt <= Date.now()) allDue.push({ deckId: d.id, cardId: c.id });
    });
  });
  if (!allDue.length) {
    state.studySession = { allDone: true };
    openStudyModal({ name: t('libTitle') });
    return;
  }
  // shuffle
  allDue.sort(() => Math.random() - 0.5);
  state.studySession = {
    multiDeck: true,
    queue: allDue, idx: 0, gradeMap: {}, startedAt: Date.now(),
  };
  openStudyModal({ name: `⚡ ${t('studyDue')}` });
}

function openStudyModal(deck) {
  $('modalTitle').textContent = deck.name;
  renderStudyCard();
  $('studyModal').classList.add('on');
  document.addEventListener('keydown', studyKeyboard);
}
function closeStudyModal() {
  $('studyModal').classList.remove('on');
  state.studySession = null;
  document.removeEventListener('keydown', studyKeyboard);
  saveDecks();
  renderLibrary();
}
function studyKeyboard(e) {
  if (!state.studySession || state.studySession.allDone) return;
  const cur = currentStudyCard();
  if (!cur) return;
  const cardEl = $('studyCard');
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (cardEl && !cardEl.classList.contains('flipped')) {
      cardEl.classList.add('flipped');
      revealGradeRow();
    }
  }
  if (cardEl && cardEl.classList.contains('flipped')) {
    if (e.key === '1') gradeCurrent(0);
    if (e.key === '2') gradeCurrent(3);
    if (e.key === '3') gradeCurrent(4);
    if (e.key === '4') gradeCurrent(5);
  }
}

function currentStudyCard() {
  const s = state.studySession;
  if (!s || s.allDone || s.idx >= s.queue.length) return null;
  if (s.multiDeck) {
    const ref = s.queue[s.idx];
    const deck = state.decks.find(d => d.id === ref.deckId);
    const card = deck?.cards.find(c => c.id === ref.cardId);
    return { deck, card };
  } else {
    const deck = state.decks.find(d => d.id === s.deckId);
    const card = deck?.cards.find(c => c.id === s.queue[s.idx]);
    return { deck, card };
  }
}

function renderStudyCard() {
  const s = state.studySession;
  if (!s) return;
  const body = $('studyBody');
  if (s.allDone) {
    body.innerHTML = `
      <div class="study-done">
        <h3>${t('studyAllDone')}</h3>
        <p>${t('studyAllDoneSub')}</p>
        <button class="ico-btn primary" id="closeDoneBtn">${t('studyDoneBtn')}</button>
      </div>`;
    $('progFill').style.width = '0%';
    $('studyMeta').innerHTML = '';
    document.getElementById('closeDoneBtn').addEventListener('click', closeStudyModal);
    return;
  }
  if (s.idx >= s.queue.length) {
    // session done
    const correct = Object.values(s.gradeMap).filter(g => g >= 3).length;
    const total = Object.keys(s.gradeMap).length;
    const acc = total ? Math.round(100 * correct / total) : 0;
    // find next due time
    let nextDue = null;
    state.decks.forEach(d => d.cards.forEach(c => {
      if (c.dueAt > Date.now() && (!nextDue || c.dueAt < nextDue)) nextDue = c.dueAt;
    }));
    const nextLabel = nextDue ? intervalLabelMs(nextDue - Date.now()) : '—';
    body.innerHTML = `
      <div class="study-done">
        <h3>${t('studyDoneTitle')}</h3>
        <p>${t('studyDoneSubTpl').replace('{n}', total).replace('{next}', nextLabel)} · ${acc}% ✓</p>
        <button class="ico-btn primary" id="closeDoneBtn">${t('studyDoneBtn')}</button>
      </div>`;
    $('progFill').style.width = '100%';
    $('studyMeta').innerHTML = '';
    document.getElementById('closeDoneBtn').addEventListener('click', closeStudyModal);
    return;
  }
  const ref = currentStudyCard();
  if (!ref) return;
  const { card, deck } = ref;
  const correct = Object.values(s.gradeMap).filter(g => g >= 3).length;
  const total = Object.keys(s.gradeMap).length;
  const acc = total ? Math.round(100 * correct / total) : 0;
  $('progFill').style.width = `${(s.idx / s.queue.length) * 100}%`;
  $('studyMeta').innerHTML = `
    <span>${t('progressTpl').replace('{cur}', s.idx + 1).replace('{total}', s.queue.length).replace('{acc}', acc)}</span>
    ${s.multiDeck ? `<span><strong>${escapeHtml(deck.name)}</strong></span>` : ''}
  `;
  body.innerHTML = `
    <div class="study-card" id="studyCard">
      <div class="study-front">${escapeHtml(card.front)}</div>
      <div class="study-back-label" id="revealBtn">${t('backLabel')} (Space)</div>
      <div class="study-back">${escapeHtml(card.back)}</div>
    </div>
    <div class="grade-row" id="gradeRow" style="display:none">
      ${[
        { g: 0, key: '1', dur: previewInterval(card, 0) },
        { g: 3, key: '2', dur: previewInterval(card, 3) },
        { g: 4, key: '3', dur: previewInterval(card, 4) },
        { g: 5, key: '4', dur: previewInterval(card, 5) },
      ].map(({ g, key, dur }) => `
        <button class="grade-btn" data-grade="${g}">
          <span>${t('grade' + g)}</span>
          <span class="grade-interval">${intervalLabelMs(dur)}</span>
          <span class="grade-key">${key}</span>
        </button>
      `).join('')}
    </div>
  `;
  // events
  const cardEl = $('studyCard');
  cardEl.addEventListener('click', () => {
    if (!cardEl.classList.contains('flipped')) {
      cardEl.classList.add('flipped');
      revealGradeRow();
    }
  });
  document.querySelectorAll('.grade-btn').forEach(btn => {
    btn.addEventListener('click', () => gradeCurrent(parseInt(btn.dataset.grade, 10)));
  });
}
function revealGradeRow() {
  const r = $('gradeRow');
  if (r) r.style.display = 'grid';
}
function gradeCurrent(q) {
  const s = state.studySession;
  if (!s) return;
  const ref = currentStudyCard();
  if (!ref) return;
  const { card, deck } = ref;
  sm2(card, q);
  s.gradeMap[card.id] = q;
  deck.lastStudied = Date.now();
  s.idx += 1;
  saveDecks();
  renderStudyCard();
}

// ---------- ANKI EXPORT ----------
function ankiExportText(cards) {
  // Anki TXT import: front\tback per line, with deck name as comment
  return cards.map(c => `${c.front.replace(/\t/g, ' ')}\t${c.back.replace(/\t/g, ' ')}`).join('\n');
}
function downloadDeck(deck) {
  const txt = `#separator:tab\n#html:false\n#deck:${deck.name}\n${ankiExportText(deck.cards)}`;
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deck.name.replace(/[^\w-]+/g, '_').slice(0, 60)}.txt`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadAllDecks() {
  if (!state.decks.length) return;
  const sections = state.decks.map(d => `#deck:${d.name}\n${ankiExportText(d.cards)}`);
  const txt = `#separator:tab\n#html:false\n${sections.join('\n\n')}`;
  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'mimocard-all-decks.txt';
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- DECK ACTIONS ----------
function deleteDeck(deckId) {
  if (!confirm(t('confirmDelete'))) return;
  state.decks = state.decks.filter(d => d.id !== deckId);
  saveDecks();
  renderLibrary();
}

// ---------- LOADING / ERRORS ----------
function setStep(n, status, meta) {
  const el = document.querySelector(`.agent-step[data-step="${n}"]`);
  if (!el) return;
  el.classList.remove('active', 'done');
  if (status) el.classList.add(status);
  if (meta) {
    const m = el.querySelector('.step-meta');
    if (m) m.textContent = meta;
  }
}
function resetSteps() { for (let i = 1; i <= 5; i++) setStep(i, ''); }
function showError(msg) { const e = $('error'); e.textContent = msg; e.classList.add('on'); }
function hideError() { $('error').classList.remove('on'); }

// ---------- LANG / THEME ----------
function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  document.querySelectorAll('[data-i18n-html]').forEach(el => { el.innerHTML = t(el.dataset.i18nHtml); });
  $('lang-btn').textContent = state.lang === 'en' ? 'EN' : 'ID';
  renderExamples();
  renderLibrary();
  localStorage.setItem('mc-lang', state.lang);
}
function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  $('theme-btn').textContent = state.theme === 'dark' ? '☾' : '☀';
  localStorage.setItem('mc-theme', state.theme);
}

function renderExamples() {
  const wrap = $('examples');
  if (!wrap) return;
  wrap.innerHTML = '';
  EXAMPLES.forEach(ex => {
    const b = document.createElement('button');
    b.className = 'example';
    b.textContent = ex.label;
    b.addEventListener('click', () => { $('url-input').value = ex.url; });
    wrap.appendChild(b);
  });
}

// ---------- INIT ----------
function init() {
  applyTheme();
  applyLang();

  $('lang-btn').addEventListener('click', () => { state.lang = state.lang === 'en' ? 'id' : 'en'; applyLang(); });
  $('theme-btn').addEventListener('click', () => { state.theme = state.theme === 'dark' ? 'light' : 'dark'; applyTheme(); });

  // tab switch
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('on'));
      tab.classList.add('on');
      const target = tab.dataset.tab;
      document.querySelector(`.tab-panel[data-panel="${target}"]`).classList.add('on');
      state.inputMode = target;
    });
  });

  $('gen-btn').addEventListener('click', generate);
  $('url-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') generate(); });

  // library actions delegated
  $('deckList').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    e.stopPropagation();
    const id = btn.dataset.id;
    if (btn.dataset.act === 'study') startStudy(id);
    else if (btn.dataset.act === 'export') {
      const deck = state.decks.find(d => d.id === id);
      if (deck) downloadDeck(deck);
    }
    else if (btn.dataset.act === 'delete') deleteDeck(id);
  });

  $('study-due-btn').addEventListener('click', startStudyAllDue);
  $('export-all-btn').addEventListener('click', downloadAllDecks);
  $('modalClose').addEventListener('click', closeStudyModal);
  $('studyModal').addEventListener('click', (e) => {
    if (e.target.id === 'studyModal') closeStudyModal();
  });

  renderLibrary();
}

document.addEventListener('DOMContentLoaded', init);
