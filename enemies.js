/**
 * ============================================================
 * ENEMIES.JS
 * ------------------------------------------------------------
 * Inimigos com IA simples:
 *   - Goomba  → anda de um lado pro outro, morre em 1 stomp
 *   - Koopa   → vira casco quando pisado, casco desliza e mata
 *   - Flying  → flutua em onda senoidal, morre em 1 stomp
 *
 * Todos têm: patrulhamento por minX/maxX, gravidade opcional,
 * sprite desenhado, colisão com tubos.
 * ============================================================
 */
"use strict";

class Enemy {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} minX    Limite esquerdo do patrulhamento
     * @param {number} maxX    Limite direito
     * @param {string} type    'goomba' | 'koopa' | 'flying'
     */
    constructor(x, y, minX, maxX, type = 'goomba') {
        this.x = x;
        this.y = y;
        this.minX = minX;
        this.maxX = maxX;
        this.type = type;

        /* Dimensões */
        if (type === 'koopa') {
            this.width = 24;
            this.height = 32;
        } else {
            this.width = 24;
            this.height = 24;
        }

        /* Física */
        const speed = type === 'koopa'
            ? CONFIG.ENEMY.KOOPA_SPEED
            : CONFIG.ENEMY.GOOMBA_SPEED;
        this.vx = -speed;
        this.vy = 0;
        this.gravity = type === 'flying' ? 0 : CONFIG.CANVAS.GRAVITY * 0.8;
        this.facingRight = false;

        /* Estado */
        this.isAlive = true;
        this.isShell = false;
        this.isShellMoving = false;
        this.hp = 1;
        this.stomped = false;
        this.stompTimer = 0;      // tempo antes de desaparecer após stomp

        /* Flying */
        this.startY = y;
        this.flyPhase = Math.random() * Math.PI * 2;

        /* Animação */
        this.animTimer = 0;
        this.animFrame = 0;

        /* Dano por casco */
        this.shellKillsLeft = 0;
    }

    /* ========================================================
       UPDATE
    ======================================================== */

    update(dt, levelData) {
        if (!this.isAlive) return;

        /* Já pisado, esperando desaparecer */
        if (this.stomped) {
            this.stompTimer -= dt;
            if (this.stompTimer <= 0) this.isAlive = false;
            return;
        }

        this.animTimer += dt;

        /* Flying: flutua */
        if (this.type === 'flying') {
            this.flyPhase += dt * 3;
            this.x += this.vx;
            this.y = this.startY + Math.sin(this.flyPhase) * CONFIG.ENEMY.FLYING_AMPLITUDE;
            this.checkPatrolBounds();
            this.animFrame = Math.floor(this.animTimer * 6) % 2;
            return;
        }

        /* Gravidade */
        this.vy += this.gravity;
        if (this.vy > 12) this.vy = 12;

        /* Movimento horizontal */
        this.x += this.vx;
        this.checkPatrolBounds();
        this.checkPipeCollisions(levelData);
        this.checkPlatformCollisions(levelData);

        /* Gravidade vertical */
        this.y += this.vy;
        this.checkGroundCollision(levelData);

        /* Animação */
        if (this.animTimer > 0.15) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 2;
        }

        /* Casco em movimento: efeito de rastro */
        if (this.isShellMoving && Math.random() < 0.3) {
            EffectsManager.particles.push(new Particle(
                this.x + this.width / 2,
                this.y + this.height,
                {
                    vx: Utils.random(-1, 1),
                    vy: Utils.random(-2, -0.5),
                    gravity: 0.15,
                    size: 3,
                    color: '#FFFFFF',
                    life: 0.4,
                    decay: 0.08,
                }
            ));
        }
    }

    checkPatrolBounds() {
        if (this.vx < 0 && this.x <= this.minX) {
            this.x = this.minX;
            this.vx = Math.abs(this.vx);
            this.facingRight = true;
        } else if (this.vx > 0 && this.x + this.width >= this.maxX) {
            this.x = this.maxX - this.width;
            this.vx = -Math.abs(this.vx);
            this.facingRight = false;
        }
    }

    checkPipeCollisions(levelData) {
        /* Só rebate se estiver no chão (não no ar) */
        for (const p of levelData.pipes) {
            const pipeRect = {
                x: p.x, y: p.y,
                width: p.width,
                height: p.height ?? 200,
            };
            if (!Utils.aabb(this, pipeRect)) continue;

            /* Descobre se veio de lado */
            const overlapLeft = (this.x + this.width) - pipeRect.x;
            const overlapRight = (pipeRect.x + pipeRect.width) - this.x;

            if (overlapLeft < overlapRight && this.vx > 0) {
                this.x = pipeRect.x - this.width;
                this.vx = -Math.abs(this.vx);
            } else if (this.vx < 0) {
                this.x = pipeRect.x + pipeRect.width;
                this.vx = Math.abs(this.vx);
            }
            this.facingRight = this.vx > 0;
        }
    }

    checkPlatformCollisions(levelData) {
        for (const p of levelData.platforms) {
            if (p.type === 'flagpole') continue;
            if (!Utils.aabb(this, p)) continue;

            const overlapLeft = (this.x + this.width) - p.x;
            const overlapRight = (p.x + p.width) - this.x;

            if (overlapLeft < overlapRight && this.vx > 0) {
                this.x = p.x - this.width;
                this.vx = -Math.abs(this.vx);
            } else if (this.vx < 0) {
                this.x = p.x + p.width;
                this.vx = Math.abs(this.vx);
            }
            this.facingRight = this.vx > 0;
        }
    }

    checkGroundCollision(levelData) {
        /* Chão */
        if (this.y + this.height >= levelData.groundY) {
            const inGap = levelData.gaps.some(g =>
                this.x + this.width / 2 >= g.x &&
                this.x + this.width / 2 <= g.x + g.width
            );
            if (!inGap) {
                this.y = levelData.groundY - this.height;
                this.vy = 0;
            }
        }

        /* Plataformas */
        for (const p of levelData.platforms) {
            if (p.type === 'flagpole') continue;
            if (!Utils.aabb(this, p)) continue;
            if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 8) {
                this.y = p.y - this.height;
                this.vy = 0;
            }
        }

        /* Caindo no buraco → morre */
        if (this.y > CONFIG.CANVAS.HEIGHT + 100) {
            this.isAlive = false;
        }
    }

    /* ========================================================
       INTERAÇÃO COM O JOGADOR
    ======================================================== */

    /**
     * Pisado pelo jogador.
     * @returns {object} { killed, shell, score }
     */
    stomp() {
        /* Goomba/Flying: morre direto */
        if (this.type !== 'koopa') {
            this.stomped = true;
            this.stompTimer = 0.4;
            EffectsManager.emitExplosion(
                this.x + this.width / 2,
                this.y + this.height / 2,
                this.type === 'flying' ? '#B39DDB' : '#8D6E63'
            );
            SoundManager.playStomp();
            return { killed: true, shell: false, score: CONFIG.SCORE.ENEMY };
        }

        /* Koopa: vira casco */
        if (!this.isShell) {
            this.isShell = true;
            this.isShellMoving = false;
            this.vx = 0;
            this.height = 20;
            this.y += 12;
            SoundManager.playStomp();
            EffectsManager.emitSparkles(
                this.x + this.width / 2,
                this.y + this.height / 2,
                6,
                '#4CAF50'
            );
            return { killed: false, shell: true, score: 100 };
        }

        /* Casco parado → chuta */
        if (this.isShell && !this.isShellMoving) {
            const dir = (this.x < (window.GAME?.player?.x ?? 0)) ? 1 : -1;
            this.vx = CONFIG.ENEMY.SHELL_SPEED * dir;
            this.isShellMoving = true;
            this.shellKillsLeft = 8;
            SoundManager.playStomp();
            return { killed: false, shell: true, kick: true, score: 200 };
        }

        /* Casco em movimento → para */
        this.vx = 0;
        this.isShellMoving = false;
        SoundManager.playStomp();
        return { killed: false, shell: true, stop: true, score: 100 };
    }

    /**
     * Atingido por fireball.
     * @returns {boolean} true se morreu
     */
    hitByFireball() {
        if (this.type === 'koopa' && this.isShell) {
            /* Casco vira projétil */
            this.isShellMoving = true;
            const dir = (this.x < (window.GAME?.player?.x ?? 0)) ? 1 : -1;
            this.vx = CONFIG.ENEMY.SHELL_SPEED * dir;
            return false;
        }

        this.stomped = true;
        this.stompTimer = 0.3;
        EffectsManager.emitExplosion(
            this.x + this.width / 2,
            this.y + this.height / 2,
            '#FF5722'
        );
        SoundManager.playEnemyHit();
        return true;
    }

    /* ========================================================
       DRAW
    ======================================================== */

    draw(ctx, cameraX) {
        if (!this.isAlive) return;

        const sx = this.x - cameraX;

        /* Pisado: achata */
        if (this.stomped) {
            const progress = 1 - (this.stompTimer / 0.4);
            ctx.save();
            ctx.globalAlpha = Math.max(0, 1 - progress);
            ctx.translate(sx + this.width / 2, this.y + this.height);
            ctx.scale(1 + progress * 0.5, 1 - progress * 0.8);
            ctx.translate(-this.width / 2, -this.height);
            this.drawBody(ctx, 0, 0);
            ctx.restore();
            return;
        }

        /* Sombra no chão */
        if (this.type !== 'flying') {
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath();
            ctx.ellipse(sx + this.width / 2, this.y + this.height + 2,
                        this.width * 0.45, 3, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        /* Espelhamento */
        ctx.save();
        if (!this.facingRight && this.type !== 'flying') {
            ctx.translate(sx + this.width, this.y);
            ctx.scale(-1, 1);
            this.drawBody(ctx, 0, 0);
        } else {
            this.drawBody(ctx, sx, this.y);
        }
        ctx.restore();
    }

    drawBody(ctx, sx, sy) {
        if (this.type === 'goomba') {
            this.drawGoomba(ctx, sx, sy);
        } else if (this.type === 'koopa') {
            this.drawKoopa(ctx, sx, sy);
        } else if (this.type === 'flying') {
            this.drawFlying(ctx, sx, sy);
        }
    }

    drawGoomba(ctx, sx, sy) {
        const bob = this.animFrame === 0 ? -1 : 1;

        /* Corpo (cogumelo) */
        ctx.fillStyle = '#8D6E63';
        ctx.beginPath();
        ctx.arc(sx + 12, sy + 10, 11, Math.PI, 0, false);
        ctx.fill();
        ctx.fillRect(sx + 1, sy + 10, 22, 8);

        /* Cabeça inferior */
        ctx.fillStyle = '#6D4C41';
        ctx.fillRect(sx + 3, sy + 14, 18, 4);

        /* Sobrancelhas */
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(sx + 5, sy + 8, 4, 2);
        ctx.fillRect(sx + 15, sy + 8, 4, 2);

        /* Olhos brancos */
        ctx.fillStyle = '#FFF';
        ctx.fillRect(sx + 5, sy + 10, 4, 5);
        ctx.fillRect(sx + 15, sy + 10, 4, 5);

        /* Pupilas (para o lado que anda) */
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 7, sy + 12, 2, 3);
        ctx.fillRect(sx + 17, sy + 12, 2, 3);

        /* Boca */
        ctx.fillStyle = '#3E2723';
        ctx.fillRect(sx + 8, sy + 17, 8, 1);

        /* Pés animados */
        ctx.fillStyle = '#4E342E';
        ctx.fillRect(sx + 1, sy + 20 + bob, 8, 5);
        ctx.fillRect(sx + 15, sy + 20 - bob, 8, 5);
    }

    drawKoopa(ctx, sx, sy) {
        if (this.isShell) {
            /* Casco */
            const speed = this.isShellMoving ? 0.05 : 0.3;
            const rot = this.isShellMoving
                ? (Date.now() / 60) % (Math.PI * 2)
                : 0;

            ctx.save();
            ctx.translate(sx + 12, sy + 10);
            if (this.isShellMoving) ctx.rotate(rot);

            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(0, 0, 11, 0, Math.PI * 2);
            ctx.fill();

            /* Detalhes do casco */
            ctx.strokeStyle = '#2E7D32';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(-8, 0); ctx.lineTo(8, 0);
            ctx.moveTo(0, -8); ctx.lineTo(0, 8);
            ctx.stroke();

            ctx.fillStyle = '#81C784';
            ctx.beginPath();
            ctx.arc(0, 0, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
            return;
        }

        /* Corpo */
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.ellipse(sx + 12, sy + 18, 11, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        /* Casco */
        ctx.fillStyle = '#2E7D32';
        ctx.beginPath();
        ctx.ellipse(sx + 12, sy + 20, 9, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        /* Cabeça (amarela) */
        ctx.fillStyle = '#FFEB3B';
        ctx.beginPath();
        ctx.arc(sx + 15, sy + 8, 7, 0, Math.PI * 2);
        ctx.fill();

        /* Bico */
        ctx.fillStyle = '#FF9800';
        ctx.beginPath();
        ctx.moveTo(sx + 20, sy + 8);
        ctx.lineTo(sx + 25, sy + 9);
        ctx.lineTo(sx + 20, sy + 11);
        ctx.fill();

        /* Olho */
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 16, sy + 5, 2, 3);

        /* Pés */
        ctx.fillStyle = '#FF9800';
        const bob = this.animFrame === 0 ? 0 : 1;
        ctx.fillRect(sx + 3, sy + 28 + bob, 8, 4);
        ctx.fillRect(sx + 14, sy + 28 - bob, 8, 4);
    }

    drawFlying(ctx, sx, sy) {
        /* Asas animadas */
        const wingFrame = Math.floor(this.animTimer * 12) % 2;
        ctx.fillStyle = '#FFFFFF';

        if (wingFrame === 0) {
            ctx.beginPath();
            ctx.ellipse(sx - 4, sy + 10, 8, 5, -0.3, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 28, sy + 10, 8, 5, 0.3, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.ellipse(sx - 6, sy + 8, 6, 8, -0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.ellipse(sx + 30, sy + 8, 6, 8, 0.5, 0, Math.PI * 2);
            ctx.fill();
        }

        /* Corpo (roxo) */
        ctx.fillStyle = '#7E57C2';
        ctx.beginPath();
        ctx.arc(sx + 12, sy + 12, 10, 0, Math.PI * 2);
        ctx.fill();

        /* Olhos */
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sx + 8, sy + 10, 3, 0, Math.PI * 2);
        ctx.arc(sx + 16, sy + 10, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(sx + 9, sy + 11, 1.5, 0, Math.PI * 2);
        ctx.arc(sx + 17, sy + 11, 1.5, 0, Math.PI * 2);
        ctx.fill();

        /* Boca */
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(sx + 12, sy + 15, 4, 0.2, Math.PI - 0.2);
        ctx.stroke();
    }
}

window.Enemy = Enemy;