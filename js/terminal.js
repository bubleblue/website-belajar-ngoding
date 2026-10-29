/**
 * Interactive In-Browser Web Terminal
 * Supports Golang execution, shell commands, interactive stdin & colorized output
 */

class WebTerminal {
    constructor(containerEl, inputEl, promptLabelEl) {
        this.container = containerEl;
        this.input = inputEl;
        this.promptLabel = promptLabelEl;

        this.history = [];
        this.historyIndex = -1;
        this.isWaitingInput = false;
        this.inputCallback = null;

        this.goInterpreter = new GoInterpreter(this);
        this.onCommandExecute = null; // optional hook

        this.initEventListeners();
        this.printWelcome();
    }

    printWelcome() {
        this.print('╭─────────────────────────────────────────────────────────────╮', 'dim');
        this.print('│  🐹 macOS Web Terminal — Golang Environment v1.27.2         │', 'cyan');
        this.print('│  Ketik \x1b[1mgo run main.go\x1b[0m untuk menjalankan kodemu atau \x1b[1mhelp\x1b[0m.     │', 'dim');
        this.print('╰─────────────────────────────────────────────────────────────╯', 'dim');
    }

    initEventListeners() {
        if (!this.input) return;

        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const val = this.input.value;
                this.input.value = '';
                this.handleInputSubmit(val);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (this.history.length > 0) {
                    if (this.historyIndex === -1) {
                        this.historyIndex = this.history.length - 1;
                    } else if (this.historyIndex > 0) {
                        this.historyIndex--;
                    }
                    this.input.value = this.history[this.historyIndex] || '';
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (this.historyIndex !== -1) {
                    if (this.historyIndex < this.history.length - 1) {
                        this.historyIndex++;
                        this.input.value = this.history[this.historyIndex];
                    } else {
                        this.historyIndex = -1;
                        this.input.value = '';
                    }
                }
            }
        });

        // Clicking anywhere in terminal body focuses input
        if (this.container) {
            this.container.addEventListener('click', () => {
                if (this.input) this.input.focus();
            });
        }
    }

    // Print a full line into terminal
    print(text, type = 'output') {
        if (typeof document === 'undefined') return;
        const lineEl = document.createElement('div');
        lineEl.className = `term-line ${type}`;

        const formatted = this.formatAnsi(text);
        lineEl.innerHTML = formatted;

        if (this.container) {
            this.container.appendChild(lineEl);
            this.scrollToBottom();
        }
    }

    // Write partial text without new line
    write(text, type = 'output') {
        if (typeof document === 'undefined' || !this.container) return;
        let lastLine = this.container.lastElementChild;
        if (!lastLine || !lastLine.classList.contains('term-line-raw')) {
            lastLine = document.createElement('div');
            lastLine.className = `term-line term-line-raw ${type}`;
            this.container.appendChild(lastLine);
        }
        lastLine.innerHTML += this.formatAnsi(text);
        this.scrollToBottom();
    }

    formatAnsi(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\x1b\[1m/g, '<b>')
            .replace(/\x1b\[0m/g, '</b>');
    }

    scrollToBottom() {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
        this.printWelcome();
    }

    // Request interactive stdin from the user
    promptInput(label = '[input]: ') {
        return new Promise((resolve) => {
            this.isWaitingInput = true;
            this.inputCallback = resolve;

            if (this.promptLabel) {
                this.promptLabel.textContent = label;
                this.promptLabel.className = 'term-prompt term-prompt-input';
            }
            if (this.input) {
                this.input.focus();
            }
        });
    }

    async handleInputSubmit(val) {
        if (this.isWaitingInput) {
            // Echo input value to terminal
            this.print(`${this.promptLabel.textContent}${val}`, 'stdin-echo');

            this.isWaitingInput = false;
            if (this.promptLabel) {
                this.promptLabel.textContent = 'gopher@macbook:~/workspace$ ';
                this.promptLabel.className = 'term-prompt';
            }

            if (this.inputCallback) {
                const cb = this.inputCallback;
                this.inputCallback = null;
                cb(val);
            }
            return;
        }

        const trimmed = val.trim();
        if (!trimmed) {
            this.print('gopher@macbook:~/workspace$ ', 'cmd-echo');
            return;
        }

        this.history.push(trimmed);
        this.historyIndex = -1;

        // Echo command
        this.print(`gopher@macbook:~/workspace$ ${trimmed}`, 'cmd-echo');

        // Execute shell commands
        await this.executeCommand(trimmed);
    }

    async executeCommand(cmdStr) {
        const parts = cmdStr.split(' ').filter(Boolean);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (cmd === 'clear') {
            this.clear();
            return;
        }

        if (cmd === 'help') {
            this.print('Perintah Terminal yang Tersedia:', 'cyan');
            this.print('  go run main.go     Jalankan kode Go di editor', 'dim');
            this.print('  go version         Periksa versi Golang', 'dim');
            this.print('  go build           Kompilasi program Go', 'dim');
            this.print('  cat main.go        Tampilkan isi kode main.go', 'dim');
            this.print('  ls                 Daftar file dalam direktori', 'dim');
            this.print('  echo <teks>        Cetak teks ke terminal', 'dim');
            this.print('  clear              Bersihkan layar terminal', 'dim');
            this.print('  date               Waktu sistem saat ini', 'dim');
            return;
        }

        if (cmd === 'go') {
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'run') {
                await this.runGoCode();
                return;
            } else if (sub === 'version') {
                this.print('go version go1.27.2 darwin/arm64', 'output');
                return;
            } else if (sub === 'build') {
                this.print('Kompilasi selesai. Executable binary: main', 'success');
                return;
            } else {
                this.print(`Perintah go sub-command '${sub}' tidak dikenal. Coba 'go run main.go'`, 'error');
                return;
            }
        }

        if (cmd === 'ls') {
            this.print('main.go  program.pseudo  go.mod  README.md', 'cyan');
            return;
        }

        if (cmd === 'cat') {
            const target = args[0] || 'main.go';
            if (window.__getEditorCode) {
                const code = window.__getEditorCode();
                this.print(code, 'dim');
            } else {
                this.print(`// file ${target}`, 'dim');
            }
            return;
        }

        if (cmd === 'date') {
            this.print(new Date().toString(), 'output');
            return;
        }

        if (cmd === 'echo') {
            this.print(args.join(' '), 'output');
            return;
        }

        this.print(`zsh: command not found: ${cmd}. Ketik 'help' untuk panduan.`, 'error');
    }

    // Run Go code from editor inside the terminal
    async runGoCode(customCode = null) {
        let code = customCode;
        if (!code && window.__getEditorCode) {
            code = window.__getEditorCode();
        }

        if (!code || !code.trim()) {
            this.print('Error: Editor kode kosong. Tulis program Go terlebih dahulu.', 'error');
            return;
        }

        if (typeof this.onRunStart === 'function') {
            this.onRunStart();
        }

        this.print('Compiling & running main.go...', 'dim');

        try {
            const startTime = performance.now();
            await this.goInterpreter.run(code);
            const dur = ((performance.now() - startTime) / 1000).toFixed(2);
            this.print(`\n[Process exited 0 in ${dur}s]`, 'dim');
            if (window.soundManager) window.soundManager.playSuccess();
            if (typeof this.onSuccess === 'function') {
                this.onSuccess(dur);
            }
        } catch (err) {
            this.print(`runtime error: ${err.message}`, 'error');
            if (window.soundManager) window.soundManager.playError();
            if (typeof this.onError === 'function') {
                this.onError(err);
            }
        }
    }
}

if (typeof window !== 'undefined') {
    window.WebTerminal = WebTerminal;
}
if (typeof module !== 'undefined') {
    module.exports = WebTerminal;
}
