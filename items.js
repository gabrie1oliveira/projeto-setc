/**
 * ============================================================
 * ITEMS.JS
 * ------------------------------------------------------------
 * Power-ups colecionáveis e projéteis do jogo.
 *   - Mushroom     → cresce o jogador (small → super)
 *   - FireFlower   → dá poder de fogo (super → fire)
 *   - Star         → invencibilidade temporária
 *   - Fireball     → projétil do jogador (quica no chão)
 *   - BossFireball → projétil do chefão (voa reto, some ao sair da tela)
 * ============================================================
 */
"use strict";

/* ============================================================
   ITEM BASE (power-up)
============================================================ */
class Item {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.width = 24;
        this.height = 24;
        this.type = type;           // 'mushroom' | 'fireflower' | 'star' | 'coin'
        this.vx = 0;
        this.vy = 0;
        this.collected = false;
        this.active = true;
        this.spawnY = y;
        this.spawnTimer = 0.5;      // sobe do bloco antes de andar
        this.isRising = true;
        this.facing = 1;
        this.animTimer = 0;

        // Ajustes por tipo
        if (type === 'mushroom') {
            this.vx = CONFIG.ITEM.MUSHROOM_SPEED;
        } else if (type === 'star') {
            this.vx = CONFIG.ITEM.STAR_SPEED;
            this.vy = -3;   // pequeno pulo ao sair do bloco
        }

        // Estrela é afetada por gravidade
        this.gravity = type === 'star' ? 0.4 : 0;
    }

    update(dt, levelData) {
        if (this.collected || !this.active) return;

        this.animTimer += dt;

        // Fase de "subida" do bloco
        if (this.isRising) {
            this.y -= 40 * dt;
            this.spawnTimer -= dt;
            if (this.spawnTimer <= 0) {
                this.isRising = false;
            }
            return;
        }

        // Movimento horizontal
        if (this.type !== 'fireflower' && this.type !== 'coin') {
            this.x += this.vx;

            // Colisão com tubos (rebate)
            for (const p of levelData.pipes) {
                const pipeRect = this.getPipeRect(p);
                if (Utils.aabb(this, pipeRect)) {
                    if (this.vx > 0) this.x = pipeRect.x - this.width;
                    else this.x = pipeRect.x + pipeRect.width;
                    this.vx *= -1;
                    this.facing *= -1;
                }
            }

            // Colisão com plataformas (rebate)
            for (const p of levelData.platforms) {
                if (p.type === 'question' || p.type === 'brick' || p.type === 'used') {
                    if (Utils.aabb(this, p)) {
                        if (this.vx > 0) this.x = p.x - this.width;
                        else this.x = p.x + p.width;
                        this.vx *= -1;
                        this.facing *= -1;
                    }
                }
            }
        }

        // Gravidade (só estrela)
        if (this.gravity > 0) {
            this.vy += this.gravity;
            this.y += this.vy;

            // Colisão com chão
            if (this.y + this.height >= levelData.groundY) {
                this.y = levelData.groundY - this.height;
                this.vy = -6;   // quica
            }

            // Colisão com plataformas (pousa)
            for (const p of levelData.platforms) {
                if (p.type === 'question' || p.type === 'brick' || p.type === 'used') {
                    if (this.vy > 0 && Utils.aabb(this, p)) {
                        this.y = p.y - this.height;
                        this.vy = -5;
                    }
                }
            }
        }
    }

    getPipeRect(p) {
        return {
            x: p.x,
            y: p.y,
            width: p.width,
            height: p.height ?? 200,
        };
    }

    draw(ctx, cameraX) {
        if (this.collected || !this.active) return;
        const sx = this.x - cameraX;

        // Brilho pulsante ao redor
        const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 6);
        ctx.save();
        ctx.globalAlpha = 0.4 * pulse;
        ctx.fillStyle = this.getGlowColor();
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 12, 18 + pulse * 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        if (this.type === 'mushroom') {
            this.drawMushroom(ctx, sx);
        } else if (this.type === 'fireflower') {
            this.drawFireFlower(ctx, sx);
        } else if (this.type === 'star') {
            this.drawStar(ctx, sx);
        } else if (this.type === 'coin') {
            this.drawCoin(ctx, sx);
        }
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
        // Talo
        ctx.fillStyle = '#FFF8E1';
        ctx.fillRect(sx + 6, this.y + 14, 12, 10);

        // Chapéu vermelho
        ctx.fillStyle = '#E53935';
        ctx.beginPath();
        ctx.arc(sx + 12, this.y + 12, 12, Math.PI, 0);
        ctx.fill();
        ctx.fillRect(sx, this.y + 12, 24, 4);

        // Bolinhas brancas
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sx + 7, this.y + 7, 2.5, 0, Math.PI * 2);
        ctx.arc(sx + 17, this.y + 7, 2.5, 0, Math.PI * 2);
        ctx.arc(sx + 12, this.y + 3, 2, 0, Math.PI * 2);
        ctx.fill();

        // Olhos
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 8, this.y + 17, 2, 3);
        ctx.fillRect(sx + 14, this.y + 17, 2, 3);
    }

    drawFireFlower(ctx, sx) {
        const t = this.animTimer * 4;

        // Talo verde
        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(sx + 10, this.y + 14, 4, 10);

        // Folhas
        ctx.beginPath();
        ctx.ellipse(sx + 6, this.y + 18, 4, 2, -0.3, 0, Math.PI * 2);
        ctx.ellipse(sx + 18, this.y + 18, 4, 2, 0.3, 0, Math.PI * 2);
        ctx.fill();

        // Pétalas rotativas
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

        // Centro
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

        // Estrela amarela
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

        // Olhos
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

        // Moeda
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
   FIREBALL DO JOGADOR
============================================================ */
class Fireball {
    constructor(x, y, vx, owner = 'player') {
        this.x = x;
        this.y = y;
        this.width = 10;
        this.height = 10;
        this.vx = vx;
        this.vy = 2;
        this.owner = owner;         // 'player' | 'boss'
        this.active = true;
        this.life = CONFIG.ITEM.FIREBALL_LIFETIME;
        this.animTimer = 0;
        this.rotation = 0;
        this.trailTimer = 0;
    }

    update(dt, levelData) {
        if (!this.active) return;

        this.animTimer += dt;
        this.rotation += dt * 15;
        this.life -= dt;
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        // Física: jogador quica no chão, boss voa reto
        if (this.owner === 'player') {
            this.vy += CONFIG.ITEM.FIREBALL_GRAVITY;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Colisão com chão
        if (this.y + this.height >= levelData.groundY) {
            this.y = levelData.groundY - this.height;
            this.vy = this.owner === 'player'
                ? CONFIG.ITEM.FIREBALL_BOUNCE
                : 0;
        }

        // Colisão com plataformas (jogador)
        if (this.owner === 'player') {
            for (const p of levelData.platforms) {
                if (p.type === 'flagpole') continue;
                if (Utils.aabb(this, p)) {
                    // Vindo de cima → quica
                    if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 4) {
                        this.y = p.y - this.height;
                        this.vy = CONFIG.ITEM.FIREBALL_BOUNCE;
                    }
                    // Vindo de baixo → some
                    else if (this.vy < 0) {
                        this.active = false;
                        return;
                    }
                    // Vindo de lado → some
                    else {
                        this.active = false;
                        return;
                    }
                }
            }

            // Colisão com tubos
            for (const p of levelData.pipes) {
                const pipeRect = {
                    x: p.x, y: p.y,
                    width: p.width,
                    height: p.height ?? 200,
                };
                if (Utils.aabb(this, pipeRect)) {
                    this.active = false;
                    return;
                }
            }

            // Rastro
            this.trailTimer += dt;
            if (this.trailTimer > 0.03) {
                this.trailTimer = 0;
                EffectsManager.emitFireTrail(this.x + 5, this.y + 5);
            }
        }

        // Fora da tela
        if (
            this.x < -50 ||
            this.x > levelData.length + 50 ||
            this.y > CONFIG.CANVAS.HEIGHT + 100
        ) {
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;

        // Aura externa
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#FF6D00';
        ctx.beginPath();
        ctx.arc(sx + 5, this.y + 5, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Núcleo rotativo
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

/* ============================================================
   BOSS FIREBALL (projétil maior, voa reto)
============================================================ */
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
        if (this.life <= 0) {
            this.active = false;
            return;
        }

        this.x += this.vx;
        this.y += this.vy;

        // Rastro
        this.trailTimer += dt;
        if (this.trailTimer > 0.04) {
            this.trailTimer = 0;
            EffectsManager.particles.push(
                new Particle(this.x + 8, this.y + 8, {
                    vx: Utils.random(-0.5, 0.5),
                    vy: Utils.random(-0.5, 0.5),
                    gravity: 0,
                    size: Utils.random(3, 5),
                    color: Utils.pick(['#FF3D00', '#FF9100', '#FFC107']),
                    shape: 'circle',
                    life: 0.5,
                    decay: 0.06,
                })
            );
        }

        // Saiu muito longe
        if (Math.abs(this.x - this.startX) > 800) {
            this.active = false;
        }
        if (this.y > CONFIG.CANVAS.HEIGHT + 100) {
            this.active = false;
        }
    }

    draw(ctx, cameraX) {
        if (!this.active) return;
        const sx = this.x - cameraX;
        const pulse = 0.5 + 0.5 * Math.sin(this.animTimer * 12);

        // Aura
        ctx.save();
        ctx.globalAlpha = 0.4 + 0.3 * pulse;
        ctx.fillStyle = '#FF5722';
        ctx.beginPath();
        ctx.arc(sx + 8, this.y + 8, 12 + pulse * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Núcleo
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