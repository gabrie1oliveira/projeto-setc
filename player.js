/**
 * ============================================================
 * PLAYER.JS
 * ------------------------------------------------------------
 * Física e controle do jogador (Mario).
 *
 * Correção v1.1:
 *   - Colisão com tubos agora usa altura REAL (p.height),
 *     não mais 200 fixo. Isso corrige:
 *     • "parede invisível" em cima de tubos baixos
 *     • possibilidade de passar por baixo de tubos altos
 * ============================================================
 */
"use strict";

class Player {
    constructor(x, y) {
        /* Posição e dimensões */
        this.x = x;
        this.y = y;
        this.width = CONFIG.PLAYER.WIDTH;
        this.height = CONFIG.PLAYER.HEIGHT_SMALL;

        /* Física */
        this.vx = 0;
        this.vy = 0;
        this.isGrounded = false;
        this.facingRight = true;

        /* Pulo */
        this.coyoteTimer = 0;
        this.jumpBufferTimer = 0;
        this.jumpHoldTimer = 0;
        this.jumpHeld = false;

        /* Estado de poder */
        this.powerState = 'small';
        this.fireCooldown = 0;
        this.fireballs = [];

        /* Dano */
        this.invulnerable = false;
        this.invulnerableTimer = 0;
        this.hurtTimer = 0;

        /* Estrela */
        this.starTimer = 0;
        this.starActive = false;

        /* Vida */
        this.lives = CONFIG.PLAYER.START_LIVES;
        this.dead = false;
        this.deadTimer = 0;

        /* Animação */
        this.animFrame = 0;
        this.animTimer = 0;
        this.animState = 'idle';

        /* Estatísticas */
        this.jumpCount = 0;
    }

    /* ========================================================
       HELPER: retângulo REAL do tubo (altura correta)
    ======================================================== */
    getPipeRect(p) {
        /* Altura real: usa p.height se existir.
           Se não existir, calcula do topo até o chão.
           Fallback final: 96. */
        const h = p.height
            ?? (CONFIG.CANVAS.GROUND_Y - p.y)
            ?? 96;

        return {
            x: p.x,
            y: p.y,
            width: p.width,
            height: h,
        };
    }

    /* ========================================================
       UPDATE
    ======================================================== */
    update(dt, keys, levelData, fireballs) {
        if (this.dead) return;

        this.fireballs = fireballs;

        /* Timers */
        if (this.invulnerable) {
            this.invulnerableTimer -= dt;
            if (this.invulnerableTimer <= 0) this.invulnerable = false;
        }
        if (this.hurtTimer > 0) this.hurtTimer -= dt;
        if (this.fireCooldown > 0) this.fireCooldown -= dt;

        /* Estrela */
        if (this.starActive) {
            this.starTimer -= dt;
            if (this.starTimer <= 0) {
                this.starActive = false;
                this.starTimer = 0;
            } else if (Math.random() < 0.6) {
                EffectsManager.emitStarTrail(
                    this.x + this.width / 2,
                    this.y + this.height / 2
                );
            }
        }

        /* Controles */
        const left  = keys['ArrowLeft']  || keys['KeyA'];
        const right = keys['ArrowRight'] || keys['KeyD'];
        const jump  = keys['Space'] || keys['KeyZ'] || keys['ArrowUp'] || keys['KeyW'];
        const shoot = keys['KeyX'] || keys['ShiftRight'];

        this.handleHorizontal(dt, left, right);
        this.handleJump(dt, jump);
        if (shoot) this.shootFireball();

        /* Gravidade */
        this.vy += CONFIG.CANVAS.GRAVITY;
        if (this.vy > CONFIG.PLAYER.MAX_FALL_SPEED) {
            this.vy = CONFIG.PLAYER.MAX_FALL_SPEED;
        }

        /* Colisão X */
        this.x += this.vx;
        this.resolveCollisionsX(levelData);

        /* Colisão Y */
        this.y += this.vy;
        const wasGrounded = this.isGrounded;
        this.isGrounded = false;
        this.resolveCollisionsY(levelData);

        /* Coyote time */
        if (wasGrounded && !this.isGrounded && this.vy >= 0) {
            this.coyoteTimer = CONFIG.PLAYER.COYOTE_FRAMES / 60;
        }
        if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
        if (this.isGrounded) this.coyoteTimer = 0;

        /* Morte por queda */
        if (this.y > levelData.groundY + 200) {
            this.kill();
        }

        this.updateAnimation(dt);
    }

    /* ========================================================
       CONTROLE HORIZONTAL
    ======================================================== */
    handleHorizontal(dt, left, right) {
        const onGround = this.isGrounded;
        const accel = CONFIG.PLAYER.ACCEL;
        const friction = onGround
            ? CONFIG.PLAYER.FRICTION
            : CONFIG.PLAYER.AIR_FRICTION;

        if (this.hurtTimer > 0) {
            this.vx *= 0.95;
            return;
        }

        if (left && !right) {
            this.vx -= accel;
            this.facingRight = false;
        } else if (right && !left) {
            this.vx += accel;
            this.facingRight = true;
        } else {
            this.vx *= friction;
            if (Math.abs(this.vx) < 0.05) this.vx = 0;
        }

        this.vx = Utils.clamp(
            this.vx,
            -CONFIG.PLAYER.MAX_SPEED,
            CONFIG.PLAYER.MAX_SPEED
        );
    }

    /* ========================================================
       PULO
    ======================================================== */
    handleJump(dt, jumpPressed) {
        if (jumpPressed && !this.jumpHeld) {
            this.jumpBufferTimer = CONFIG.PLAYER.JUMP_BUFFER_FRAMES / 60;
        }
        this.jumpHeld = jumpPressed;

        if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

        const canJump = this.isGrounded || this.coyoteTimer > 0;

        if (this.jumpBufferTimer > 0 && canJump) {
            this.vy = CONFIG.PLAYER.JUMP_FORCE;
            this.isGrounded = false;
            this.coyoteTimer = 0;
            this.jumpBufferTimer = 0;
            this.jumpHoldTimer = CONFIG.PLAYER.JUMP_HOLD_FRAMES / 60;
            this.jumpCount++;

            if (this.powerState === 'small') SoundManager.playJump();
            else SoundManager.playBigJump();

            EffectsManager.emitDust(
                this.x + this.width / 2,
                this.y + this.height,
                5,
                '#FFFFFF'
            );
        }

        if (this.jumpHoldTimer > 0) {
            if (jumpPressed && this.vy < 0) {
                this.jumpHoldTimer -= dt;
            } else {
                if (this.vy < 0) this.vy *= 0.5;
                this.jumpHoldTimer = 0;
            }
        }
    }

    /* ========================================================
       COLISÕES
    ======================================================== */

    resolveCollisionsX(levelData) {
        /* Plataformas */
        for (const p of levelData.platforms) {
            if (p.type === 'flagpole') continue;
            if (Utils.aabb(this, p)) {
                if (this.vx > 0) this.x = p.x - this.width;
                else if (this.vx < 0) this.x = p.x + p.width;
                this.vx = 0;
            }
        }

        /* Tubos — usa altura REAL */
        for (const p of levelData.pipes) {
            const r = this.getPipeRect(p);
            if (Utils.aabb(this, r)) {
                if (this.vx > 0) this.x = r.x - this.width;
                else if (this.vx < 0) this.x = r.x + r.width;
                this.vx = 0;
            }
        }
    }

    resolveCollisionsY(levelData) {
        /* Chão (exceto nos gaps) */
        const inGap = levelData.gaps.some(g =>
            this.x + this.width / 2 >= g.x &&
            this.x + this.width / 2 <= g.x + g.width
        );

        if (!inGap && this.y + this.height >= levelData.groundY) {
            this.y = levelData.groundY - this.height;
            this.vy = 0;
            this.isGrounded = true;
        }

        /* Plataformas */
        for (const p of levelData.platforms) {
            if (p.type === 'flagpole') continue;
            if (!Utils.aabb(this, p)) continue;

            if (this.vy > 0 && this.y + this.height - this.vy <= p.y + 8) {
                this.y = p.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            } else if (this.vy < 0) {
                this.y = p.y + p.height;
                this.vy = 0;

                if (p.type === 'question' && p.item) {
                    this.hitQuestionBlock(p, levelData);
                } else if (p.type === 'brick' && this.powerState !== 'small') {
                    p.broken = true;
                    EffectsManager.emitExplosion(
                        p.x + p.width / 2,
                        p.y + p.height / 2,
                        '#D32F2F'
                    );
                    SoundManager.playStomp();
                } else {
                    SoundManager.playStomp();
                }
            }
        }

        /* Tubos — usa altura REAL */
        for (const p of levelData.pipes) {
            const r = this.getPipeRect(p);
            if (!Utils.aabb(this, r)) continue;

            if (this.vy > 0 && this.y + this.height - this.vy <= r.y + 8) {
                /* Aterrissou em cima do tubo */
                this.y = r.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            } else if (this.vy < 0) {
                /* Bateu a cabeça por baixo */
                this.y = r.y + r.height;
                this.vy = 0;
            }
        }
    }

    hitQuestionBlock(block, levelData) {
        SoundManager.playCoin();

        if (block.item === 'coin') {
            EffectsManager.textScore(block.x + 16, block.y - 12, CONFIG.SCORE.COIN);
            if (window.GAME) {
                GAME.addScore(CONFIG.SCORE.COIN);
                GAME.addCoin(1);
            }
        } else {
            levelData.items.push(new Item(block.x + 4, block.y - 24, block.item));
            EffectsManager.text(block.x + 16, block.y - 12, 'POWER!', {
                color: '#FFF',
                size: 10,
            });
        }

        block.item = null;
        block.type = 'used';

        EffectsManager.emitSparkles(block.x + 16, block.y, 6, '#FFEB3B');
    }

    /* ========================================================
       DANO / PODER
    ======================================================== */
    takeDamage(instantKill = false) {
        if (this.dead) return;
        if (this.invulnerable && !instantKill) return;
        if (this.starActive && !instantKill) return;

        if (instantKill) {
            this.kill();
            return;
        }

        if (this.powerState === 'fire') {
            this.powerState = 'super';
            this.applyDamage();
        } else if (this.powerState === 'super') {
            this.powerState = 'small';
            this.height = CONFIG.PLAYER.HEIGHT_SMALL;
            this.y += CONFIG.PLAYER.HEIGHT_BIG - CONFIG.PLAYER.HEIGHT_SMALL;
            this.applyDamage();
        } else {
            this.kill();
        }
    }

    applyDamage() {
        this.invulnerable = true;
        this.invulnerableTimer = CONFIG.PLAYER.INVULN_TIME;
        this.hurtTimer = 0.3;
        this.vx = this.facingRight ? -4 : 4;
        this.vy = -6;

        SoundManager.playPowerDown();
        EffectsManager.vignetteRed(0.5);
        EffectsManager.flashScreen('#FF0000', 0.4);
        EffectsManager.shake(8, 0.4);
    }

    kill() {
        if (this.dead) return;
        this.dead = true;
        this.vy = -10;
        this.vx = 0;

        SoundManager.stopMusic();
        SoundManager.playHit();
        EffectsManager.flashScreen('#FFF', 0.6);

        if (window.GAME && GAME.onPlayerDeath) {
            GAME.onPlayerDeath();
        }
    }

    /* ========================================================
       POWER-UPS
    ======================================================== */
    collectPowerUp(type) {
        if (type === 'mushroom') {
            if (this.powerState === 'small') {
                this.powerState = 'super';
                const oldH = this.height;
                this.height = CONFIG.PLAYER.HEIGHT_BIG;
                this.y -= (this.height - oldH);
            }
            SoundManager.playPowerUp();
            EffectsManager.emitSparkles(
                this.x + this.width / 2,
                this.y + this.height / 2,
                10,
                '#4CAF50'
            );
            EffectsManager.text(
                this.x + this.width / 2,
                this.y - 10,
                'SUPER!',
                { color: '#4CAF50', size: 12 }
            );

        } else if (type === 'fireflower') {
            const oldH = this.height;
            this.powerState = 'fire';
            this.height = CONFIG.PLAYER.HEIGHT_BIG;
            if (oldH === CONFIG.PLAYER.HEIGHT_SMALL) {
                this.y -= (this.height - oldH);
            }
            SoundManager.playPowerUp();
            EffectsManager.emitSparkles(
                this.x + this.width / 2,
                this.y + this.height / 2,
                12,
                '#FF9800'
            );
            EffectsManager.text(
                this.x + this.width / 2,
                this.y - 10,
                'FIRE!',
                { color: '#FF9800', size: 12 }
            );

        } else if (type === 'star') {
            this.starActive = true;
            this.starTimer = 10.0;
            SoundManager.playPowerUp();
            EffectsManager.emitSparkles(
                this.x + this.width / 2,
                this.y + this.height / 2,
                15,
                '#FFD700'
            );
            EffectsManager.text(
                this.x + this.width / 2,
                this.y - 10,
                'INVENCÍVEL!',
                { color: '#FFD700', size: 12, life: 1.5 }
            );
        }
    }

    /* ========================================================
       TIRO
    ======================================================== */
    shootFireball() {
        if (this.powerState !== 'fire') return;
        if (this.fireCooldown > 0) return;
        if (!this.fireballs) return;
        if (this.fireballs.length >= 2) return;

        const x = this.facingRight ? this.x + this.width : this.x - 10;
        const vx = this.facingRight
            ? CONFIG.ITEM.FIREBALL_SPEED_X
            : -CONFIG.ITEM.FIREBALL_SPEED_X;

        this.fireballs.push(new Fireball(x, this.y + 12, vx, 'player'));
        this.fireCooldown = CONFIG.PLAYER.FIRE_COOLDOWN;
        SoundManager.playFireball();
        EffectsManager.emitSparkles(x, this.y + 12, 4, '#FF6D00');
    }

    /* ========================================================
       ANIMAÇÃO
    ======================================================== */
    updateAnimation(dt) {
        const absVx = Math.abs(this.vx);

        if (!this.isGrounded) {
            this.animState = 'jump';
        } else if (absVx > 0.5) {
            const movingRight = this.vx > 0;
            this.animState = (movingRight !== this.facingRight) ? 'skid' : 'walk';
        } else {
            this.animState = 'idle';
        }

        this.animTimer += dt;
        const frameSpeed = this.animState === 'walk'
            ? Math.max(0.04, 0.12 - absVx * 0.015)
            : 0.15;

        if (this.animTimer > frameSpeed) {
            this.animTimer = 0;
            this.animFrame = (this.animFrame + 1) % 4;
        }
    }

    /* ========================================================
       DRAW
    ======================================================== */
    draw(ctx, cameraX) {
        if (this.invulnerable && Math.floor(Date.now() / 80) % 2 === 0) return;

        const starPhase = this.starActive
            ? Math.floor(Date.now() / 60) % 6
            : -1;

        const sx = this.x - cameraX;

        ctx.save();
        if (!this.facingRight) {
            ctx.translate(sx + this.width, this.y);
            ctx.scale(-1, 1);
        } else {
            ctx.translate(sx, this.y);
        }

        const colors = this.getColors(starPhase);
        this.drawMario(ctx, colors, starPhase);

        ctx.restore();
    }

    getColors(starPhase) {
        const base = {
            cap:     '#D32F2F',
            capDark: '#B71C1C',
            skin:    '#FFCC80',
            hair:    '#3E2723',
            shirt:   '#D32F2F',
            overall: '#1976D2',
            shoe:    '#3E2723',
            button:  '#FFD700',
        };

        if (this.powerState === 'fire') {
            base.cap = '#FFFFFF';
            base.capDark = '#E0E0E0';
            base.shirt = '#FFFFFF';
            base.overall = '#E53935';
        }

        if (starPhase >= 0) {
            const palette = ['#FFD700', '#FF5252', '#4CAF50', '#2196F3', '#9C27B0', '#FFFFFF'];
            const c = palette[starPhase % palette.length];
            base.cap = c;
            base.shirt = c;
            base.overall = palette[(starPhase + 2) % palette.length];
        }

        return base;
    }

    drawMario(ctx, c, starPhase) {
        const H = this.height;
        const big = (this.powerState !== 'small');
        const scaleY = big ? 1.4 : 1;

        /* Boné */
        ctx.fillStyle = c.cap;
        ctx.fillRect(2, 0, 18, 8 * scaleY);
        ctx.fillRect(8, 2 * scaleY, 14, 4);
        ctx.fillStyle = c.capDark;
        ctx.fillRect(2, 6 * scaleY, 18, 2);

        /* Rosto */
        ctx.fillStyle = c.skin;
        ctx.fillRect(4, 8 * scaleY, 14, 10);

        /* Cabelo */
        ctx.fillStyle = c.hair;
        ctx.fillRect(4, 8 * scaleY, 3, 2);
        ctx.fillRect(15, 8 * scaleY, 3, 2);

        /* Olho */
        ctx.fillStyle = '#000';
        if (this.animState === 'idle' || this.animState === 'walk') {
            ctx.fillRect(13, 10 * scaleY, 2, 3);
        } else {
            ctx.fillRect(13, 11 * scaleY, 2, 1);
        }

        /* Bigode */
        ctx.fillStyle = c.hair;
        ctx.fillRect(10, 13 * scaleY, 8, 3);

        /* Camisa */
        ctx.fillStyle = c.shirt;
        ctx.fillRect(4, 18 * scaleY, 16, 6);

        /* Macacão */
        ctx.fillStyle = c.overall;
        ctx.fillRect(4, 22 * scaleY, 16, H - 24 - (big ? 6 : 0));

        /* Botões */
        ctx.fillStyle = c.button;
        ctx.fillRect(6, 19 * scaleY, 2, 2);
        ctx.fillRect(16, 19 * scaleY, 2, 2);

        /* Braços */
        ctx.fillStyle = c.shirt;
        if (this.animState === 'jump') {
            ctx.fillRect(0, 16 * scaleY, 4, 6);
            ctx.fillRect(20, 16 * scaleY, 4, 6);
        } else if (this.animState === 'walk') {
            const off = (this.animFrame % 2 === 0) ? 0 : 1;
            ctx.fillRect(0, (18 - off) * scaleY, 4, 6);
            ctx.fillRect(20, (18 + off) * scaleY, 4, 6);
        } else {
            ctx.fillRect(0, 18 * scaleY, 4, 6);
            ctx.fillRect(20, 18 * scaleY, 4, 6);
        }

        /* Mãos */
        ctx.fillStyle = '#FFF';
        ctx.fillRect(0, 24 * scaleY, 4, 3);
        ctx.fillRect(20, 24 * scaleY, 4, 3);

        /* Sapatos */
        const shoeY = H - 6;
        ctx.fillStyle = c.shoe;

        if (this.animState === 'jump') {
            ctx.fillRect(0, shoeY - 2, 9, 6);
            ctx.fillRect(15, shoeY - 4, 9, 6);
        } else if (this.animState === 'walk') {
            const off = (this.animFrame % 2 === 0) ? 0 : 2;
            ctx.fillRect(1, shoeY + off, 9, 6);
            ctx.fillRect(14, shoeY - off, 9, 6);
        } else if (this.animState === 'skid') {
            ctx.fillRect(0, shoeY, 10, 6);
            ctx.fillRect(14, shoeY, 10, 6);
        } else {
            ctx.fillRect(2, shoeY, 8, 6);
            ctx.fillRect(14, shoeY, 8, 6);
        }
    }

    get isStarPowered() { return this.starActive; }
    get isFire() { return this.powerState === 'fire'; }
    get isBig() { return this.powerState !== 'small'; }

    getRect() {
        return { x: this.x, y: this.y, width: this.width, height: this.height };
    }
}

window.Player = Player;