/**
 * ============================================================
 * CONFIG.JS
 * ------------------------------------------------------------
 * Constantes globais do jogo. Centralizar aqui evita "números
 * mágicos" espalhados pelo código e facilita o balanceamento.
 * ============================================================
 */
"use strict";

const CONFIG = {

    /* ========================================================
       CANVAS
    ======================================================== */
    CANVAS: {
        WIDTH: 800,
        HEIGHT: 450,
        TILE: 32,
        GROUND_Y: 380,
        GRAVITY: 0.65,
        MAX_DELTA: 0.05,   // limita deltaTime para evitar tunnelling
    },

    /* ========================================================
       FÍSICA DO JOGADOR
    ======================================================== */
    PLAYER: {
        WIDTH: 24,
        HEIGHT_SMALL: 32,
        HEIGHT_BIG: 48,
        ACCEL: 0.7,
        FRICTION: 0.82,
        AIR_FRICTION: 0.94,
        MAX_SPEED: 4.4,
        MAX_FALL_SPEED: 14,
        JUMP_FORCE: -12.5,
        JUMP_HOLD_FRAMES: 8,       // frames de "pulo variável"
        COYOTE_FRAMES: 6,          // frames após sair da plataforma
        JUMP_BUFFER_FRAMES: 8,     // frames de input pré-pulo
        INVULN_TIME: 2.0,
        FIRE_COOLDOWN: 0.25,
        START_LIVES: 3,
    },

    /* ========================================================
       INIMIGOS
    ======================================================== */
    ENEMY: {
        GOOMBA_SPEED: 1.2,
        KOOPA_SPEED: 1.4,
        SHELL_SPEED: 7.5,
        FLYING_AMPLITUDE: 35,
        FLYING_FREQ: 250,
        STOMP_BOUNCE: -8,
        BOSS_HP: 5,
        BOSS_PHASE2_HP: 2,
    },

    /* ========================================================
       ITENS E PROJÉTEIS
    ======================================================== */
    ITEM: {
        MUSHROOM_SPEED: 1.5,
        STAR_SPEED: 2.0,
        FIREBALL_SPEED_X: 7,
        FIREBALL_GRAVITY: 0.4,
        FIREBALL_BOUNCE: -4,
        FIREBALL_LIFETIME: 3.0,
    },

    /* ========================================================
       MOEDAS E PONTUAÇÃO
    ======================================================== */
    SCORE: {
        COIN: 200,
        ENEMY: 200,
        BOSS_HIT: 300,
        BOSS_KILL: 5000,
        POWERUP: 1000,
        TIME_BONUS: 50,
        LEVEL_CLEAR: 2000,
    },

    /* ========================================================
       CÂMERA
    ======================================================== */
    CAMERA: {
        FOLLOW_SPEED: 0.1,
        LOOKAHEAD: 0,              // pixels à frente do player
        SHAKE_DECAY: 0.9,
        SHAKE_INTENSITY: 8,
    },

    /* ========================================================
       TIMER E PROGRESSÃO
    ======================================================== */
    GAME: {
        START_TIME: 400,
        TIME_WARNING: 100,
        LEVELS_TOTAL: 3,
    },

    /* ========================================================
       ÁUDIO
    ======================================================== */
    AUDIO: {
        MASTER_VOLUME: 0.7,
        SFX_VOLUME: 0.08,
    },

    /* ========================================================
       PALETA DE CORES
    ======================================================== */
    COLORS: {
        // Jogador
        MARIO_RED:    '#D32F2F',
        MARIO_SKIN:   '#FFCC80',
        MARIO_OVERALL:'#1976D2',
        MARIO_SHOE:   '#3E2723',
        MARIO_HAIR:   '#3E2723',
        FIRE_WHITE:   '#FFFFFF',
        FIRE_RED:     '#E53935',

        // Inimigos
        GOOMBA_BODY:  '#8D6E63',
        GOOMBA_FEET:  '#4E342E',
        KOOPA_SHELL:  '#4CAF50',
        KOOPA_SKIN:   '#FFEB3B',
        BOSS_BODY:    '#2E7D32',
        BOSS_FURY:    '#D50000',
        BOSS_HORN:    '#FFD54F',

        // Cenário
        BRICK:        '#D32F2F',
        QUESTION:     '#FFC107',
        USED:         '#757575',
        PIPE:         '#2E7D32',
        GROUND_TOP:   '#4CAF50',
        GROUND_BODY:  '#795548',
        CASTLE_TOP:   '#D32F2F',
        CASTLE_BODY:  '#3E2723',

        // Itens
        MUSHROOM:     '#E53935',
        FLOWER_1:     '#FF9800',
        FLOWER_2:     '#FFF59D',
        STAR:         '#FFD700',
        FIREBALL:     '#FF3D00',

        // Efeitos
        PARTICLE_W:   '#FFFFFF',
        PARTICLE_Y:   '#FFD700',
        PARTICLE_R:   '#FF5722',
    },

    /* ========================================================
       TEMAS DAS FASES
    ======================================================== */
    THEMES: {
        overworld: {
            bgTop:    '#1A237E',
            bgBottom: '#64B5F6',
            ground:   '#4CAF50',
            groundBody:'#795548',
            pipe:     '#2E7D32',
        },
        underground: {
            bgTop:    '#000000',
            bgBottom: '#212121',
            ground:   '#37474F',
            groundBody:'#263238',
            pipe:     '#1B5E20',
        },
        castle: {
            bgTop:    '#210000',
            bgBottom: '#420000',
            ground:   '#D32F2F',
            groundBody:'#3E2723',
            pipe:     '#2E7D32',
        },
        sky: {
            bgTop:    '#0288D1',
            bgBottom: '#B3E5FC',
            ground:   '#FFFFFF',
            groundBody:'#B0BEC5',
            pipe:     '#4CAF50',
        },
    },
};

// Congela para evitar mutação acidental
Object.freeze(CONFIG);
Object.freeze(CONFIG.CANVAS);
Object.freeze(CONFIG.PLAYER);
Object.freeze(CONFIG.ENEMY);
Object.freeze(CONFIG.ITEM);
Object.freeze(CONFIG.SCORE);
Object.freeze(CONFIG.CAMERA);
Object.freeze(CONFIG.GAME);
Object.freeze(CONFIG.AUDIO);
Object.freeze(CONFIG.COLORS);
Object.freeze(CONFIG.THEMES);

// Exporta para escopo global (usado pelos outros scripts)
window.CONFIG = CONFIG;