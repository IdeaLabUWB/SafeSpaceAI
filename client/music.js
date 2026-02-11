// SafeSpace AI - SoundCloud Calming Sounds Module
// Reconfigure by changing the playlist URL constant below.

const SOUNDCLOUD_PLAYLIST_URL = 'https://api.soundcloud.com/playlists/soundcloud:playlists:2185118780';

const CONTAINER_ID = 'soundcloud-container';
const WIDGET_API_URL = 'https://w.soundcloud.com/player/api.js';

let iframe = null;
let widget = null;
let isVisible = false;
let currentTrackIndex = 0;

function buildEmbedUrl() {
    const encoded = encodeURIComponent(SOUNDCLOUD_PLAYLIST_URL);
    // visual=true shows full playlist UI. auto_play=true plays first song when widget opens.
    return `https://w.soundcloud.com/player/?url=${encoded}&auto_play=true&visual=true&show_user=false`;
}

function loadWidgetApi(callback) {
    if (window.SC && window.SC.Widget) {
        callback();
        return;
    }
    const script = document.createElement('script');
    script.src = WIDGET_API_URL;
    script.onload = callback;
    document.head.appendChild(script);
}

function bindSingleTrackLoop() {
    if (!widget) return;
    // Save current track index when a track starts (user selection or auto-advance)
    widget.bind(window.SC.Widget.Events.PLAY, function () {
        widget.getCurrentSoundIndex(function (idx) {
            currentTrackIndex = idx;
        });
    });
    // When track finishes, skip back to the same track and play (loop)
    widget.bind(window.SC.Widget.Events.FINISH, function () {
        widget.skip(currentTrackIndex);
        setTimeout(() => {
            widget.play();
        }, 200); //delay to ensure track is loaded before play
    }); 
}

function toggleSoundCloudWidget() {
    const container = document.getElementById(CONTAINER_ID);
    if (!container) return;

    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.src = buildEmbedUrl();
        iframe.setAttribute('width', '100%');
        iframe.setAttribute('height', '450');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameborder', 'no');
        iframe.setAttribute('allow', 'autoplay');
        container.appendChild(iframe);
        container.style.display = 'block';
        isVisible = true;

        loadWidgetApi(function () {
            widget = window.SC.Widget(iframe);
            widget.bind(window.SC.Widget.Events.READY, bindSingleTrackLoop);
        });
    } else {
        isVisible = !isVisible;
        container.style.display = isVisible ? 'block' : 'none';
    }
}

window.toggleSoundCloudWidget = toggleSoundCloudWidget;
