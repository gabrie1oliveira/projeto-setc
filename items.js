/**
 * ============================================================
 * ITEMS.JS — Power-ups funcionais
 * ============================================================
 */
"use strict";

class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.type = type;
        this.collected = false;
        this.active = true;

        /* Subida do bloco */
        this.riseTimer = 0.5;
        this.isRising = true;

        /* Física */
        this.vx = 0;
        this.vy = 0;
        this.gravity = 0;

        if (type === 'mushroom') {
            this.vx = 1.5;
            this.gravity = 0.4;
        } else if (type === 'star') {
            this.vx = 2.0;
            this.gravity = 0.4;
            this.vy = -4;
        }
        /* fireflower: vx = 0, gravity = 0 (fica parada) */

        this.animTimer = 0;
    }

    update(dt, levelData) {
        if (this.collected || !this.active) return;

        this.animTimer += dt;

        /* Subindo do bloco */
        if (this.isRising) {
            this.y -= 40 * dt;
            this.riseTimer -= dt;
            if (this.riseTimer <= 0) this.isRising = false;
            return;
        }

        /* Fireflower não se move */
        if (this.type === 'fireflower' || this.type === 'coin') return;

        /* Movimento horizontal */
        this.x += this.vx;

        /* Colisão com tubos */
        for (const p of levelData.pipes) {
            const r = { x: p.x, y: p.y, width: p.width, height: p.height ?? 96 };
            if (Utils.aabb(this, r)) {
                if (this.vx > 0) this.x = r.x - this.width;
                else this.x = r.x + r.width;
                this.vx *= -1;
            }
        }

        /* Colisão com plataformas (lateral) */
        for (const p of levelData.platforms) {
            if (p.type === 'flagpole' || p.type === 'castle') continue;
            if (Utils.aabb(this, p)) {
                if (this.vx > 0) this.x = p.x - this.width;
                else this.x = p.x + p.width;
                this.vx *= -1;
            }
        }

        /* Gravidade */
        this.vy += this.gravity;
        if (this.vy > 10) this.vy = 10;
        this.y += this.vy;

        /* Colisão com o chão */
        const gy = levelData.groundY;
        const inGap = levelData.gaps.some(g =>
            this.x + this.width / 2 >= g.x &&
            this.x + this.width / 2 <= g.x + g.width
        );

        if (!inGap && this.y + this.height >= gy) {
            this.y = gy - this.height;
            this.vy = 0;
        }

        /* Colisão com topo de plataformas */
        for (const p of levelData.platforms) {
            if (p.type === 'flagpole' || p.type === 'castle') continue;
            if (!Utils.aabb(this, p)) continue;
            if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 8) {
                this.y = p.y - this.height;
                this.vy = 0;
            }
        }

        if (this.y > CONFIG.CANVAS.HEIGHT + 100) this.active = false;
    }

    draw(ctx, cameraX) {
        if (this.collected || !this.active) return;
        const sx = this.x - cameraX;

        /* Brilho */
        const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 6);
        ctx.save();
        ctx.globalAlpha = 0.4 * pulse;
        ctx.fillStyle = this.getGlowColor();
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 12, 18 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (this.type === 'mushroom') this.drawMushroom(ctx, sx);
        else if (this.type === 'fireflower') this.drawFireFlower(ctx, sx);
        else if (this.type === 'star') this.drawStar(ctx, sx);
        else if (this.type === 'coin') this.drawCoin(ctx, sx);
    }

    getGlowColor() {
        return {
            mushroom: '#FF5252',
            fireflower: '#FFB74D',
            star: '#FFD700',
            coin: '#FFEB3B',
        }[this.type] || '#FFFFFF';
    }

    drawMushroom(ctx, sx) {
        /* Talo */
        ctx.fillStyle = '#FFF8E1';
        ctx.fillRect(sx + 6, this.y + 14, 12, 10);

        /* Chapéu */
        ctx.fillStyle = '#E53935';
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 12, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(sx, this.y + 12, 24, 4);

        /* Bolinhas */
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sx + 7, this.y + 7, 2.5, 0, Math.PI * 2);
        ctx.arc(sx + 17, this.y + 7, 2.5, 0, Math.PI * 2);
        ctx.arc(sx + 12, this.y + 3, 2, 0, Math.PI * 2);
        ctx.fill();

        /* Olhos */
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 8, this.y + 17, 2, 3);
        ctx.fillRect(sx + 14, this.y + 17, 2, 3);
    }

    drawFireFlower(ctx, sx) {
        const t = this.animTimer * 4;
        /* Talo */
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(sx + 10, this.y + 14, 4, 10);
        /* Folhas */
        ctx.beginPath();
        ctx.ellipse(sx + 6, this.y + 18, 4, 2, -0.3, 0, Math.PI * 2);
        ctx.ellipse(sx + 18, this.y + 18, 4, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();

        /* Pétalas */
        const colors = ['#FF5722', '#FFB74D', '#FFEB3B'];
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI * 2 * i) / 6 + t;
            const px = sx + 12 + Math.cos(angle) * 7;
            const py = this.y + 9 + Math.sin(angle) * 7;
            ctx.fillStyle = colors[i % colors.length];
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        /* Centro */
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 9, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 9, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    drawStar(ctx, sx) {
        const t = this.animTimer * 3;
        const rotation = Math.sin(t) * 0.2;

        ctx.save();
        ctx.translate(sx + 12, this.y + 12);
        ctx.rotate(rotation);

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const a2 = (Math.PI * 2 * (i + 0.5)) / 5 - Math.PI / 2;
            const r1 = 12, r2 = 5;
            if (i === 0) ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
            else ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
            ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        }
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.fillRect(-4, -1, 2, 3);
        ctx.fillRect(2, -1, 2, 3);

        ctx.restore();
    }

    drawCoin(ctx, sx) {
        const t = this.animTimer * 4;
        const scaleX = Math.abs(Math.cos(t));
        ctx.save();
        ctx.translate(sx + 12, this.y + 12);
        ctx.scale(scaleX, 1);

        ctx.fillStyle = '#FFC107';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#F57F17';
        ctx.fillRect(-1, -5, 2, 10);

        ctx.restore();
    }
}

/* ============================================================
   FIREBALL
============================================================ */
class Fireball {
    constructor(x, y, vx, owner = 'player') {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.vx = vx;
        this.vy = 2;
        this.owner = owner;
        this.active = true;
        this.life = 3.0;
        this.animTimer = 0;
        this.rotation = 0;
        this.trailTimer = 0;
    }

    update(dt, levelData) {
        if (!this.active) return;
        this.animTimer += dt;
        this.rotation += dt * 15;
        this.life -= dt;
        if (this.life <= 0) { this.active = false; return; }

        if (this.owner === 'player') this.vy += 0.4;
        this.x += this.vx;
        this.y += this.vy;

        if (this.y + this.height >= levelData.groundY) {
            this.y = levelData.groundY - this.height;
            this.vy = this.owner === 'player' ? -4 : 0;
        }

        if (this.owner === 'player') {
            for (const p of levelData.platforms) {
                if (p.type === 'flagpole') continue;
                if (Utils.aabb(this, p)) {
                    if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 4) {
                        this.y = p.y - this.height;
                        this.vy = -4;
                    } else if (this.vy < 0) { this.active = false; return; }
                    else { this.active = false; return; }
                }
            }

            for (const p of levelData.pipes) {
                const r = { x: p.x, y: p.y, width: p.width, height: p.height ?? 96 };
                if (Utils.aabb(this, r)) { this.active = false; return; }
            }

            this.trailTimer += dt;
            if (this.trailTimer > 0.03) {
                this.trailTimer = 0;
                EffectsManager.emitFireTrail(this.x + 5, this.y + 5);
            }
        }

        if (this.x < -50 || this.x > levelData.length + 50 ||
            this.y > CONFIG.CANVAS.HEIGHT + 100) {
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;

        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#FF6D00';
        ctx.beginPath();
        ctx.arc(sx + 5, this.y + 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.translate(sx + 5, this.y + 5);
        ctx.rotate(this.rotation);

        ctx.fillStyle = '#FF3D00';
        ctx.beginPath();
        ctx.arc(0, 0, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
}

class BossFireball {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.width = 16;
        this.height = 16;
        this.vx = vx;
        this.vy = vy;
        this.active = true;
        this.life = 4.0;
        this.animTimer = 0;
        this.trailTimer = 0;
        this.startX = x;
    }

    update(dt, levelData) {
        if (!this.active) return;
        this.animTimer += dt;
        this.life -= dt;
        if (this.life <= 0) { this.active = false; return; }

        this.x += this.vx;
        this.y += this.vy;

        this.trailTimer += dt;
        if (this.trailTimer > 0.04) {
            this.trailTimer = 0;
            EffectsManager.particles.push(new Particle(this.x + 8, this.y + 8, {
                vx: Utils.random(-0.5, 0.5),
                vy: Utils.random(-0.5, 0.5),
                gravity: 0,
                size: Utils.random(3, 5),
                color: Utils.pick(['#FF3D00', '#FF9100', '#FFC107']),
                shape: 'circle',
                life: 0.5,
                decay: 0.06,
            }));
        }

        if (Math.abs(this.x - this.startX) > 800) this.active = false;
        if (this.y > CONFIG.CANVAS.HEIGHT + 100) this.active = false;
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;
        const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 12);

        ctx.save();
        ctx.globalAlpha = 0.4 + 0.3 * pulse;
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 12 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#D50000';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FF9100';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

window.Item = Item;
window.Fireball = Fireball;
window.BossFireball = BossFireball;