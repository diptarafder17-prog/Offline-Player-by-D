let player;
let playlist = [];
let currentTrackIndex = -1;

function extractVideoId(urlOrId) {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlOrId.match(regExp);
    return (match && match[2].length === 11) ? match[2] : urlOrId.trim();
}

function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
        height: '360',
        width: '640',
        playerVars: {
            'autoplay': 1,
            'playsinline': 1
        },
        events: {
            'onStateChange': onPlayerStateChange
        }
    });
}

function onPlayerStateChange(event) {
    if (event.data === YT.PlayerState.ENDED) {
        playNextTrack();
    }
}

async function loadPlaylist() {
    try {
        const res = await fetch('/api/playlist');
        playlist = await res.json();
        renderPlaylist();
    } catch (err) {
        console.error('Failed to load playlist:', err);
    }
}

function renderPlaylist() {
    const container = document.getElementById('playlist');
    container.innerHTML = '';

    playlist.forEach((track, index) => {
        const li = document.createElement('li');
        li.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
        li.innerHTML = `
            <img src="${track.thumbnail}" alt="thumb">
            <div class="track-info">
                <div class="title">${track.title}</div>
                <div class="author">${track.author}</div>
            </div>
            <button class="delete-btn" onclick="deleteTrack(event, '${track.id}')">&times;</button>
        `;
        li.onclick = () => playTrack(index);
        container.appendChild(li);
    });
}

function playTrack(index) {
    if (index >= 0 && index < playlist.length) {
        currentTrackIndex = index;
        const track = playlist[index];
        player.loadVideoById(track.id);
        document.getElementById('nowPlaying').innerHTML = `<h3>Now Playing: ${track.title}</h3>`;
        renderPlaylist();
    }
}

function playNextTrack() {
    if (playlist.length > 0) {
        const nextIndex = (currentTrackIndex + 1) % playlist.length;
        playTrack(nextIndex);
    }
}

async function addTrack() {
    const input = document.getElementById('videoInput');
    const rawValue = input.value.trim();
    if (!rawValue) return;

    const videoId = extractVideoId(rawValue);
    const newTrack = {
        id: videoId,
        title: `YouTube Track (${videoId})`,
        author: 'YouTube Creator',
        thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
    };

    try {
        const res = await fetch('/api/playlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTrack)
        });
        const data = await res.json();
        playlist = data.playlist;
        input.value = '';
        renderPlaylist();
        
        if (currentTrackIndex === -1) {
            playTrack(0);
        }
    } catch (err) {
        console.error('Failed to add track:', err);
    }
}

async function deleteTrack(event, videoId) {
    event.stopPropagation();
    try {
        const res = await fetch(`/api/playlist?id=${videoId}`, { method: 'DELETE' });
        const data = await res.json();
        playlist = data.playlist;
        renderPlaylist();
    } catch (err) {
        console.error('Failed to delete track:', err);
    }
}

document.getElementById('addBtn').addEventListener('click', addTrack);
window.addEventListener('DOMContentLoaded', loadPlaylist);
