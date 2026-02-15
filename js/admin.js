document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('addForm');
    const imgFileWrap = document.getElementById('imgFileWrap');
    const imgUrlWrap = document.getElementById('imgUrlWrap');
    const imageFile = document.getElementById('imageFile');
    const imageUrl = document.getElementById('imageUrl');
    const categorySelect = document.getElementById('category');
    const editIdInput = document.getElementById('editId');
    const editCatInput = document.getElementById('editCat');
    const submitBtn = document.getElementById('submitBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const videoUrlGroup = document.getElementById('videoUrlGroup');
    const episodesGroup = document.getElementById('episodesGroup');
    const episodesContainer = document.getElementById('episodesContainer');
    const addEpisodeBtn = document.getElementById('addEpisodeBtn');
    const videoUrlInput = document.getElementById('videoUrl');

    function toggleEpisodeFields() {
        const isSerie = categorySelect.value === 'serie';
        episodesGroup.classList.toggle('hidden', !isSerie);
        document.getElementById('descriptionGroup').classList.toggle('hidden', isSerie);
        document.getElementById('videoUrlGroup').classList.toggle('hidden', isSerie);
        document.getElementById('durationRow').classList.toggle('hidden', isSerie);
        if (isSerie) {
            videoUrlInput.removeAttribute('required');
        } else {
            videoUrlInput.setAttribute('required', 'required');
            episodesContainer.innerHTML = '';
        }
    }

    categorySelect.addEventListener('change', toggleEpisodeFields);

    function escapeAttr(s) {
        if (!s) return '';
        return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function renderEpisodeInSeason(ep, epIndex, seasonNum) {
        const episodeNum = ep.episode || '';
        const title = escapeAttr(ep.title);
        return `
            <div class="episode-item" data-ep-index="${epIndex}">
                <div class="episode-header">
                    <button type="button" class="btn-toggle-episode" title="Développer/Réduire" data-collapsed="true">▶</button>
                    <span class="episode-quick-view">EP${episodeNum}${title ? ' - ' + title : ''}</span>
                    <div class="episode-row hidden">
                        <input type="number" placeholder="Ép." value="${episodeNum}" min="1" class="ep-num">
                        <input type="text" placeholder="Titre" value="${title}" class="ep-title">
                        <input type="number" placeholder="Min" value="${escapeAttr(ep.duration)}" min="0" class="ep-duration" title="Durée en minutes">
                        <input type="url" placeholder="URL vidéo" value="${escapeAttr(ep.videoUrl)}" class="ep-url">
                        <button type="button" class="btn-remove-ep" title="Supprimer">×</button>
                    </div>
                </div>
                <div class="episode-content collapsed">
                    <textarea class="ep-description" placeholder="Description de l'épisode (optionnel)" rows="2">${escapeAttr(ep.description)}</textarea>
                </div>
            </div>
        `;
    }

    function renderSeasonBlock(seasonNum, episodes = []) {
        return `
            <div class="season-block" data-season="${seasonNum}">
                <div class="season-header">
                    <button type="button" class="btn-toggle-season" title="Développer/Réduire" data-collapsed="false">▼</button>
                    <h4>Saison ${seasonNum}</h4>
                    <span class="season-count">${episodes.length} épisode${episodes.length !== 1 ? 's' : ''}</span>
                    <button type="button" class="btn-remove-season" title="Supprimer la saison">×</button>
                </div>
                <div class="episodes-wrapper" data-season="${seasonNum}">
                    <div class="episodes-container" data-season="${seasonNum}">
                        ${episodes.map((ep, i) => renderEpisodeInSeason(ep, i, seasonNum)).join('')}
                    </div>
                    <button type="button" class="btn-add-episode-in-season">+ Ajouter un épisode</button>
                </div>
            </div>
        `;
    }

    function addEpisodeToSeason(seasonBlock, ep = {}) {
        const seasonNum = seasonBlock.dataset.season;
        const episodesContainer = seasonBlock.querySelector('.episodes-container');
        const epIndex = episodesContainer.querySelectorAll('.episode-item').length;
        const div = document.createElement('div');
        div.innerHTML = renderEpisodeInSeason(ep, epIndex, seasonNum);
        episodesContainer.appendChild(div.firstElementChild);
        const epBlock = episodesContainer.lastElementChild;
        attachEpisodeListeners(epBlock);
        updateSeasonCount(seasonBlock);
    }

    function attachEpisodeListeners(epBlock) {
        const toggleBtn = epBlock.querySelector('.btn-toggle-episode');
        const content = epBlock.querySelector('.episode-content');
        const episodeRow = epBlock.querySelector('.episode-row');
        const quickView = epBlock.querySelector('.episode-quick-view');
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = toggleBtn.dataset.collapsed === 'true';
            toggleBtn.dataset.collapsed = !isCollapsed;
            toggleBtn.textContent = isCollapsed ? '▼' : '▶';
            content.classList.toggle('collapsed');
            episodeRow.classList.toggle('hidden');
            quickView.classList.toggle('hidden');
        });
        epBlock.querySelector('.btn-remove-ep').addEventListener('click', () => {
            const seasonBlock = epBlock.closest('.season-block');
            epBlock.remove();
            updateSeasonCount(seasonBlock);
        });
    }

    function updateSeasonCount(seasonBlock) {
        const count = seasonBlock.querySelectorAll('.episode-item').length;
        seasonBlock.querySelector('.season-count').textContent = count + " épisode" + (count !== 1 ? 's' : '');
    }

    function addSeasonRow(seasonNum = null) {
        const existingSeasons = Array.from(episodesContainer.querySelectorAll('.season-block')).map(s => parseInt(s.dataset.season));
        if (!seasonNum) seasonNum = Math.max(0, ...existingSeasons) + 1;
        const div = document.createElement('div');
        div.innerHTML = renderSeasonBlock(seasonNum, []);
        episodesContainer.appendChild(div.firstElementChild);
        const seasonBlock = episodesContainer.lastElementChild;
        attachSeasonListeners(seasonBlock);
    }

    function attachSeasonListeners(seasonBlock) {
        const toggleBtn = seasonBlock.querySelector('.btn-toggle-season');
        const episodesWrapper = seasonBlock.querySelector('.episodes-wrapper');
        toggleBtn.addEventListener('click', () => {
            const isCollapsed = toggleBtn.dataset.collapsed === 'true';
            toggleBtn.dataset.collapsed = !isCollapsed;
            toggleBtn.textContent = isCollapsed ? '▼' : '▶';
            episodesWrapper.classList.toggle('collapsed');
        });
        seasonBlock.querySelector('.btn-add-episode-in-season').addEventListener('click', () => addEpisodeToSeason(seasonBlock));
        seasonBlock.querySelector('.btn-remove-season').addEventListener('click', () => {
            seasonBlock.remove();
        });
    }

    addEpisodeBtn?.addEventListener('click', () => addSeasonRow());

    function getEpisodes() {
        const seasons = episodesContainer.querySelectorAll('.season-block');
        const episodes = [];
        seasons.forEach(seasonBlock => {
            const seasonNum = parseInt(seasonBlock.dataset.season);
            const episodeItems = seasonBlock.querySelectorAll('.episode-item');
            episodeItems.forEach(epBlock => {
                episodes.push({
                    season: seasonNum,
                    episode: parseInt(epBlock.querySelector('.ep-num').value, 10) || 0,
                    title: epBlock.querySelector('.ep-title').value.trim() || 'Épisode',
                    duration: epBlock.querySelector('.ep-duration').value.trim() || '',
                    description: epBlock.querySelector('.ep-description').value.trim() || '',
                    videoUrl: epBlock.querySelector('.ep-url').value.trim()
                });
            });
        });
        return episodes.filter(ep => ep.videoUrl);
    }

    document.querySelectorAll('.option-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.option-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const val = tab.dataset.option;
            if (val === 'file') {
                imgFileWrap.classList.remove('hidden');
                imgUrlWrap.classList.add('hidden');
            } else {
                imgFileWrap.classList.add('hidden');
                imgUrlWrap.classList.remove('hidden');
            }
        });
    });

    document.querySelectorAll('.list-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.list-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('filmsList').classList.toggle('hidden', tab.dataset.list !== 'films');
            document.getElementById('seriesList').classList.toggle('hidden', tab.dataset.list !== 'series');
        });
    });

    cancelEditBtn.addEventListener('click', () => {
        editIdInput.value = '';
        editCatInput.value = '';
        form.reset();
        imageFile.value = '';
        episodesContainer.innerHTML = '';
        toggleEpisodeFields();
        submitBtn.textContent = 'Ajouter au site';
        cancelEditBtn.classList.add('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const category = categorySelect.value;
        const title = document.getElementById('title').value.trim();
        const description = document.getElementById('description').value.trim();
        let videoUrl = document.getElementById('videoUrl').value.trim();
        const duration = document.getElementById('duration').value.trim();
        const year = document.getElementById('year').value.trim();
        const genre = document.getElementById('genre').value.trim();

        // Vérifier si le titre existe déjà
        const isEditing = editIdInput.value && editCatInput.value;
        if (!isEditing) {
            const content = getContent();
            const allTitles = [...content.films.map(f => f.title.toLowerCase()), ...content.series.map(s => s.title.toLowerCase())];
            if (allTitles.includes(title.toLowerCase())) {
                alert(`"${title}" existe déjà sur le site. Choisis un autre titre ou modifie l'existant.`);
                return;
            }
        } else {
            // En cas de modification, vérifier que le nouveau titre n'existe pas ailleurs
            const content = getContent();
            const currentItem = getItemById(editCatInput.value, editIdInput.value);
            if (currentItem && currentItem.title.toLowerCase() !== title.toLowerCase()) {
                const allTitles = [...content.films.map(f => f.title.toLowerCase()), ...content.series.map(s => s.title.toLowerCase())];
                if (allTitles.includes(title.toLowerCase())) {
                    alert(`"${title}" existe déjà sur le site. Choisis un autre titre.`);
                    return;
                }
            }
        }

        const episodes = category === 'serie' ? getEpisodes() : [];
        if (category === 'serie' && episodes.length && !videoUrl) videoUrl = episodes[0].videoUrl;
        if (!videoUrl && (!episodes || episodes.length === 0)) {
            alert('Indique au moins une URL vidéo (champ principal ou épisode).');
            return;
        }

        let image = '';
        const useFile = document.querySelector('input[name="imgType"]:checked').value === 'file';

        if (useFile && imageFile.files.length) {
            image = await fileToBase64(imageFile.files[0]);
        } else if (!useFile && imageUrl.value.trim()) {
            image = imageUrl.value.trim();
        } else if (!editIdInput.value) {
            alert('Choisis une image (fichier ou URL).');
            return;
        }

        if (isEditing) {
            const updates = { title, description: description || '', videoUrl, duration: duration || '-', year: year || '-', genre: genre || '-' };
            if (image) updates.image = image;
            if (category === 'serie' && episodes.length) updates.episodes = episodes;
            try {
                const ok = await updateItem(editCatInput.value, editIdInput.value, updates);
                if (!ok) return;
                editIdInput.value = '';
                editCatInput.value = '';
                form.reset();
                imageFile.value = '';
                episodesContainer.innerHTML = '';
                toggleEpisodeFields();
                submitBtn.textContent = 'Ajouter au site';
                cancelEditBtn.classList.add('hidden');
                showSuccessEdit();
                renderLists();
            } catch (err) {
                const errMsg = (err.message || '').toLowerCase();
                const needsDescriptionCol = errMsg.includes('column') || errMsg.includes('description');
                const msg = needsDescriptionCol 
                    ? 'La colonne "description" n\'existe pas. Ouvre le fichier supabase-add-description.sql, copie son contenu, et exécute-le dans Supabase (SQL Editor).'
                    : 'Erreur lors de la modification. Vérifie ta config Supabase.\n\n' + (err.message || '');
                alert(msg);
            }
        } else {
            if (!image) {
                alert('Choisis une image (fichier ou URL).');
                return;
            }
            const item = {
                title,
                description: description || '',
                image,
                videoUrl,
                duration: duration || '-',
                year: year || '-',
                genre: genre || '-'
            };
            if (category === 'serie' && episodes.length) item.episodes = episodes;
            try {
                await addItem(category, item);
                form.reset();
                imageFile.value = '';
                episodesContainer.innerHTML = '';
                toggleEpisodeFields();
                showSuccess();
                renderLists();
            } catch (err) {
                alert('Erreur lors de l\'ajout. Vérifie ta config Supabase.');
            }
        }
    });

    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    function showSuccess() {
        const existing = document.querySelector('.msg-success');
        if (existing) existing.remove();
        const msg = document.createElement('div');
        msg.className = 'msg-success';
        msg.textContent = '✓ Contenu ajouté ! Il apparaît maintenant sur le site.';
        form.insertBefore(msg, form.firstChild);
        setTimeout(() => msg.remove(), 3000);
    }

    function showSuccessEdit() {
        const existing = document.querySelector('.msg-success');
        if (existing) existing.remove();
        const msg = document.createElement('div');
        msg.className = 'msg-success';
        msg.textContent = '✓ Contenu modifié !';
        form.insertBefore(msg, form.firstChild);
        setTimeout(() => msg.remove(), 3000);
    }

    function loadItemForEdit(id, cat) {
        const item = getItemById(cat, id);
        if (!item) return;
        editIdInput.value = id;
        editCatInput.value = cat;
        categorySelect.value = cat === 'film' ? 'film' : 'serie';
        toggleEpisodeFields();
        document.getElementById('title').value = item.title || '';
        document.getElementById('description').value = item.description || '';
        document.getElementById('videoUrl').value = item.videoUrl || '';
        document.getElementById('duration').value = (item.duration && item.duration !== '-') ? item.duration : '';
        document.getElementById('year').value = (item.year && item.year !== '-') ? item.year : '';
        document.getElementById('genre').value = (item.genre && item.genre !== '-') ? item.genre : '';
        episodesContainer.innerHTML = '';
        if (cat === 'serie' && item.episodes?.length) {
            const seasonGroups = {};
            item.episodes.forEach(ep => {
                const s = ep.season || 1;
                if (!seasonGroups[s]) seasonGroups[s] = [];
                seasonGroups[s].push(ep);
            });
            Object.keys(seasonGroups).sort((a, b) => a - b).forEach(seasonNum => {
                const div = document.createElement('div');
                div.innerHTML = renderSeasonBlock(seasonNum, seasonGroups[seasonNum]);
                episodesContainer.appendChild(div.firstElementChild);
                const seasonBlock = episodesContainer.lastElementChild;
                seasonBlock.querySelectorAll('.episode-item').forEach(epBlock => attachEpisodeListeners(epBlock));
                attachSeasonListeners(seasonBlock);
            });
        }
        if (item.image) {
            document.querySelector('input[name="imgType"][value="url"]').checked = true;
            document.querySelector('.option-tab[data-option="file"]').classList.remove('active');
            document.querySelector('.option-tab[data-option="url"]').classList.add('active');
            imgFileWrap.classList.add('hidden');
            imgUrlWrap.classList.remove('hidden');
            imageUrl.value = item.image;
        }
        imageFile.value = '';
        submitBtn.textContent = 'Modifier';
        cancelEditBtn.classList.remove('hidden');
    }

    function renderLists() {
        const content = getContent();

        const filmsList = document.getElementById('filmsList');
        filmsList.innerHTML = content.films.map(item => renderItem(item, 'film')).join('');

        const seriesList = document.getElementById('seriesList');
        seriesList.innerHTML = content.series.map(item => renderItem(item, 'serie')).join('');

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.dataset.id;
                const cat = btn.dataset.cat;
                if (confirm('Supprimer ce contenu ?')) {
                    try {
                        await deleteItem(cat, id);
                        renderLists();
                    } catch (err) {
                        alert('Erreur lors de la suppression.');
                    }
                }
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', () => {
                loadItemForEdit(btn.dataset.id, btn.dataset.cat);
            });
        });
    }

    function renderItem(item, cat) {
        const imgHtml = item.image
            ? `<img src="${item.image}" alt="${item.title}">`
            : `<div class="item-placeholder">?</div>`;
        const meta = [item.genre, item.year].filter(v => v && v !== '-').join(' • ') || '-';
        const canDelete = !!item.id;
        const delBtn = canDelete
            ? `<button class="btn-delete" data-id="${item.id}" data-cat="${cat}">Supprimer</button>`
            : '';
        const canEdit = !!item.id;
        const editBtn = canEdit
            ? `<button class="btn-edit" data-id="${item.id}" data-cat="${cat}">Modifier</button>`
            : '';
        return `
            <div class="content-item">
                ${imgHtml}
                <div class="content-item-info">
                    <h4>${item.title}</h4>
                    <span>${meta}</span>
                </div>
                <div class="content-item-actions">
                    ${editBtn}
                    ${delBtn}
                </div>
            </div>
        `;
    }

    // Search functionality
    const searchInput = document.getElementById('searchContent');
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filmsList = document.getElementById('filmsList');
        const seriesList = document.getElementById('seriesList');
        
        const items = document.querySelectorAll('.content-item');
        items.forEach(item => {
            const title = item.querySelector('h4').textContent.toLowerCase();
            if (title.includes(query)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
            }
        });
    });

    toggleEpisodeFields();
    loadContentAsync().then(() => {
        renderLists();
        window.addEventListener('content:updated', renderLists);
    });
});
