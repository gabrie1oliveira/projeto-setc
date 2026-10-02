/**
 * ============================================================
 * GAME.JS
 * ------------------------------------------------------------
 * v1.8 — Power-ups corrigidos (mushroom/fireflower funcionam)
 *   - loadLevel sincroniza levelData.items com this.items
 *   - updatePlaying faz loop em levelData.items (mesma ref)
 *   - Crédito no canto
 *   - Game Over reseta para 1-1
 *   - Boss ativa ao se aproximar
 * ============================================================
 */
"use strict";

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        this.state = 'MENU';
        this.running = false;
        this.paused = false;
        this.gameOver = false;

        this.currentStage = 1;
        this.score = 0;
        this.coins = 0;
        this.timeLeft = CONFIG.GAME.START_TIME;
        this.timeAccumulator = 0;

        this.player = null;
        this.enemies = [];
        this.boss = null;
        this.items = [];
        this.fireballs = [];
        this.coins_entities = [];
        this.levelData = null;

        this.cameraX = 0;
        this.cameraShakeX = 0;
        this.cameraShakeY = 0;

        this.introTimer = 0;
        this.introDuration = 2.5;

        this.levelClearTimer = 0;
        this.levelClearDuration = 3.0;

        this.combo = 0;
        this.comboTimer = 0;

        this.keys = {};
        this.keysPressedThisFrame = {};

        this.fps = Utils.createFpsCounter();
        this.autosaveTimer = 0;
        this.lastTime = performance.now();
        this.playTimeAccumulator = 0;

        UI.init();
        this.initControls();
        this.initAudioUnlock();

        MenuManager.setState('MAIN_MENU');

        requestAnimationFrame((t) => this.gameLoop(t));
        setInterval(() => this.autosave(), 15000);
        window.addEventListener('beforeunload', () => this.autosave());
    }

    /* ========================================================
       INPUT
    ======================================================== */
    initControls() {
        window.addEventListener('keydown', (e) => {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
            if (!this.keys[e.code]) this.keysPressedThisFrame[e.code] = true;
            this.keys[e.code] = true;
            this.handleHotkeys(e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });

        window.addEventListener('blur', () => {
            this.keys = {};
            if (this.state === 'PLAYING') this.pause();
        });
    }

    initAudioUnlock() {
        const unlock = () => {
            SoundManager.init();
            SoundManager.resume();
        };
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('click', unlock, { once: true });
    }

    handleHotkeys(code) {
        if ((code === 'KeyP' || code === 'Escape') && this.state === 'PLAYING') {
            this.pause();
            return;
        }

        if (code === 'KeyM') {
            const muted = SoundManager.toggleMute();
            EffectsManager.text(
                this.player ? this.player.x + 12 : 400,
                this.player ? this.player.y - 20 : 100,
                muted ? 'SOM OFF' : 'SOM ON',
                { color: '#FFF', size: 12 }
            );
            return;
        }

        if (code === 'KeyR' && (this.state === 'PLAYING' || this.state === 'PAUSED')) {
            this.restartLevel();
            return;
        }

        if (this.state !== 'PLAYING' && this.state !== 'LEVEL_INTRO') {
            MenuManager.handleInput(code);
        }
    }

    /* ========================================================
       FLUXO
    ======================================================== */
    startNewGame() {
        const data = SAVE.get();
        data.player.lives = CONFIG.PLAYER.START_LIVES;
        data.player.coins = 0;
        data.player.score = 0;
        data.player.powerState = 'small';
        data.player.currentLevel = 1;
        data.progress.unlockedLevel = 1;
        SAVE.save(data);

        this.currentStage = 1;
        this.score = 0;
        this.coins = 0;
        this.player = null;
        this.playTimeAccumulator = 0;

        this.loadLevel(this.currentStage);
        this.startLevelIntro();
    }

    continueFromSave() {
        const data = SAVE.validate();

        this.currentStage = data.player.currentLevel || 1;
        this.score = data.player.score || 0;
        this.coins = data.player.coins || 0;

        this.loadLevel(this.currentStage);

        if (this.player && data.player.powerState) {
            this.player.powerState = data.player.powerState;
            if (data.player.powerState !== 'small') {
                this.player.height = CONFIG.PLAYER.HEIGHT_BIG;
                const spawnY = this.levelData.groundY - this.player.height - 4;
                this.player.y = spawnY;
            }
        }

        this.startLevelIntro();
    }

    stopGame() {
        this.running = false;
        this.state = 'MENU';
        this.paused = false;
        SoundManager.stopMusic();
    }

    pause() {
        if (this.state !== 'PLAYING') return;
        this.state = 'PAUSED';
        this.paused = true;
        MenuManager.setState('PAUSED');
        SoundManager.pauseMusic();
    }

    resume() {
        if (this.state !== 'PAUSED') return;
        this.state = 'PLAYING';
        this.paused = false;
        SoundManager.resumeMusic();
    }

    restartLevel() {
        this.loadLevel(this.currentStage);
        this.startLevelIntro();
    }

    nextLevel() {
        if (this.currentStage < CONFIG.GAME.LEVELS_TOTAL) {
            this.currentStage++;
            SAVE.completeLevel(this.currentStage - 1, CONFIG.GAME.START_TIME - this.timeLeft);
            this.loadLevel(this.currentStage);
            this.startLevelIntro();
        } else {
            this.victory();
        }
    }

    victory() {
        this.state = 'VICTORY';
        this.running = false;
        MenuManager.setState('VICTORY');
        SoundManager.stopMusic();
        SoundManager.playVictory();
        EffectsManager.emitConfetti(80);
        EffectsManager.flashScreen('#FFD700', 0.6);
    }

    gameOverSequence() {
        this.state = 'GAME_OVER';
        this.running = false;
        MenuManager.setState('GAME_OVER');
        SoundManager.stopMusic();
        SoundManager.playGameOver();

        const data = SAVE.get();
        data.player.lives = CONFIG.PLAYER.START_LIVES;
        data.player.coins = 0;
        data.player.score = 0;
        data.player.powerState = 'small';
        data.player.currentLevel = 1;
        data.progress.unlockedLevel = 1;
        SAVE.save(data);
    }

    startLevelIntro() {
        this.state = 'LEVEL_INTRO';
        this.introTimer = this.introDuration;

        const spawnY = this.levelData.groundY - CONFIG.PLAYER.HEIGHT_SMALL - 4;

        if (!this.player) {
            this.player = new Player(80, spawnY);
            this.player.lives = SAVE.get().player.lives;
        } else {
            this.player.x = 80;
            this.player.y = spawnY;
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.dead = false;
            this.player.deadTimer = 0;
            this.player.isGrounded = true;
            this.player.powerState = 'small';
            this.player.height = CONFIG.PLAYER.HEIGHT_SMALL;
            this.player.starActive = false;
            this.player.invulnerable = false;
        }

        SoundManager.startMusic(this.levelData.theme);
    }

    /* ========================================================
       CARREGAR FASE
    ======================================================== */
    loadLevel(stageId) {
        this.levelData = WorldManager.getLevel(stageId);
        this.currentStage = stageId;

        this.enemies = [];
        this.items = [];
        this.fireballs = [];
        this.coins_entities = [];
        this.boss = null;

        for (const e of this.levelData.enemies) {
            this.enemies.push(new Enemy(e.x, e.y, e.minX, e.maxX, e.type));
        }

        for (const c of this.levelData.coins) {
            this.coins_entities.push({
                x: c.x, y: c.y, width: 16, height: 16,
                collected: false, animTimer: Math.random() * 2,
            });
        }

        for (const it of (this.levelData.items || [])) {
            this.items.push(new Item(it.x, it.y, it.type));
        }

        if (this.levelData.hasBoss && this.levelData.bossSpawn) {
            const bs = this.levelData.bossSpawn;
            this.boss = new Boss(bs.x, bs.y, bs.minX, bs.maxX);
        }

        /* ⚠️ Sincroniza referências: player escreve em levelData.items */
        this.levelData.items = this.items;

        this.cameraX = 0;
        this.timeLeft = CONFIG.GAME.START_TIME;
        this.timeAccumulator = 0;
        this.combo = 0;
        this.comboTimer = 0;

        EffectsManager.clear();
        UI.setLives(this.player ? this.player.lives : SAVE.get().player.lives);
    }

    /* ========================================================
       LOOP
    ======================================================== */
    gameLoop(currentTime) {
        const dt = Math.min((currentTime - this.lastTime) / 1000, CONFIG.CANVAS.MAX_DELTA);
        this.lastTime = currentTime;

        this.update(dt);
        this.draw();

        this.keysPressedThisFrame = {};
        requestAnimationFrame((t) => this.gameLoop(t));
    }

    update(dt) {
        EffectsManager.update(dt);

        if (this.comboTimer > 0) {
            this.comboTimer -= dt;
            if (this.comboTimer <= 0) this.combo = 0;
        }

        switch (this.state) {
            case 'LEVEL_INTRO': this.updateLevelIntro(dt); break;
            case 'PLAYING':     this.updatePlaying(dt); break;
            case 'LEVEL_CLEAR': this.updateLevelClear(dt); break;
            case 'VICTORY':     this.updateVictory(dt); break;
        }

        this.fps.tick();

        if (this.state === 'PLAYING') {
            this.playTimeAccumulator += dt;
            if (this.playTimeAccumulator >= 1) {
                SAVE.addPlayTime(1);
                this.playTimeAccumulator -= 1;
            }
        }
    }

    updateLevelIntro(dt) {
        this.introTimer -= dt;
        if (this.introTimer <= 0) {
            this.state = 'PLAYING';
            this.running = true;
        }
    }

    updateLevelClear(dt) {
        this.levelClearTimer -= dt;

        if (this.timeLeft > 0) {
            const drain = Math.min(this.timeLeft, dt * 200);
            this.timeLeft -= drain;
            const bonus = Math.floor(drain) * CONFIG.SCORE.TIME_BONUS;
            this.addScore(bonus);

            if (Math.floor(this.timeLeft) % 10 === 0 && Math.random() < 0.3) {
                SoundManager.playCoin();
            }
        }

        if (this.levelClearTimer <= 0) {
            if (this.currentStage < CONFIG.GAME.LEVELS_TOTAL) {
                MenuManager.setState('LEVEL_CLEAR');
            } else {
                this.victory();
            }
        }
    }

    updateVictory(dt) {
        if (Math.random() < 0.1) EffectsManager.emitConfetti(3);
    }

    updatePlaying(dt) {
        /* Timer */
        this.timeAccumulator += dt;
        if (this.timeAccumulator >= 1) {
            this.timeAccumulator -= 1;
            this.timeLeft -= 1;
            if (this.timeLeft <= 0) { this.player.kill(); return; }
            if (this.timeLeft === 30) SoundManager.playMenuSelect();
        }

        /* Player */
        this.player.update(dt, this.keys, this.levelData, this.fireballs);

        /* Inimigos */
        for (const enemy of this.enemies) enemy.update(dt, this.levelData);

        /* Boss */
        if (this.boss && this.boss.isAlive) {
            this.boss.update(dt, this.levelData, this.player.x);
            if (this.boss.active && !this.boss.stomped) {
                this.checkBossPlayerCollision();
                this.checkBossFireballPlayerCollisions();
            }
        }

        /* Fireballs */
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            fb.update(dt, this.levelData);
            if (!fb.active) Utils.removeAt(this.fireballs, i);
        }

        /* ===== ITENS (power-ups) — usa levelData.items ===== */
        const items = this.levelData.items;
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            item.update(dt, this.levelData);

            if (!item.collected && Utils.aabb(this.player, item)) {
                item.collected = true;
                this.player.collectPowerUp(item.type);
                this.addScore(CONFIG.SCORE.POWERUP);

                if (item.type === 'star') {
                    EffectsManager.flashScreen('#FFD700', 0.5);
                }

                EffectsManager.text(
                    this.player.x + 12,
                    this.player.y - 20,
                    item.type === 'mushroom' ? 'GIGANTE!' :
                    item.type === 'fireflower' ? 'FOGO!' : 'STAR!',
                    { color: '#FFD700', size: 10, life: 1.0 }
                );
            }

            if (item.collected || !item.active) {
                Utils.removeAt(items, i);
            }
        }

        /* Moedas */
        for (let i = this.coins_entities.length - 1; i >= 0; i--) {
            const c = this.coins_entities[i];
            c.animTimer += dt;

            if (!c.collected && Utils.aabb(this.player, c)) {
                c.collected = true;
                this.addCoin(1);
                this.addScore(CONFIG.SCORE.COIN);
                SoundManager.playCoin();
                EffectsManager.textScore(c.x + 8, c.y - 5, CONFIG.SCORE.COIN);
                EffectsManager.emitSparkles(c.x + 8, c.y + 8, 6, '#FFD700');
            }
            if (c.collected) Utils.removeAt(this.coins_entities, i);
        }

        /* Colisões */
        this.checkPlayerEnemyCollisions();
        this.checkFireballEnemyCollisions();
        this.checkFireballBossCollisions();
        this.checkFlagCollision();

        /* Player morreu */
        if (this.player.dead) {
            this.player.deadTimer = (this.player.deadTimer || 0) + dt;
            if (this.player.deadTimer > 1.5) this.handlePlayerDeathResolved();
        }

        this.updateCamera(dt);
        this.updateHUD();
    }

    /* ========================================================
       COLISÕES
    ======================================================== */
    checkPlayerEnemyCollisions() {
        const p = this.player;
        if (p.dead) return;

        for (const enemy of this.enemies) {
            if (!enemy.isAlive || enemy.stomped) continue;
            if (!Utils.aabb(p, enemy)) continue;

            const fallingOnTop = p.vy > 0 && p.y + p.height - p.vy <= enemy.y + 12;

            if (p.isStarPowered) {
                enemy.stomped = true;
                enemy.stompTimer = 0.3;
                this.onEnemyKilled(enemy);
                continue;
            }

            if (fallingOnTop) {
                const result = enemy.stomp();
                if (result.killed) this.onEnemyKilled(enemy);

                if (result.shell) {
                    p.vy = CONFIG.ENEMY.STOMP_BOUNCE;
                    EffectsManager.text(enemy.x + 12, enemy.y - 10,
                        result.kick ? 'KICK!' : 'CASCO!',
                        { color: '#4CAF50', size: 10, life: 0.8 });
                } else {
                    p.vy = CONFIG.ENEMY.STOMP_BOUNCE;
                }
                EffectsManager.emitDust(enemy.x + enemy.width / 2, enemy.y + enemy.height, 4);
            } else {
                if (enemy.isShell && enemy.isShellMoving) p.takeDamage();
                else if (!enemy.isShell) p.takeDamage();
                else if (enemy.isShell && !enemy.isShellMoving) {
                    const result = enemy.stomp();
                    if (result.kick) p.vy = CONFIG.ENEMY.STOMP_BOUNCE * 0.6;
                }
            }
        }

        for (const shell of this.enemies) {
            if (!shell.isShell || !shell.isShellMoving || !shell.isAlive) continue;
            for (const other of this.enemies) {
                if (other === shell || !other.isAlive || other.stomped) continue;
                if (!Utils.aabb(shell, other)) continue;
                other.stomped = true;
                other.stompTimer = 0.3;
                this.onEnemyKilled(other);
                SoundManager.playEnemyHit();
            }
        }
    }

    checkFireballEnemyCollisions() {
        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            if (!fb.active) continue;

            for (const enemy of this.enemies) {
                if (!enemy.isAlive || enemy.stomped) continue;
                if (!Utils.aabb(fb, enemy)) continue;

                fb.active = false;
                const killed = enemy.hitByFireball();
                if (killed) this.onEnemyKilled(enemy);
                EffectsManager.emitExplosion(fb.x + 5, fb.y + 5, '#FF6D00');
                Utils.removeAt(this.fireballs, i);
                break;
            }
        }
    }

    checkFireballBossCollisions() {
        if (!this.boss || !this.boss.isAlive || this.boss.stomped) return;
        if (!this.boss.active) return;

        for (let i = this.fireballs.length - 1; i >= 0; i--) {
            const fb = this.fireballs[i];
            if (!fb.active || !Utils.aabb(fb, this.boss)) continue;

            fb.active = false;
            const result = this.boss.hitByFireball();
            if (result.killed) this.onBossKilled();
            else this.addScore(CONFIG.SCORE.BOSS_HIT);
            Utils.removeAt(this.fireballs, i);
        }
    }

    checkBossFireballPlayerCollisions() {
        if (!this.boss) return;
        const p = this.player;
        if (p.dead || p.invulnerable) return;

        for (let i = this.boss.fireballs.length - 1; i >= 0; i--) {
            const fb = this.boss.fireballs[i];
            if (!fb.active || !Utils.aabb(p, fb)) continue;
            fb.active = false;
            p.takeDamage();
            Utils.removeAt(this.boss.fireballs, i);
        }
    }

    checkBossPlayerCollision() {
        if (!this.boss || !this.boss.isAlive || this.boss.stomped) return;
        if (!this.boss.active) return;
        const p = this.player;
        if (p.dead || !Utils.aabb(p, this.boss)) return;

        const fallingOnTop = p.vy > 0 && p.y + p.height - p.vy <= this.boss.y + 16;

        if (fallingOnTop && !p.invulnerable) {
            const result = this.boss.stomp();
            p.vy = CONFIG.ENEMY.STOMP_BOUNCE * 1.2;
            if (result.killed) this.onBossKilled();
            else this.addScore(CONFIG.SCORE.BOSS_HIT);
            EffectsManager.shake(10, 0.4);
            return;
        }

        if (!this.boss.stomped) p.takeDamage();
    }

    checkFlagCollision() {
        const flag = this.levelData.platforms.find(p => p.type === 'flagpole');
        if (!flag) return;

        const flagRect = { x: flag.x - 8, y: flag.y, width: flag.width + 16, height: flag.height };
        if (Utils.aabb(this.player, flagRect)) this.onLevelComplete();
    }

    /* ========================================================
       EVENTOS
    ======================================================== */
    onEnemyKilled(enemy) {
        this.addScore(CONFIG.SCORE.ENEMY);
        this.combo++;
        this.comboTimer = 3.0;

        const comboBonus = Math.max(0, (this.combo - 1)) * 100;
        const total = CONFIG.SCORE.ENEMY + comboBonus;
        if (comboBonus > 0) this.addScore(comboBonus);

        EffectsManager.textScore(enemy.x + enemy.width / 2, enemy.y - 5, total,
            this.combo >= 3 ? '#FF2A6D' : '#FFD700');

        if (this.combo >= 3) {
            EffectsManager.textCombo(enemy.x + enemy.width / 2, enemy.y - 25, this.combo);
        }

        const stats = SAVE.getStats();
        stats.totalEnemies++;
    }

    onBossKilled() {
        this.addScore(CONFIG.SCORE.BOSS_KILL);
        EffectsManager.text(this.boss.x + this.boss.width / 2, this.boss.y - 20,
            'BOSS DERROTADO!', { color: '#FFD700', size: 14, life: 2.5 });
        EffectsManager.flashScreen('#FFD700', 0.5);
        SoundManager.playVictory();
    }

    onBossDefeated() {
        setTimeout(() => {
            if (this.state === 'PLAYING') this.onLevelComplete();
        }, 1500);
    }

    onPlayerDeath() {
        this.player.deadTimer = 0;
    }

    handlePlayerDeathResolved() {
        const lives = SAVE.loseLife();
        this.player.lives = lives;
        UI.setLives(lives);

        if (lives <= 0) {
            this.gameOverSequence();
        } else {
            const spawnY = this.levelData.groundY - CONFIG.PLAYER.HEIGHT_SMALL - 4;

            this.player.dead = false;
            this.player.deadTimer = 0;
            this.player.x = 80;
            this.player.y = spawnY;
            this.player.vx = 0;
            this.player.vy = 0;
            this.player.powerState = 'small';
            this.player.height = CONFIG.PLAYER.HEIGHT_SMALL;
            this.player.invulnerable = true;
            this.player.invulnerableTimer = 2.0;
            this.player.starActive = false;

            this.timeLeft = CONFIG.GAME.START_TIME;
            this.startLevelIntro();
        }
    }

    onLevelComplete() {
        if (this.state !== 'PLAYING') return;
        this.state = 'LEVEL_CLEAR';
        this.levelClearTimer = this.levelClearDuration;
        this.running = false;

        SoundManager.stopMusic();
        SoundManager.playStageClear();
        EffectsManager.text(this.player.x + 12, this.player.y - 20, 'FASE COMPLETA!',
            { color: '#4CAF50', size: 16, life: 2.5 });
    }

    /* ========================================================
       SCORE / COINS / HUD / CAMERA
    ======================================================== */
    addScore(n) { this.score += n; SAVE.addScore(n); }

    addCoin(n = 1) {
        this.coins += n;
        this.coins = SAVE.addCoins(n);
    }

    updateHUD() {
        UI.update({
            score: this.score,
            coins: SAVE.get().player.coins,
            lives: this.player ? this.player.lives : 0,
            time: this.timeLeft,
            level: this.levelData ? this.levelData.id : '1-1',
            power: this.player ? this.player.powerState : 'small',
        });
    }

    updateCamera(dt) {
        const targetX = this.player.x + this.player.vx * 10 - this.width / 3;
        this.cameraX += (targetX - this.cameraX) * CONFIG.CAMERA.FOLLOW_SPEED;
        const maxX = Math.max(0, this.levelData.length - this.width);
        this.cameraX = Utils.clamp(this.cameraX, 0, maxX);

        const shake = EffectsManager.getShakeOffset();
        this.cameraShakeX = shake.x;
        this.cameraShakeY = shake.y;
    }

    autosave() {
        if (this.state !== 'PLAYING' && this.state !== 'PAUSED') return;

        const data = SAVE.collect(this);
        data.player.currentLevel = this.currentStage;
        data.player.powerState = this.player.powerState;
        data.player.lives = this.player.lives;
        data.player.score = this.score;
        data.player.coins = SAVE.get().player.coins;
        SAVE.save(data);
    }

    /* ========================================================
       DRAW
    ======================================================== */
    draw() {
        const ctx = this.ctx;

        ctx.save();
        ctx.translate(this.cameraShakeX, this.cameraShakeY);

        this.drawBackground(ctx);

        if (this.state === 'PLAYING' || this.state === 'PAUSED' ||
            this.state === 'LEVEL_CLEAR' || this.state === 'LEVEL_INTRO') {
            this.drawWorld(ctx);
        }

        ctx.restore();

        if (this.state === 'LEVEL_INTRO') {
            MenuManager.drawLevelIntro(ctx, this.width, this.height,
                this.levelData.name, this.introTimer, this.introDuration);
        } else {
            MenuManager.draw(ctx, this.width, this.height);
        }

        EffectsManager.drawOverlay(ctx);
        UI.drawFpsCounter(ctx, this.fps.value);
        this.drawCredit(ctx);
    }

    drawCredit(ctx) {
        ctx.save();
        const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 800);
        ctx.font = 'bold 7px "Press Start 2P", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';

        const x = this.width - 8;
        const y = this.height - 6;
        const text = 'Feito por Gabriel Oliveira Rocha';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillText(text, x + 1, y + 1);

        ctx.shadowBlur = 6 * pulse;
        ctx.shadowColor = '#FFD700';
        ctx.fillStyle = `rgba(255, 215, 0, ${0.7 + 0.3 * pulse})`;
        ctx.fillText(text, x, y);

        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    drawBackground(ctx) {
        if (!this.levelData) {
            const g = ctx.createLinearGradient(0, 0, 0, this.height);
            g.addColorStop(0, '#0a0a1e');
            g.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, this.width, this.height);
            return;
        }

        const theme = CONFIG.THEMES[this.levelData.theme] || CONFIG.THEMES.overworld;
        const g = ctx.createLinearGradient(0, 0, 0, this.height);
        g.addColorStop(0, theme.bgTop);
        g.addColorStop(1, theme.bgBottom);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, this.width, this.height);

        if (this.levelData.theme === 'overworld') {
            this.drawParallaxClouds(ctx);
            this.drawParallaxHills(ctx);
        } else if (this.levelData.theme === 'underground') {
            this.drawParallaxBricks(ctx);
        } else if (this.levelData.theme === 'castle') {
            this.drawParallaxLava(ctx);
        }
    }

    drawParallaxClouds(ctx) {
        const camFactor = this.cameraX * 0.2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        for (let i = 0; i < 8; i++) {
            const baseX = i * 400 - camFactor;
            const x = ((baseX % 3200) + 3200) % 3200 - 200;
            const y = 60 + (i * 37) % 80;
            this.drawCloud(ctx, x, y, 40 + (i % 3) * 15);
        }
    }

    drawCloud(ctx, x, y, size) {
        ctx.beginPath();
        ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y - size * 0.2, size * 0.6, 0, Math.PI * 2);
        ctx.arc(x + size * 1.0, y, size * 0.5, 0, Math.PI * 2);
        ctx.arc(x + size * 0.5, y + size * 0.2, size * 0.55, 0, Math.PI * 2);
        ctx.fill();
    }

    drawParallaxHills(ctx) {
        const camFactor = this.cameraX * 0.4;
        ctx.fillStyle = 'rgba(0, 100, 0, 0.3)';
        for (let i = 0; i < 6; i++) {
            const baseX = i * 500 - camFactor;
            const x = ((baseX % 3000) + 3000) % 3000 - 150;
            ctx.beginPath();
            ctx.moveTo(x, this.height);
            ctx.quadraticCurveTo(x + 100, this.height - 150, x + 200, this.height);
            ctx.fill();
        }
    }

    drawParallaxBricks(ctx) {
        const camFactor = this.cameraX * 0.15;
        ctx.fillStyle = 'rgba(50, 50, 60, 0.5)';
        for (let i = 0; i < 30; i++) {
            const x = (i * 60 - camFactor) % 900;
            const y = 40 + (i * 23) % 60;
            ctx.fillRect(x, y, 20, 10);
        }
    }

    drawParallaxLava(ctx) {
        const camFactor = this.cameraX * 0.1;
        const grad = ctx.createLinearGradient(0, this.height - 150, 0, this.height);
        grad.addColorStop(0, 'rgba(255, 87, 34, 0)');
        grad.addColorStop(1, 'rgba(255, 87, 34, 0.5)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, this.height - 150, this.width, 150);

        const t = Date.now() / 500;
        for (let i = 0; i < 6; i++) {
            const x = (i * 200 - camFactor) % 900;
            const y = this.height - 30 + Math.sin(t + i) * 5;
            ctx.fillStyle = 'rgba(255, 200, 0, 0.4)';
            ctx.beginPath();
            ctx.arc(x, y, 6 + Math.sin(t + i) * 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    drawWorld(ctx) {
        this.drawGround(ctx);
        this.drawPlatforms(ctx);
        this.drawPipes(ctx);
        this.drawCoins(ctx);

        for (const item of this.levelData.items) item.draw(ctx, this.cameraX);
        for (const fb of this.fireballs) fb.draw(ctx, this.cameraX);
        for (const enemy of this.enemies) enemy.draw(ctx, this.cameraX);
        if (this.boss) this.boss.draw(ctx, this.cameraX);
        if (this.player) this.player.draw(ctx, this.cameraX);

        EffectsManager.draw(ctx, this.cameraX);
        UI.drawTimeWarning(ctx, this.timeLeft);
        UI.drawCombo(ctx, this.combo);
    }

    drawGround(ctx) {
        const theme = CONFIG.THEMES[this.levelData.theme] || CONFIG.THEMES.overworld;
        const tile = CONFIG.CANVAS.TILE;
        const gy = this.levelData.groundY;
        const len = this.levelData.length;

        const startTile = Math.floor(this.cameraX / tile);
        const endTile = Math.ceil((this.cameraX + this.width) / tile) + 1;

        for (let i = startTile; i < endTile; i++) {
            const x = i * tile;
            if (x < 0 || x >= len) continue;

            const inGap = this.levelData.gaps.some(g => x >= g.x && x < g.x + g.width);
            if (inGap) continue;

            const sx = x - this.cameraX;

            ctx.fillStyle = theme.ground;
            ctx.fillRect(sx, gy, tile, 8);

            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(sx, gy, tile, 2);

            ctx.fillStyle = theme.groundBody;
            ctx.fillRect(sx, gy + 8, tile, this.height - gy - 8);

            ctx.strokeStyle = 'rgba(0,0,0,0.2)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, gy + 20);
            ctx.lineTo(sx + tile, gy + 20);
            ctx.moveTo(sx + tile / 2, gy + 8);
            ctx.lineTo(sx + tile / 2, gy + 20);
            ctx.stroke();
        }
    }

    drawPlatforms(ctx) {
        for (const p of this.levelData.platforms) {
            const sx = p.x - this.cameraX;
            if (sx + p.width < 0 || sx > this.width) continue;

            switch (p.type) {
                case 'brick':
                case 'used':
                    this.drawBrick(ctx, sx, p); break;
                case 'question':
                    this.drawQuestionBlock(ctx, sx, p); break;
                case 'flagpole':
                    this.drawFlagpole(ctx, sx, p); break;
                case 'castle':
                    this.drawCastle(ctx, sx, p); break;
                default:
                    ctx.fillStyle = CONFIG.COLORS.BRICK;
                    ctx.fillRect(sx, p.y, p.width, p.height);
            }
        }
    }

    drawBrick(ctx, sx, p) {
        const used = p.type === 'used';
        const base = used ? CONFIG.COLORS.USED : CONFIG.COLORS.BRICK;

        ctx.fillStyle = base;
        ctx.fillRect(sx, p.y, p.width, p.height);

        const grad = ctx.createLinearGradient(sx, p.y, sx, p.y + p.height);
        grad.addColorStop(0, 'rgba(255,255,255,0.15)');
        grad.addColorStop(1, 'rgba(0,0,0,0.2)');
        ctx.fillStyle = grad;
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 1;
        for (let i = 1; i < p.width / 16; i++) {
            ctx.beginPath();
            ctx.moveTo(sx + i * 16, p.y);
            ctx.lineTo(sx + i * 16, p.y + p.height);
            ctx.stroke();
        }
        for (let j = 1; j < p.height / 16; j++) {
            ctx.beginPath();
            ctx.moveTo(sx, p.y + j * 16);
            ctx.lineTo(sx + p.width, p.y + j * 16);
            ctx.stroke();
        }

        ctx.strokeStyle = '#000';
        ctx.strokeRect(sx + 0.5, p.y + 0.5, p.width - 1, p.height - 1);
    }

    drawQuestionBlock(ctx, sx, p) {
        const t = Date.now() / 300;
        const pulse = 0.5 + 0.5 * Math.sin(t);

        ctx.fillStyle = CONFIG.COLORS.QUESTION;
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.fillStyle = `rgba(255, 235, 59, ${0.2 + 0.2 * pulse})`;
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, p.y + 1, p.width - 2, p.height - 2);

        ctx.fillStyle = '#FFF';
        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', sx + p.width / 2, p.y + p.height / 2 + 8);
        ctx.textAlign = 'left';

        ctx.fillStyle = '#F57F17';
        ctx.fillRect(sx + 2, p.y + 2, 4, 4);
        ctx.fillRect(sx + p.width - 6, p.y + 2, 4, 4);
        ctx.fillRect(sx + 2, p.y + p.height - 6, 4, 4);
        ctx.fillRect(sx + p.width - 6, p.y + p.height - 6, 4, 4);
    }

    drawFlagpole(ctx, sx, p) {
        ctx.fillStyle = '#E0E0E0';
        ctx.fillRect(sx + 5, p.y, 6, p.height);

        ctx.fillStyle = '#757575';
        ctx.fillRect(sx, p.y + p.height - 12, 16, 12);

        const wave = Math.sin(Date.now() / 200) * 3;
        ctx.fillStyle = '#4CAF50';
        ctx.beginPath();
        ctx.moveTo(sx + 11, p.y + 20);
        ctx.lineTo(sx + 11 + 32, p.y + 25 + wave);
        ctx.lineTo(sx + 11 + 32, p.y + 45 + wave);
        ctx.lineTo(sx + 11, p.y + 50);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(sx + 11 + 16, p.y + 35 + wave, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(sx + 8, p.y + 5, 6, 0, Math.PI * 2);
        ctx.fill();
    }

    drawCastle(ctx, sx, p) {
        ctx.fillStyle = '#8D6E63';
        ctx.fillRect(sx, p.y, p.width, p.height);

        ctx.fillStyle = '#5D4037';
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(sx + i * 16, p.y - 8, 8, 8);
        }

        ctx.fillStyle = '#212121';
        ctx.fillRect(sx + p.width / 2 - 10, p.y + p.height - 30, 20, 30);

        ctx.fillStyle = '#000';
        ctx.fillRect(sx + 10, p.y + 15, 8, 10);
        ctx.fillRect(sx + p.width - 18, p.y + 15, 8, 10);

        ctx.fillStyle = '#FFD700';
        ctx.fillRect(sx + p.width / 2 - 1, p.y - 20, 2, 20);
        ctx.beginPath();
        ctx.moveTo(sx + p.width / 2 + 1, p.y - 20);
        ctx.lineTo(sx + p.width / 2 + 15, p.y - 15);
        ctx.lineTo(sx + p.width / 2 + 1, p.y - 10);
        ctx.fill();
    }

    drawPipes(ctx) {
        for (const p of this.levelData.pipes) {
            const sx = p.x - this.cameraX;
            if (sx + p.width + 16 < 0 || sx - 8 > this.width) continue;

            const h = p.height ?? 96;
            const pipeColor = CONFIG.THEMES[this.levelData.theme]?.pipe || CONFIG.COLORS.PIPE;

            const aroX = sx - 4;
            const aroY = p.y;
            const aroW = p.width + 8;
            const aroH = 14;

            ctx.fillStyle = pipeColor;
            ctx.fillRect(aroX, aroY, aroW, aroH);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(aroX + aroW - 8, aroY, 8, aroH);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(aroX + 2, aroY + 2, 5, aroH - 4);
            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(aroX + 0.5, aroY + 0.5, aroW - 1, aroH - 1);

            const bodyX = sx;
            const bodyY = p.y + aroH;
            const bodyW = p.width;
            const bodyH = h - aroH;

            ctx.fillStyle = pipeColor;
            ctx.fillRect(bodyX, bodyY, bodyW, bodyH);
            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.fillRect(bodyX + bodyW - 8, bodyY, 8, bodyH);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.fillRect(bodyX + 2, bodyY, 5, bodyH);

            ctx.strokeStyle = 'rgba(0,0,0,0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(bodyX + 0.5, bodyY);
            ctx.lineTo(bodyX + 0.5, bodyY + bodyH);
            ctx.moveTo(bodyX + bodyW - 0.5, bodyY);
            ctx.lineTo(bodyX + bodyW - 0.5, bodyY + bodyH);
            ctx.stroke();

            if (p.hasText) this.drawPipeText(ctx, sx, p, pipeColor);
        }
    }

    drawPipeText(ctx, sx, pipe, pipeColor) {
        const cx = sx + pipe.width / 2;
        const cy = pipe.y + 14 + (pipe.height - 14) / 2;

        ctx.save();

        const textW = 44;
        const textH = 11;
        const boxX = cx - textW / 2;
        const boxY = cy - textH / 2;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.fillRect(boxX, boxY, textW, textH);

        ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 0.5, boxY + 0.5, textW - 1, textH - 1);

        ctx.font = 'bold 7px "Press Start 2P", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.fillStyle = 'rgba(0, 0, 0, 0.95)';
        ctx.fillText('vai ds', cx + 1, cy + 1);

        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 3;
        ctx.shadowColor = '#FFD700';
        ctx.fillText('vai ds', cx, cy);

        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.restore();
    }

    drawCoins(ctx) {
        for (const c of this.coins_entities) {
            const sx = c.x - this.cameraX;
            if (sx + 16 < 0 || sx > this.width) continue;

            const t = c.animTimer * 3;
            const scaleX = Math.abs(Math.cos(t));
            const bob = Math.sin(c.animTimer * 4) * 1.5;

            ctx.save();
            ctx.translate(sx + 8, c.y + 8 + bob);
            ctx.scale(scaleX, 1);

            ctx.fillStyle = '#FFC107';
            ctx.beginPath();
            ctx.arc(0, 0, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath();
            ctx.arc(0, 0, 6, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#F57F17';
            ctx.fillRect(-1, -4, 2, 8);

            ctx.restore();
        }
    }
}

/* ============================================================
   BOOT
============================================================ */
window.addEventListener('DOMContentLoaded', () => {
    window.GAME = new Game();
});

window.Game = Game;