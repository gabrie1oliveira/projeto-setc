/**
 * ============================================================
 * LEVELS.JS
 * ------------------------------------------------------------
 * Blocos dourados (question) com power-ups:
 *   - item: 'mushroom'    → Mario GIGANTE
 *   - item: 'fireflower'  → Mario com FOGO
 *   - item: 'coin'        → moeda
 * ============================================================
 */
"use strict";

const LEVELS = {

    /* ===== FASE 1 ===== */
    1: {
        id: '1-1',
        name: 'Mundo 1-1',
        theme: 'overworld',
        length: 3400,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 960,  width: 96 },
            { x: 1920, width: 128 },
            { x: 2720, width: 96 },
        ],

        platforms: [
            /* Bloco de cogumelo (Mario gigante) */
            { x: 288, y: 284, width: 32, height: 32, type: 'question', item: 'mushroom' },
            /* Bloco de flor de fogo */
            { x: 320, y: 188, width: 32, height: 32, type: 'question', item: 'fireflower' },
            /* Blocos de moeda */
            { x: 352, y: 284, width: 32, height: 32, type: 'question', item: 'coin' },
            { x: 704, y: 284, width: 32, height: 32, type: 'question', item: 'coin' },
            { x: 2560, y: 240, width: 32, height: 32, type: 'question', item: 'coin' },

            /* Blocos comuns */
            { x: 256, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 320, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 384, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 640, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 672, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 736, y: 284, width: 32, height: 32, type: 'brick' },
            { x: 1280, y: 284, width: 128, height: 32, type: 'brick' },
            { x: 1440, y: 220, width: 96, height: 32, type: 'brick' },
            { x: 1600, y: 284, width: 96, height: 32, type: 'brick' },
            { x: 2400, y: 240, width: 128, height: 32, type: 'brick' },

            { x: 3150, y: 124, width: 16, height: 256, type: 'flagpole' },
            { x: 3220, y: 320, width: 64, height: 60, type: 'castle' },
        ],

        pipes: [
            { x: 480,  y: 340, width: 64, height: 40, hasText: true  },
            { x: 700,  y: 316, width: 64, height: 64, hasText: true  },
            { x: 1400, y: 340, width: 64, height: 40, hasText: true  },
            { x: 2200, y: 316, width: 64, height: 64, hasText: false },
        ],

        enemies: [
            { x: 400,  y: 356, minX: 300,  maxX: 460,  type: 'goomba' },
            { x: 600,  y: 356, minX: 550,  maxX: 680,  type: 'goomba' },
            { x: 1100, y: 356, minX: 1000, maxX: 1380, type: 'koopa' },
            { x: 1600, y: 356, minX: 1480, maxX: 1800, type: 'goomba' },
            { x: 1750, y: 356, minX: 1700, maxX: 1850, type: 'goomba' },
            { x: 2050, y: 200, minX: 1950, maxX: 2350, type: 'flying' },
            { x: 2800, y: 356, minX: 2700, maxX: 3000, type: 'koopa' },
        ],

        coins: [
            { x: 292, y: 250 }, { x: 356, y: 250 },
            { x: 648, y: 250 }, { x: 712, y: 250 },
            { x: 1300, y: 250 }, { x: 1340, y: 250 },
            { x: 1470, y: 190 }, { x: 2560, y: 200 },
        ],

        items: [],
        hasBoss: false,
    },

    /* ===== FASE 2 ===== */
    2: {
        id: '1-2',
        name: 'Mundo 1-2 (Subterrâneo)',
        theme: 'underground',
        length: 3000,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 1088, width: 96 },
            { x: 2208, width: 96 },
        ],

        platforms: [
            /* Bloco de flor de fogo */
            { x: 450, y: 252, width: 64, height: 32, type: 'question', item: 'fireflower' },
            /* Bloco de cogumelo */
            { x: 2600, y: 240, width: 32, height: 32, type: 'question', item: 'mushroom' },
            /* Blocos de moeda */
            { x: 1000, y: 240, width: 32, height: 32, type: 'question', item: 'coin' },

            /* Blocos comuns */
            { x: 200,  y: 284, width: 96,  height: 32, type: 'brick' },
            { x: 600,  y: 220, width: 128, height: 32, type: 'brick' },
            { x: 800,  y: 284, width: 160, height: 32, type: 'brick' },
            { x: 1450, y: 252, width: 96,  height: 32, type: 'brick' },
            { x: 1700, y: 220, width: 128, height: 32, type: 'brick' },
            { x: 1900, y: 284, width: 128, height: 32, type: 'brick' },
            { x: 2400, y: 240, width: 96,  height: 32, type: 'brick' },

            { x: 2800, y: 124, width: 16, height: 256, type: 'flagpole' },
            { x: 2870, y: 320, width: 64, height: 60,  type: 'castle' },
        ],

        pipes: [
            { x: 352,  y: 316, width: 64, height: 64, hasText: true  },
            { x: 1248, y: 284, width: 64, height: 96, hasText: true  },
            { x: 2000, y: 316, width: 64, height: 64, hasText: false },
        ],

        enemies: [
            { x: 500,  y: 356, minX: 400,  maxX: 750,  type: 'koopa' },
            { x: 900,  y: 356, minX: 800,  maxX: 1050, type: 'goomba' },
            { x: 1000, y: 356, minX: 800,  maxX: 1050, type: 'goomba' },
            { x: 1500, y: 200, minX: 1300, maxX: 1800, type: 'flying' },
            { x: 1800, y: 356, minX: 1700, maxX: 2000, type: 'koopa' },
            { x: 2450, y: 200, minX: 2300, maxX: 2600, type: 'flying' },
        ],

        coins: [
            { x: 220,  y: 250 }, { x: 260,  y: 250 },
            { x: 620,  y: 190 }, { x: 660,  y: 190 },
            { x: 820,  y: 250 }, { x: 860,  y: 250 },
            { x: 1460, y: 220 }, { x: 1500, y: 220 },
            { x: 2410, y: 210 }, { x: 2450, y: 210 },
        ],

        items: [],
        hasBoss: false,
    },

    /* ===== FASE 3 ===== */
    3: {
        id: '1-3',
        name: 'Mundo 1-3 (Castelo)',
        theme: 'castle',
        length: 2800,
        groundY: CONFIG.CANVAS.GROUND_Y,

        gaps: [
            { x: 800,  width: 96 },
            { x: 1408, width: 96 },
            { x: 2016, width: 96 },
        ],

        platforms: [
            /* Bloco de cogumelo antes do boss */
            { x: 300,  y: 284, width: 64,  height: 32, type: 'question', item: 'mushroom' },
            /* Bloco de flor de fogo antes do boss */
            { x: 1300, y: 190, width: 32,  height: 32, type: 'question', item: 'fireflower' },
            /* Bloco de moeda */
            { x: 2450, y: 240, width: 32,  height: 32, type: 'question', item: 'coin' },

            /* Blocos comuns */
            { x: 500,  y: 220, width: 128, height: 32, type: 'brick' },
            { x: 700,  y: 284, width: 64,  height: 32, type: 'brick' },
            { x: 1100, y: 252, width: 128, height: 32, type: 'brick' },
            { x: 1700, y: 252, width: 128, height: 32, type: 'brick' },
            { x: 1900, y: 220, width: 96,  height: 32, type: 'brick' },
            { x: 2300, y: 240, width: 128, height: 32, type: 'brick' },

            { x: 2700, y: 124, width: 16, height: 256, type: 'flagpole' },
        ],

        pipes: [
            { x: 450,  y: 340, width: 64, height: 40, hasText: true },
            { x: 1552, y: 340, width: 64, height: 40, hasText: true },
        ],

        enemies: [
            { x: 400,  y: 356, minX: 300,  maxX: 460,  type: 'koopa' },
            { x: 600,  y: 356, minX: 500,  maxX: 700,  type: 'goomba' },
            { x: 1150, y: 356, minX: 1100, maxX: 1250, type: 'koopa' },
            { x: 1200, y: 200, minX: 1000, maxX: 1400, type: 'flying' },
            { x: 1750, y: 356, minX: 1700, maxX: 1900, type: 'koopa' },
            { x: 2100, y: 200, minX: 2000, maxX: 2300, type: 'flying' },
        ],

        coins: [
            { x: 320,  y: 250 },
            { x: 520,  y: 190 }, { x: 560,  y: 190 },
            { x: 1120, y: 220 }, { x: 1160, y: 220 },
            { x: 1720, y: 220 },
            { x: 2320, y: 210 },
        ],

        items: [],

        hasBoss: true,
        bossSpawn: { x: 2150, y: 316, minX: 1900, maxX: 2400 },
    },
};

const WorldManager = {
    currentId: 1,
    getLevel(id) {
        const raw = LEVELS[id] || LEVELS[1];
        return JSON.parse(JSON.stringify(raw));
    },
    get total() { return Object.keys(LEVELS).length; },
    hasNext(id) { return id < this.total; },
};

window.LEVELS = LEVELS;
window.WorldManager = WorldManager;