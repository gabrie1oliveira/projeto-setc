/**
 * ============================================================
 * MENU.JS
 * ------------------------------------------------------------
 * Sistema de menus e telas de estado do jogo.
 *
 * Estados:
 *   - MAIN_MENU       → menu inicial
 *   - CONTROLS        → tela de controles
 *   - PLAYING         → jogo rodando (sem overlay)
 *   - PAUSED          → jogo pausado
 *   - LEVEL_INTRO     → tela "MUNDO 1-1" antes de começar
 *   - GAME_OVER       → tela de game over
 *   - VICTORY         → tela de vitória final
 *   - LEVEL_CLEAR     → tela de fase concluída
 *
 * Navegação por teclado (setas + Enter/Espaço).
 * ============================================================
 */
"use strict";

const MenuManager = {

    state: 'MAIN_MENU',
    selectedIndex: 0,
    options: [],
    previousState: null,

    /* ========================================================
       NAVEGAÇÃO
    ======================================================== */

    setState(newState, data = null) {
        this.state = newState;
        this.selectedIndex = 0;
        this.options = this.getOptionsForState(newState);

        /* Transição entre menus → som */
        if (newState !== 'PLAYING') {
            SoundManager.playMenuSelect();
        }

        /* Hooks de entrada */
        if (newState === 'PLAYING' && this.previousState === 'PAUSED') {
            SoundManager.resumeMusic();
        }
        if (newState === 'PAUSED') {
            SoundManager.pauseMusic();
        }

        this.previousState = newState;
    },

    getOptionsForState(state) {
        switch (state) {
            case 'MAIN_MENU':
                return [
                    { label: 'INICIAR JOGO',   action: () => this.startNewGame() },
                    { label: 'CONTINUAR',      action: () => this.continueGame(), disabled: !SAVE.exists() },
                    { label: 'CONTROLES',      action: () => this.setState('CONTROLS') },
                    { label: 'APAGAR SAVE',    action: () => this.confirmReset() },
                ];
            case 'PAUSED':
                return [
                    { label: 'CONTINUAR',      action: () => this.resumeGame() },
                    { label: 'REINICIAR FASE', action: () => this.restartLevel() },
                    { label: 'MENU PRINCIPAL', action: () => this.goToMainMenu() },
                ];
            case 'GAME_OVER':
                return [
                    { label: 'TENTAR DE NOVO', action: () => this.retryFromCheckpoint() },
                    { label: 'MENU PRINCIPAL', action: () => this.goToMainMenu() },
                ];
            case 'VICTORY':
                return [
                    { label: 'JOGAR NOVAMENTE', action: () => this.startNewGame() },
                    { label: 'MENU PRINCIPAL',  action: () => this.goToMainMenu() },
                ];
            case 'LEVEL_CLEAR':
                return [
                    { label: 'PRÓXIMA FASE',   action: () => this.nextLevel() },
                ];
            case 'CONTROLS':
                return [
                    { label: 'VOLTAR',         action: () => this.setState('MAIN_MENU') },
                ];
            default:
                return [];
        }
    },

    /* ========================================================
       INPUT
    ======================================================== */

    handleInput(key) {
        /* Só processa input em menus */
        if (this.state === 'PLAYING' || this.state === 'LEVEL_INTRO') return;

        const opts = this.options;
        if (opts.length === 0) return;

        if (key === 'ArrowUp' || key === 'KeyW') {
            this.moveSelection(-1);
        } else if (key === 'ArrowDown' || key === 'KeyS') {
            this.moveSelection(1);
        } else if (key === 'Enter' || key === 'Space' || key === 'KeyZ') {
            this.confirm();
        } else if (key === 'Escape') {
            this.back();
        }
    },

    moveSelection(dir) {
        const n = this.options.length;
        let next = this.selectedIndex;
        for (let i = 0; i < n; i++) {
            next = (next + dir + n) % n;
            if (!this.options[next].disabled) break;
        }
        if (next !== this.selectedIndex) {
            this.selectedIndex = next;
            SoundManager.playMenuSelect();
        }
    },

    confirm() {
        const opt = this.options[this.selectedIndex];
        if (!opt || opt.disabled) return;
        SoundManager.playMenuConfirm();
        opt.action();
    },

    back() {
        if (this.state === 'PAUSED') {
            this.resumeGame();
        } else if (this.state === 'CONTROLS') {
            this.setState('MAIN_MENU');
        }
    },

    /* ========================================================
       AÇÕES
    ======================================================== */

    startNewGame() {
        SAVE.reset();
        if (window.GAME) {
            GAME.startNewGame();
        }
        this.setState('LEVEL_INTRO');
    },

    continueGame() {
        if (window.GAME) {
            GAME.continueFromSave();
        }
        this.setState('LEVEL_INTRO');
    },

    resumeGame() {
        this.setState('PLAYING');
    },

    restartLevel() {
        if (window.GAME) {
            GAME.restartLevel();
        }
        this.setState('LEVEL_INTRO');
    },

    goToMainMenu() {
        if (window.GAME) {
            GAME.stopGame();
        }
        this.setState('MAIN_MENU');
    },

    nextLevel() {
        if (window.GAME) {
            GAME.nextLevel();
        }
        this.setState('LEVEL_INTRO');
    },

    retryFromCheckpoint() {
        if (window.GAME) {
            GAME.restartLevel();
        }
        this.setState('LEVEL_INTRO');
    },

    confirmReset() {
        if (confirm('Apagar todo o progresso?')) {
            SAVE.reset();
            SoundManager.playPowerDown();
        }
    },

    /* ========================================================
       DRAW
    ======================================================== */

    draw(ctx, width, height) {
        if (this.state === 'PLAYING' || this.state === 'LEVEL_INTRO') return;

        /* Fundo escuro */
        ctx.fillStyle = 'rgba(10, 10, 20, 0.88)';
        ctx.fillRect(0, 0, width, height);

        /* Vinheta de fundo */
        const grad = ctx.createRadialGradient(
            width / 2, height / 2, 100,
            width / 2, height / 2, width * 0.7
        );
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.6)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        switch (this.state) {
            case 'MAIN_MENU':       this.drawMainMenu(ctx, width, height); break;
            case 'PAUSED':          this.drawPaused(ctx, width, height); break;
            case 'GAME_OVER':       this.drawGameOver(ctx, width, height); break;
            case 'VICTORY':         this.drawVictory(ctx, width, height); break;
            case 'LEVEL_CLEAR':     this.drawLevelClear(ctx, width, height); break;
            case 'CONTROLS':        this.drawControls(ctx, width, height); break;
        }
    },

    drawMainMenu(ctx, width, height) {
        const t = Date.now() / 1000;

        /* Título flutuante */
        const titleY = 100 + Math.sin(t * 2) * 4;
        ctx.textAlign = 'center';

        /* Sombra do título */
        ctx.font = 'bold 32px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText('SUPER RETRO', width / 2 + 3, titleY + 3);

        /* Gradiente do título */
        const titleGrad = ctx.createLinearGradient(0, titleY - 30, 0, titleY + 10);
        titleGrad.addColorStop(0, '#FFD700');
        titleGrad.addColorStop(0.5, '#FF9800');
        titleGrad.addColorStop(1, '#E94560');
        ctx.fillStyle = titleGrad;
        ctx.fillText('SUPER RETRO', width / 2, titleY);

        /* Subtítulo */
        ctx.font = '16px "Press Start 2P", monospace';
        ctx.fillStyle = '#4FC3F7';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#4FC3F7';
        ctx.fillText('PLATFORMER 2D', width / 2, titleY + 40);
        ctx.shadowBlur = 0;

        /* Moedas flutuando no fundo */
        this.drawFloatingCoins(ctx, width, height, t);

        /* Opções */
        ctx.font = '14px "Press Start 2P", monospace';
        const startY = height / 2 + 30;
        const spacing = 34;

        this.options.forEach((opt, i) => {
            const y = startY + i * spacing;
            const selected = i === this.selectedIndex;
            const disabled = opt.disabled;

            /* Seta */
            if (selected && !disabled) {
                const arrowBob = Math.sin(t * 8) * 3;
                ctx.fillStyle = '#FFD700';
                ctx.fillText('▶', width / 2 - 150 + arrowBob, y + 4);
            }

            /* Cor */
            if (disabled) {
                ctx.fillStyle = '#444';
            } else if (selected) {
                ctx.fillStyle = '#FFD700';
                ctx.shadowBlur = 12;
                ctx.shadowColor = '#FFD700';
            } else {
                ctx.fillStyle = '#CCC';
            }

            ctx.fillText(opt.label, width / 2, y + 4);
            ctx.shadowBlur = 0;
        });

        /* Versão no rodapé */
        ctx.font = '8px "Press Start 2P", monospace';
        ctx.fillStyle = '#666';
        ctx.fillText('v1.0 · Pressione ENTER para começar', width / 2, height - 20);
        ctx.textAlign = 'left';
    },

    drawFloatingCoins(ctx, width, height, t) {
        const coins = [
            { x: 80,  y: 200, s: 12, spd: 0.6, amp: 15 },
            { x: 130, y: 300, s: 10, spd: 0.8, amp: 20 },
            { x: 700, y: 180, s: 14, spd: 0.5, amp: 18 },
            { x: 720, y: 320, s: 10, spd: 0.9, amp: 12 },
            { x: 180, y: 380, s: 8,  spd: 0.7, amp: 16 },
            { x: 620, y: 380, s: 9,  spd: 0.6, amp: 14 },
        ];

        for (const c of coins) {
            const cy = c.y + Math.sin(t * c.spd * 2) * c.amp;
            const scaleX = Math.abs(Math.cos(t * 2 * c.spd));

            ctx.save();
            ctx.translate(c.x, cy);
            ctx.scale(scaleX, 1);

            /* Corpo */
            ctx.fillStyle = '#FFC107';
            ctx.beginPath();
            ctx.arc(0, 0, c.s, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#FFEB3B';
            ctx.beginPath();
            ctx.arc(0, 0, c.s * 0.7, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#F57F17';
            ctx.fillRect(-1, -c.s * 0.5, 2, c.s);

            ctx.restore();
        }
    },

    drawPaused(ctx, width, height) {
        const t = Date.now() / 1000;

        ctx.textAlign = 'center';

        /* Título */
        ctx.font = 'bold 28px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFD700';
        ctx.fillText('PAUSADO', width / 2, 100);
        ctx.shadowBlur = 0;

        /* Opções */
        ctx.font = '14px "Press Start 2P", monospace';
        const startY = height / 2;
        const spacing = 40;

        this.options.forEach((opt, i) => {
            const y = startY + i * spacing;
            const selected = i === this.selectedIndex;

            if (selected) {
                const arrowBob = Math.sin(t * 8) * 3;
                ctx.fillStyle = '#FFD700';
                ctx.fillText('▶', width / 2 - 160 + arrowBob, y + 4);
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = '#CCC';
            }

            ctx.fillText(opt.label, width / 2, y + 4);
        });

        /* Dica */
        ctx.font = '9px "Press Start 2P", monospace';
        ctx.fillStyle = '#888';
        ctx.fillText('ESC para continuar', width / 2, height - 30);
        ctx.textAlign = 'left';
    },

    drawGameOver(ctx, width, height) {
        const t = Date.now() / 1000;

        ctx.textAlign = 'center';

        /* Sacudir o título */
        const shakeX = Math.sin(t * 20) * 2;
        const shakeY = Math.cos(t * 20) * 2;

        /* Sombra */
        ctx.font = 'bold 32px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillText('GAME OVER', width / 2 + shakeX + 3, 130 + shakeY + 3);

        /* Texto */
        ctx.fillStyle = '#FF2A6D';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FF2A6D';
        ctx.fillText('GAME OVER', width / 2 + shakeX, 130 + shakeY);
        ctx.shadowBlur = 0;

        /* Score final */
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFF';
        const score = window.GAME ? GAME.score : 0;
        ctx.fillText(`PONTUAÇÃO: ${Utils.pad(score, 6)}`, width / 2, 180);

        /* Opções */
        ctx.font = '14px "Press Start 2P", monospace';
        const startY = height / 2 + 30;
        const spacing = 40;

        this.options.forEach((opt, i) => {
            const y = startY + i * spacing;
            const selected = i === this.selectedIndex;

            if (selected) {
                const arrowBob = Math.sin(t * 8) * 3;
                ctx.fillStyle = '#FFD700';
                ctx.fillText('▶', width / 2 - 160 + arrowBob, y + 4);
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = '#CCC';
            }

            ctx.fillText(opt.label, width / 2, y + 4);
        });

        ctx.textAlign = 'left';
    },

    drawVictory(ctx, width, height) {
        const t = Date.now() / 1000;

        ctx.textAlign = 'center';

        /* Título arco-íris */
        const colors = ['#FFD700', '#FF9800', '#E94560', '#4CAF50', '#2196F3'];
        const c = colors[Math.floor(t * 3) % colors.length];

        ctx.font = 'bold 24px "Press Start 2P", monospace';
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillText('PARABÉNS!', width / 2 + 3, 103);

        ctx.fillStyle = c;
        ctx.shadowBlur = 20;
        ctx.shadowColor = c;
        ctx.fillText('PARABÉNS!', width / 2, 100);
        ctx.shadowBlur = 0;

        /* Subtítulo */
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFF';
        ctx.fillText('VOCÊ ZEROU O JOGO!', width / 2, 140);

        /* Estatísticas */
        const stats = SAVE.getStats();
        const player = SAVE.get().player;

        ctx.font = '10px "Press Start 2P", monospace';
        const lines = [
            `PONTUAÇÃO: ${Utils.pad(player.score, 6)}`,
            `MOEDAS:    ${Utils.pad(stats.totalCoins, 4)}`,
            `INIMIGOS:  ${Utils.pad(stats.totalEnemies, 4)}`,
            `MORTES:    ${Utils.pad(stats.totalDeaths, 3)}`,
            `TEMPO:     ${Utils.formatTime(stats.playTime)}`,
        ];

        lines.forEach((line, i) => {
            ctx.fillStyle = i === 0 ? '#FFD700' : '#FFF';
            ctx.fillText(line, width / 2, 190 + i * 22);
        });

        /* Opções */
        ctx.font = '12px "Press Start 2P", monospace';
        const startY = height - 90;
        const spacing = 30;

        this.options.forEach((opt, i) => {
            const y = startY + i * spacing;
            const selected = i === this.selectedIndex;

            if (selected) {
                const arrowBob = Math.sin(t * 8) * 3;
                ctx.fillStyle = '#FFD700';
                ctx.fillText('▶', width / 2 - 130 + arrowBob, y + 4);
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = '#CCC';
            }

            ctx.fillText(opt.label, width / 2, y + 4);
        });

        ctx.textAlign = 'left';
    },

    drawLevelClear(ctx, width, height) {
        const t = Date.now() / 1000;

        ctx.textAlign = 'center';

        /* Título */
        ctx.font = 'bold 22px "Press Start 2P", monospace';
        ctx.fillStyle = '#4CAF50';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#4CAF50';
        ctx.fillText('FASE CONCLUÍDA!', width / 2, 120);
        ctx.shadowBlur = 0;

        /* Estrelas decorativas */
        for (let i = 0; i < 3; i++) {
            const x = width / 2 - 60 + i * 60;
            const y = 180 + Math.sin(t * 3 + i) * 5;
            this.drawStarIcon(ctx, x, y, 20, i < 3 ? '#FFD700' : '#444');
        }

        /* Bônus de tempo */
        const timeLeft = window.GAME ? GAME.timeLeft : 0;
        const bonus = Math.floor(timeLeft) * CONFIG.SCORE.TIME_BONUS;

        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFF';
        ctx.fillText(`BÔNUS DE TEMPO: +${bonus}`, width / 2, 250);

        /* Opções */
        ctx.font = '14px "Press Start 2P", monospace';
        const startY = height / 2 + 60;

        this.options.forEach((opt, i) => {
            const y = startY + i * 40;
            const selected = i === this.selectedIndex;

            if (selected) {
                const arrowBob = Math.sin(t * 8) * 3;
                ctx.fillStyle = '#FFD700';
                ctx.fillText('▶', width / 2 - 180 + arrowBob, y + 4);
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = '#CCC';
            }

            ctx.fillText(opt.label, width / 2, y + 4);
        });

        ctx.textAlign = 'left';
    },

    drawStarIcon(ctx, x, y, size, color) {
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
            const a2 = (Math.PI * 2 * (i + 0.5)) / 5 - Math.PI / 2;
            const r1 = size, r2 = size * 0.4;
            if (i === 0) ctx.moveTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
            else ctx.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1);
            ctx.lineTo(Math.cos(a2) * r2, Math.sin(a2) * r2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },

    drawControls(ctx, width, height) {
        const t = Date.now() / 1000;

        ctx.textAlign = 'center';

        /* Título */
        ctx.font = 'bold 22px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#FFD700';
        ctx.fillText('CONTROLES', width / 2, 80);
        ctx.shadowBlur = 0;

        /* Lista */
        const controls = [
            { keys: '← →', desc: 'Mover' },
            { keys: 'A D', desc: 'Mover (alternativo)' },
            { keys: 'Z / ESPAÇO / ↑', desc: 'Pular (segurar = mais alto)' },
            { keys: 'X / SHIFT', desc: 'Atirar (quando FIRE)' },
            { keys: 'P / ESC', desc: 'Pausar' },
            { keys: 'R', desc: 'Reiniciar fase' },
            { keys: 'M', desc: 'Mudo/ativo' },
        ];

        ctx.font = '11px "Press Start 2P", monospace';

        controls.forEach((c, i) => {
            const y = 150 + i * 32;

            /* Tecla */
            ctx.fillStyle = '#FFD700';
            ctx.textAlign = 'right';
            ctx.fillText(c.keys, width / 2 - 20, y);

            /* Descrição */
            ctx.fillStyle = '#FFF';
            ctx.textAlign = 'left';
            ctx.fillText(c.desc, width / 2 + 20, y);
        });

        /* Opções */
        ctx.textAlign = 'center';
        ctx.font = '12px "Press Start 2P", monospace';
        const startY = height - 60;

        this.options.forEach((opt, i) => {
            const y = startY + i * 30;
            const selected = i === this.selectedIndex;

            if (selected) {
                const arrowBob = Math.sin(t * 8) * 3;
                ctx.fillStyle = '#FFD700';
                ctx.fillText('▶', width / 2 - 80 + arrowBob, y + 4);
                ctx.fillStyle = '#FFD700';
            } else {
                ctx.fillStyle = '#CCC';
            }

            ctx.fillText(opt.label, width / 2, y + 4);
        });

        ctx.textAlign = 'left';
    },

    /* ========================================================
       LEVEL INTRO (transição "MUNDO 1-1")
    ======================================================== */

    drawLevelIntro(ctx, width, height, levelName, timer, maxTimer) {
        const fadeIn = Math.min(1, (maxTimer - timer) / 0.5);
        const fadeOut = Math.min(1, timer / 0.5);
        const alpha = Math.min(fadeIn, fadeOut);

        /* Fundo */
        ctx.fillStyle = `rgba(0, 0, 0, ${0.9 * alpha})`;
        ctx.fillRect(0, 0, width, height);

        /* Texto */
        ctx.textAlign = 'center';
        ctx.globalAlpha = alpha;

        ctx.font = 'bold 20px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFF';
        ctx.fillText('MUNDO', width / 2, height / 2 - 40);

        ctx.font = 'bold 36px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFD700';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#FFD700';
        ctx.fillText(levelName, width / 2, height / 2 + 20);
        ctx.shadowBlur = 0;

        /* Vidas restantes */
        ctx.font = '12px "Press Start 2P", monospace';
        ctx.fillStyle = '#FFF';
        const lives = window.GAME ? GAME.player.lives : 3;
        ctx.fillText(`❤ × ${lives}`, width / 2, height / 2 + 70);

        ctx.globalAlpha = 1.0;
        ctx.textAlign = 'left';
    },
};

window.MenuManager = MenuManager;