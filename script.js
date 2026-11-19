// ==========================================
// CONFIGURACIÓN DE LA CANCIÓN
// ==========================================

const AUDIO_PATH = "Te Estoy Correteando.mp3";

// Tiempos aproximados, ajustables en segundos.
const LETRAS = [
    // INTRO
    { t: 0.0, texto: "" },

    // PRIMERA ESTROFA
    { t: 7.5, texto: "Te estoy correteando" },
    { t: 9.4, texto: "Ya sal de mi mente, que te quiero ver (uh)" },
    { t: 13.7, texto: "Ya van varios días enfermo de ti" },
    { t: 16.8, texto: "Dale, ven, cúrame" },
    { t: 19.8, texto: "Cuéntame, ¿qué ha sido de ti?" },
    { t: 24.0, texto: "Extráñame, te extraño a ti (extráñame)" },

    // VOCALIZACIONES
    { t: 29.5, texto: "Uh-uh-uh" },
    { t: 33.0, texto: "Ah-ah-ah" },
    { t: 37.0, texto: "Uh-uh-uh, uh" },
    { t: 41.0, texto: "" },

    // SEGUNDA ESTROFA
    { t: 64.5, texto: "Te estoy correteando" },
    { t: 67.0, texto: "Ya sal de mi mente, que te quiero ver" },
    { t: 71.0, texto: "Ya van varios días enfermo de ti" },
    { t: 74.2, texto: "Dale, ven, cúrame" },
    { t: 77.3, texto: "Cuéntame, ¿qué ha sido de ti?" },
    { t: 82.0, texto: "Extráñame, te extraño a ti" },

    // PUENTE VOCAL
    { t: 88.0, texto: "No sabes, no sabes verme" },
    { t: 101.0, texto: "No puedo si tú no estás cerca de mí" },
    { t: 115.0, texto: "Me va a matar estar sin ti" },
    { t: 124.0, texto: "" },

    // TERCERA ESTROFA
    { t: 131.5, texto: "Te estoy correteando" },
    { t: 134.0, texto: "Ya sal de mi mente, que te quiero ver" },
    { t: 138.0, texto: "Ya van varios días enfermo de ti" },
    { t: 141.0, texto: "Dale, ven, cúrame" },
    { t: 144.4, texto: "Cuéntame, ¿qué ha sido de ti?" },
    { t: 149.2, texto: "Extráñame, te extraño a ti" },

    // INSTRUMENTAL
    { t: 155.0, texto: "" },

    // CIERRE
    { t: 171.0, texto: "Todo se va, ya no pregunta por mí, eh" },
    { t: 176.0, texto: "Todo se va, ella se va, ya no pregunta por mí" },
    { t: 182.0, texto: "No estás acá, no estás aquí" },
    { t: 186.0, texto: "Te quiero acá, voy a morir, escúchame" },

    // FINAL
    { t: 192.0, texto: "" }
];

const PALETTE = [
    "#ff4d6d", "#ff7b00", "#ffd23f",
    "#7ae582", "#2ec4b6", "#4cc9f0",
    "#4361ee", "#9b5de5", "#f15bb5",
    "#ffffff"
];

// ==========================================
// CANVAS Y AUDIO
// ==========================================

const canvas = document.getElementById("sandCanvas");
const ctx = canvas.getContext("2d");

const musica = document.getElementById("musica")
    || document.createElement("audio");

musica.id = "musica";
musica.preload = "metadata";

if (!musica.getAttribute("src")) {
    musica.src = AUDIO_PATH;
}

if (!musica.parentNode) {
    document.body.appendChild(musica);
}

const btnPlay = document.getElementById("btnPlay");
const progreso = document.getElementById("progreso");
const tiempo = document.getElementById("tiempo");
const volumen = document.getElementById("volumen");

let W = 0;
let H = 0;
let dpr = 1;

let particles = [];
let pile = [];
let currentIndex = -1;
let lastFrame = performance.now();
let lastSettle = 0;

let cols = 0;
let rows = 0;
let cell = 3;

let animationStarted = false;

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function random(min, max) {
    return min + Math.random() * (max - min);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function formatTime(seconds) {
    if (!Number.isFinite(seconds)) return "0:00";

    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    return `${m}:${String(s).padStart(2, "0")}`;
}

function gridIndex(x, y) {
    return y * cols + x;
}

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;

    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cell = W < 600 ? 2 : 2;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(W / cell);
    rows = Math.ceil(H / cell);

    pile = new Uint8Array(cols * rows);
    particles = [];

    currentIndex = -1;

    if (animationStarted) {
        syncLyrics(true);
    }
}

musica.addEventListener("seeked", () => {
    syncLyrics(true);
});

window.addEventListener("resize", resize);

// ==========================================
// CREAR LETRAS CON PARTÍCULAS
// ==========================================

function buildText(text) {
    if (!text) return [];

    const mask = document.createElement("canvas");
    mask.width = W;
    mask.height = H;

    const mctx = mask.getContext("2d", {
        willReadFrequently: true
    });

    const maxWidth = W * 0.9;
    const maxHeight = H * 0.42;

    let fontSize = Math.min(110, W * 0.095, H * 0.16);
    fontSize = Math.max(15, fontSize);

    let lines = [];

    function wrap() {
        mctx.font = `900 ${fontSize}px system-ui`;

        const words = text.split(/\s+/);
        const result = [];
        let line = "";

        for (const word of words) {
            const test = line ? line + " " + word : word;

            if (mctx.measureText(test).width > maxWidth && line) {
                result.push(line);
                line = word;
            } else {
                line = test;
            }
        }

        if (line) result.push(line);

        return result;
    }

    do {
        lines = wrap();

        const tooWide = lines.some(
            line => mctx.measureText(line).width > maxWidth
        );

        const tooTall =
            lines.length * fontSize * 1.2 > maxHeight;

        if (!tooWide && !tooTall) break;

        fontSize *= 0.92;

    } while (fontSize > 14);

    mctx.clearRect(0, 0, W, H);

    mctx.fillStyle = "#ffffff";
    mctx.textAlign = "center";
    mctx.textBaseline = "middle";
    mctx.font = `900 ${fontSize}px system-ui`;

    const lineHeight = fontSize * 1.2;
    const centerY = H * 0.34;

    const startY =
        centerY - ((lines.length - 1) * lineHeight) / 2;

    lines.forEach((line, i) => {
        mctx.fillText(
            line,
            W / 2,
            startY + i * lineHeight
        );
    });

    const image = mctx.getImageData(0, 0, W, H).data;
    const targets = [];

    for (let y = 0; y < H; y += cell) {
        for (let x = 0; x < W; x += cell) {
            const index = (y * W + x) * 4 + 3;

            if (image[index] > 80) {
                targets.push({ x, y });
            }
        }
    }

    const limit = W < 600 ? 3500 : 6500;

    if (targets.length > limit) {
        const step = Math.ceil(targets.length / limit);
        return targets.filter((_, i) => i % step === 0);
    }

    return targets;
}

// ==========================================
// FORMAR UNA FRASE
// ==========================================

function showText(text) {
    releaseText();

    if (!text) return;

    const targets = buildText(text);

    targets.forEach((target, i) => {
        const fromBottom = Math.random() < 0.35;

        particles.push({
            x: fromBottom ? random(0, W) : random(0, W),
            y: fromBottom ? H - random(0, 30) : -random(10, 150),

            tx: target.x,
            ty: target.y,

            vx: 0,
            vy: 0,

            color: i % PALETTE.length,
            size: cell,

            mode: "forming",
            life: 1,

            delay: random(0, 0.12),
            age: 0,
            hold: 0
        });
    });
}

// ==========================================
// DESINTEGRACIÓN DE LETRAS
// ==========================================

function releaseText() {
    for (const p of particles) {
        if (p.mode === "forming" || p.mode === "hold") {
            p.mode = "falling";

            p.vx = random(-35, 35);
            p.vy = random(-45, 20);

            p.life = 1;
        }
    }
}

// ==========================================
// ARENA ACUMULADA
// ==========================================

function isSolid(col, row) {
    if (col < 0 || col >= cols || row >= rows) {
        return true;
    }

    if (row < 0) return false;

    return pile[gridIndex(col, row)] !== 0;
}

function settleParticle(p) {
    const col = clamp(Math.floor(p.x / cell), 0, cols - 1);
    let row = clamp(Math.floor(p.y / cell), 0, rows - 1);

    while (row >= 0 && isSolid(col, row)) {
        row--;
    }

    if (row >= 0) {
        pile[gridIndex(col, row)] = p.color + 1;
    }
}

function settleSand() {
    for (let row = rows - 2; row >= 0; row--) {
        for (let col = 0; col < cols; col++) {
            const idx = gridIndex(col, row);
            const color = pile[idx];

            if (!color) continue;

            const choices = Math.random() < 0.5
                ? [0, -1, 1]
                : [0, 1, -1];

            for (const dx of choices) {
                const nx = col + dx;
                const ny = row + 1;

                if (!isSolid(nx, ny)) {
                    pile[gridIndex(nx, ny)] = color;
                    pile[idx] = 0;
                    break;
                }
            }
        }
    }
}

// ==========================================
// ACTUALIZACIÓN DE PARTÍCULAS
// ==========================================

function updateParticles(dt) {
    const gravity = 850;

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];

        p.age += dt;

        if (p.mode === "forming") {
            if (p.age < p.delay) continue;

            const factor = Math.min(1, dt * 14);

            p.x += (p.tx - p.x) * factor;
            p.y += (p.ty - p.y) * factor;

            const distance = Math.hypot(
                p.tx - p.x,
                p.ty - p.y
            );

            if (distance < 1.5) {
                p.x = p.tx;
                p.y = p.ty;
                p.mode = "hold";
            }
        }

        else if (p.mode === "falling") {
            p.vy += gravity * dt;

            p.vx *= Math.pow(0.992, dt * 60);

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Desvanecimiento progresivo
            p.life -= dt * 0.65;

            // Eliminar partículas cuando desaparecen
            if (p.life <= 0 || p.y > H + 20) {
                particles.splice(i, 1);
                continue;
            }
        }
    }

    lastSettle += dt;

    if (lastSettle >= 0.045) {
        settleSand();
        lastSettle = 0;
    }
}

// ==========================================
// DIBUJAR PARTÍCULAS
// ==========================================


function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {

        // Transparencia según el estado
        if (p.mode === "falling") {
            ctx.globalAlpha = Math.max(0, p.life ?? 1);
        } else {
            ctx.globalAlpha = 1;
        }

        // Color original de cada partícula
        ctx.fillStyle = PALETTE[p.color];

        // Dibujar partículas pequeñas
        ctx.fillRect(
            p.x,
            p.y,
            p.size,
            p.size
        );
    }

    // Restaurar transparencia
    ctx.globalAlpha = 1;
}

// ==========================================
// SINCRONIZACIÓN MUSICAL
// ==========================================

function syncLyrics(force = false) {
    const currentTime = musica.currentTime;

    let index = -1;

    for (let i = 0; i < LETRAS.length; i++) {
        if (currentTime >= LETRAS[i].t) {
            index = i;
        } else {
            break;
        }
    }

    if (index !== currentIndex || force) {
        currentIndex = index;

        if (index >= 0) {
            showText(LETRAS[index].texto);
        } else {
            releaseText();
        }
    }
}

// ==========================================
// CONTROLES DE MÚSICA
// ==========================================

if (btnPlay) {
    btnPlay.addEventListener("click", async () => {
        if (musica.paused) {
            try {
                await musica.play();
                animationStarted = true;
                btnPlay.textContent = "⏸ Pausar";
                syncLyrics();
            } catch (error) {
                console.error("Error de audio:", error);
                alert("No se pudo reproducir el MP3. Revisa la ruta del archivo.");
            }
        } else {
            musica.pause();
            btnPlay.textContent = "▶ Reproducir";
        }
    });
}

musica.addEventListener("ended", () => {
    if (btnPlay) btnPlay.textContent = "▶ Reproducir";
    releaseText();
});

musica.addEventListener("pause", () => {
    if (btnPlay) btnPlay.textContent = "▶ Reproducir";
});

musica.addEventListener("play", () => {
    if (btnPlay) btnPlay.textContent = "⏸ Pausar";
});

musica.addEventListener("error", () => {
    console.error("No se encontró o no se pudo leer:", musica.src);
});

if (progreso) {
    progreso.addEventListener("input", () => {
        if (Number.isFinite(musica.duration) && musica.duration > 0) {
            musica.currentTime =
                (Number(progreso.value) / 1000) * musica.duration;

            syncLyrics(true);
        }
    });
}

if (volumen) {
    musica.volume = Number(volumen.value) / 100;

    volumen.addEventListener("input", () => {
        musica.volume = Number(volumen.value) / 100;
    });
}

function updateControls() {
    if (progreso && Number.isFinite(musica.duration) && musica.duration > 0) {
        progreso.value = Math.round(
            (musica.currentTime / musica.duration) * 1000
        );
    }

    if (tiempo) {
        tiempo.textContent =
            formatTime(musica.currentTime) +
            " / " +
            formatTime(musica.duration);
    }
}

// ==========================================
// BUCLE PRINCIPAL
// ==========================================

function animate(now) {
    const dt = Math.min(
        (now - lastFrame) / 1000,
        0.033
    );

    lastFrame = now;

    if (!musica.paused && !musica.ended) {
        syncLyrics();
        updateParticles(dt);
    }

    draw();
    updateControls();

    requestAnimationFrame(animate);
}

// ==========================================
// INICIALIZACIÓN
// ==========================================

resize();
requestAnimationFrame(animate);
