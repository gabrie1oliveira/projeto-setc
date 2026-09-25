/**
 * ============================================================
 * UTILS.JS
 * ------------------------------------------------------------
 * Funções utilitárias reutilizáveis em todo o projeto.
 * Nada aqui depende de outras classes — só matemática e helpers.
 * ============================================================
 */
"use strict";

const Utils = {

    /* ========================================================
       MATEMÁTICA
    ======================================================== */

    /** Limita um valor entre min e max. */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    },

    /** Interpolação linear entre a e b pelo fator t (0..1). */
    lerp(a, b, t) {
        return a + (b - a) * t;
    },

    /** Distância euclidiana entre dois pontos. */
    dist(x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        return Math.sqrt(dx * dx + dy * dy);
    },

    /** Distância ao quadrado (mais rápido — evita sqrt). */
    distSq(x1, y1, x2, y2) {
        const dx = x2 - x1, dy = y2 - y1;
        return dx * dx + dy * dy;
    },

    /** Número aleatório entre min e max (float). */
    random(min, max) {
        return Math.random() * (max - min) + min;
    },

    /** Número inteiro aleatório entre min e max (inclusivo). */
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    /** Retorna -1 ou 1 aleatoriamente. */
    randomSign() {
        return Math.random() < 0.5 ? -1 : 1;
    },

    /** Mapeia um valor de um range para outro. */
    map(value, inMin, inMax, outMin, outMax) {
        return (value - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },

    /** Verifica se dois números estão próximos dentro de epsilon. */
    near(a, b, eps = 0.001) {
        return Math.abs(a - b) < eps;
    },

    /* ========================================================
       COLISÃO (AABB)
    ======================================================== */

    /**
     * Colisão AABB entre dois retângulos {x, y, width, height}.
     * Também aceita objetos com `w`/`h` (compatibilidade).
     */
    aabb(a, b) {
        const aw = a.width ?? a.w ?? 0;
        const ah = a.height ?? a.h ?? 0;
        const bw = b.width ?? b.w ?? 0;
        const bh = b.height ?? b.h ?? 0;
        return (
            a.x < b.x + bw &&
            a.x + aw > b.x &&
            a.y < b.y + bh &&
            a.y + ah > b.y
        );
    },

    /** Colisão AABB expandida (com margem). */
    aabbExpand(a, b, margin = 0) {
        const aw = a.width ?? a.w ?? 0;
        const ah = a.height ?? a.h ?? 0;
        const bw = b.width ?? b.w ?? 0;
        const bh = b.height ?? b.h ?? 0;
        return (
            a.x - margin < b.x + bw &&
            a.x + aw + margin > b.x &&
            a.y - margin < b.y + bh &&
            a.y + ah + margin > b.y
        );
    },

    /* ========================================================
       VETORES
    ======================================================== */

    /** Normaliza um vetor {x, y} para comprimento 1. */
    normalize(v) {
        const len = Math.sqrt(v.x * v.x + v.y * v.y);
        if (len === 0) return { x: 0, y: 0 };
        return { x: v.x / len, y: v.y / len };
    },

    /** Comprimento de um vetor. */
    length(v) {
        return Math.sqrt(v.x * v.x + v.y * v.y);
    },

    /* ========================================================
       CORES
    ======================================================== */

    /** Converte hex "#RRGGBB" para {r, g, b}. */
    hexToRgb(hex) {
        const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return m ? {
            r: parseInt(m[1], 16),
            g: parseInt(m[2], 16),
            b: parseInt(m[3], 16),
        } : null;
    },

    /** Mistura duas cores hex com fator t (0..1). */
    mixColors(hex1, hex2, t) {
        const c1 = this.hexToRgb(hex1);
        const c2 = this.hexToRgb(hex2);
        if (!c1 || !c2) return hex1;
        const r = Math.round(this.lerp(c1.r, c2.r, t));
        const g = Math.round(this.lerp(c1.g, c2.g, t));
        const b = Math.round(this.lerp(c1.b, c2.b, t));
        return `rgb(${r},${g},${b})`;
    },

    /** Retorna rgba() a partir de hex + alpha. */
    rgba(hex, alpha) {
        const c = this.hexToRgb(hex);
        if (!c) return hex;
        return `rgba(${c.r},${c.g},${c.b},${alpha})`;
    },

    /* ========================================================
       TEXTO
    ======================================================== */

    /** Preenche número com zeros à esquerda. */
    pad(num, size) {
        return String(num).padStart(size, '0');
    },

    /** Formata tempo em MM:SS. */
    formatTime(seconds) {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${this.pad(m, 2)}:${this.pad(s, 2)}`;
    },

    /* ========================================================
       TEMPO
    ======================================================== */

    /** Contador de FPS (atualiza uma vez por segundo). */
    createFpsCounter() {
        let frames = 0;
        let lastTime = performance.now();
        let fps = 60;
        return {
            tick() {
                frames++;
                const now = performance.now();
                if (now - lastTime >= 1000) {
                    fps = frames;
                    frames = 0;
                    lastTime = now;
                }
            },
            get value() { return fps; },
        };
    },

    /* ========================================================
       ARRAYS
    ======================================================== */

    /** Remove item de array pelo índice (swap-pop, mais rápido). */
    removeAt(arr, index) {
        if (index < 0 || index >= arr.length) return;
        const last = arr.length - 1;
        if (index !== last) arr[index] = arr[last];
        arr.pop();
    },

    /** Escolhe um item aleatório de um array. */
    pick(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },

    /** Embaralha array (Fisher-Yates) — modifica in-place. */
    shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    },

    /* ========================================================
       EASING (interpolações)
    ======================================================== */

    easeOutQuad(t)    { return 1 - (1 - t) * (1 - t); },
    easeInQuad(t)     { return t * t; },
    easeInOutQuad(t)  { return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    easeOutCubic(t)   { return 1 - Math.pow(1 - t, 3); },
    easeInCubic(t)    { return t * t * t; },
    easeOutElastic(t) {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1
            : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    },

    /* ========================================================
       DEBUG
    ======================================================== */

    /** Desenha retângulo de debug (AABB) no canvas. */
    debugRect(ctx, rect, color = 'red', cameraX = 0) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(
            Math.round(rect.x - cameraX) + 0.5,
            Math.round(rect.y) + 0.5,
            rect.width,
            rect.height
        );
    },

    /** Log condicional (só se window.DEBUG = true). */
    log(...args) {
        if (window.DEBUG) console.log('[DEBUG]', ...args);
    },
};

window.Utils = Utils;