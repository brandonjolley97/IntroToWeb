const doomSong = loadAudio('assets/audio/ripandtear.mp3', {loop: true, volume: 0.3});

if (document.body.getAttribute("data-page") == "doom") {
    autoplay(doomSong);
}

// The "?" safely handles cases where the check for the particular element would return null.
document.getElementById('rand-color')?.addEventListener('click',changeBackgroundColor);
document.getElementById('rand-color-home')?.addEventListener('click',changeBackgroundColor);
document.getElementById('reset-color')?.addEventListener('click', resetBackgroundColor);



// Spotlight values and function calls
let _rafId = 0;
let _lastX = -9999, _lastY = -9999;
let _onMove = null;

const SPOT_SCOPE = document.getElementById('spotlight');

setSpotRadius(400);
setSpotHardness(0.3);
enableSpotlight();

// document.addEventListener('DOMContentLoaded', () => {
//     // SPOT_SCOPE = document.getElementById('spotlight');

//     setSpotRadius(400);
//     setSpotHardness(0.2);
//     enableSpotlight();
// });


// document.addEventListener('DOMContentLoaded', () => {
//   wireDropdown('#tab-random');
//   wireDropdown('#tab-links');
// });

initTheme();

function changeBackgroundColor() {
    getRandomColor();
    initTheme();
}

function resetBackgroundColor() {
    clearTheme();
    clearRoot();
    clearScope("section");
    clearScope("#nav-rail",["--tab-hover-bg","--tab-hover-fg"]);
}

function getRandomColor() {
    const r = Math.floor(Math.random()*256);
    const g = Math.floor(Math.random()*256);
    const b = Math.floor(Math.random()*256);

    saveTheme("rgb("+r+","+g+","+b+")");
}

function clearTheme() {
    localStorage.removeItem("theme.bg");
}

function clearRoot() {
    const root = document.documentElement;
    root.style.removeProperty("--bg");
    root.style.removeProperty("--fg");
}

function clearScope(scope, properties=["--bg","--fg"]) {
    document.querySelectorAll(scope).forEach( s => {
        properties.forEach(p => s.style.removeProperty(p));
    });
}

function saveTheme(bg) {
    localStorage.setItem("theme.bg", bg);
}

function loadTheme() {
    return localStorage.getItem("theme.bg");
}

// // Updated method of applying the theme rendered this obsolete
// function applyTheme(bg,fg) {
//     document.body.style.backgroundColor=bg;
//     document.querySelectorAll("h1,p,nav").forEach(item => {
//         item.style.color=fg;
//     });
// }

function generateTextColor(bg) {
    const [r,g,b] = bg.slice(4,-1).split(",").map(Number); // Separates the values from the string generated in getRandomColor()
    const lum = 0.299*r + 0.587*g + 0.114*b; // Measures luminance of the background to determine white or black text
    return lum > 128 ? "rgb(0,0,0)" : "rgb(255,255,255)"; // Returns black or white based on luminance
}

function generateOppositeColor(bg) {
    const [r,g,b] = bg.slice(4,-1).split(",").map(Number);
    const og = "rgb("+(255-r)+","+(255-g)+","+(255-b)+")";
    return og;
}

function generateHoverShade(bg, t=0.12) {
    const [r,g,b] = bg.slice(4,-1).split(",").map(Number);
    const lum = 0.299*r + 0.587*g + 0.114*b;
    const x = lum > 128 ? darkenColorChannel(r,t) : lightenColorChannel(r,t);
    const y = lum > 128 ? darkenColorChannel(g,t) : lightenColorChannel(g,t);
    const z = lum > 128 ? darkenColorChannel(b,t) : lightenColorChannel(b,t);
    return "rgb("+x+","+y+","+z+")";
}

function darkenColorChannel(c,t) {
    return Math.round(Math.max(0, c * (1-t)));
}

function lightenColorChannel(c,t) {
    return Math.round(Math.min(255, c+(255-c)*t));
}

function initTheme() {
    const bg = loadTheme();
    if (!bg) return;
    const fg = generateTextColor(bg);
    const og = generateOppositeColor(bg);
    const ogLum = generateTextColor(og);
    const hs = generateHoverShade(bg,0.25);
    const hsLum = generateTextColor(hs);

    setCSSVar("--bg", bg);
    setCSSVar("--fg", fg);

    document.querySelectorAll('section').forEach(s => {
        setCSSVar("--bg", og, s);
        setCSSVar("--fg", ogLum, s);
    });

    setCSSVar("--tab-hover-bg",hs,document.getElementById("nav-rail"));
    setCSSVar("--tab-hover-fg",hsLum,document.getElementById("nav-rail"));

    setSpotColor(hs);
}

function loadAudio(src, {loop=true, volume=0.5}) {
    const audio = new Audio(src);
    audio.preload = 'auto';
    audio.loop=loop;
    audio.volume=volume;
    return audio;
}

function autoplay(src) {
    const audio = src.play();
    return audio;
}

function setCSSVar(name, value, scope = document.documentElement) {
    scope.style.setProperty(name,value);
}

function getCSSVar(name, scope = document.documentElement) {
    return getComputedStyle(scope).getPropertyValue(name).trim();
}


// These handle clicking to open and close a dropdown, which is currently not being used.
function toggleOpenContainer(container) {
    const open = container.classList.toggle('is-open');
    const label = container.querySelector('.tab-label');
    if (label) label.setAttribute('aria-expanded', String(open));
    return open;
}

function closeOpenContainer(container) {
    if (!container.classList.contains('is-open')) return;
    container.classList.remove('is-open');
    const label = container.querySelector('.tab-label');
    if (label) label.setAttribute('aria-expanded', String(false));
}

function closeOtherContainers(currentContainer = '') {
    document.querySelectorAll('.tab.is-open').forEach(item => {
        if (!currentContainer || !item.matches(currentContainer)) closeOpenContainer(item);
    });
}

function wireDropdown(currentContainer) {
    const container = document.querySelector(currentContainer);
    if (!container) return;
    const label = container.querySelector('.tab-label');
    if (!label) return;

    label.addEventListener('click', (e) => {
        if (label.tagName === "A") e.preventDefault();
        closeOtherContainers(currentContainer);
        toggleOpenContainer(container);
    });

    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) closeOpenContainer(container);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === "Escape") closeOpenContainer(container);
    });
}
// End of click-to-dropdown functions

// Functions to produce a spotlight effect following the cursor.
function enableSpotlight() {
    if (_onMove) return;
    _onMove = (e) => {
        _lastX = e.clientX;
        _lastY = e.clientY;
        if (!_rafId) _rafId = requestAnimationFrame(_flushSpotlight);
    };

    document.addEventListener("pointermove", _onMove, {
        passive: true
    });
}

function disableSpotlight() {
    if(_onMove) {
        document.removeEventListener("pointermove", _onMove);
        _onMove = null;
    }
    if(_rafId) {
        _rafId = 0;
    }
    setCSSVar('--spot-r', '0px', SPOT_SCOPE);
    setCSSVar('--spot-x', '-9999px', SPOT_SCOPE);
    setCSSVar('--spot-y', '-9999px', SPOT_SCOPE);
    
}

function _flushSpotlight() {
    _rafId = 0;
    setCSSVar('--spot-x', _lastX + 'px', SPOT_SCOPE);
    setCSSVar('--spot-y', _lastY + 'px', SPOT_SCOPE);
}

function setSpotRadius(px) {
    setCSSVar('--spot-r', (px|0) + 'px', SPOT_SCOPE);
}

function setSpotColor(c) {
    const m = String(c).match(/\d+/g);
    if (m && m.length >= 3) {
        const [r,g,b] = m.map(Number);
        setCSSVar('--spot-color', `rgb(${r} ${g} ${b} / 0.38)`, SPOT_SCOPE);
        setCSSVar('--spot-clear', `rgb(${r} ${g} ${b} / 0)`, SPOT_SCOPE);
    }
}

function setSpotHardness(hd) {
    const core = 0.55 - 0.35 * (1-hd);
    const feather = 0.6 - 0.4 * hd;
    setCSSVar('--spot-core', core, SPOT_SCOPE);
    setCSSVar('--spot-feather', feather, SPOT_SCOPE);
}

// End of spotlight functions