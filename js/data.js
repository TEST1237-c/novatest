// Données des films et séries - Supabase (partagé) ou localStorage (fallback)
const STORAGE_KEY = 'novaStream_content';

// Cache local (mis à jour par Supabase ou localStorage)
let contentCache = { films: [], series: [] };

function isSupabaseConfigured() {
    return typeof SUPABASE_URL === 'string' && SUPABASE_URL.length > 0 &&
           typeof SUPABASE_ANON_KEY === 'string' && SUPABASE_ANON_KEY.length > 0;
}

function supabaseFetch(path, options = {}) {
    if (!isSupabaseConfigured()) return Promise.reject(new Error('Supabase non configuré'));
    const url = SUPABASE_URL.replace(/\/$/, '') + '/rest/v1' + path;
    return fetch(url, {
        ...options,
        headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
            ...options.headers
        }
    });
}

// Charge le contenu depuis Supabase (visible par tous)
async function loadContentAsync() {
    if (!isSupabaseConfigured()) {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                const norm = (s) => {
                    let episodes = s.episodes;
                    // Parser les épisodes s'ils sont en JSON string
                    if (typeof episodes === 'string') {
                        try { episodes = JSON.parse(episodes); } catch (e) { episodes = []; }
                    }
                    if (!Array.isArray(episodes)) episodes = [];
                    if (episodes.length === 0) {
                        episodes = s.videoUrl ? [{ season: 1, episode: 1, title: 'Épisode 1', videoUrl: s.videoUrl }] : [];
                    } else {
                        // Normaliser les épisodes
                        episodes = episodes.map(ep => ({
                            season: parseInt(ep.season) || 1,
                            episode: parseInt(ep.episode) || 0,
                            title: ep.title || 'Épisode',
                            duration: ep.duration || '',
                            description: ep.description || '',
                            videoUrl: ep.videoUrl || ep.video_url || ''
                        }));
                    }
                    return { ...s, episodes };
                };
                contentCache = {
                    films: data.films || [],
                    series: (data.series || []).map(norm)
                };
            }
        } catch (e) {}
        return contentCache;
    }

    try {
        const [filmsRes, seriesRes] = await Promise.all([
            supabaseFetch('/content?type=eq.film&order=created_at.asc&select=*'),
            supabaseFetch('/content?type=eq.serie&order=created_at.asc&select=*')
        ]);

        const filmsData = filmsRes.ok ? await filmsRes.json() : [];
        const seriesData = seriesRes.ok ? await seriesRes.json() : [];

        const toFilmItem = (row) => ({
            id: row.id,
            title: row.title,
            description: row.description || '',
            image: row.image || '',
            videoUrl: row.video_url,
            duration: row.duration || '-',
            year: row.year || '-',
            genre: row.genre || '-'
        });

        const toSerieItem = (row) => {
            let episodes = row.episodes;
            if (typeof episodes === 'string') try { episodes = JSON.parse(episodes); } catch (e) { episodes = []; }
            if (!Array.isArray(episodes)) episodes = [];
            if (episodes.length === 0) {
                if (row.video_url) episodes = [{ season: 1, episode: 1, title: 'Épisode 1', videoUrl: row.video_url }];
            } else {
                // S'assurer que chaque épisode a les bonnes propriétés
                episodes = episodes.map(ep => ({
                    season: parseInt(ep.season) || 1,
                    episode: parseInt(ep.episode) || 0,
                    title: ep.title || 'Épisode',
                    duration: ep.duration || '',
                    description: ep.description || '',
                    videoUrl: ep.videoUrl || ep.video_url || ''
                }));
            }
            return {
                id: row.id,
                title: row.title,
                description: row.description || '',
                image: row.image || '',
                videoUrl: row.video_url,
                duration: row.duration || '-',
                year: row.year || '-',
                genre: row.genre || '-',
                episodes
            };
        };

        contentCache = {
            films: filmsData.map(toFilmItem),
            series: seriesData.map(toSerieItem)
        };

        // Fusionne avec localStorage pour récupérer la description si elle n'est pas en Supabase
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const local = JSON.parse(saved);
                const mergeDesc = (target, source) => {
                    if (!source || !Array.isArray(source)) return;
                    target.forEach((item, i) => {
                        const localItem = source.find(l => l.id === item.id);
                        if (localItem && localItem.description && !item.description) {
                            item.description = localItem.description;
                        }
                    });
                };
                mergeDesc(contentCache.films, local.films);
                mergeDesc(contentCache.series, local.series);
                if (local.series) {
                    // N'appliquer les épisodes locaux que si le serveur n'en fournit pas,
                    // pour éviter d'écraser les données partagées par Supabase.
                    const normalizeLocalEpisodes = (eps) => {
                        if (!Array.isArray(eps)) return [];
                        return eps.map(ep => ({
                            season: parseInt(ep.season) || 1,
                            episode: parseInt(ep.episode) || 0,
                            title: ep.title || 'Épisode',
                            duration: ep.duration || '',
                            description: ep.description || '',
                            videoUrl: ep.videoUrl || ep.video_url || ''
                        }));
                    };

                    contentCache.series.forEach(item => {
                        const localItem = (local.series || []).find(l => l.id === item.id);
                        if (!localItem) return;
                        // Si le serveur n'a pas d'épisodes, utiliser ceux du local
                        if ((!item.episodes || item.episodes.length === 0) && localItem.episodes?.length) {
                            item.episodes = normalizeLocalEpisodes(localItem.episodes);
                        }
                        // Récupérer la description locale seulement si le serveur n'en a pas
                        if (localItem.description && !item.description) item.description = localItem.description;
                    });
                }
            }
        } catch (e) {}

        localStorage.setItem(STORAGE_KEY, JSON.stringify(contentCache));
    } catch (e) {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const data = JSON.parse(saved);
                contentCache = {
                    films: data.films || [],
                    series: data.series || []
                };
            }
        } catch (err) {}
    }
    return contentCache;
}

function getContent() {
    return contentCache;
}

function saveContentLocal(content) {
    contentCache = content;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(content));
}

async function addItem(category, item) {
    const type = category === 'film' ? 'film' : 'serie';
    const episodes = (type === 'serie' && item.episodes?.length) ? item.episodes : null;
    const firstVideoUrl = episodes?.length ? episodes[0].videoUrl : (item.videoUrl || '');
    const row = {
        type,
        title: item.title,
        description: item.description || '',
        image: item.image || '',
        video_url: firstVideoUrl || item.videoUrl || '',
        duration: item.duration || '-',
        year: item.year || '-',
        genre: item.genre || '-'
    };
    if (episodes) {
        // S'assurer que les épisodes sont en JSON string pour Supabase
        row.episodes = JSON.stringify(episodes);
    }

    if (isSupabaseConfigured()) {
        try {
            const res = await supabaseFetch('/content', {
                method: 'POST',
                body: JSON.stringify(row)
            });
            if (!res.ok) throw new Error(await res.text());
            const [created] = await res.json();
            const newItem = {
                id: created.id,
                title: created.title,
                description: created.description || '',
                image: created.image,
                videoUrl: created.video_url,
                duration: created.duration,
                year: created.year,
                genre: created.genre
            };
            if (episodes) newItem.episodes = episodes;
            const content = getContent();
            if (type === 'film') {
                content.films.push(newItem);
            } else {
                content.series.push(newItem);
            }
            saveContentLocal(content);
            return newItem;
        } catch (e) {
            console.error('Erreur Supabase:', e);
            throw e;
        }
    }

    item.id = 'item_' + Date.now();
    const content = getContent();
    const list = type === 'film' ? content.films : content.series;
    list.push(item);
    saveContentLocal(content);
    return item;
}

async function deleteItem(category, id) {
    const type = category === 'film' ? 'film' : 'serie';

    if (isSupabaseConfigured() && !id.startsWith('item_')) {
        try {
            const res = await supabaseFetch('/content?id=eq.' + id, { method: 'DELETE' });
            if (!res.ok) throw new Error(await res.text());
        } catch (e) {
            console.error('Erreur Supabase:', e);
            throw e;
        }
    }

    const content = getContent();
    const list = type === 'film' ? content.films : content.series;
    const filtered = list.filter(item => item.id !== id);
    if (type === 'film') {
        content.films = filtered;
    } else {
        content.series = filtered;
    }
    saveContentLocal(content);
}

async function updateItem(category, id, updates) {
    const type = category === 'film' ? 'film' : 'serie';
    const content = getContent();
    const list = type === 'film' ? content.films : content.series;
    const index = list.findIndex(item => item.id === id);
    if (index === -1) return false;

    if (isSupabaseConfigured() && !id.startsWith('item_')) {
        const buildBody = (includeDesc) => {
            const body = {};
            if (updates.title !== undefined) body.title = updates.title;
            if (includeDesc && updates.description !== undefined) body.description = updates.description || '';
            if (updates.image !== undefined) body.image = updates.image;
            if (updates.videoUrl !== undefined) body.video_url = updates.videoUrl;
            if (updates.duration !== undefined) body.duration = updates.duration;
            if (updates.year !== undefined) body.year = updates.year;
            if (updates.genre !== undefined) body.genre = updates.genre;
            if (updates.episodes !== undefined) {
                // Convertir les épisodes en JSON string pour Supabase
                body.episodes = JSON.stringify(updates.episodes);
            }
            if (updates.episodes?.length && !body.video_url) body.video_url = updates.episodes[0].videoUrl;
            return body;
        };

        const doPatch = (body) => supabaseFetch('/content?id=eq.' + encodeURIComponent(id), {
            method: 'PATCH',
            body: JSON.stringify(body)
        });

        try {
            const res = await doPatch(buildBody(true));
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(errText);
            }
        } catch (e) {
            console.error('Erreur Supabase:', e);
            throw e;
        }
    }

    list[index] = { ...list[index], ...updates };
    saveContentLocal(content);
    return true;
}

function getItemById(category, id) {
    const content = getContent();
    const list = category === 'film' ? content.films : content.series;
    return list.find(item => item.id === id) || null;
}

// --- Sync / pseudo-realtime ---
// Si Supabase est configuré, on lance un poll régulier qui recharge le contenu
// et émet un événement `content:updated` lorsque le contenu change.
let __lastSerializedContent = JSON.stringify(contentCache);
async function __pollForUpdates(intervalMs = 5000) {
    try {
        // make an initial load to ensure contentCache is populated
        await loadContentAsync();
        __lastSerializedContent = JSON.stringify(contentCache);
    } catch (e) {}

    setInterval(async () => {
        try {
            const before = __lastSerializedContent;
            await loadContentAsync();
            const after = JSON.stringify(contentCache);
            if (after !== before) {
                __lastSerializedContent = after;
                try { window.dispatchEvent(new Event('content:updated')); } catch (e) {}
            }
        } catch (e) {
            // ignore polling errors
        }
    }, intervalMs);
}

if (isSupabaseConfigured()) {
    __pollForUpdates(5000);
    // Essayer d'établir un abonnement Realtime via la librairie officielle Supabase (CDN)
    (function __setupRealtime() {
        // URL du bundle UMD de supabase-js (v2)
        const CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/dist/umd/supabase.js';

        // Charge le script CDN si nécessaire
        function loadScript(src) {
            return new Promise((resolve, reject) => {
                if (window.supabase) return resolve(window.supabase);
                const s = document.createElement('script');
                s.src = src;
                s.async = true;
                s.onload = () => resolve(window.supabase);
                s.onerror = reject;
                document.head.appendChild(s);
            });
        }

        async function start() {
            try {
                await loadScript(CDN);
                if (!window.supabase || typeof window.supabase.createClient !== 'function') return;
                const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

                // Crée un channel pour écouter les changements sur la table `content`
                try {
                    const chan = client.channel('public:content')
                        .on('postgres_changes', { event: '*', schema: 'public', table: 'content' }, async (payload) => {
                            console.debug('[realtime] payload:', payload);
                            try {
                                // Si l'événement concerne la table `content`, on recharge le contenu
                                const eventType = payload?.eventType || payload?.type || payload?.commit_timestamp ? 'unknown' : 'unknown';
                                const row = payload?.new || payload?.record || null;
                                const isContent = true; // on écoute déjà la table content
                                if (isContent) {
                                    await loadContentAsync();
                                    __lastSerializedContent = JSON.stringify(contentCache);
                                    try { window.dispatchEvent(new Event('content:updated')); } catch (e) {}
                                }
                            } catch (e) { console.error('[realtime] handler error', e); }
                        })
                        .subscribe();

                    chan.on('error', (err) => console.warn('Supabase realtime error', err));
                    chan.on('close', () => console.info('Supabase realtime channel closed'));
                } catch (e) {
                    console.warn('Impossible de s\u2019abonner en realtime:', e);
                }
            } catch (e) {
                // échec du chargement CDN -> fallback au polling
            }
        }

        // démarrer sans bloquer
        start();
    })();
}
