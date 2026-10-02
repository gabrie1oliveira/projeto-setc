/**
 * ============================================================
 * BOSSES.JS
 * ------------------------------------------------------------
 * Boss final com 2 fases de combate.
 *
 * v1.2 — Correções:
 *   - Não cai do chão (gravidade limitada)
 *   - Respeita minX/maxX (arena)
 *   - Fireballs somem após um tempo
 *   - Aparece só quando o player se aproxima (ativação)
 *   - Ao morrer, libera a vitória
 *   - Aura de fúria mais visível
 * ============================================================
 */
"use strict";

class Boss {
    /**
     * @param {number} x
     * @param {number} y
     * @param {number} minX  Limite esquerdo da arena
     * @param {number} maxX  Limite direito da arena
     */
    constructor(x, y, minX, maxX) {
        this.x = x;
        this.y = y;
        this.width = 64;
        this.height = 64;
        this.minX = minX;
        this.maxX = maxX;

        /* Vida */
        this.hp = CONFIG.ENEMY.BOSS_HP;       // 5
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
        this.introTimer = 2.0;
        this.roared = false;

        /* Ativação: só aparece quando o player chega perto */
        this.active = false;
        this.activationRange = 500;

        /* Animação */
        this.animTimer = 0;
        this.facingRight = false;

        /* Recompensa */
        this.score = CONFIG.SCORE.BOSS_KILL;
    }

    /* ========================================================
       ATIVAÇÃO
    ======================================================== */
    tryActivate(playerX) {
        if (this.active) return true;
        if (Math.abs(playerX - this.x) < this.activationRange) {
            this.active = true;
            SoundManager.playBossRoar();
            EffectsManager.shake(6, 0.5);
            EffectsManager.flashScreen('#D50000', 0.4);
            return true;
        }
        return false;
    }

    /* ========================================================
       UPDATE
    ======================================================== */
    update(dt, levelData, playerX) {
        /* Se não está ativo, não faz nada */
        if (!this.active) {
            this.tryActivate(playerX);
            return;
        }

        /* Se já morreu, não faz nada */
        if (!this.isAlive && !this.stomped) return;

        /* Morrendo (animação de explosão) */
        if (this.stomped) {
            this.stompTimer -= dt;

            /* Explosões aleatórias */
            if (Math.random() < 0.5) {
                EffectsManager.emitExplosion(
                    this.x + Utils.random(0, this.width),
                    this.y + Utils.random(0, this.height),
                    Utils.random() < 0.5 ? '#FF5722' : '#FFC107'
                );
            }

            /* Sacode a tela */
            if (Math.random() < 0.3) {
                EffectsManager.shake(8, 0.2);
            }

            if (this.stompTimer <= 0) {
                this.isAlive = false;

                /* Explosão final */
                for (let i = 0; i < 10; i++) {
                    setTimeout(() => {
                        EffectsManager.emitExplosion(
                            this.x + Utils.random(0, this.width),
                            this.y + Utils.random(0, this.height),
                            Utils.random() < 0.5 ? '#FF5722' : '#FFD700'
                        );
                    }, i * 80);
                }

                EffectsManager.shake(20, 1.0);
                EffectsManager.flashScreen('#FFD700', 0.7);
                SoundManager.playBossRoar();

                /* Libera a vitória */
                if (window.GAME && GAME.onBossDefeated) {
                    GAME.onBossDefeated();
                }
            }
            return;
        }

        /* Intro (ruge antes de atacar) */
        if (this.introTimer > 0) {
            this.introTimer -= dt;
            if (!this.roared) {
                this.roared = true;
                SoundManager.playBossRoar();
            }
            return;
        }

        /* Hit flash */
        if (this.hitTimer > 0) {
            this.hitTimer -= dt;
            if (this.hitTimer <= 0) this.isHit = false;
        }

        /* Mudança de fase */
        if (this.hp <= CONFIG.ENEMY.BOSS_PHASE2_HP && this.phase === 1) {
            this.phase = 2;
            this.attackCooldown = 1.5;

            SoundManager.playBossRoar();
            EffectsManager.shake(10, 0.6);
            EffectsManager.flashScreen('#D50000', 0.5);

            /* Explosão de fúria */
            EffectsManager.emitSparkles(
                this.x + this.width / 2,
                this.y + this.height / 2,
                25,
                '#D50000'
            );
        }

        /* ===== MOVIMENTO HORIZONTAL ===== */
        const speed = this.phase === 2 ? 2.2 : 1.0;
        this.x += this.vx * speed;

        /* Respeita os limites da arena */
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
        if (Math.abs(playerX - this.x) < 300) {
            this.facingRight = playerX > this.x;
        }

        /* ===== ATAQUES ===== */
        this.attackTimer += dt;
        if (this.attackTimer >= this.attackCooldown) {
            this.attackTimer = 0;
            this.shootFireball(playerX);
        }

        /* ===== ATUALIZA PROJÉTEIS ===== */
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            fb.update(dt, levelData);
            if (!fb.active) Utils.removeAt(this.fireballs, i);
        }

        /* ===== AURA DE FÚRIA (fase 2) ===== */
        if (this.phase === 2 && Math.random() < 0.5) {
            EffectsManager.particles.push(new Particle(
                this.x + Utils.random(0, this.width),
                this.y + Utils.random(0, this.height),
                {
                    vx: Utils.random(-1, 1),
                    vy: Utils.random(-2, -0.5),
                    gravity: -0.05,
                    size: Utils.random(2, 4),
                    color: Math.random() < 0.5 ? '#D50000' : '#FF5722',
                    shape: 'circle',
                    life: 0.6,
                    decay: 0.05,
                }
            ));
        }

        /* ===== GRAVIDADE (limitada, não cai) ===== */
        this.vy += this.gravity;
        if (this.vy > 8) this.vy = 8;     // limita velocidade de queda
        this.y += this.vy;

        /* Colisão com o chão */
        if (this.y + this.height >= levelData.groundY) {
            this.y = levelData.groundY - this.height;
            this.vy = 0;
            this.onGround = true;
        } else {
            this.onGround = false;
        }

        this.animTimer += dt;
    }

    /* ========================================================
       TIRO
    ======================================================== */
    shootFireball(targetX) {
        const dir = targetX < this.x ? -1 : 1;
        const startX = this.x + (dir === -1 ? 0 : this.width);
        const startY = this.y + 24;

        /* Fase 2 → ataque triplo */
        const count = this.phase === 2 ? 3 : 1;

        for (let i = 0; i < count; i++) {
            const spread = (i - (count - 1) / 2) * 0.6;
            const vx = dir * 5;
            const vy = spread * 2;
            this.fireballs.push(new BossFireball(startX, startY, vx, vy));
        }

        SoundManager.playFireball();
        EffectsManager.emitSparkles(startX, startY, 6, '#FF5722');
    }

    /* ========================================================
       INTERAÇÃO COM O JOGADOR
    ======================================================== */

    /**
     * Pisado pelo jogador.
     */
    stomp() {
        if (!this.isAlive || this.stomped) return { hit: false };
        if (!this.active) return { hit: false };

        this.takeHit();
        if (this.hp <= 0) {
            this.startDeath();
            return { hit: true, killed: true };
        }
        return { hit: true, killed: false };
    }

    /**
     * Atingido por fireball.
     */
    hitByFireball() {
        if (!this.isAlive || this.stomped) return { hit: false };
        if (!this.active) return { hit: false };

        this.takeHit();
        if (this.hp <= 0) {
            this.startDeath();
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

    startDeath() {
        this.stomped = true;
        this.stompTimer = 1.5;
    }

    /* ========================================================
       DRAW
    ======================================================== */
    draw(ctx, cameraX) {
        /* Não desenha se não está ativo */
        if (!this.active) return;

        /* Não desenha se já morreu (fora da animação) */
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
            const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 150);

            ctx.save();
            ctx.globalAlpha = 0.3 * pulse;
            ctx.fillStyle = '#FF3D00';
            ctx.beginPath();
            ctx.arc(
                sx + this.width / 2,
                this.y + this.height / 2,
                this.width * 0.85 + pulse * 8,
                0, Math.PI * 2
            );
            ctx.fill();
            ctx.restore();
        }

        /* ===== CORPO ===== */
        const bodyColor = this.phase === 2 ? '#D50000' : '#2E7D32';

        /* Corpo principal */
        ctx.fillStyle = bodyColor;
        ctx.fillRect(sx, this.y + 8, this.width, this.height - 8);

        /* Sombra inferior */
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(sx, this.y + this.height - 12, this.width, 12);

        /* Borda */
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, this.y + 9, this.width - 2, this.height - 10);

        /* ===== CHIFRES ===== */
        ctx.fillStyle = CONFIG.COLORS.BOSS_HORN;

        /* Chifre esquerdo */
        ctx.beginPath();
        ctx.moveTo(sx + 8, this.y + 10);
        ctx.lineTo(sx + 2, this.y - 12);
        ctx.lineTo(sx + 16, this.y + 10);
        ctx.closePath();
        ctx.fill();

        /* Chifre direito */
        ctx.beginPath();
        ctx.moveTo(sx + this.width - 8, this.y + 10);
        ctx.lineTo(sx + this.width - 2, this.y - 12);
        ctx.lineTo(sx + this.width - 16, this.y + 10);
        ctx.closePath();
        ctx.fill();

        /* ===== OLHOS ===== */
        const eyeColor = this.phase === 2 ? '#FF0000' : '#FF5722';

        /* Olho esquerdo */
        ctx.fillStyle = eyeColor;
        ctx.fillRect(sx + 12, this.y + 20, 12, 8);

        /* Olho direito */
        ctx.fillRect(sx + this.width - 24, this.y + 20, 12, 8);

        /* Brilho nos olhos */
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(sx + 14, this.y + 22, 3, 3);
        ctx.fillRect(sx + this.width - 22, this.y + 22, 3, 3);

        /* ===== BOCA ===== */
        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 20, this.y + 38, this.width - 40, 10);

        /* Dentes */
        ctx.fillStyle = '#FFFFFF';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(sx + 22 + i * 6, this.y + 38, 3, 4);
        }

        /* ===== BRAÇOS ===== */
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

        /* ===== PROJÉTEIS ===== */
        for (const fb of this.fireballs) {
            fb.draw(ctx, cameraX);
        }

        /* ===== BARRA DE VIDA ===== */
        this.drawHealthBar(ctx);
    }

    drawHealthBar(ctx) {
        if (!this.isAlive || !this.active) return;

        const barW = 200;
        const barH = 12;
        const barX = CONFIG.CANVAS.WIDTH / 2 - barW / 2;
        const barY = 30;

        /* Fundo */
        ctx.fillStyle = 'rgba(0,0,0,0.75)';
        ctx.fillRect(barX - 3, barY - 3, barW + 6, barH + 6);

        /* Barra */
        const ratio = Math.max(0, this.hp / this.maxHp);
        const color = this.phase === 2 ? '#D50000' : '#2E7D32';
        ctx.fillStyle = color;
        ctx.fillRect(barX, barY, barW * ratio, barH);

        /* Brilho */
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        ctx.fillRect(barX, barY, barW * ratio, 4);

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

        /* Contador de vida */
        ctx.font = 'bold 8px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`${this.hp}/${this.maxHp}`, barX + barW + 8, barY + 10);
    }
}

window.Boss = Boss;