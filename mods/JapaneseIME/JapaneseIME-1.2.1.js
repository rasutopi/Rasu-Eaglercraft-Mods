(function () {
    "use strict";

    function registerJapaneseIME() {
        Rasu.register({
            name: "JapaneseIME",
            version: "1.2.0",

            active: false,
            overlayEl: null,
            keydownHandler: null,
            watchdogInterval: null,
            historyIndex: -1, 
            draftBeforeHistory: "", 
            localHistory: [], 

            
            
            
            
            
            _getSentMessages() {
                return this.localHistory;
            },

            
            
            _getOverlayContainer() {
                return document.fullscreenElement
                    || document.webkitFullscreenElement
                    || document.mozFullScreenElement
                    || document.msFullscreenElement
                    || document.body;
            },

            _fsWrapperReady: false,

            
            
            
            
            
            
            _ensureFullscreenWrapper() {
                if (this._fsWrapperReady) return;

                const canvas = document.querySelector("canvas");
                if (!canvas) return;

                if (canvas.parentElement && canvas.parentElement.dataset && canvas.parentElement.dataset.rasuImeWrapper === "1") {
                    this._fsWrapperReady = true;
                    return;
                }

                const wrapper = document.createElement("div");
                wrapper.dataset.rasuImeWrapper = "1";
                
                wrapper.style.cssText = canvas.style.cssText;
                if (!wrapper.style.position) wrapper.style.position = "relative";

                canvas.parentNode.insertBefore(wrapper, canvas);
                wrapper.appendChild(canvas);

                
                canvas.style.width = "100%";
                canvas.style.height = "100%";

                const methods = ["requestFullscreen", "webkitRequestFullscreen", "mozRequestFullScreen", "msRequestFullscreen"];
                methods.forEach((name) => {
                    if (typeof canvas[name] === "function") {
                        canvas[name] = function (...args) {
                            const fn = wrapper[name] || wrapper.requestFullscreen;
                            return fn.apply(wrapper, args);
                        };
                    }
                });

                this._fsWrapperReady = true;
            },

            onLoad() {
                this._ensureFullscreenWrapper();
                Rasu.chat.print("§aJapaneseIME loaded! (Type / or T to chat in Japanese)");
            },

            onUpdate() {
                const screen = ModAPI.mc?.currentScreen;
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
                this._ensureFullscreenWrapper();

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
                this.historyIndex = -1;
                this.draftBeforeHistory = "";

                this._repositionOverlay(screen);
                this._startWatchdog();

                
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

                        const trimmed = input.value.trim();
                        if (trimmed.length === 0) {
                            
                            self._closeOverlay(false);
                        } else {                            
                          self._sendMessage(trimmed);
                          self._closeOverlay(true);
                        }
                        return;
                    }

                    if (e.key === "ArrowUp") {
                        
                        if (e.isComposing) {
                            e.stopPropagation();
                            return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        self._historyUp(input);
                        return;
                    }

                    if (e.key === "ArrowDown") {
                        if (e.isComposing) {
                            e.stopPropagation();
                            return;
                        }
                        e.preventDefault();
                        e.stopPropagation();
                        self._historyDown(input);
                        return;
                    }

                    
                    
                    e.stopPropagation();
                };

                
                document.addEventListener("keydown", handler, true);
                this.keydownHandler = handler;
            },

            
            
            _historyUp(input) {
                const messages = this._getSentMessages();
                if (messages.length === 0) return;

                if (this.historyIndex === -1) {
                    this.draftBeforeHistory = input.value;
                    this.historyIndex = messages.length - 1;
                } else if (this.historyIndex > 0) {
                    this.historyIndex--;
                } else {
                    return; 
                }

                input.value = messages[this.historyIndex];
                
                requestAnimationFrame(() => {
                    input.setSelectionRange(input.value.length, input.value.length);
                });
            },

            
            
            _historyDown(input) {
                if (this.historyIndex === -1) return; 

                const messages = this._getSentMessages();

                if (this.historyIndex < messages.length - 1) {
                    this.historyIndex++;
                    input.value = messages[this.historyIndex];
                } else {
                    this.historyIndex = -1;
                    input.value = this.draftBeforeHistory;
                }

                requestAnimationFrame(() => {
                    input.setSelectionRange(input.value.length, input.value.length);
                });
            },

            _repositionOverlay(screen) {
                if (!this.overlayEl) return;

                const canvas = document.querySelector("canvas");
                if (!canvas) return;

                
                const container = this._getOverlayContainer();
                if (this.overlayEl.parentNode !== container) {
                    container.appendChild(this.overlayEl);
                }

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

            
            
            
            _startWatchdog() {
                this._stopWatchdog();
                const self = this;
                this.watchdogInterval = setInterval(function () {
                    try {
                        if (!self.active) return;

                        const player = Rasu._internal.getPlayer();
                        const screen = ModAPI.mc?.currentScreen;
                        const isChatScreen = !!(screen && "inputField" in screen && "historyBuffer" in screen);

                        if (!player || !isChatScreen) {
                            self._closeOverlay(false);
                        }
                    } catch (e) {
                        
                        try {
                            self._closeOverlay(false);
                        } catch (_) { }
                    }
                }, 200);
            },

            _stopWatchdog() {
                if (this.watchdogInterval) {
                    clearInterval(this.watchdogInterval);
                    this.watchdogInterval = null;
                }
            },

            _sendMessage(text) {
                try {
                    const player = Rasu._internal.getPlayer();
                    const jStr = ModAPI.util.string(text);
                    player.sendChatMessage(jStr);

                    
                    if (this.localHistory[this.localHistory.length - 1] !== text) {
                        this.localHistory.push(text);
                    }
                    
                    if (this.localHistory.length > 100) {
                        this.localHistory.shift();
                    }
                } catch (e) {
                    console.error("[JapaneseIME] メッセージ送信中にエラーが発生しました:", e);
                }
            },

            _closeOverlay(alreadySent) {
                if (!this.active && !this.overlayEl) return; 

                this._stopWatchdog();

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
                    const screen = ModAPI.mc?.currentScreen;
                    const isChatScreen = !!(screen && "inputField" in screen && "historyBuffer" in screen);
                    if (isChatScreen) {
                        ModAPI.mc.displayGuiScreen(null);
                    }
                } catch (e) {
                    
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