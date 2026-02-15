/**
 * Contrôles vidéo personnalisés Nova Stream
 * Play/Pause, progression, volume, plein écran
 */
(function() {
    const playIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    const pauseIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    const volIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>';
    const volMuteIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
    const fullscreenIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>';
    const fullscreenExitIcon = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>';

    function formatTime(sec) {
        if (!isFinite(sec) || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return m + ':' + (s < 10 ? '0' : '') + s;
    }

    function initVideoControls(container) {
        const video = container.querySelector('video');
        if (!video || container.dataset.vcInit) return;

        container.dataset.vcInit = '1';
        video.removeAttribute('controls');

        const pauseOverlay = document.createElement('div');
        pauseOverlay.className = 'vc-pause-overlay';
        pauseOverlay.innerHTML = `<span class="vc-pause-icon">${pauseIcon}</span>`;
        pauseOverlay.style.display = 'none';

        const controls = document.createElement('div');
        controls.className = 'custom-video-controls';
        controls.innerHTML = `
            <div class="vc-progress">
                <div class="vc-progress-fill"></div>
            </div>
            <div class="vc-bar">
                <div class="vc-bar-left">
                    <button class="vc-btn vc-play" type="button" aria-label="Play/Pause">${playIcon}</button>
                    <span class="vc-time"><span class="vc-current">0:00</span> / <span class="vc-duration">0:00</span></span>
                </div>
                <div class="vc-bar-right">
                    <div class="vc-volume-wrap">
                        <button class="vc-btn vc-volume-btn" type="button" aria-label="Volume">${volIcon}</button>
                        <input type="range" class="vc-volume" min="0" max="100" value="100" aria-label="Volume">
                    </div>
                    <button class="vc-btn vc-fullscreen" type="button" aria-label="Plein écran (paysage sur mobile)">${fullscreenIcon}<span class="vc-fullscreen-hint">Paysage</span></button>
                </div>
            </div>
        `;

        container.appendChild(pauseOverlay);
        container.appendChild(controls);

        const progressEl = controls.querySelector('.vc-progress');
        const progressFill = controls.querySelector('.vc-progress-fill');
        const playBtn = controls.querySelector('.vc-play');
        const currentEl = controls.querySelector('.vc-current');
        const durationEl = controls.querySelector('.vc-duration');
        const volBtn = controls.querySelector('.vc-volume-btn');
        const volSlider = controls.querySelector('.vc-volume');
        const fullscreenBtn = controls.querySelector('.vc-fullscreen');

        let hideTimeout;
        function showControls() {
            container.classList.add('controls-visible');
            clearTimeout(hideTimeout);
            hideTimeout = setTimeout(() => container.classList.remove('controls-visible'), 3000);
        }

        container.addEventListener('mousemove', showControls);
        container.addEventListener('touchstart', showControls);

        video.addEventListener('play', () => { playBtn.innerHTML = pauseIcon; pauseOverlay.style.display = 'none'; });
        video.addEventListener('pause', () => { playBtn.innerHTML = playIcon; pauseOverlay.style.display = 'flex'; });

        playBtn.addEventListener('click', () => {
            video.paused ? video.play() : video.pause();
        });

        video.addEventListener('click', (e) => {
            if (e.target === video) video.paused ? video.play() : video.pause();
        });

        function updateTime() {
            currentEl.textContent = formatTime(video.currentTime);
        }
        function updateDuration() {
            durationEl.textContent = formatTime(video.duration);
        }
        function updateProgress() {
            const pct = video.duration ? (video.currentTime / video.duration) * 100 : 0;
            progressFill.style.width = pct + '%';
        }

        video.addEventListener('timeupdate', () => { updateTime(); updateProgress(); });
        video.addEventListener('loadedmetadata', updateDuration);
        video.addEventListener('durationchange', updateDuration);

        progressEl.addEventListener('click', (e) => {
            if (!video.duration) return;
            const rect = progressEl.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            video.currentTime = pct * video.duration;
        });

        volSlider.value = video.volume * 100;
        volSlider.addEventListener('input', () => {
            video.volume = volSlider.value / 100;
            volBtn.innerHTML = video.volume > 0 ? volIcon : volMuteIcon;
        });
        volBtn.addEventListener('click', () => {
            if (video.volume > 0) {
                video.volume = 0;
                volSlider.value = 0;
                volBtn.innerHTML = volMuteIcon;
            } else {
                video.volume = 1;
                volSlider.value = 100;
                volBtn.innerHTML = volIcon;
            }
        });

        function isMobile() {
            return window.matchMedia('(max-width: 768px)').matches || 'ontouchstart' in document.documentElement;
        }

        function lockLandscape() {
            if (!isMobile()) return;
            const o = screen.orientation;
            if (o && typeof o.lock === 'function') {
                o.lock('landscape').catch(function() {});
            }
        }

        function unlockOrientation() {
            const o = screen.orientation;
            if (o && typeof o.unlock === 'function') {
                o.unlock();
            }
        }

        function onFullscreenEnter() {
            fullscreenBtn.innerHTML = fullscreenExitIcon;
            lockLandscape();
        }

        function onFullscreenExit() {
            fullscreenBtn.innerHTML = fullscreenIcon;
            unlockOrientation();
        }

        function toggleFullscreen() {
            const isVideoFullscreen = video.webkitDisplayingFullscreen;
            const isDocFullscreen = !!document.fullscreenElement || !!document.webkitFullscreenElement;

            if (isVideoFullscreen || isDocFullscreen) {
                onFullscreenExit();
                if (video.webkitExitFullscreen) {
                    video.webkitExitFullscreen();
                } else {
                    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
                }
                return;
            }

            /* Sur téléphone : toujours utiliser le plein écran du conteneur pour pouvoir
               verrouiller l’orientation en paysage automatiquement. */
            if (isMobile()) {
                goContainerFullscreen();
                return;
            }

            if (typeof video.webkitEnterFullscreen === 'function') {
                try {
                    video.webkitEnterFullscreen();
                    fullscreenBtn.innerHTML = fullscreenExitIcon;
                    lockLandscape();
                } catch (err) {
                    goContainerFullscreen();
                }
            } else {
                goContainerFullscreen();
            }
        }

        function goContainerFullscreen() {
            var el = container.closest('.modal') || container.closest('.media-player-wrap') || container;
            var req = el && (el.requestFullscreen || el.webkitRequestFullscreen);
            if (req) {
                req.call(el).then(onFullscreenEnter).catch(function() {
                    fullscreenBtn.innerHTML = fullscreenIcon;
                    tryVideoFullscreen();
                });
            } else {
                tryVideoFullscreen();
            }
        }

        function tryVideoFullscreen() {
            if (typeof video.webkitEnterFullscreen === 'function') {
                try {
                    video.webkitEnterFullscreen();
                    fullscreenBtn.innerHTML = fullscreenExitIcon;
                    lockLandscape();
                } catch (e) {
                    fullscreenBtn.innerHTML = fullscreenIcon;
                }
            } else {
                fullscreenBtn.innerHTML = fullscreenIcon;
            }
        }

        video.addEventListener('webkitbeginfullscreen', onFullscreenEnter);
        video.addEventListener('webkitendfullscreen', onFullscreenExit);
        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                onFullscreenEnter();
            } else {
                onFullscreenExit();
            }
        });
        document.addEventListener('webkitfullscreenchange', () => {
            if (document.fullscreenElement || document.webkitFullscreenElement) {
                onFullscreenEnter();
            } else {
                onFullscreenExit();
            }
        });
        fullscreenBtn.addEventListener('click', function(e) {
            e.preventDefault();
            toggleFullscreen();
        });
    }

    function getActiveVideo() {
        const modal = document.getElementById('playerModal');
        if (modal?.classList.contains('active')) {
            const v = modal.querySelector('video');
            if (v) return v;
        }
        const mediaWrap = document.querySelector('.media-player-wrap');
        if (mediaWrap?.offsetParent) return mediaWrap.querySelector('video');
        return null;
    }

    function isLandscapeMobile() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        return w > h && Math.min(w, h) <= 900;
    }

    function updateLandscapeClass() {
        if (isLandscapeMobile()) {
            document.body.classList.add('landscape-mobile');
        } else {
            document.body.classList.remove('landscape-mobile');
        }
    }

    function init() {
        updateLandscapeClass();
        window.addEventListener('resize', updateLandscapeClass);
        window.addEventListener('orientationchange', function() {
            setTimeout(updateLandscapeClass, 100);
        });

        document.querySelectorAll('.video-wrapper, .media-player-wrap').forEach(wrap => {
            const video = wrap.querySelector('video');
            if (!video) return;

            let container = wrap.querySelector('.video-container');
            if (!container) {
                container = document.createElement('div');
                container.className = 'video-container';
                wrap.insertBefore(container, video);
                container.appendChild(video);
            }
            initVideoControls(container);
        });

        document.addEventListener('keydown', (e) => {
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
            const video = getActiveVideo();
            if (!video) return;
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                video.currentTime = Math.min(video.currentTime + 15, video.duration || video.currentTime + 15);
            } else if (e.key === 'ArrowLeft') {
                e.preventDefault();
                video.currentTime = Math.max(video.currentTime - 15, 0);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    window.initVideoControls = init;
})();
