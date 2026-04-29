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
    return `https://w.soundcloud.com/player/?url=${encoded}&auto_play=true&visual=false&show_user=false`;
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
    const player = document.getElementById('floating-player');
    const container = document.getElementById(CONTAINER_ID);

    if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.src = buildEmbedUrl();
        iframe.setAttribute('width', '100%');
        iframe.setAttribute('height', '100%');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameborder', 'no');
        iframe.setAttribute('allow', 'autoplay');

        container.appendChild(iframe);

        loadWidgetApi(function () {
            widget = window.SC.Widget(iframe);
            widget.bind(window.SC.Widget.Events.READY, bindSingleTrackLoop);
        });
    }

    // ✅ Toggle + return state
    if (player.classList.contains('hidden')) {
        player.classList.remove('hidden');
        return 'opened';
    } else {
        player.classList.add('hidden');
        return 'closed';
    }
}

window.toggleSoundCloudWidget = toggleSoundCloudWidget;

document.addEventListener('DOMContentLoaded', function () {
    const player = document.getElementById('floating-player');
    const header = document.getElementById('floating-header');
    const closeBtn = document.getElementById('floating-close');

    player.addEventListener('click', function (e) {
        // Prevent header drag from triggering toggle
        if (isDragging) return;
    
        // Optional: ignore clicks on iframe area
        if (e.target.tagName.toLowerCase() === 'iframe') return;
    
        toggleSoundCloudWidget();
    });
    
    // Close button
    closeBtn.addEventListener('click', function () {
        toggleSoundCloudWidget();
    });

    // Dragging logic
    let isDragging = false;
    let offsetX, offsetY;

    header.addEventListener('mousedown', function (e) {
        isDragging = true;
        offsetX = e.clientX - player.offsetLeft;
        offsetY = e.clientY - player.offsetTop;
        header.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function (e) {
        if (!isDragging) return;
    
        let newLeft = e.clientX - offsetX;
        let newTop = e.clientY - offsetY;
    
        const playerRect = player.getBoundingClientRect();
    
        const maxLeft = window.innerWidth - playerRect.width;
        const maxTop = window.innerHeight - playerRect.height;
    
        // Clamp values
        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));
    
        player.style.left = newLeft + 'px';
        player.style.top = newTop + 'px';
    
        player.style.bottom = 'auto';
        player.style.right = 'auto';
    });

    document.addEventListener('mouseup', function () {
        isDragging = false;
        header.style.cursor = 'grab';
    });
});

