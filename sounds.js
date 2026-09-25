/**
 * ============================================================
 * SOUNDS.JS
 * ------------------------------------------------------------
 * Sintetizador de áudio retrô usando Web Audio API.
 * Nenhum arquivo .mp3/.wav é necessário — todos os sons são
 * gerados matematicamente (oscillators + envelopes).
 * ============================================================
 */
"use strict";

const SoundManager = {

    /* ========================================================
       ESTADO
    ======================================================== */
    ctx: null,
    masterGain: null,
    isMuted: false,
    musicPlaying: false,
    musicTimer: null,
    musicStep: 0,

    /* ========================================================
       INICIALIZAÇÃO
    ======================================================== */

    /**
     * Inicializa o AudioContext. Deve ser chamado após
     * interação do usuário (política dos navegadores).
     */
    init() {
        if (this.ctx) return;

        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) {
            console.warn('[SoundManager] Web Audio API não suportada.');
            return;
        }

        this.ctx = new AudioCtx();

        // Gain mestre para controle de volume global
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = CONFIG.AUDIO.MASTER_VOLUME;
        this.masterGain.connect(this.ctx.destination);
    },

    /** Retoma o contexto (após suspensão do navegador). */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    },

    /** Alterna mudo/ativo. */
    toggleMute() {
        this.isMuted = !this.isMuted;
        return this.isMuted;
    },

    /** Define volume mestre (0..1). */
    setVolume(v) {
        CONFIG.AUDIO.MASTER_VOLUME = Utils.clamp(v, 0, 1);
        if (this.masterGain) {
            this.masterGain.gain.value = CONFIG.AUDIO.MASTER_VOLUME;
        }
    },

    /* ========================================================
       MOTOR DE TOM BÁSICO
    ======================================================== */

    /**
     * Toca um tom simples.
     * @param {number} freq     Frequência em Hz
     * @param {string} type     'sine' | 'square' | 'sawtooth' | 'triangle'
     * @param {number} duration Duração em segundos
     * @param {number} volume   Volume relativo (0..1)
     * @param {number} when     Atraso em segundos (agendamento)
     */
    tone(freq, type = 'square', duration = 0.1, volume = 0.08, when = 0) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const t0 = this.ctx.currentTime + when;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);

        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t0);
        osc.stop(t0 + duration);
    },

    /**
     * Tom com deslize de frequência (glissando).
     */
    sweep(freqStart, freqEnd, type = 'square', duration = 0.15, volume = 0.08, when = 0) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;

        const t0 = this.ctx.currentTime + when;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freqStart, t0);
        osc.frequency.exponentialRampToValueAtTime(
            Math.max(1, freqEnd),
            t0 + duration
        );

        gain.gain.setValueAtTime(volume, t0);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t0);
        osc.stop(t0 + duration);
    },

    /* ========================================================
       EFEITOS ESPECÍFICOS DO JOGO
    ======================================================== */

    playJump() {
        this.sweep(300, 650, 'square', 0.14, 0.07);
    },

    playBigJump() {
        this.sweep(280, 720, 'square', 0.18, 0.09);
    },

    playStomp() {
        this.sweep(200, 60, 'sawtooth', 0.12, 0.12);
    },

    playCoin() {
        this.tone(987.77, 'sine', 0.07, 0.10);
        this.tone(1318.51, 'sine', 0.18, 0.10, 0.06);
    },

    playPowerUp() {
        const notes = [330, 392, 659, 523, 587, 784];
        notes.forEach((f, i) => {
            this.tone(f, 'square', 0.09, 0.07, i * 0.05);
        });
    },

    playPowerDown() {
        const notes = [784, 587, 523, 659, 392, 330];
        notes.forEach((f, i) => {
            this.tone(f, 'square', 0.09, 0.07, i * 0.05);
        });
    },

    playFireball() {
        this.sweep(700, 200, 'triangle', 0.10, 0.06);
    },

    playHit() {
        this.sweep(180, 50, 'sawtooth', 0.25, 0.13);
    },

    playEnemyHit() {
        this.tone(400, 'square', 0.06, 0.08);
        this.tone(200, 'square', 0.08, 0.08, 0.06);
    },

    playBossHit() {
        this.sweep(300, 120, 'sawtooth', 0.18, 0.14);
        this.tone(80, 'square', 0.22, 0.10, 0.10);
    },

    playBossRoar() {
        for (let i = 0; i < 4; i++) {
            this.tone(60 + i * 10, 'sawtooth', 0.35, 0.10, i * 0.08);
        }
    },

    playStageClear() {
        const notes = [261, 329, 392, 523, 659, 784, 1047];
        notes.forEach((f, i) => {
            this.tone(f, 'triangle', 0.16, 0.09, i * 0.11);
        });
    },

    playGameOver() {
        const notes = [392, 370, 349, 330, 262];
        notes.forEach((f, i) => {
            this.tone(f, 'triangle', 0.28, 0.10, i * 0.20);
        });
    },

    playVictory() {
        const notes = [
            523, 523, 523, 523, 415, 466, 523,
            466, 523,
        ];
        notes.forEach((f, i) => {
            this.tone(f, 'square', 0.16, 0.09, i * 0.16);
        });
    },

    playMenuSelect() {
        this.tone(660, 'square', 0.06, 0.06);
    },

    playMenuConfirm() {
        this.tone(523, 'square', 0.06, 0.07);
        this.tone(784, 'square', 0.10, 0.07, 0.06);
    },

    play1UP() {
        const notes = [659, 784, 1047, 1319];
        notes.forEach((f, i) => {
            this.tone(f, 'square', 0.10, 0.08, i * 0.08);
        });
    },

    /* ========================================================
       MÚSICA DE FUNDO (loop procedural)
    ======================================================== */

    /**
     * Toca a música tema em loop.
     * Usa setInterval para agendar as notas.
     */
    startMusic(theme = 'overworld') {
        if (this.isMuted || this.musicPlaying) return;
        this.init();
        if (!this.ctx) return;

        this.musicPlaying = true;
        this.musicStep = 0;

        // Melodias por tema (notas em Hz, 0 = pausa)
        const melodies = {
            overworld: [
                659, 659, 0, 659, 0, 523, 659, 0,
                784, 0, 0, 0, 392, 0, 0, 0,
            ],
            underground: [
                262, 0, 262, 0, 196, 0, 262, 0,
                330, 0, 0, 0, 262, 0, 0, 0,
            ],
            castle: [
                196, 196, 196, 0, 165, 0, 196, 0,
                165, 0, 0, 0, 147, 0, 0, 0,
            ],
        };

        const melody = melodies[theme] || melodies.overworld;
        const tempo = 180; // ms por passo

        this.musicTimer = setInterval(() => {
            if (!this.musicPlaying || this.isMuted) return;
            const note = melody[this.musicStep % melody.length];
            if (note > 0) {
                this.tone(note, 'square', 0.14, 0.028);
                // Baixo uma oitava abaixo
                this.tone(note / 2, 'triangle', 0.20, 0.020);
            }
            this.musicStep++;
        }, tempo);
    },

    stopMusic() {
        this.musicPlaying = false;
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    },

    /** Pausa a música (mantém estado para retomar). */
    pauseMusic() {
        if (this.musicTimer) {
            clearInterval(this.musicTimer);
            this.musicTimer = null;
        }
    },

    /** Retoma a música se estava tocando. */
    resumeMusic() {
        if (this.musicPlaying && !this.musicTimer) {
            // Reagenda
            const theme = 'overworld';
            const saved = this.musicPlaying;
            this.musicPlaying = false;
            if (saved) this.startMusic(theme);
        }
    },
};

window.SoundManager = SoundManager;