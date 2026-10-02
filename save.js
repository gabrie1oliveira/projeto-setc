/**
 * ============================================================
 * SAVE.JS
 * ------------------------------------------------------------
 * Persistência em localStorage + validação de saves antigos.
 * ============================================================
 */
"use strict";

const SAVE = {

    key: 'superRetroSave_v1',
    version: 1,

    /* ========================================================
       DADOS PADRÃO
    ======================================================== */
    defaultData() {
        return {
            version: this.version,
            player: {
                lives: CONFIG.PLAYER.START_LIVES,
                coins: 0,
                score: 0,
                powerState: 'small',
                currentLevel: 1,
            },
            progress: {
                unlockedLevel: 1,
                completedLevels: [],
                bestTimes: {},
            },
            settings: {
                music: true,
                sound: true,
                masterVolume: CONFIG.AUDIO.MASTER_VOLUME,
            },
            stats: {
                totalCoins: 0,
                totalEnemies: 0,
                totalDeaths: 0,
                totalJumps: 0,
                playTime: 0,
            },
            lastSaved: new Date().toISOString(),
        };
    },

    /* ========================================================
       GET (com merge)
    ======================================================== */
    get() {
        try {
            const raw = localStorage.getItem(this.key);
            if (!raw) return this.defaultData();
            const data = JSON.parse(raw);
            return this.merge(this.defaultData(), data);
        } catch (err) {
            const fallback = this.defaultData();
            try {
                localStorage.setItem(this.key, JSON.stringify(fallback));
            } catch (storageError) {
                return fallback;
            }
            return fallback;
        }
    },

    merge(defaults, saved) {
        const result = { ...defaults };
        for (const key of Object.keys(defaults)) {
            const defVal = defaults[key];
            const savVal = saved[key];
            if (savVal === undefined) continue;

            if (typeof defVal === 'object' && defVal !== null && !Array.isArray(defVal)) {
                result[key] = this.merge(defVal, savVal);
            } else {
                result[key] = savVal;
            }
        }
        return result;
    },

    /* ========================================================
       VALIDATE — corrige saves antigos/corrompidos
    ======================================================== */
    validate() {
        const data = this.get();
        let changed = false;

        /* Vidas entre 1 e 99 */
        if (!Number.isInteger(data.player.lives) ||
            data.player.lives < 1 ||
            data.player.lives > 99) {
            data.player.lives = CONFIG.PLAYER.START_LIVES;
            changed = true;
        }

        /* Fase válida */
        if (!Number.isInteger(data.player.currentLevel) ||
            data.player.currentLevel < 1 ||
            data.player.currentLevel > CONFIG.GAME.LEVELS_TOTAL) {
            data.player.currentLevel = 1;
            changed = true;
        }

        /* Score e moedas numéricos */
        if (!Number.isFinite(data.player.score)) {
            data.player.score = 0;
            changed = true;
        }
        if (!Number.isFinite(data.player.coins)) {
            data.player.coins = 0;
            changed = true;
        }

        /* PowerState válido */
        const validPowers = ['small', 'super', 'fire'];
        if (!validPowers.includes(data.player.powerState)) {
            data.player.powerState = 'small';
            changed = true;
        }

        /* Progresso */
        if (!Number.isInteger(data.progress.unlockedLevel) ||
            data.progress.unlockedLevel < 1 ||
            data.progress.unlockedLevel > CONFIG.GAME.LEVELS_TOTAL) {
            data.progress.unlockedLevel = 1;
            changed = true;
        }

        if (changed) {
            this.save(data);
            console.log('[SAVE] Save validado e corrigido.');
        }

        return data;
    },

    /* ========================================================
       SAVE
    ======================================================== */
    save(data = null) {
        try {
            const payload = data || this.get();
            payload.version = this.version;
            payload.lastSaved = new Date().toISOString();
            localStorage.setItem(this.key, JSON.stringify(payload));
            return true;
        } catch (err) {
            console.error('[SAVE] Erro ao salvar:', err);
            return false;
        }
    },

    collect(game) {
        const data = this.get();

        if (game && game.player) {
            data.player.lives = game.player.lives ?? data.player.lives;
            data.player.coins = game.coins ?? data.player.coins;
            data.player.score = game.score ?? data.player.score;
            data.player.powerState = game.player.powerState ?? data.player.powerState;
            data.player.currentLevel = game.currentStage ?? data.player.currentLevel;
        }

        if (game && game.currentStage !== undefined) {
            data.progress.unlockedLevel = Math.max(
                data.progress.unlockedLevel,
                game.currentStage
            );
        }

        return data;
    },

    /* ========================================================
       HELPERS
    ======================================================== */
    setLives(n) {
        const data = this.get();
        data.player.lives = Math.max(0, n);
        this.save(data);
    },

    addLife(n = 1) {
        const data = this.get();
        data.player.lives += n;
        this.save(data);
        return data.player.lives;
    },

    loseLife() {
        const data = this.get();
        data.player.lives = Math.max(0, data.player.lives - 1);
        data.stats.totalDeaths++;
        this.save(data);
        return data.player.lives;
    },

    addCoins(n = 1) {
        const data = this.get();
        data.player.coins += n;
        data.stats.totalCoins += n;

        /* 100 moedas → 1 vida */
        if (data.player.coins >= 100) {
            const extra = Math.floor(data.player.coins / 100);
            data.player.lives += extra;
            data.player.coins %= 100;
        }

        this.save(data);
        return data.player.coins;
    },

    addScore(n) {
        const data = this.get();
        data.player.score += n;
        this.save(data);
        return data.player.score;
    },

    addPlayTime(seconds) {
        const data = this.get();
        data.stats.playTime += seconds;
        this.save(data);
    },

    /* ========================================================
       PROGRESSO
    ======================================================== */
    unlockLevel(level) {
        const data = this.get();
        if (level > data.progress.unlockedLevel) {
            data.progress.unlockedLevel = level;
        }
        this.save(data);
    },

    completeLevel(level, time = 0) {
        const data = this.get();

        if (!data.progress.completedLevels.includes(level)) {
            data.progress.completedLevels.push(level);
        }

        if (time > 0) {
            const best = data.progress.bestTimes[level];
            if (!best || time < best) {
                data.progress.bestTimes[level] = time;
            }
        }

        if (level >= data.progress.unlockedLevel) {
            data.progress.unlockedLevel = Math.min(
                level + 1,
                CONFIG.GAME.LEVELS_TOTAL
            );
        }

        this.save(data);
    },

    /* ========================================================
       CONFIGURAÇÕES
    ======================================================== */
    getSettings() {
        return this.get().settings;
    },

    saveSettings(settings) {
        const data = this.get();
        data.settings = { ...data.settings, ...settings };
        this.save(data);
    },

    /* ========================================================
       ESTATÍSTICAS
    ======================================================== */
    getStats() {
        return this.get().stats;
    },

    /* ========================================================
       UTILITÁRIOS
    ======================================================== */
    exists() {
        return localStorage.getItem(this.key) !== null;
    },

    reset() {
        localStorage.removeItem(this.key);
        console.log('[SAVE] Save apagado.');
    },

    export() {
        try {
            return btoa(encodeURIComponent(JSON.stringify(this.get())));
        } catch (err) {
            console.error('[SAVE] Erro ao exportar:', err);
            return null;
        }
    },

    import(code) {
        try {
            const json = decodeURIComponent(atob(code));
            const data = JSON.parse(json);
            this.save(this.merge(this.defaultData(), data));
            return true;
        } catch (err) {
            console.error('[SAVE] Erro ao importar:', err);
            return false;
        }
    },

    debug() {
        const d = this.get();
        console.log('=== SAVE DATA ===');
        console.table(d.player);
        console.table(d.progress);
        console.table(d.stats);
        console.table(d.settings);
    },
};

/* Valida o save assim que o arquivo carrega */
SAVE.validate();

window.SAVE = SAVE;