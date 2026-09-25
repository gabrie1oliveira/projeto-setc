/**
 * ============================================================
 * BOSSES.JS
 * ------------------------------------------------------------
 * Chefão com duas fases:
 *   Fase 1 (HP > 50%): velocidade normal, atira a cada 3s
 *   Fase 2 (HP ≤ 50%): velocidade dobrada, atira a cada 1.5s,
 *                       aura de fúria vermelha
 *
 * Vida: 5 pontos (3 stomps/fireballs para entrar em fúria,
 * 2 mais para matar). Pisar dá 1 de dano; fireball dá 1.
 * ============================================================
 */
"use strict";

class Boss {
    constructor(x, y, minX, maxX) {
        this.x = x;
        this.y = y;
        this.width = 64;
        this.height = 64;
        this.minX = minX;
        this.maxX = maxX;

        /* Vida */
        this.hp = CONFIG.ENEMY.BOSS_HP;
        this.maxHp = CONFIG.ENEMY.BOSS_HP;
        this.phase = 1;

        /* Física */
        this.vx = -1;
        this.vy = 0;
        this.gravity = CONFIG.CANVAS.GRAVITY * 0.6;
        this.onGround = false;

        /* Ataques */
        this.fireballs = [];
        this.attackTimer = 0;
        this.attackCooldown = 3.0;

        /* Estado */
        this.isAlive = true;
        this.isHit = false;
        this.hitTimer = 0;
        this.stomped = false;
        this.stompTimer = 0;
        this.introTimer = 2.0;      // rugido inicial
        this.roared = false;

        /* Animação */
        this.animTimer = 0;
        this.facingRight = false;

        /* Recompensa */
        this.score = CONFIG.SCORE.BOSS_KILL;
    }

    /* ========================================================
       UPDATE
    ======================================================== */

    update(dt, levelData, playerX) {
        if (!this.isAlive) return;

        /* Morrendo */
        if (this.stomped) {
            this.stompTimer -= dt;
            if (Math.random() < 0.5) {
                EffectsManager.emitExplosion(
                    this.x + Utils.random(0, this.width),
                    this.y + Utils.random(0, this.height),
                    Utils.random() < 0.5 ? '#FF5722' : '#FFC107'
                );
            }
            if (this.stompTimer <= 0) {
                this.isAlive = false;
                /* Explosão final */
                for (let i = 0; i < 8; i++) {
                    setTimeout(() => {
                        EffectsManager.emitExplosion(
                            this.x + Utils.random(0, this.width),
                            this.y + Utils.random(0, this.height),
                            '#FF5722'
                        );
                    }, i * 80);
                }
                EffectsManager.shake(20, 1.0);
                SoundManager.playBossRoar();
            }
            return;
        }

        /* Intro (ruge antes de atacar) */
        if (this.introTimer > 0) {
            this.introTimer -= dt;
            if (!this.roared) {
                this.roared = true;
                SoundManager.playBossRoar();
                EffectsManager.shake(6, 0.5);
            }
            return;
        }

        /* Hit flash */
        if (this.hitTimer > 0) {
            this.hitTimer -= dt;
            if (this.hitTimer <= 0) this.isHit = false;
        }

        /* Fase */
        if (this.hp <= CONFIG.ENEMY.BOSS_PHASE2_HP && this.phase === 1) {
            this.phase = 2;
            this.attackCooldown = 1.5;
            this.vx = (this.vx > 0 ? 1 : -1) * 2.2;
            SoundManager.playBossRoar();
            EffectsManager.shake(10, 0.6);
            EffectsManager.flashScreen('#D50000', 0.5);

            /* Explosão de fúria */
            EffectsManager.emitSparkles(
                this.x + this.width / 2,
                this.y + this.height / 2,
                20,
                '#D50000'
            );
        }

        /* Movimento horizontal */
        const speed = this.phase === 2 ? 2.2 : 1.0;
        this.x += this.vx * speed;

        if (this.x <= this.minX) {
            this.x = this.minX;
            this.vx = Math.abs(this.vx);
            this.facingRight = true;
        } else if (this.x + this.width >= this.maxX) {
            this.x = this.maxX - this.width;
            this.vx = -Math.abs(this.vx);
            this.facingRight = false;
        }

        /* Fica de frente para o jogador quando perto */
        if (Math.abs(playerX - this.x) < 200) {
            this.facingRight = playerX > this.x;
        }

        /* Ataques */
        this.attackTimer += dt;
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            this.shootFireball(playerX);
        }

        /* Atualiza projéteis */
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            fb.update(dt, levelData);
            if (!fb.active) Utils.removeAt(this.fireballs, i);
        }

        /* Aura de fúria */
        if (this.phase === 2 && Math.random() < 0.4) {
            EffectsManager.particles.push(new Particle(
                this.x + Utils.random(0, this.width),
                this.y + Utils.random(0, this.height),
                {
                    vx: Utils.random(-1, 1),
                    vy: Utils.random(-2, -0.5),
                    gravity: -0.05,
                    size: Utils.random(2, 4),
                    color: Utils.random() < 0.5 ? '#D50000' : '#FF5722',
                    shape: 'circle',
                    life: 0.6,
                    decay: 0.05,
                }
            ));
        }

        /* Gravidade */
        this.vy += this.gravity;
        this.y += this.vy;
        if (this.y + this.height >= levelData.groundY) {
            this.y = levelData.groundY - this.height;
            this.vy = 0;
            this.onGround = true;
        }
    }

    shootFireball(targetX) {
        const dir = targetX < this.x ? -1 : 1;
        const startX = this.x + (dir === -1 ? 0 : this.width);

        /* Ataque triplo na fase 2 */
        const count = this.phase === 2 ? 3 : 1;
        for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 0.4;
            const vx = dir * 5;
            const vy = -2 + spread * 3;
            this.fireballs.push(new BossFireball(
                startX, this.y + 20 + i * 8, vx, vy
            ));
        }

        SoundManager.playFireball();
        EffectsManager.emitSparkles(
            startX, this.y + 20, 6, '#FF5722'
        );
    }

    /* ========================================================
       INTERAÇÃO COM O JOGADOR
    ======================================================== */

    /**
     * Pisado pelo jogador.
     * @returns {object} { hit, killed }
     */
    stomp() {
        if (!this.isAlive || this.stomped) return { hit: false };

        this.takeHit();
        if (this.hp <= 0) {
            this.stomped = true;
            this.stompTimer = 1.5;
            return { hit: true, killed: true };
        }
        return { hit: true, killed: false };
    }

    /**
     * Atingido por fireball.
     * @returns {object} { hit, killed }
     */
    hitByFireball() {
        if (!this.isAlive || this.stomped) return { hit: false };

        this.takeHit();
        if (this.hp <= 0) {
            this.stomped = true;
            this.stompTimer = 1.5;
            return { hit: true, killed: true };
        }
        return { hit: true, killed: false };
    }

    takeHit() {
        this.hp--;
        this.isHit = true;
        this.hitTimer = 0.3;

        SoundManager.playBossHit();
        EffectsManager.shake(8, 0.3);
        EffectsManager.flashScreen('#FFFFFF', 0.3);
        EffectsManager.emitExplosion(
            this.x + this.width / 2,
            this.y + this.height / 2,
            '#FF5722'
        );
        EffectsManager.textScore(
            this.x + this.width / 2,
            this.y - 10,
            CONFIG.SCORE.BOSS_HIT,
            '#FF5722'
        );
    }

    /* ========================================================
       DRAW
    ======================================================== */

    draw(ctx, cameraX) {
        if (!this.isAlive && !this.stomped) return;

        const sx = this.x - cameraX;

        /* Morrendo: pisca */
        if (this.stomped) {
            const blink = Math.floor(this.stompTimer * 12) % 2 === 0;
            if (!blink) return;
        }

        /* Hit flash */
        if (this.isHit) {
            ctx.save();
            ctx.globalAlpha = 0.7 + 0.3 * Math.sin(this.hitTimer * 50);
        }

        /* Aura de fúria (fase 2) */
        if (this.phase === 2 && this.isAlive) {
            ctx.save();
            ctx.shadowBlur = 20;
            ctx.shadowColor = '#D50000';

            /* Aura pulsante */
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);
            ctx.globalAlpha = 0.3 * pulse;
            ctx.fillStyle = '#FF3D00';
            ctx.beginPath();
            ctx.arc(sx + this.width / 2, this.y + this.height / 2,
                    this.width * 0.8 + pulse * 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        /* Corpo principal */
        const bodyColor = this.phase === 2 ? '#D50000' : '#2E7D32';
        ctx.fillStyle = bodyColor;
        ctx.fillRect(sx, this.y + 8, this.width, this.height - 8);

        /* Sombra na parte de baixo */
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(sx, this.y + this.height - 12, this.width, 12);

        /* Chifres */
        ctx.fillStyle = CONFIG.COLORS.BOSS_HORN;
        ctx.beginPath();
        ctx.moveTo(sx + 8, this.y + 10);
        ctx.lineTo(sx + 2, this.y - 12);
        ctx.lineTo(sx + 16, this.y + 10);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(sx + this.width - 8, this.y + 10);
        ctx.lineTo(sx + this.width - 2, this.y - 12);
        ctx.lineTo(sx + this.width - 16, this.y + 10);
        ctx.closePath();
        ctx.fill();

        /* Olhos vermelhos */
        const eyeColor = this.phase === 2 ? '#FF0000' : '#FF5722';
        ctx.fillStyle = eyeColor;
        ctx.fillRect(sx + 12, this.y + 20, 12, 8);
        ctx.fillRect(sx + this.width - 24, this.y + 20, 12, 8);

        /* Brilho nos olhos */
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx + 14, this.y + 22, 3, 3);
        ctx.fillRect(sx + this.width - 22, this.y + 22, 3, 3);

        /* Boca */
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 20, this.y + 38, this.width - 40, 10);

        /* Dentes */
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 4; i++) {
            const dx = sx + 22 + i * 6;
            ctx.fillRect(dx, this.y + 38, 3, 4);
        }

        /* Braços */
        ctx.fillStyle = bodyColor;
        const armBob = this.phase === 2
            ? Math.sin(Date.now() / 100) * 3
            : 0;
        ctx.fillRect(sx - 8, this.y + 25 + armBob, 10, 20);
        ctx.fillRect(sx + this.width - 2, this.y + 25 - armBob, 10, 20);

        /* Garras */
        ctx.fillStyle = '#FFEB3B';
        ctx.fillRect(sx - 8, this.y + 42 + armBob, 10, 4);
        ctx.fillRect(sx + this.width - 2, this.y + 42 - armBob, 10, 4);

        if (this.isHit) ctx.restore();

        /* Projéteis */
        for (const fb of this.fireballs) {
            fb.draw(ctx, cameraX);
        }

        /* Barra de vida (aparece durante a luta) */
        this.drawHealthBar(ctx, cameraX);
    }

    drawHealthBar(ctx, cameraX) {
        if (!this.isAlive) return;
        if (Math.abs((window.GAME?.player?.x ?? 0) - this.x) > 500) return;

        const barW = 200;
        const barH = 12;
        const barX = CONFIG.CANVAS.WIDTH / 2 - barW / 2;
        const barY = 30;

        /* Fundo */
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);

        /* Barra */
        const ratio = Math.max(0, this.hp / this.maxHp);
        const color = this.phase === 2 ? '#D50000' : '#2E7D32';
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, barW * ratio, barH);

        /* Borda */
        ctx.strokeStyle = '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);

        /* Texto */
        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 10px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', CONFIG.CANVAS.WIDTH / 2, barY - 8);
        ctx.textAlign = 'left';
    }
}

window.Boss = Boss;