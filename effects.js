/**
 * ============================================================
 * EFFECTS.JS
 * ------------------------------------------------------------
 * Sistema de efeitos visuais:
 *   - Partículas (poeira, faíscas, moedas)
 *   - Textos flutuantes ("+200", "1UP")
 *   - Screen shake (tremor de tela)
 *   - Flash de tela (dano)
 *   - Vinheta de transição
 * ============================================================
 */
"use strict";

/* ============================================================
   PARTÍCULA INDIVIDUAL
============================================================ */
class Particle {
    constructor(x, y, opts = {}) {
        this.x = x;
        this.y = y;

        this.vx = opts.vx ?? Utils.random(-2, 2);
        this.vy = opts.vy ?? Utils.random(-3, 1);

        this.gravity = opts.gravity ?? 0.2;
        this.friction = opts.friction ?? 0.98;

        this.size = opts.size ?? 3;
        this.color = opts.color ?? '#FFFFFF';
        this.life = opts.life ?? 1.0;
        this.decay = opts.decay ?? 0.025;
        this.shape = opts.shape ?? 'square'; // 'square' | 'circle' | 'star'
        this.rotation = opts.rotation ?? 0;
        this.rotationSpeed = opts.rotationSpeed ?? 0;

        this.active = true;
    }

    update(dt) {
        this.vy += this.gravity;
        this.vx *= this.friction;
        this.vy *= this.friction;

        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotationSpeed;

        this.life -= this.decay;
        if (this.life <= 0) {
            this.life = 0;
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        if (!this.active) return;

        const sx = this.x - cameraX;
        ctx.globalAlpha = Math.max(0, this.life);

        ctx.save();
        ctx.translate(sx + this.size / 2, this.y + this.size / 2);
        ctx.rotate(this.rotation);

        if (this.shape === 'circle') {
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.shape === 'star') {
            this.drawStar(ctx, 0, 0, 5, this.size / 2, this.size / 4);
        } else {
            ctx.fillStyle = this.color;
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
        }

        ctx.restore();
        ctx.globalAlpha = 1.0;
    }

    drawStar(ctx, cx, cy, spikes, outerR, innerR) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        let rot = Math.PI / 2 * 3;
        const step = Math.PI / spikes;
        ctx.moveTo(cx, cy - outerR);
        for (let i = 0; i < spikes; i++) {
            ctx.lineTo(
                cx + Math.cos(rot) * outerR,
                cy + Math.sin(rot) * outerR
            );
            rot += step;
            ctx.lineTo(
                cx + Math.cos(rot) * innerR,
                cy + Math.sin(rot) * innerR
            );
            rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
        ctx.fill();
    }
}

/* ============================================================
   TEXTO FLUTUANTE
============================================================ */
class FloatingText {
    constructor(x, y, text, opts = {}) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = opts.color ?? '#FFD700';
        this.size = opts.size ?? 12;
        this.font = opts.font ?? 'Press Start 2P, monospace';
        this.vy = opts.vy ?? -0.8;
        this.life = opts.life ?? 1.0;
        this.decay = opts.decay ?? 0.018;
        this.active = true;
    }

    update() {
        this.y += this.vy;
        this.vy *= 0.97;
        this.life -= this.decay;
        if (this.life <= 0) {
            this.life = 0;
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;

        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = `bold ${this.size}px ${this.font}`;
        ctx.textAlign = 'center';

        // Contorno preto
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';
        ctx.strokeText(this.text, sx, this.y);

        // Preenchimento
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, sx, this.y);

        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'left';
    }
}

/* ============================================================
   GERENCIADOR DE EFEITOS
============================================================ */
const EffectsManager = {

    particles: [],
    floatingTexts: [],
    screenShake: { x: 0, y: 0, intensity: 0 },
    flash: { alpha: 0, color: '#FFF', decay: 0.06 },
    vignette: { alpha: 0, decay: 0.04 },

    /* ========================================================
       PARTÍCULAS
    ======================================================== */

    /** Emite N partículas de poeira. */
    emitDust(x, y, count = 4, color = '#FFFFFF') {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, {
                vx: Utils.random(-2, 2),
                vy: Utils.random(-3, -0.5),
                gravity: 0.15,
                size: Utils.random(2, 4),
                color,
                life: 1.0,
                decay: 0.04,
            }));
        }
    },

    /** Emite faíscas coloridas (moeda, power-up). */
    emitSparkles(x, y, count = 8, color = '#FFD700') {
        for (let i = 0; i < count; i++) {
            const angle = (Math.PI * 2 * i) / count;
            const speed = Utils.random(2, 4);
            this.particles.push(new Particle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1,
                gravity: 0.1,
                size: Utils.random(2, 4),
                color,
                shape: 'star',
                life: 1.2,
                decay: 0.025,
                rotation: Math.random() * Math.PI,
                rotationSpeed: Utils.random(-0.2, 0.2),
            }));
        }
    },

    /** Emite explosão de inimigo derrotado. */
    emitExplosion(x, y, color = '#FF5722') {
        for (let i = 0; i < 14; i++) {
            this.particles.push(new Particle(x, y, {
                vx: Utils.random(-4, 4),
                vy: Utils.random(-5, 1),
                gravity: 0.25,
                size: Utils.random(3, 6),
                color,
                life: 1.0,
                decay: 0.035,
            }));
        }
    },

    /** Rastro de fogo da fireball. */
    emitFireTrail(x, y) {
        this.particles.push(new Particle(x, y, {
            vx: Utils.random(-0.5, 0.5),
            vy: Utils.random(-1, -0.2),
            gravity: -0.05,
            size: Utils.random(2, 4),
            color: Utils.pick(['#FF3D00', '#FF9100', '#FFC107']),
            shape: 'circle',
            life: 0.6,
            decay: 0.06,
        }));
    },

    /** Rastro de estrela (power-up). */
    emitStarTrail(x, y) {
        this.particles.push(new Particle(x, y, {
            vx: Utils.random(-0.8, 0.8),
            vy: Utils.random(-1.5, -0.3),
            gravity: 0.05,
            size: Utils.random(2, 5),
            color: Utils.pick(['#FFD700', '#FFFFFF', '#FFF59D']),
            shape: 'star',
            life: 0.8,
            decay: 0.04,
            rotationSpeed: Utils.random(-0.3, 0.3),
        }));
    },

    /** Confete da vitória. */
    emitConfetti(count = 60) {
        const colors = ['#E94560', '#FFD700', '#4CAF50', '#2196F3', '#9C27B0'];
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(
                Utils.random(0, CONFIG.CANVAS.WIDTH),
                Utils.random(-100, 0),
                {
                    vx: Utils.random(-1.5, 1.5),
                    vy: Utils.random(1, 3),
                    gravity: 0.08,
                    size: Utils.random(3, 6),
                    color: Utils.pick(colors),
                    life: 4.0,
                    decay: 0.008,
                    rotation: Math.random() * Math.PI,
                    rotationSpeed: Utils.random(-0.15, 0.15),
                }
            ));
        }
    },

    /* ========================================================
       TEXTOS FLUTUANTES
    ======================================================== */

    text(x, y, str, opts = {}) {
        this.floatingTexts.push(new FloatingText(x, y, str, opts));
    },

    textScore(x, y, score, color = '#FFD700') {
        this.text(x, y, `+${score}`, { color, size: 11 });
    },

    text1UP(x, y) {
        this.text(x, y, '1UP', { color: '#4CAF50', size: 12, life: 1.4 });
    },

    textCombo(x, y, combo) {
        this.text(x, y, `x${combo}`, { color: '#FF6B6B', size: 14, life: 1.2 });
    },

    /* ========================================================
       SCREEN SHAKE
    ======================================================== */

    shake(intensity = 6, duration = 0.25) {
        this.screenShake.intensity = Math.max(this.screenShake.intensity, intensity);
    },

    /* ========================================================
       FLASH / VINHETA
    ======================================================== */

    flashScreen(color = '#FFF', alpha = 0.5) {
        this.flash.color = color;
        this.flash.alpha = alpha;
    },

    vignetteRed(alpha = 0.4) {
        this.vignette.alpha = Math.max(this.vignette.alpha, alpha);
    },

    /* ========================================================
       UPDATE
    ======================================================== */

    update(dt) {
        // Partículas
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            if (!p.active) Utils.removeAt(this.particles, i);
        }

        // Textos
        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const t = this.floatingTexts[i];
            t.update(dt);
            if (!t.active) Utils.removeAt(this.floatingTexts, i);
        }

        // Screen shake
        if (this.screenShake.intensity > 0.1) {
            this.screenShake.x = Utils.random(-1, 1) * this.screenShake.intensity;
            this.screenShake.y = Utils.random(-1, 1) * this.screenShake.intensity;
            this.screenShake.intensity *= CONFIG.CAMERA.SHAKE_DECAY;
        } else {
            this.screenShake.x = 0;
            this.screenShake.y = 0;
            this.screenShake.intensity = 0;
        }

        // Flash
        if (this.flash.alpha > 0) {
            this.flash.alpha -= this.flash.decay;
            if (this.flash.alpha < 0) this.flash.alpha = 0;
        }

        // Vinheta
        if (this.vignette.alpha > 0) {
            this.vignette.alpha -= this.vignette.decay;
            if (this.vignette.alpha < 0) this.vignette.alpha = 0;
        }
    },

    /* ========================================================
       DRAW
    ======================================================== */

    /**
     * Desenha partículas e textos com offset de shake.
     * Deve ser chamado DEPOIS de entidades e ANTES do HUD.
     */
    draw(ctx, cameraX) {
        const shakeX = this.screenShake.x;
        const shakeY = this.screenShake.y;

        ctx.save();
        ctx.translate(shakeX, shakeY);

        // Partículas (atrás dos textos)
        for (const p of this.particles) p.draw(ctx, cameraX);

        // Textos flutuantes
        for (const t of this.floatingTexts) t.draw(ctx, cameraX);

        ctx.restore();
    },

    /**
     * Desenha flash e vinheta por cima de TUDO.
     */
    drawOverlay(ctx) {
        if (this.flash.alpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.flash.alpha;
            ctx.fillStyle = this.flash.color;
            ctx.fillRect(0, 0, CONFIG.CANVAS.WIDTH, CONFIG.CANVAS.HEIGHT);
            ctx.restore();
        }

        if (this.vignette.alpha > 0) {
            const w = CONFIG.CANVAS.WIDTH;
            const h = CONFIG.CANVAS.HEIGHT;
            const grad = ctx.createRadialGradient(
                w / 2, h / 2, h * 0.2,
                w / 2, h / 2, h * 0.9
            );
            grad.addColorStop(0, 'rgba(255,0,0,0)');
            grad.addColorStop(1, `rgba(255,0,0,${this.vignette.alpha})`);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);
        }
    },

    /** Limpa tudo (ao reiniciar fase). */
    clear() {
        this.particles.length = 0;
        this.floatingTexts.length = 0;
        this.screenShake.intensity = 0;
        this.flash.alpha = 0;
        this.vignette.alpha = 0;
    },

    /** Retorna offset atual de shake (para aplicar na câmera). */
    getShakeOffset() {
        return { x: this.screenShake.x, y: this.screenShake.y };
    },
};

window.Particle = Particle;
window.FloatingText = FloatingText;
window.EffectsManager = EffectsManager;