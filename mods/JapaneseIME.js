(function () {
    "use strict";

    function registerJapaneseIME() {
        Rasu.register({
            name: "JapaneseIME",
            version: "1.0.0",

            active: false,
            overlayEl: null,
            keydownHandler: null,

            onLoad() {
                Rasu.chat.print("§aJapaneseIME loaded! (Type / or T to chat in Japanese)");
            },

            onUpdate() {
                const screen = ModAPI.mc.currentScreen;
                const isChatScreen = !!(screen && "inputField" in screen && "historyBuffer" in screen);

                if (isChatScreen && !this.active) {
                    this._openOverlay(screen);
                } else if (!isChatScreen && this.active) {
                    this._closeOverlay(false);
                } else if (isChatScreen && this.active) {
                    this._repositionOverlay(screen);
                }
            },

            _openOverlay(screen) {
                const canvas = document.querySelector("canvas");
                if (!canvas) {
                    console.error("[JapaneseIME] canvas要素が見つかりません。");
                    return;
                }

                const input = document.createElement("input");
                input.type = "text";
                input.autocomplete = "off";
                input.spellcheck = false;
                input.style.position = "fixed";
                input.style.zIndex = "999999";
                input.style.background = "rgba(0, 0, 0, 0.6)";
                input.style.color = "#ffffff";
                input.style.border = "1px solid rgba(255, 255, 255, 0.4)";
                input.style.outline = "none";
                input.style.boxSizing = "border-box";
                input.style.fontFamily = "monospace";
                input.style.fontSize = "14px";
                input.style.padding = "2px 4px";

                document.body.appendChild(input);
                this.overlayEl = input;
                this.active = true;

                this._repositionOverlay(screen);

                setTimeout(() => input.focus(), 0);

                const self = this;
                const handler = function (e) {
                    if (!self.active) return;

                    if (e.key === "Escape") {
                        e.preventDefault();
                        e.stopPropagation();
                        self._closeOverlay(false);
                        return;
                    }

                    if (e.key === "Enter") {
                        if (e.isComposing) {
                            e.stopPropagation();
                            return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        self._sendAndClose(input.value);
                        return;
                    }

                    e.stopPropagation();
                };

                document.addEventListener("keydown", handler, true);
                this.keydownHandler = handler;
            },

            _repositionOverlay(screen) {
                if (!this.overlayEl) return;

                const canvas = document.querySelector("canvas");
                if (!canvas) return;

                const rect = canvas.getBoundingClientRect();
                const field = screen.inputField;

                const guiWidth = screen.width13 || 1;
                const guiHeight = screen.height14 || 1;
                const scaleX = rect.width / guiWidth;
                const scaleY = rect.height / guiHeight;

                let x = field?.xPosition1 ?? 2;
                let y = field?.yPosition0 ?? (guiHeight - 12);
                let w = field?.width22 ?? (guiWidth - 4);
                let h = field?.height23 ?? 12;

                this.overlayEl.style.left = (rect.left + x * scaleX) + "px";
                this.overlayEl.style.top = (rect.top + y * scaleY) + "px";
                this.overlayEl.style.width = (w * scaleX) + "px";
                this.overlayEl.style.height = (h * scaleY) + "px";
            },

            _sendAndClose(text) {
                const trimmed = (text || "").trim();
                if (trimmed.length > 0) {
                    try {
                        const player = Rasu._internal.getPlayer();
                        const jStr = ModAPI.util.string(trimmed);
                        player.sendChatMessage(jStr);
                    } catch (e) {
                        console.error("[JapaneseIME] メッセージ送信中にエラーが発生しました:", e);
                    }
                }
                this._closeOverlay(true);
            },

            _closeOverlay(alreadySent) {
                if (this.keydownHandler) {
                    document.removeEventListener("keydown", this.keydownHandler, true);
                    this.keydownHandler = null;
                }
                if (this.overlayEl) {
                    this.overlayEl.remove();
                    this.overlayEl = null;
                }
                this.active = false;

                try {
                    const screen = ModAPI.mc.currentScreen;
                    const isChatScreen = !!(screen && "inputField" in screen && "historyBuffer" in screen);
                    if (isChatScreen) {
                        ModAPI.mc.displayGuiScreen(null);
                    }
                } catch (e) {
                    console.error("[JapaneseIME] チャット画面クローズ中にエラーが発生しました:", e);
                }
            }
        });
    }

    if (window.Rasu) {
        registerJapaneseIME();
    } else {
        let attempts = 0;
        const maxAttempts = 200;
        const waitForRasu = setInterval(function () {
            attempts++;
            if (window.Rasu) {
                clearInterval(waitForRasu);
                registerJapaneseIME();
            } else if (attempts >= maxAttempts) {
                clearInterval(waitForRasu);
                console.error("[JapaneseIME] RasuModAPI が時間内に読み込まれませんでした。");
            }
        }, 100);
    }
})();
