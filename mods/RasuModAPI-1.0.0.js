/*
 * ============================================================
 *  RasuModAPI
 *  Version : 1.0.0
 *  Author  : Rasu
 * ============================================================
 */

(function () {
    "use strict";

    if (window.Rasu) {
        console.warn("[RasuModAPI] Already loaded.");
        return;
    }

    const Rasu = {};

    /* ========================================================
     * Basic
     * ====================================================== */

    Rasu.version = "0.1.0";
    Rasu.author = "Rasu";
    Rasu.mods = [];

    /* ========================================================
     * Internal
     * ====================================================== */

    Rasu._internal = {

        getPlayer: function () {
            return ModAPI.mc?.thePlayer || ModAPI.mcinstance?.thePlayer || null;
        },

        // LWJGL
        keyCodes: {
            A: 30, B: 48, C: 46, D: 32, E: 18, F: 33, G: 34, H: 35, I: 23, J: 36,
            K: 37, L: 38, M: 50, N: 49, O: 24, P: 25, Q: 16, R: 19, S: 31, T: 20,
            U: 22, V: 47, W: 17, X: 45, Y: 21, Z: 44,
            "0": 11, "1": 2, "2": 3, "3": 4, "4": 5, "5": 6, "6": 7, "7": 8, "8": 9, "9": 10,
            SPACE: 57, ESCAPE: 1, TAB: 15, RETURN: 28, ENTER: 28, BACK: 14, BACKSPACE: 14,
            LSHIFT: 42, RSHIFT: 54, LCONTROL: 29, RCONTROL: 157, LMENU: 56, RMENU: 184,
            UP: 200, DOWN: 208, LEFT: 203, RIGHT: 205,
            F1: 59, F2: 60, F3: 61, F4: 62, F5: 63, F6: 64, F7: 65, F8: 66, F9: 67, F10: 68, F11: 87, F12: 88
        },

        resolveKeyCode: function (name) {
            if (typeof name === "number") return name;
            if (typeof name === "string") {
                const upper = name.toUpperCase();
                if (upper in this.keyCodes) return this.keyCodes[upper];
            }
            return null;
        },

        keyTracking: {
            curr: {},
            prev: {}
        },

        cache: {
            init: function () {
                this.LivingBase = ModAPI.reflect.getClassById("net.minecraft.entity.EntityLivingBase");
                this.PotionEffect = ModAPI.reflect.getClassById("net.minecraft.potion.PotionEffect");
                this.Potion = ModAPI.reflect.getClassById("net.minecraft.potion.Potion");

            },
            LivingBase: null,
            PotionEffect: null,
            Potion: null,
            Keyboard: null,
            isKeyDownFn: null
        },


        ensureKeyboard: function () {
            const cache = this.cache;
            if (cache.isKeyDownFn) return true;

            try {
                const kb = ModAPI.reflect.classMap["nlev_Keyboard"];
                const fn = kb?.staticMethods?.isKeyDown?.method;
                if (fn) {
                    cache.Keyboard = kb;
                    cache.isKeyDownFn = fn;
                    return true;
                }
            } catch (e) {
                console.error("[RasuModAPI] Keyboard遅延解決中にエラー:", e);
            }
            return false;
        }
    };

    /* ========================================================
     * Utils
     * ====================================================== */

    Rasu.utils = {};

    /* ========================================================
     * Chat API
     * ====================================================== */

    Rasu.chat = {};

    Rasu.chat.print = function (msg) {
        try {
            ModAPI.displayToChat(String(msg));
        } catch (e) {
            console.error("[RasuModAPI] chat.print エラー:", e);
        }
    };

    Rasu.chat.success = function (msg) {
        Rasu.chat.print("§a" + msg);
    };

    Rasu.chat.warn = function (msg) {
        Rasu.chat.print("§e" + msg);
    };

    Rasu.chat.error = function (msg) {
        Rasu.chat.print("§c" + msg);
    };

    /* ========================================================
     * Reflect API
     * ====================================================== */

    Rasu.reflect = {};
    Rasu.reflect._callCandidates = ["callMethod", "call", "invoke", "invokeMethod", "callInstanceMethod"];
    Rasu.reflect._constructCandidates = ["construct", "newInstance", "instantiate", "create"];

    Rasu.reflect.class = function (id) {
        try {
            return ModAPI.reflect.getClassById(id);
        } catch (e) {
            console.error("[RasuModAPI] reflect.class 失敗:", id, e);
            return null;
        }
    };

    Rasu.reflect.call = function (instance, methodName, args) {
        args = args || [];
        let lastError = null;
        for (const candidate of Rasu.reflect._callCandidates) {
            const fn = ModAPI.reflect?.[candidate];
            if (typeof fn !== "function") continue;
            try {
                return fn.call(ModAPI.reflect, instance, methodName, args);
            } catch (e1) {
                try {
                    return fn.call(ModAPI.reflect, instance, methodName, ...args);
                } catch (e2) {
                    lastError = e2;
                }
            }
        }
        throw new Error(
            `[RasuModAPI] reflect.call: 利用可能な呼び出しメソッドが見つかりません (試行: ${Rasu.reflect._callCandidates.join(", ")}). 最後のエラー: ${lastError}`
        );
    };

    Rasu.reflect.construct = function (clazz, args) {
        args = args || [];
        let lastError = null;
        for (const candidate of Rasu.reflect._constructCandidates) {
            const fn = ModAPI.reflect?.[candidate];
            if (typeof fn !== "function") continue;
            try {
                return fn.call(ModAPI.reflect, clazz, args);
            } catch (e1) {
                try {
                    return fn.call(ModAPI.reflect, clazz, ...args);
                } catch (e2) {
                    lastError = e2;
                }
            }
        }
        throw new Error(
            `[RasuModAPI] reflect.construct: 利用可能な生成メソッドが見つかりません (試行: ${Rasu.reflect._constructCandidates.join(", ")}). 最後のエラー: ${lastError}`
        );
    };

    Rasu.reflect.diagnose = function () {
        try {
            console.log("[RasuModAPI] ModAPI.reflect のプロパティ一覧:");
            for (const key in ModAPI.reflect) {
                console.log("  -", key, typeof ModAPI.reflect[key]);
            }
        } catch (e) {
            console.error("[RasuModAPI] diagnose 失敗:", e);
        }
    };

    /* ========================================================
     * Player API
     * ====================================================== */

    Rasu.player = {};

    Rasu.player.get = function () {};

    Rasu.player.jump = function () {};

    Rasu.player.setHealth = function () {};

    Rasu.player.getHealth = function () {};

    Rasu.player.getPosition = function () {};

    /* ========================================================
     * Effect API
     * ====================================================== */

    Rasu.effect = {

        /**
         * プレイヤーにポーションエフェクトを付与または上書きする
         * @param {number} id - ポーションID (Rasu.effect.types参照)
         * @param {number} duration - 効果時間 (ticks)
         * @param {number} level - エフェクトのレベル (0がLv1, 1がLv2...)
         * @returns {boolean} 成功したかどうか
         */
        add: function (id, duration, level) {
            const player = Rasu._internal.getPlayer();
            const pe = Rasu._internal.cache.PotionEffect;

            if (!player) {
                console.error("[RasuModAPI] プレイヤーが取得できません。");
                return false;
            }
            if (!pe || !pe.class || !pe.internalConstructors) {
                console.error("[RasuModAPI] PotionEffect クラスが未キャッシュです。");
                return false;
            }

            try {
                const instance = new pe.class();
                pe.internalConstructors[1](instance, id, duration, level);

                player.addPotionEffect(instance);

                return true;
            } catch (e) {
                console.error("[RasuModAPI] ポーション付与中にエラーが発生しました:", e);
                return false;
            }
        },

        /**
         * プレイヤーから指定エフェクトを除去する
         * @param {number} id - ポーションID
         * @returns {boolean} 成功したかどうか
         */
        remove: function (id) {
            const player = Rasu._internal.getPlayer();
            if (!player) {
                console.error("[RasuModAPI] プレイヤーが取得できません。");
                return false;
            }

            try {
                player.removePotionEffect(id);
                return true;
            } catch (e) {
                console.error("[RasuModAPI] エフェクト除去中にエラーが発生しました:", e);
                return false;
            }
        },

        /**
         * プレイヤーが指定エフェクトを持っているか確認する
         * @param {number} id - ポーションID
         * @returns {boolean}
         */
        has: function (id) {
            const player = Rasu._internal.getPlayer();
            if (!player) {
                console.error("[RasuModAPI] プレイヤーが取得できません。");
                return false;
            }

            try {
                return !!player.isPotionActive(id);
            } catch (e) {
                console.error("[RasuModAPI] エフェクト確認中にエラーが発生しました:", e);
                return false;
            }
        },

        /**
         * プレイヤーの全エフェクトを除去する
         * @returns {boolean} 成功したかどうか
         */
        clear: function () {
            const player = Rasu._internal.getPlayer();
            if (!player) {
                console.error("[RasuModAPI] プレイヤーが取得できません。");
                return false;
            }

            try {
                player.clearActivePotions();
                return true;
            } catch (e) {
                console.error("[RasuModAPI] 全エフェクト除去中にエラーが発生しました:", e);
                return false;
            }
        }
    };

    // エフェクトIDの定数定義
    Rasu.effect.types = {
        SPEED: 1,
        SLOWNESS: 2,
        HASTE: 3,
        MINING_FATIGUE: 4,
        STRENGTH: 5,
        INSTANT_HEALTH: 6,
        INSTANT_DAMAGE: 7,
        JUMP_BOOST: 8,
        NAUSEA: 9,
        REGENERATION: 10,
        RESISTANCE: 11,
        FIRE_RESISTANCE: 12,
        WATER_BREATHING: 13,
        INVISIBILITY: 14,
        BLINDNESS: 15,
        NIGHT_VISION: 16,
        HUNGER: 17,
        WEAKNESS: 18,
        POISON: 19,
        WITHER: 20,
        HEALTH_BOOST: 21,
        ABSORPTION: 22,
        SATURATION: 23
    };

    /* ========================================================
     * World API
     * ====================================================== */

    Rasu.world = {};

    Rasu.world.getBlock = function () {};

    Rasu.world.setBlock = function () {};

    Rasu.world.getBiome = function () {};

    /* ========================================================
     * Render API
     * ====================================================== */

    Rasu.render = {};

    Rasu.render.reload = function () {};

    Rasu.render.hideBlock = function () {};

    Rasu.render.showBlock = function () {};

    Rasu.render.fullbright = function () {};

    /* ========================================================
     * GUI API
     * ====================================================== */

    Rasu.gui = {};

    Rasu.gui.button = function () {};

    Rasu.gui.checkbox = function () {};

    Rasu.gui.slider = function () {};

    /* ========================================================
     * Key API
     * ====================================================== */

    Rasu.keys = {};

    Rasu.keys.register = function (name, callback) {
        const code = Rasu._internal.resolveKeyCode(name);
        if (code === null) {
            console.error("[RasuModAPI] keys.register: 不明なキー名です:", name);
            return false;
        }
        Rasu._internal.keyCallbacks = Rasu._internal.keyCallbacks || {};
        Rasu._internal.keyCallbacks[code] = Rasu._internal.keyCallbacks[code] || [];
        Rasu._internal.keyCallbacks[code].push(callback);
        return true;
    };

    Rasu.keys.isDown = function (name) {
        if (!Rasu._internal.ensureKeyboard()) return false;
        const fn = Rasu._internal.cache.isKeyDownFn;
        const code = Rasu._internal.resolveKeyCode(name);
        if (!fn || code === null) return false;
        try {
            return !!fn(code);
        } catch (e) {
            console.error("[RasuModAPI] keys.isDown エラー:", e);
            return false;
        }
    };

    Rasu.keys.isPressed = function (name) {
        if (!Rasu._internal.ensureKeyboard()) return false;
        const fn = Rasu._internal.cache.isKeyDownFn;
        const code = Rasu._internal.resolveKeyCode(name);
        if (!fn || code === null) return false;

        const tracking = Rasu._internal.keyTracking;
        if (!(code in tracking.curr)) {
            let state = false;
            try {
                state = !!fn(code);
            } catch (e) {
                console.error("[RasuModAPI] keys.isPressed エラー:", e);
            }
            tracking.curr[code] = state;
            tracking.prev[code] = state;
            return false;
        }

        return !!tracking.curr[code] && !tracking.prev[code];
    };

    /* ========================================================
     * Config API
     * ====================================================== */

    Rasu.config = {};

    Rasu.config.get = function () {};

    Rasu.config.set = function () {};

    Rasu.config.save = function () {};

    Rasu.config.load = function () {};

    /* ========================================================
     * Event API
     * ====================================================== */

    Rasu.events = {};

    Rasu.events.on = function () {};

    Rasu.events.off = function () {};

    Rasu.events.emit = function () {};

    /* ========================================================
     * Mod API
     * ====================================================== */

    Rasu.register = function (mod) {

        if (!mod.name)
            throw new Error("Mod name is required.");

        Rasu.mods.push(mod);

        try {
            mod.onLoad?.call(mod);
        } catch (e) {
            console.error(`[RasuModAPI] Mod "${mod.name}" の onLoad でエラーが発生しました:`, e);
        }

    };

    /* ========================================================
     * Module API
     * ====================================================== */

    Rasu.module = {};

    Rasu.module.enable = function () {};

    Rasu.module.disable = function () {};

    Rasu.module.toggle = function () {};

    /* ========================================================
     * Storage API
     * ====================================================== */

    Rasu.storage = {};

    Rasu.storage.get = function () {};

    Rasu.storage.set = function () {};

    Rasu.storage.remove = function () {};

    /* ========================================================
     * Network API
     * ====================================================== */

    Rasu.network = {};

    Rasu.network.sendChat = function () {};

    Rasu.network.sendPacket = function () {};

    /* ========================================================
     * Debug API
     * ====================================================== */

    Rasu.debug = {};

    Rasu.debug.log = function () {};

    Rasu.debug.warn = function () {};

    Rasu.debug.error = function () {};


    
    /* ========================================================
     * Export
     * ====================================================== */
    Rasu._internal.cache.init();
    console.log("[RasuModAPI] cache initialized");

    ModAPI.addEventListener("event", function (e) {
        if (!e || e.event !== "update") return;

        const tracking = Rasu._internal.keyTracking;
        const hasKeyboard = Rasu._internal.ensureKeyboard();
        const isKeyDownFn = Rasu._internal.cache.isKeyDownFn;

        if (hasKeyboard && isKeyDownFn) {
            for (const code in tracking.curr) {
                tracking.prev[code] = tracking.curr[code];
                try {
                    tracking.curr[code] = !!isKeyDownFn(Number(code));
                } catch (err) {
                    tracking.curr[code] = false;
                }
            }

            const callbacks = Rasu._internal.keyCallbacks;
            if (callbacks) {
                for (const code in callbacks) {
                    const pressed = !!tracking.curr[code] && !tracking.prev[code];
                    if (pressed) {
                        for (const cb of callbacks[code]) {
                            try {
                                cb();
                            } catch (err) {
                                console.error("[RasuModAPI] keys.register コールバックでエラー:", err);
                            }
                        }
                    }
                }
            }
        }

        for (const mod of Rasu.mods) {
            try {
                mod.onUpdate?.call(mod);
            } catch (err) {
                console.error(`[RasuModAPI] Mod "${mod.name}" の onUpdate でエラーが発生しました:`, err);
            }
        }
    });

    console.log("[RasuModAPI] loaded v" + Rasu.version);

    console.log("[RasuModAPI] loading...");
    window.Rasu = Object.freeze(Rasu);

})();
