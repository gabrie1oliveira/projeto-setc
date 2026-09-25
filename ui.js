/**
 * ============================================================
 * UI.JS
 * ------------------------------------------------------------
 * Atualiza o DOM (HUD overlay) e desenha elementos de UI no
 * canvas (barra de tempo, indicador de power-up, mensagens).
 *
 * Responsável por:
 *   - Score, moedas, vidas, tempo, nível
 *   - Indicador de power-up (SMALL / SUPER / FIRE)
 *   - Mensagens de overlay
 * ============================================================
 */
"use strict";

const UI = {

    /* Cache de elementos DOM */
    els: {},
    lastValues: {},

    /* ========================================================
       INICIALIZAÇÃO
    ======================================================== */

    init() {
        this.els = {
            score:   document.getElementById('score-display'),
            coins:   document.getElementById('coins-display'),
            lives:   document.getElementById('lives-display'),
            time:    document.getElementById('time-display'),
            level:   document.getElementById('level-display'),
            power:   document.getElementById('power-display'),
            powerIndicator: document.getElementById('power-indicator'),
            overlay: document.getElementById('overlay-message'),
            overlayContent: document.getElementById('overlay-content'),
        };
    },

    /* ========================================================
       HUD PRINCIPAL
    ======================================================== */

    /**
     * Atualiza o HUD inteiro.
     * @param {object} data { score, coins, lives, time, level, power }
     */
    update(data) {
        if (!this.els.score) return;

        /* Score */
        if (data.score !== this.lastValues.score) {
            this.els.score.textContent = Utils.pad(data.score, 6);
            this.lastValues.score = data.score;
            this.pulse(this.els.score);
        }

        /* Coins */
        if (data.coins !== this.lastValues.coins) {
            this.els.coins.textContent = `x${Utils.pad(data.coins, 2)}`;
            this.lastValues.coins = data.coins;
            this.pulse(this.els.coins);
        }

        /* Lives */
        if (data.lives !== this.lastValues.lives) {
            this.els.lives.textContent = `x${data.lives}`;
            this.lastValues.lives = data.lives;
            this.pulse(this.els.lives);
        }

        /* Time */
        const timeInt = Math.max(0, Math.floor(data.time));
        if (timeInt !== this.lastValues.time) {
            this.els.time.textContent = Utils.pad(timeInt, 3);
            this.lastValues.time = timeInt;

            /* Piscar quando tempo baixo */
            if (timeInt <= 30 && timeInt > 0) {
                this.els.time.style.color = '#FF2A6D';
                this.els.time.style.textShadow = '2px 2px 0 #000, 0 0 15px #FF2A6D';
            } else {
                this.els.time.style.color = '';
                this.els.time.style.textShadow = '';
            }
        }

        /* Level */
        if (data.level !== this.lastValues.level) {
            this.els.level.textContent = data.level;
            this.lastValues.level = data.level;
        }

        /* Power */
        if (data.power !== this.lastValues.power) {
            this.updatePower(data.power);
            this.lastValues.power = data.power;
        }
    },

    updatePower(power) {
        const labels = {
            small: 'SMALL',
            super: 'SUPER',
            fire:  'FIRE',
        };

        this.els.power.textContent = labels[power] || 'SMALL';

        /* Classes para cor */
        if (this.els.powerIndicator) {
            this.els.powerIndicator.classList.remove('super', 'fire');
            if (power === 'super') this.els.powerIndicator.classList.add('super');
            if (power === 'fire')  this.els.powerIndicator.classList.add('fire');
        }
    },

    /* ========================================================
       PULSE (anima número ao mudar)
    ======================================================== */

    pulse(el) {
        if (!el) return;
        el.style.transform = 'scale(1.3)';
        el.style.transition = 'transform 0.1s';
        setTimeout(() => {
            el.style.transform = 'scale(1)';
        }, 100);
    },

    /* ========================================================
       OVERLAY
    ======================================================== */

    showOverlay(html, duration = 0) {
        if (!this.els.overlay) return;

        this.els.overlayContent.innerHTML = html;
        this.els.overlay.classList.remove('hidden');

        if (duration > 0) {
            setTimeout(() => this.hideOverlay(), duration * 1000);
        }
    },

    hideOverlay() {
        if (!this.els.overlay) return;
        this.els.overlay.classList.add('hidden');
    },

    /* ========================================================
       MENSAGENS DE CANVAS
    ======================================================== */

    drawBanner(ctx, text, subtext, alpha, color = '#FFD700') {
        if (alpha <= 0) return;

        const w = CONFIG.CANVAS.WIDTH;
        const h = CONFIG.CANVAS.HEIGHT;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.textAlign = 'center';

        /* Fundo semitransparente */
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(0, h / 2 - 60, w, 120);

        /* Borda */
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(0, h / 2 - 60, w, 120);

        /* Texto principal */
        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.fillStyle = color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
        ctx.fillText(text, w / 2, h / 2);
        ctx.shadowBlur = 0;

        /* Subtítulo */
        if (subtext) {
            ctx.font = '10px "Press Start 2P", monospace';
            ctx.fillStyle = '#FFF';
            ctx.fillText(subtext, w / 2, h / 2 + 30);
        }

        ctx.restore();
    },

    drawTimeWarning(ctx, timeLeft) {
        if (timeLeft > 30) return;

        const pulse = 0.3 + 0.3 * Math.sin(Date.now() / 150);
        const w = CONFIG.CANVAS.WIDTH;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = '#FF0000';
        ctx.font = 'bold 14px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('⚠ TEMPO ⚠', w / 2, 60);
        ctx.restore();
        ctx.textAlign = 'left';
    },

    drawCombo(ctx, combo, x, y) {
        if (combo < 2) return;
        const w = CONFIG.CANVAS.WIDTH;

        ctx.save();
        ctx.textAlign = 'right';
        ctx.font = 'bold 16px "Press Start 2P", monospace';

        const color = combo >= 5 ? '#FF2A6D' : '#FFD700';
        ctx.fillStyle = color;
        ctx.shadowBlur = 12;
        ctx.shadowColor = color;
        ctx.fillText(`COMBO x${combo}`, w - 20, 80);

        ctx.restore();
        ctx.textAlign = 'left';
    },

    drawFpsCounter(ctx, fps) {
        if (!window.DEBUG) return;

        ctx.save();
        ctx.font = '9px monospace';
        ctx.fillStyle = '#0F0';
        ctx.fillText(`FPS: ${fps}`, 10, CONFIG.CANVAS.HEIGHT - 10);
        ctx.restore();
    },

    /* ========================================================
       HELPERS DE HUD
    ======================================================== */

    setLives(n) {
        this.lastValues.lives = -1;
        if (this.els.lives) this.els.lives.textContent = `x${n}`;
    },

    getLives() {
        return this.lastValues.lives ?? 3;
    },

    reset() {
        this.lastValues = {};
        if (this.els.score) this.els.score.textContent = '000000';
        if (this.els.coins) this.els.coins.textContent = 'x00';
        if (this.els.lives) this.els.lives.textContent = 'x3';
        if (this.els.time)  this.els.time.textContent = '400';
        if (this.els.level) this.els.level.textContent = '1-1';
        if (this.els.power) this.els.power.textContent = 'SMALL';
        if (this.els.powerIndicator) {
            this.els.powerIndicator.classList.remove('super', 'fire');
        }
        this.hideOverlay();
    },
};

window.UI = UI;