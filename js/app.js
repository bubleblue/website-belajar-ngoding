/**
 * Main Application Logic & UI Bindings
 * Supports Pseudocode & Golang with In-Browser Interactive Terminal
 */

document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lucide icons
    if (window.lucide) {
        window.lucide.createIcons();
    }

    // Default sample programs for first-time users (both Pseudocode & Golang)
    const DEFAULT_SAVED_PROGRAMS = [
        {
            id: 'prog-sample-1',
            name: 'luas_lingkaran',
            lang: 'pseudocode',
            code: `program luas_lingkaran
kamus
    r, luas : real

algoritma
    // masukkan jari-jari lingkaran
    input(r)
    luas <- 3.14 * r * r
    output("luas lingkaran: ", luas)
endprogram`,
            date: 'Bawaan',
            updatedAt: Date.now() - 3600000
        },
        {
            id: 'prog-sample-2',
            name: 'cek_kelulusan_go',
            lang: 'golang',
            code: `package main

import "fmt"

func main() {
    var nama string
    var nilai int
    fmt.Println("=== Status Kelulusan Mahasiswa ===")
    fmt.Scan(&nama)
    fmt.Scan(&nilai)
    fmt.Println("Nama:", nama)
    if nilai >= 75 {
        fmt.Println("Status: LULUS (Selamat!)")
    } else {
        fmt.Println("Status: REMIDI (Semangat belajar lagi)")
    }
}`,
            date: 'Bawaan',
            updatedAt: Date.now() - 7200000
        },
        {
            id: 'prog-sample-3',
            name: 'deret_fibonacci_go',
            lang: 'golang',
            code: `package main

import "fmt"

func main() {
    var n int
    fmt.Scan(&n)
    a := 0
    b := 1
    fmt.Println(a)
    fmt.Println(b)
    for i := 3; i <= n; i++ {
        c := a + b
        fmt.Println(c)
        a = b
        b = c
    }
}`,
            date: 'Bawaan',
            updatedAt: Date.now() - 10800000
        }
    ];

    // Load saved programs from localStorage or initialize with defaults
    let savedPrograms = [];
    try {
        const stored = localStorage.getItem('pseudocode_saved_programs');
        if (stored) {
            savedPrograms = JSON.parse(stored);
        } else {
            savedPrograms = DEFAULT_SAVED_PROGRAMS;
            localStorage.setItem('pseudocode_saved_programs', JSON.stringify(savedPrograms));
        }
    } catch (e) {
        console.warn('Failed to load saved programs:', e);
        savedPrograms = DEFAULT_SAVED_PROGRAMS;
    }

    // App State
    const state = {
        currentChallengeIndex: 0,
        currentLanguage: 'pseudocode', // 'pseudocode' | 'golang'
        activeTab: 'challenges', // 'challenges', 'playground', 'saved-programs', 'cheatsheet'
        completedChallenges: new Set(),
        interpreter: new PseudocodeInterpreter(),
        steppingActive: false,
        theme: localStorage.getItem('pseudocode_theme') || 'light',
        soundEnabled: localStorage.getItem('pseudocode_sound') !== 'false',
        currentFileTitle: 'program.pseudo',
        currentProgramId: null
    };

    // Load completed challenges from localStorage
    try {
        const savedCompleted = localStorage.getItem('pseudocode_completed');
        if (savedCompleted) {
            JSON.parse(savedCompleted).forEach(id => state.completedChallenges.add(id));
        }
    } catch (e) {
        console.warn('Could not read localStorage', e);
    }

    // Sound manager setup
    if (window.soundManager) {
        window.soundManager.enabled = state.soundEnabled;
    }

    // DOM Elements
    const elements = {
        themeToggle: document.getElementById('btn-theme-toggle'),
        themeIcon: document.getElementById('theme-icon'),
        soundToggle: document.getElementById('btn-sound-toggle'),
        soundIcon: document.getElementById('sound-icon'),
        sidebarToggle: document.getElementById('sidebar-toggle'),
        sidebar: document.getElementById('app-sidebar'),
        sidebarResizerHandle: document.getElementById('sidebar-resizer-handle'),
        sidebarEdgeHotspot: document.getElementById('sidebar-edge-hotspot'),
        sidebarEdgePill: document.getElementById('sidebar-edge-pill'),
        sidebarEdgeChevron: document.getElementById('sidebar-edge-chevron'),
        sidebarBackdrop: document.getElementById('sidebar-backdrop'),
        challengesList: document.getElementById('challenges-list-container'),
        progressCount: document.getElementById('progress-count'),
        progressFill: document.getElementById('progress-fill'),

        // Tab switcher
        segmentedControl: document.getElementById('main-segmented-control'),
        savedProgramsCount: document.getElementById('saved-programs-count'),

        // Account & Cloud Auth elements
        btnAuthUser: document.getElementById('btn-auth-user'),
        authStatusLabel: document.getElementById('auth-status-label'),
        authPillIcon: document.getElementById('auth-pill-icon'),
        sidebarAuthBtn: document.getElementById('sidebar-auth-btn'),
        sidebarUserDisplay: document.getElementById('sidebar-user-display'),
        sidebarSyncStatus: document.getElementById('sidebar-sync-status'),
        authOverlay: document.getElementById('auth-overlay'),
        btnCloseAuth: document.getElementById('btn-close-auth'),
        cloudStatusDot: document.getElementById('cloud-status-dot'),
        cloudStatusText: document.getElementById('cloud-status-text'),
        btnToggleConfigView: document.getElementById('btn-toggle-config-view'),
        authConfigDrawer: document.getElementById('auth-config-drawer'),
        firebaseConfigInput: document.getElementById('firebase-config-input'),
        btnSaveFirebaseConfig: document.getElementById('btn-save-firebase-config'),
        btnCloseConfigDrawer: document.getElementById('btn-close-config-drawer'),
        authLoggedInView: document.getElementById('auth-logged-in-view'),
        authGuestView: document.getElementById('auth-guest-view'),
        loggedUsernameDisplay: document.getElementById('logged-username-display'),
        btnManualSync: document.getElementById('btn-manual-sync'),
        btnAuthLogout: document.getElementById('btn-auth-logout'),
        btnTabLogin: document.getElementById('btn-tab-login'),
        btnTabRegister: document.getElementById('btn-tab-register'),
        authForm: document.getElementById('auth-form'),
        authInputUsername: document.getElementById('auth-input-username'),
        authInputPassword: document.getElementById('auth-input-password'),
        btnTogglePassword: document.getElementById('btn-toggle-password'),
        iconTogglePass: document.getElementById('icon-toggle-pass'),
        groupConfirmPassword: document.getElementById('group-confirm-password'),
        authInputConfirmPassword: document.getElementById('auth-input-confirm-password'),
        authErrorBox: document.getElementById('auth-error-box'),
        authErrorText: document.getElementById('auth-error-text'),
        btnAuthSubmit: document.getElementById('btn-auth-submit'),
        authSubmitLabel: document.getElementById('auth-submit-label'),

        // Problem Card
        problemCard: document.getElementById('problem-card'),
        problemTitle: document.getElementById('problem-title'),
        problemCategory: document.getElementById('problem-category'),
        problemDifficulty: document.getElementById('problem-difficulty'),
        problemStatus: document.getElementById('problem-status'),
        problemDesc: document.getElementById('problem-description'),
        btnHint: document.getElementById('btn-hint'),
        hintDrawer: document.getElementById('hint-drawer'),
        hintText: document.getElementById('hint-text'),
        btnSolution: document.getElementById('btn-solution'),

        // Saved Programs Section
        savedProgramsSection: document.getElementById('saved-programs-section'),
        savedProgramsGrid: document.getElementById('saved-programs-grid'),
        savedSearchInput: document.getElementById('saved-search-input'),
        savedStatsLabel: document.getElementById('saved-stats-label'),
        btnNewProgram: document.getElementById('btn-new-program'),
        btnExportBackup: document.getElementById('btn-export-backup'),

        // Language Switcher & Transpiler
        langSwitcher: document.getElementById('lang-switcher'),
        btnLangPseudo: document.getElementById('btn-lang-pseudo'),
        btnLangGo: document.getElementById('btn-lang-go'),
        snippetBarPseudo: document.getElementById('snippet-bar-pseudo'),
        snippetBarGo: document.getElementById('snippet-bar-go'),
        btnTranspileCode: document.getElementById('btn-transpile-code'),
        transpileBtnLabel: document.getElementById('transpile-btn-label'),
        transpileBadgeTag: document.getElementById('transpile-badge-tag'),

        // Editor & Coding Area
        codingGrid: document.getElementById('coding-grid-container'),
        gridResizerGutter: document.getElementById('grid-resizer-gutter'),
        editorContainer: document.getElementById('editor-container'),
        editorHeightResizer: document.getElementById('editor-height-resizer'),
        executionColumn: document.getElementById('execution-column'),
        currentFileLabel: document.getElementById('current-file-label'),
        editor: document.getElementById('code-editor'),
        codeHighlight: document.getElementById('code-highlight'),
        codeHighlightContent: document.getElementById('code-highlight-content'),
        autocomplete: document.getElementById('editor-autocomplete'),
        autocompleteList: document.getElementById('autocomplete-list'),
        lineNumbers: document.getElementById('line-numbers'),
        lineIndicator: document.getElementById('active-line-indicator'),
        btnSaveProgram: document.getElementById('btn-save-program'),
        saveKbdShortcut: document.getElementById('save-kbd-shortcut'),
        btnSelectAll: document.getElementById('btn-select-all'),
        btnToggleLayout: document.getElementById('btn-toggle-layout'),
        layoutToggleIcon: document.getElementById('layout-toggle-icon'),
        btnResetCode: document.getElementById('btn-reset-code'),
        btnCopyCode: document.getElementById('btn-copy-code'),

        // Actions
        btnCheckSolution: document.getElementById('btn-check-solution'),
        btnRunFast: document.getElementById('btn-run-fast'),
        btnRunTerminal: document.getElementById('btn-run-terminal'),
        btnStartStep: document.getElementById('btn-start-step'),
        btnNextStep: document.getElementById('btn-next-step'),
        btnStopStep: document.getElementById('btn-stop-step'),

        // Web Terminal & Console
        webTerminalCard: document.getElementById('web-terminal-card'),
        terminalHeightResizer: document.getElementById('terminal-height-resizer'),
        pseudoConsoleCard: document.getElementById('pseudo-console-card'),
        consoleHeightResizer: document.getElementById('console-height-resizer'),
        consoleOutput: document.getElementById('console-output'),
        btnClearConsole: document.getElementById('btn-clear-console'),
        terminalLines: document.getElementById('terminal-lines'),
        termCommandInput: document.getElementById('term-command-input'),
        termPromptLabel: document.getElementById('term-prompt-label'),
        btnQuickGoRun: document.getElementById('btn-quick-gorun'),
        btnClearTerminal: document.getElementById('btn-clear-terminal'),
        termDotRed: document.getElementById('term-dot-red'),
        termDotYellow: document.getElementById('term-dot-yellow'),
        termDotGreen: document.getElementById('term-dot-green'),

        // Panels
        varTableBody: document.getElementById('var-table-body'),
        stepStatusTag: document.getElementById('step-status-tag'),
        testcasesCard: document.getElementById('testcases-card'),
        testcasesList: document.getElementById('testcases-list'),
        testScoreBadge: document.getElementById('test-score-badge'),

        // Modals & Sheets
        inputModal: document.getElementById('input-modal-overlay'),
        inputPromptLabel: document.getElementById('input-prompt-label'),
        userInputField: document.getElementById('interactive-user-input'),
        btnInputSubmit: document.getElementById('btn-input-submit'),
        btnInputCancel: document.getElementById('btn-input-cancel'),

        saveModal: document.getElementById('save-modal-overlay'),
        saveModalLangBadge: document.getElementById('save-modal-lang-badge'),
        saveModalLangText: document.getElementById('save-modal-lang-text'),
        saveModalExt: document.getElementById('save-modal-ext'),
        saveChipsList: document.getElementById('save-chips-list'),
        saveProgramTitle: document.getElementById('save-program-title'),
        saveDetectedHint: document.getElementById('save-detected-hint'),
        btnSaveConfirm: document.getElementById('btn-save-confirm'),
        btnSaveCancel: document.getElementById('btn-save-cancel'),

        cheatsheetOverlay: document.getElementById('cheatsheet-overlay'),
        btnCloseCheatsheet: document.getElementById('btn-close-cheatsheet'),
        btnCheatsheetDone: document.getElementById('btn-cheatsheet-done'),
        btnOpenHelp: document.getElementById('btn-open-help'),

        // Dynamic Island
        dynamicIsland: document.getElementById('dynamic-island'),
        islandIcon: document.getElementById('island-icon'),
        islandTitle: document.getElementById('island-title'),
        islandDesc: document.getElementById('island-desc')
    };

    // =========================================================================
    // In-Website Interactive Terminal Setup
    // =========================================================================
    const webTerminal = new WebTerminal(
        elements.terminalLines,
        elements.termCommandInput,
        elements.termPromptLabel
    );

    // Dynamic Island event hooks for Golang terminal execution
    webTerminal.onRunStart = () => {
        showNotification('Menjalankan Program', 'go run main.go sedang dieksekusi...', 'info', 'terminal');
    };
    webTerminal.onSuccess = (dur) => {
        showNotification('Kode Berhasil', `Program Golang selesai dieksekusi (${dur}s).`, 'success', 'check-circle-2');
    };
    webTerminal.onError = (err) => {
        showNotification('Kode Gagal', `Kesalahan: ${err.message}`, 'error', 'alert-circle');
    };

    // Global editor accessor for the terminal
    window.__getEditorCode = () => elements.editor.value;

    if (elements.btnClearTerminal) {
        elements.btnClearTerminal.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            webTerminal.clear();
        });
    }

    if (elements.btnQuickGoRun) {
        elements.btnQuickGoRun.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            runInTerminal();
        });
    }

    if (elements.termDotRed) {
        elements.termDotRed.addEventListener('click', () => webTerminal.clear());
    }
    if (elements.termDotYellow) {
        elements.termDotYellow.addEventListener('click', () => {
            const body = document.getElementById('web-terminal-container');
            if (body) {
                body.style.height = body.style.height === '120px' ? '250px' : '120px';
            }
        });
    }
    if (elements.termDotGreen) {
        elements.termDotGreen.addEventListener('click', () => {
            const body = document.getElementById('web-terminal-container');
            if (body) {
                body.style.height = body.style.height === '380px' ? '250px' : '380px';
            }
        });
    }

    // =========================================================================
    // Language Switcher & Transpiler (Pseudocode <-> Golang)
    // =========================================================================
    function setLanguage(lang, convertCode = false) {
        state.currentLanguage = lang;

        if (lang === 'golang') {
            elements.btnLangGo.classList.add('active');
            elements.btnLangPseudo.classList.remove('active');

            elements.snippetBarGo.classList.remove('is-hidden');
            elements.snippetBarPseudo.classList.add('is-hidden');

            elements.transpileBtnLabel.textContent = 'Ke Pseudocode';
            if (elements.transpileBadgeTag) elements.transpileBadgeTag.textContent = 'PSEUDO';
            if (elements.btnTranspileCode) {
                elements.btnTranspileCode.classList.remove('mode-to-go');
                elements.btnTranspileCode.classList.add('mode-to-pseudo');
                elements.btnTranspileCode.setAttribute('title', 'Konversi Otomatis ke Pseudocode');
            }

            // SLIDE OPEN Terminal with smooth animation!
            if (elements.webTerminalCard) {
                elements.webTerminalCard.classList.remove('terminal-slide-closed');
            }
            // SLIDE CLOSE Pseudocode Console
            if (elements.pseudoConsoleCard) {
                elements.pseudoConsoleCard.classList.add('console-slide-closed');
            }

            // Show Terminal Run button, hide Fast Run button
            if (elements.btnRunTerminal) elements.btnRunTerminal.classList.remove('is-hidden');
            if (elements.btnRunFast) elements.btnRunFast.classList.add('is-hidden');

            if (convertCode) {
                const current = elements.editor.value;
                if (current.includes('program') || current.includes('kamus') || current.includes('algoritma')) {
                    elements.editor.value = CodeTranspiler.pseudocodeToGo(current);
                    updateLineNumbers();
                }
            }

            state.currentFileTitle = state.currentFileTitle.replace(/\.pseudo$/, '.go');
            updateFileLabel();

            setTimeout(() => {
                if (elements.termCommandInput) elements.termCommandInput.focus();
            }, 350);
        } else {
            elements.btnLangPseudo.classList.add('active');
            elements.btnLangGo.classList.remove('active');

            elements.snippetBarPseudo.classList.remove('is-hidden');
            elements.snippetBarGo.classList.add('is-hidden');

            elements.transpileBtnLabel.textContent = 'Ke Golang';
            if (elements.transpileBadgeTag) elements.transpileBadgeTag.textContent = 'GO';
            if (elements.btnTranspileCode) {
                elements.btnTranspileCode.classList.remove('mode-to-pseudo');
                elements.btnTranspileCode.classList.add('mode-to-go');
                elements.btnTranspileCode.setAttribute('title', 'Konversi Otomatis ke Golang');
            }

            // SLIDE CLOSE Terminal with smooth slide animation!
            if (elements.webTerminalCard) {
                elements.webTerminalCard.classList.add('terminal-slide-closed');
            }
            // SLIDE OPEN Pseudocode Console
            if (elements.pseudoConsoleCard) {
                elements.pseudoConsoleCard.classList.remove('console-slide-closed');
            }

            // Show Fast Run button, hide Terminal Run button
            if (elements.btnRunTerminal) elements.btnRunTerminal.classList.add('is-hidden');
            if (elements.btnRunFast) elements.btnRunFast.classList.remove('is-hidden');

            if (convertCode) {
                const current = elements.editor.value;
                if (current.includes('package main') || current.includes('fmt.')) {
                    elements.editor.value = CodeTranspiler.goToPseudocode(current);
                    updateLineNumbers();
                }
            }

            state.currentFileTitle = state.currentFileTitle.replace(/\.go$/, '.pseudo');
            updateFileLabel();
        }
        hideAutocomplete();
        updateLineNumbers();
    }

    if (elements.btnLangPseudo) {
        elements.btnLangPseudo.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            setLanguage('pseudocode');
        });
    }
    if (elements.btnLangGo) {
        elements.btnLangGo.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            setLanguage('golang');
        });
    }

    // Transpile button toggle
    if (elements.btnTranspileCode) {
        elements.btnTranspileCode.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            const curCode = elements.editor.value;

            if (state.currentLanguage === 'pseudocode') {
                const goCode = CodeTranspiler.pseudocodeToGo(curCode);
                elements.editor.value = goCode;
                updateLineNumbers();
                setLanguage('golang');
                webTerminal.print('╭─────────────────────────────────────────────────────────────╮', 'cyan');
                webTerminal.print('│  🔄 [Transpiler] Pseudocode berhasil dikonversi ke Golang!   │', 'cyan');
                webTerminal.print('╰─────────────────────────────────────────────────────────────╯', 'cyan');
            } else {
                const pseudoCode = CodeTranspiler.goToPseudocode(curCode);
                elements.editor.value = pseudoCode;
                updateLineNumbers();
                setLanguage('pseudocode');
            }
        });
    }

    // =========================================================================
    // Dynamic Island Notifications (Restricted to 5 specific triggers)
    // 1. Menyalin (Copying code)
    // 2. Menjalankan program (Running code)
    // 3. Kode berhasil (Execution success / tests passed)
    // 4. Kode gagal (Execution / syntax error / tests failed)
    // 5. Selamat datang (Welcome notification)
    // =========================================================================
    let islandTimeout = null;
    function showNotification(title, desc, type = 'info', customIcon = null) {
        if (!elements.dynamicIsland) return;

        elements.islandTitle.textContent = title;
        elements.islandDesc.textContent = desc;

        let iconName = customIcon;
        if (!iconName) {
            if (type === 'success') iconName = 'check-circle-2';
            else if (type === 'error') iconName = 'alert-circle';
            else if (type === 'welcome') iconName = 'sparkles';
            else iconName = 'play';
        }

        if (elements.islandIcon) {
            elements.islandIcon.innerHTML = `<i data-lucide="${iconName}"></i>`;
            if (window.lucide) window.lucide.createIcons();
        }

        elements.dynamicIsland.className = `dynamic-island active ${type}`;
        
        clearTimeout(islandTimeout);
        islandTimeout = setTimeout(() => {
            elements.dynamicIsland.classList.remove('active');
        }, 3200);
    }

    function applyTheme(theme) {
        state.theme = theme;
        localStorage.setItem('pseudocode_theme', theme);
        if (theme === 'dark') {
            document.body.classList.remove('ios-theme-light');
            document.body.classList.add('ios-theme-dark');
            elements.themeIcon.setAttribute('data-lucide', 'sun');
        } else {
            document.body.classList.remove('ios-theme-dark');
            elements.themeIcon.setAttribute('data-lucide', 'moon');
        }
        if (window.lucide) window.lucide.createIcons();
    }

    applyTheme(state.theme);

    elements.themeToggle.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playTap();
        const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
    });

    // Sound toggle
    function updateSoundIcon() {
        if (state.soundEnabled) {
            elements.soundIcon.setAttribute('data-lucide', 'volume-2');
        } else {
            elements.soundIcon.setAttribute('data-lucide', 'volume-x');
        }
        if (window.lucide) window.lucide.createIcons();
    }
    updateSoundIcon();

    elements.soundToggle.addEventListener('click', () => {
        state.soundEnabled = !state.soundEnabled;
        localStorage.setItem('pseudocode_sound', state.soundEnabled);
        if (window.soundManager) {
            window.soundManager.enabled = state.soundEnabled;
            if (state.soundEnabled) window.soundManager.playTap();
        }
        updateSoundIcon();
    });

    // Update Saved Programs Count Badge
    function updateSavedProgramsBadge() {
        const count = savedPrograms.length;
        if (elements.savedProgramsCount) {
            elements.savedProgramsCount.textContent = count;
        }
        const sidebarSavedCount = document.getElementById('sidebar-saved-count');
        if (sidebarSavedCount) {
            sidebarSavedCount.textContent = count;
        }
        const tabbarSavedCount = document.getElementById('tabbar-saved-count');
        if (tabbarSavedCount) {
            tabbarSavedCount.textContent = count;
        }
    }
    updateSavedProgramsBadge();

    // Central persistence: saves locally and syncs to Cloud if logged in
    function persistSavedPrograms(showCloudAlert = false) {
        localStorage.setItem('pseudocode_saved_programs', JSON.stringify(savedPrograms));
        updateSavedProgramsBadge();
        if (elements.savedProgramsGrid) {
            renderSavedProgramsList(elements.savedSearchInput ? elements.savedSearchInput.value : '');
        }

        if (window.CloudDB && window.CloudDB.getCurrentUser()) {
            window.CloudDB.syncToCloud(savedPrograms).then(success => {
                if (success && showCloudAlert) {
                    showNotification('Tersinkron Cloud', 'Program Anda berhasil disimpan ke cloud database', 'success', 'cloud-check');
                }
            });
        }
    }

    // =========================================================================
    // Sidebar & Curriculum Navigation
    // =========================================================================
    function renderSidebar() {
        elements.challengesList.innerHTML = '';
        CHALLENGES.forEach((challenge, idx) => {
            const isCompleted = state.completedChallenges.has(challenge.id);
            const isActive = idx === state.currentChallengeIndex && state.activeTab === 'challenges';

            const item = document.createElement('div');
            item.className = `challenge-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`;
            item.innerHTML = `
                <div class="challenge-item-info">
                    <span class="challenge-item-title">${challenge.title}</span>
                    <div class="challenge-item-sub">
                        <span class="challenge-badge-mini">${challenge.category}</span>
                        <span>•</span>
                        <span>${challenge.difficulty}</span>
                    </div>
                </div>
                <div class="challenge-status-icon">
                    <i data-lucide="check"></i>
                </div>
            `;

            item.addEventListener('click', () => {
                if (window.soundManager) window.soundManager.playTap();
                selectChallenge(idx);
                closeSidebar();
            });

            elements.challengesList.appendChild(item);
        });

        // Update progress pill
        const completedCount = state.completedChallenges.size;
        const totalCount = CHALLENGES.length;
        elements.progressCount.textContent = `${completedCount}/${totalCount}`;
        const pct = Math.round((completedCount / totalCount) * 100);
        elements.progressFill.style.width = `${pct}%`;

        if (window.lucide) window.lucide.createIcons();
    }

    function selectChallenge(idx) {
        state.currentChallengeIndex = idx;
        state.currentProgramId = null;
        const challenge = CHALLENGES[idx];

        switchTab('challenges');

        elements.problemTitle.textContent = challenge.title;
        elements.problemCategory.textContent = challenge.category;
        elements.problemDifficulty.textContent = challenge.difficulty;
        elements.problemDifficulty.className = `ios-badge badge-difficulty ${challenge.difficulty}`;

        const isCompleted = state.completedChallenges.has(challenge.id);
        elements.problemStatus.textContent = isCompleted ? 'Selesai' : 'Belum Selesai';
        elements.problemStatus.className = `ios-badge badge-status ${isCompleted ? 'completed' : ''}`;

        let descHtml = `<p>${challenge.description}</p>`;
        if (challenge.instructions && challenge.instructions.length > 0) {
            descHtml += `<p style="margin-top: 8px; font-weight: 600;">Langkah Pengerjaan:</p><ul>`;
            challenge.instructions.forEach(inst => {
                descHtml += `<li>${inst}</li>`;
            });
            descHtml += `</ul>`;
        }
        elements.problemDesc.innerHTML = descHtml;

        elements.hintText.textContent = challenge.hint || 'Tidak ada petunjuk khusus.';
        elements.hintDrawer.classList.remove('active');

        // Load starter code based on active language
        if (state.currentLanguage === 'golang') {
            elements.editor.value = CodeTranspiler.pseudocodeToGo(challenge.starterCode);
            state.currentFileTitle = `${challenge.id}.go`;
        } else {
            elements.editor.value = challenge.starterCode;
            state.currentFileTitle = `${challenge.id}.pseudo`;
        }

        updateFileLabel();
        updateLineNumbers();

        resetVarTable();
        stopStepExecution();

        renderInitialTestCases(challenge.testCases);
        renderSidebar();
    }

    function updateFileLabel() {
        if (elements.currentFileLabel) {
            const iconName = state.currentFileTitle.endsWith('.go') ? 'file-code' : 'file-code-2';
            elements.currentFileLabel.innerHTML = `<i data-lucide="${iconName}"></i> ${state.currentFileTitle}`;
            if (window.lucide) window.lucide.createIcons();
        }
    }

    function renderInitialTestCases(testCases) {
        elements.testScoreBadge.textContent = `0 / ${testCases.length} Lolos`;
        elements.testScoreBadge.className = 'test-score-badge';
        elements.testcasesList.innerHTML = '';

        testCases.forEach((tc, idx) => {
            const item = document.createElement('div');
            item.className = 'testcase-item';
            const inStr = tc.inputs.length > 0 ? tc.inputs.join(', ') : '(tanpa input)';
            const outStr = tc.expected.join(' | ');

            item.innerHTML = `
                <div class="testcase-item-header">
                    <span class="testcase-desc">Uji #${idx + 1}: ${tc.description}</span>
                    <span class="testcase-pill">Menunggu</span>
                </div>
                <div class="testcase-details">
                    <div class="testcase-field">Input: <b>${inStr}</b></div>
                    <div class="testcase-field">Ekspektasi: <b>${outStr}</b></div>
                </div>
            `;
            elements.testcasesList.appendChild(item);
        });
    }

    // =========================================================================
    // Sidebar & Curriculum Navigation (Collapsible & Edge Hover Trigger)
    // =========================================================================
    let sidebarCollapseTimer = null;

    function openSidebar() {
        if (!elements.sidebar) return;
        elements.sidebar.classList.remove('collapsed');
        elements.sidebar.classList.add('open');
        if (elements.sidebarBackdrop) {
            elements.sidebarBackdrop.classList.add('active');
        }
    }

    function closeSidebar() {
        if (!elements.sidebar) return;
        elements.sidebar.classList.remove('open');
        if (elements.sidebarBackdrop) {
            elements.sidebarBackdrop.classList.remove('active');
        }
        if (window.innerWidth > 860) {
            const isCollapsed = localStorage.getItem('pseudocode_sidebar_collapsed') === 'true';
            elements.sidebar.classList.toggle('collapsed', isCollapsed);
        }
    }

    function toggleSidebarCollapsed(forceState, showNotif = true) {
        if (!elements.sidebar) return;
        const willCollapse = forceState !== undefined 
            ? forceState 
            : !elements.sidebar.classList.contains('collapsed');

        // Clear any active 1-second hide timer
        if (sidebarCollapseTimer) {
            clearTimeout(sidebarCollapseTimer);
            sidebarCollapseTimer = null;
        }

        if (willCollapse) {
            elements.sidebar.classList.add('collapsed');
            if (elements.sidebarEdgeChevron) elements.sidebarEdgeChevron.setAttribute('data-lucide', 'chevron-right');
            if (elements.sidebarEdgePill) elements.sidebarEdgePill.setAttribute('title', 'Buka Kurikulum Materi');
            
            // Keep button visible while sliding along with the sidebar to left: 0
            if (elements.sidebarEdgeHotspot) {
                elements.sidebarEdgeHotspot.classList.remove('is-collapsed-hidden');
                elements.sidebarEdgeHotspot.classList.remove('is-near-edge');

                // Disappear after exactly 1 second (1000ms)
                sidebarCollapseTimer = setTimeout(() => {
                    if (elements.sidebar.classList.contains('collapsed')) {
                        elements.sidebarEdgeHotspot.classList.add('is-collapsed-hidden');
                    }
                }, 1000);
            }
        } else {
            elements.sidebar.classList.remove('collapsed');
            if (elements.sidebarEdgeChevron) elements.sidebarEdgeChevron.setAttribute('data-lucide', 'chevron-left');
            if (elements.sidebarEdgePill) elements.sidebarEdgePill.setAttribute('title', 'Tutup Kurikulum Materi');

            // Slide back to the right of the material list and stay visible
            if (elements.sidebarEdgeHotspot) {
                elements.sidebarEdgeHotspot.classList.remove('is-collapsed-hidden');
                elements.sidebarEdgeHotspot.classList.remove('is-near-edge');
            }
        }

        localStorage.setItem('pseudocode_sidebar_collapsed', willCollapse ? 'true' : 'false');
        if (window.lucide) window.lucide.createIcons();
    }

    // Toggle button in Header
    if (elements.sidebarToggle) {
        elements.sidebarToggle.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            if (window.innerWidth <= 860) {
                if (elements.sidebar.classList.contains('open')) {
                    closeSidebar();
                } else {
                    openSidebar();
                }
            } else {
                toggleSidebarCollapsed();
            }
        });
    }

    // Sidebar Close Button in Mobile Drawer
    const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            closeSidebar();
        });
    }

    // Floating Oval Pill Button
    if (elements.sidebarEdgePill) {
        elements.sidebarEdgePill.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.soundManager) window.soundManager.playTap();
            toggleSidebarCollapsed();
        });
    }

    // Hover behavior: When sidebar is collapsed and hidden, reappear when cursor moves to the far left edge (<= 56px)
    window.addEventListener('mousemove', (e) => {
        if (!elements.sidebarEdgeHotspot) return;
        if (window.innerWidth <= 860) return;
        
        const isCollapsed = elements.sidebar.classList.contains('collapsed');
        if (isCollapsed) {
            // Re-appear when cursor is near the far left edge
            if (e.clientX <= 56) {
                elements.sidebarEdgeHotspot.classList.add('is-near-edge');
            } else {
                elements.sidebarEdgeHotspot.classList.remove('is-near-edge');
            }
        } else {
            elements.sidebarEdgeHotspot.classList.remove('is-near-edge');
        }
    });

    document.addEventListener('mouseleave', () => {
        if (elements.sidebarEdgeHotspot && elements.sidebar.classList.contains('collapsed')) {
            elements.sidebarEdgeHotspot.classList.remove('is-near-edge');
        }
    });

    // Restore saved sidebar collapsed state on load
    const savedCollapsed = localStorage.getItem('pseudocode_sidebar_collapsed') === 'true';
    if (savedCollapsed && window.innerWidth > 860) {
        toggleSidebarCollapsed(true, false);
        // Since it was already collapsed in storage, hide immediately
        if (elements.sidebarEdgeHotspot) {
            elements.sidebarEdgeHotspot.classList.add('is-collapsed-hidden');
        }
    }

    elements.sidebarBackdrop.addEventListener('click', closeSidebar);

    // Responsive viewport listener to keep sidebar state synchronized
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 860) {
            // When minimized, ensure .collapsed doesn't obstruct drawer opening
            if (elements.sidebar) {
                elements.sidebar.classList.remove('collapsed');
            }
        } else {
            // Returning to desktop full screen: close mobile drawer and restore collapsed state
            if (elements.sidebar) {
                elements.sidebar.classList.remove('open');
                const isCollapsed = localStorage.getItem('pseudocode_sidebar_collapsed') === 'true';
                elements.sidebar.classList.toggle('collapsed', isCollapsed);
            }
            if (elements.sidebarBackdrop) {
                elements.sidebarBackdrop.classList.remove('active');
            }
        }
    });

    // =========================================================================
    // Tab Switching (Challenges / Playground / Saved Programs / Cheatsheet)
    // =========================================================================
    function switchTab(tab) {
        if (tab === 'cheatsheet') {
            openCheatsheet();
            document.querySelectorAll('[data-tab]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === 'cheatsheet');
            });
            return;
        }

        state.activeTab = tab;

        // Synchronize all tab buttons (segmented control, sidebar main nav, mobile tabbar)
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });

        if (tab === 'challenges') {
            elements.problemCard.style.display = 'block';
            elements.savedProgramsSection.classList.add('is-hidden');
            elements.codingGrid.style.display = 'grid';
            elements.testcasesCard.style.display = 'block';
            elements.btnCheckSolution.style.display = 'inline-flex';
            renderSidebar();
        } else if (tab === 'playground') {
            elements.problemCard.style.display = 'none';
            elements.savedProgramsSection.classList.add('is-hidden');
            elements.codingGrid.style.display = 'grid';
            elements.testcasesCard.style.display = 'none';
            elements.btnCheckSolution.style.display = 'none';

            if (!elements.editor.value.trim() || elements.editor.value.includes('HaloDunia')) {
                if (state.currentLanguage === 'golang') {
                    elements.editor.value = `package main

import "fmt"

func main() {
    nama := "budi"
    umur := 17
    fmt.Printf("Halo %s, umurmu adalah %d\n", nama, umur)
    if umur >= 17 {
        fmt.Println("Kamu sudah cukup umur!")
    } else {
        fmt.Println("Kamu masih anak-anak.")
    }
}`;
                } else {
                    elements.editor.value = `program #####
kamus
    nama : string
    umur : integer

algoritma
    nama <- "budi"
    umur <- 17
    
    output("halo ", nama, ", umurmu adalah ", umur)
    
    jika umur >= 17 maka
        output("kamu sudah cukup umur!")
    lainnya
        output("kamu masih anak-anak.")
    selesai_jika
endprogram`;
                }
                updateLineNumbers();
            }
        } else if (tab === 'saved-programs') {
            elements.problemCard.style.display = 'none';
            elements.codingGrid.style.display = 'none';
            elements.savedProgramsSection.classList.remove('is-hidden');
            renderSavedProgramsList(elements.savedSearchInput ? elements.savedSearchInput.value : '');
        }
    }

    // Attach click listeners to all tab buttons across segmented control, sidebar, and tabbar
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            const targetTab = btn.dataset.tab;
            switchTab(targetTab);

            // If sidebar is open on mobile/tablet drawer, close it smoothly after selection
            if (elements.sidebar && elements.sidebar.classList.contains('open')) {
                closeSidebar();
            }
        });
    });

    // =========================================================================
    // Saved Programs Manager Logic
    // =========================================================================
    function extractProgramName(code) {
        if (!code) return '';
        // Pseudocode: program <name> or algoritma <name>
        const match = code.match(/^(?:program|algoritma)\s+([a-zA-Z0-9_#]+)/im);
        if (match && match[1] && match[1] !== '#####') {
            return match[1].trim().toLowerCase();
        }
        // Go / Pseudocode comments: // program: <name> or // file: <name>
        const commentMatch = code.match(/\/\/\s*(?:program|file|nama)\s*:\s*([a-zA-Z0-9_-]+)/i);
        if (commentMatch && commentMatch[1]) {
            return commentMatch[1].trim().toLowerCase();
        }
        return '';
    }

    function renderSavedProgramsList(filterQuery = '') {
        const query = filterQuery.trim().toLowerCase();
        const filtered = savedPrograms.filter(p => 
            p.name.toLowerCase().includes(query) || p.code.toLowerCase().includes(query)
        );

        elements.savedStatsLabel.textContent = `Menampilkan ${filtered.length} dari ${savedPrograms.length} program`;
        elements.savedProgramsGrid.innerHTML = '';

        if (filtered.length === 0) {
            elements.savedProgramsGrid.innerHTML = `
                <div class="saved-empty-state">
                    <div class="empty-icon"><i data-lucide="file-question"></i></div>
                    <h3 class="empty-title">${query ? 'Tidak Ditemukan' : 'Belum Ada Program'}</h3>
                    <p class="empty-desc">${query ? 'Tidak ada program tersimpan yang sesuai dengan kata kunci pencarian.' : 'Tulis program di editor dan klik tombol "Simpan" untuk menyimpannya di sini.'}</p>
                    <button class="ios-button ios-button-primary ios-btn-bounce" id="btn-empty-new-prog">
                        <i data-lucide="plus"></i>
                        <span>Buat Program Baru</span>
                    </button>
                </div>
            `;
            const emptyBtn = document.getElementById('btn-empty-new-prog');
            if (emptyBtn) {
                emptyBtn.addEventListener('click', createNewProgram);
            }
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        filtered.forEach(prog => {
            const card = document.createElement('div');
            card.className = 'saved-program-card';
            const lines = prog.code.split('\n').length;
            const previewSnippet = prog.code.split('\n').slice(0, 5).join('\n');
            const isGo = prog.lang === 'golang' || prog.code.includes('package main');

            card.innerHTML = `
                <div class="saved-card-header">
                    <div class="saved-card-title-group">
                        <span class="saved-card-title">${isGo ? 'main.go (' + prog.name + ')' : 'program ' + prog.name}</span>
                        <div class="saved-card-meta">
                            <span><i data-lucide="calendar"></i> ${prog.date}</span>
                            <span>•</span>
                            <span>${lines} baris</span>
                            <span>•</span>
                            <span class="${isGo ? 'go-tag' : 'challenge-badge-mini'}">${isGo ? 'GOLANG' : 'PSEUDO'}</span>
                        </div>
                    </div>
                </div>
                <div class="saved-code-preview">${escapeHtml(previewSnippet)}</div>
                <div class="saved-card-footer">
                    <button class="ios-button ios-button-tinted ios-button-sm btn-open-saved" title="Buka di Editor">
                        <i data-lucide="play"></i>
                        <span>Buka</span>
                    </button>
                    <button class="ios-button ios-button-secondary ios-button-sm btn-download-saved" title="Unduh File">
                        <i data-lucide="download"></i>
                    </button>
                    <button class="ios-button ios-button-secondary ios-button-sm btn-duplicate-saved" title="Duplikat Program">
                        <i data-lucide="copy"></i>
                    </button>
                    <button class="ios-button ios-button-subtle ios-button-sm btn-delete-saved" title="Hapus Program" style="color: var(--ios-red);">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            `;

            card.querySelector('.btn-open-saved').addEventListener('click', () => {
                if (window.soundManager) window.soundManager.playTap();
                loadSavedProgramIntoEditor(prog);
            });

            card.querySelector('.btn-download-saved').addEventListener('click', () => {
                if (window.soundManager) window.soundManager.playTap();
                const ext = isGo ? 'go' : 'pseudo';
                downloadFile(`${prog.name}.${ext}`, prog.code);
            });

            card.querySelector('.btn-duplicate-saved').addEventListener('click', () => {
                if (window.soundManager) window.soundManager.playTap();
                duplicateProgram(prog);
            });

            card.querySelector('.btn-delete-saved').addEventListener('click', () => {
                if (window.soundManager) window.soundManager.playTap();
                deleteProgram(prog.id, prog.name);
            });

            elements.savedProgramsGrid.appendChild(card);
        });

        if (window.lucide) window.lucide.createIcons();
    }

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function loadSavedProgramIntoEditor(prog) {
        const isGo = prog.lang === 'golang' || prog.code.includes('package main');
        elements.editor.value = prog.code;
        state.currentProgramId = prog.id;
        state.currentFileTitle = `${prog.name}.${isGo ? 'go' : 'pseudo'}`;
        updateFileLabel();
        updateLineNumbers();
        setLanguage(isGo ? 'golang' : 'pseudocode');
        switchTab('playground');
    }

    function createNewProgram() {
        if (window.soundManager) window.soundManager.playTap();
        state.currentProgramId = null;
        if (state.currentLanguage === 'golang') {
            elements.editor.value = `package main

import "fmt"

func main() {
    fmt.Println("Halo dari program Go baru!")
}`;
            state.currentFileTitle = 'main.go';
        } else {
            elements.editor.value = `program #####
kamus
    // deklarasi variabel ditulis di sini
    nama : string

algoritma
    // instruksi program ditulis di sini
    output("halo dari program baru!")
endprogram`;
            state.currentFileTitle = 'program_baru.pseudo';
        }
        updateFileLabel();
        updateLineNumbers();
        switchTab('playground');
        elements.editor.focus();
    }

    if (elements.btnNewProgram) {
        elements.btnNewProgram.addEventListener('click', createNewProgram);
    }

    if (elements.savedSearchInput) {
        elements.savedSearchInput.addEventListener('input', (e) => {
            renderSavedProgramsList(e.target.value);
        });
    }

    function duplicateProgram(prog) {
        const isGo = prog.lang === 'golang' || prog.code.includes('package main');
        const newProg = {
            id: 'prog-' + Date.now(),
            name: `${prog.name}_salinan`,
            lang: isGo ? 'golang' : 'pseudocode',
            code: prog.code,
            date: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
            updatedAt: Date.now()
        };
        savedPrograms.unshift(newProg);
        persistSavedPrograms();
    }

    function deleteProgram(id, name) {
        if (confirm(`Yakin ingin menghapus program "${name}"?`)) {
            savedPrograms = savedPrograms.filter(p => p.id !== id);
            persistSavedPrograms();
        }
    }

    function downloadFile(filename, content) {
        const cleanName = filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = cleanName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Export Backup JSON
    if (elements.btnExportBackup) {
        elements.btnExportBackup.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            const dataStr = JSON.stringify(savedPrograms, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `programs_backup_${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    }

    // =========================================================================
    // Save Program Modal Logic
    // =========================================================================
    const SUGGESTED_PROGRAM_NAMES = {
        pseudocode: ['hitung_luas', 'cek_ganjil_genap', 'kalkulator_mini', 'faktorial', 'deret_prima', 'luas_lingkaran'],
        golang: ['main_calc', 'loop_bilangan', 'hitung_luas', 'slice_demo', 'deret_fibonacci', 'greeting_go']
    };

    // Platform-aware shortcut badge (⌘S on macOS/iOS, Ctrl+S on Windows/Linux)
    if (elements.saveKbdShortcut) {
        const isApple = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform || navigator.userAgent);
        elements.saveKbdShortcut.textContent = isApple ? '⌘S' : 'Ctrl+S';
    }

    function openSaveModal() {
        const currentCode = elements.editor.value;
        const isGo = state.currentLanguage === 'golang';
        const detectedName = extractProgramName(currentCode) || (isGo ? 'main' : 'program_ku');

        elements.saveProgramTitle.value = detectedName;
        if (detectedName && detectedName !== 'program_ku' && detectedName !== 'main') {
            elements.saveDetectedHint.style.display = 'block';
            elements.saveDetectedHint.textContent = `Terdeteksi dari baris program: "${detectedName}"`;
        } else {
            elements.saveDetectedHint.style.display = 'none';
        }

        // Update modal language badge and extension tag
        if (elements.saveModalLangBadge) {
            if (isGo) {
                elements.saveModalLangBadge.classList.add('is-go');
                elements.saveModalLangBadge.classList.remove('is-pseudo');
            } else {
                elements.saveModalLangBadge.classList.add('is-pseudo');
                elements.saveModalLangBadge.classList.remove('is-go');
            }
        }
        if (elements.saveModalLangText) {
            elements.saveModalLangText.textContent = isGo ? 'Golang (.go)' : 'Pseudocode (.pseudo)';
        }
        if (elements.saveModalExt) {
            elements.saveModalExt.textContent = isGo ? '.go' : '.pseudo';
        }

        // Render suggestion chips
        if (elements.saveChipsList) {
            const suggestions = SUGGESTED_PROGRAM_NAMES[state.currentLanguage] || SUGGESTED_PROGRAM_NAMES.pseudocode;
            elements.saveChipsList.innerHTML = suggestions.map(name => 
                `<button type="button" class="save-chip-btn" data-name="${name}">${name}</button>`
            ).join('');

            elements.saveChipsList.querySelectorAll('.save-chip-btn').forEach(chip => {
                chip.addEventListener('click', () => {
                    if (window.soundManager) window.soundManager.playTap();
                    elements.saveProgramTitle.value = chip.dataset.name;
                    elements.saveProgramTitle.focus();
                    elements.saveProgramTitle.select();
                });
            });
        }

        elements.saveModal.classList.add('active');
        if (window.lucide) window.lucide.createIcons();
        elements.saveProgramTitle.focus();
        elements.saveProgramTitle.select();
    }

    function closeSaveModal() {
        elements.saveModal.classList.remove('active');
    }

    function animateSaveButtonSuccess() {
        if (!elements.btnSaveProgram) return;
        const originalHtml = elements.btnSaveProgram.innerHTML;
        elements.btnSaveProgram.innerHTML = '<i data-lucide="check"></i> <span>Tersimpan!</span>';
        elements.btnSaveProgram.style.borderColor = 'var(--ios-green)';
        elements.btnSaveProgram.style.color = 'var(--ios-green)';
        if (window.lucide) window.lucide.createIcons();

        setTimeout(() => {
            elements.btnSaveProgram.innerHTML = originalHtml;
            elements.btnSaveProgram.style.borderColor = '';
            elements.btnSaveProgram.style.color = '';
            if (window.lucide) window.lucide.createIcons();
        }, 1500);
    }

    function saveCurrentProgram() {
        let code = elements.editor.value;
        const nowFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        // 1. If currently editing a loaded program or an already-saved program
        let existingProg = null;
        if (state.currentProgramId) {
            existingProg = savedPrograms.find(p => p.id === state.currentProgramId);
        }

        // 2. Fallback check by current filename if specific
        if (!existingProg) {
            const cleanBase = state.currentFileTitle.replace(/\.(pseudo|go)$/, '').toLowerCase();
            if (cleanBase && cleanBase !== 'program' && cleanBase !== 'main' && cleanBase !== 'program_baru') {
                existingProg = savedPrograms.find(p => p.name.toLowerCase() === cleanBase);
            }
        }

        if (existingProg) {
            // DIRECTLY OVERWRITE the same file with the new code!
            existingProg.code = code;
            existingProg.lang = state.currentLanguage;
            existingProg.date = nowFormatted;
            existingProg.updatedAt = Date.now();
            state.currentProgramId = existingProg.id;

            persistSavedPrograms(true);

            animateSaveButtonSuccess();
            if (window.soundManager) window.soundManager.playSuccess();
            return;
        }

        // 3. Otherwise, open save modal for the very first time to choose a name
        openSaveModal();
    }

    function handleSaveConfirm() {
        let name = elements.saveProgramTitle.value.trim().toLowerCase();
        if (!name) name = state.currentLanguage === 'golang' ? 'main' : 'program_ku';

        name = name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');

        let code = elements.editor.value;

        if (code.includes('program #####')) {
            code = code.replace('program #####', `program ${name}`);
            elements.editor.value = code;
            updateLineNumbers();
        }

        const existingIdx = savedPrograms.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
        const nowFormatted = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

        if (existingIdx !== -1) {
            savedPrograms[existingIdx].code = code;
            savedPrograms[existingIdx].lang = state.currentLanguage;
            savedPrograms[existingIdx].date = nowFormatted;
            savedPrograms[existingIdx].updatedAt = Date.now();
            state.currentProgramId = savedPrograms[existingIdx].id;
        } else {
            const newProg = {
                id: 'prog-' + Date.now(),
                name: name,
                lang: state.currentLanguage,
                code: code,
                date: nowFormatted,
                updatedAt: Date.now()
            };
            savedPrograms.unshift(newProg);
            state.currentProgramId = newProg.id;
        }

        persistSavedPrograms(true);

        const ext = state.currentLanguage === 'golang' ? 'go' : 'pseudo';
        state.currentFileTitle = `${name}.${ext}`;
        updateFileLabel();

        closeSaveModal();
        animateSaveButtonSuccess();
        if (window.soundManager) window.soundManager.playSuccess();
    }

    if (elements.btnSaveProgram) {
        elements.btnSaveProgram.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            saveCurrentProgram();
        });
    }

    if (elements.btnSaveConfirm) {
        elements.btnSaveConfirm.addEventListener('click', handleSaveConfirm);
    }
    if (elements.btnSaveCancel) {
        elements.btnSaveCancel.addEventListener('click', closeSaveModal);
    }
    if (elements.saveProgramTitle) {
        elements.saveProgramTitle.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleSaveConfirm();
            if (e.key === 'Escape') closeSaveModal();
        });
    }

    // Shortcut: Cmd+S / Ctrl+S to save
    window.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            saveCurrentProgram();
        }
    });

    // =========================================================================
    // Syntax Highlighter Engine (Text Color for Golang & Pseudocode)
    // =========================================================================
    const CodeHighlighter = {
        escape(str) {
            return (str || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
        },

        highlightGolang(code) {
            const tokenRegex = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|((?:"(?:\\.|[^"\\])*"|`[^`]*`))|(\b\d+(?:\.\d+)?\b)|(\b(?:package|import|func|var|const|type|struct|interface|return|if|else|for|range|switch|case|default|break|continue|go|defer|select|chan|map)\b)|(\b(?:int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|float32|float64|float\s*64|float\s*32|string|bool|byte|rune|error|any)\b)|(\b(?:fmt|Println|Printf|Print|Scan|Scanln|Scanf|math|make|len|cap|append|copy|delete|panic|recover|new|true|false|nil|iota)\b)|(:=|==|!=|<=|>=|\+\+|--|&&|\|\||[+\-*\/%&|^!=<>])/g;

            let result = '';
            let lastIndex = 0;
            let match;

            while ((match = tokenRegex.exec(code)) !== null) {
                result += this.escape(code.slice(lastIndex, match.index));
                const [full, comment, str, num, kw, type, builtin, op] = match;
                if (comment) result += `<span class="token-comment">${this.escape(comment)}</span>`;
                else if (str) result += `<span class="token-string">${this.escape(str)}</span>`;
                else if (num) result += `<span class="token-number">${this.escape(num)}</span>`;
                else if (kw) result += `<span class="token-keyword">${this.escape(kw)}</span>`;
                else if (type) result += `<span class="token-type">${this.escape(type)}</span>`;
                else if (builtin) result += `<span class="token-builtin">${this.escape(builtin)}</span>`;
                else if (op) result += `<span class="token-operator">${this.escape(op)}</span>`;
                lastIndex = tokenRegex.lastIndex;
            }
            result += this.escape(code.slice(lastIndex));
            return result;
        },

        highlightPseudocode(code) {
            const tokenRegex = /(\/\/[^\n]*|#[^\n]*|\{[^\}]*\})|((?:"(?:\\.|[^"\\])*"|'[^']*'))|(\b\d+(?:\.\d+)?\b)|(\b(?:program|kamus|algoritma|endprogram|deklarasi|deskripsi)\b)|(\b(?:jika|maka|selain\s+itu|selainitu|selesai|untuk|sampai|lakukan|ulangi|selama|while|do|for|if|then|else|endif|endfor|endwhile|kasus|pilih|berhenti)\b)|(\b(?:input|output|masukan|tampilkan|cetak|baca|tulis)\b)|(\b(?:integer|string|boolean|float|real|char|bilangan|bulat|teks|desimal|karakter|larik|array)\b)|(\b(?:true|false|benar|salah|nil|null)\b)|(<-|:=|<=|>=|==|!=|<>|[+\-*\/%^=<>])|(\b(?:dan|atau|bukan|and|or|not|div|mod)\b)/gi;

            let result = '';
            let lastIndex = 0;
            let match;

            while ((match = tokenRegex.exec(code)) !== null) {
                result += this.escape(code.slice(lastIndex, match.index));
                const [full, comment, str, num, struct, ctrl, fn, type, boolConst, op, wordOp] = match;
                if (comment) result += `<span class="token-comment">${this.escape(comment)}</span>`;
                else if (str) result += `<span class="token-string">${this.escape(str)}</span>`;
                else if (num) result += `<span class="token-number">${this.escape(num)}</span>`;
                else if (struct) result += `<span class="token-structure">${this.escape(struct)}</span>`;
                else if (ctrl) result += `<span class="token-keyword">${this.escape(ctrl)}</span>`;
                else if (fn) result += `<span class="token-function">${this.escape(fn)}</span>`;
                else if (type) result += `<span class="token-type">${this.escape(type)}</span>`;
                else if (boolConst) result += `<span class="token-constant">${this.escape(boolConst)}</span>`;
                else if (op || wordOp) result += `<span class="token-operator">${this.escape(op || wordOp)}</span>`;
                lastIndex = tokenRegex.lastIndex;
            }
            result += this.escape(code.slice(lastIndex));
            return result;
        },

        highlight(code, lang) {
            if (!code) return '';
            return lang === 'golang'
                ? this.highlightGolang(code)
                : this.highlightPseudocode(code);
        }
    };

    // =========================================================================
    // Intelligent Autocomplete Suggestions Engine
    // =========================================================================
    const AUTOCOMPLETE_DATA = {
        golang: [
            { trigger: 'pac', label: 'package main', insert: 'package main\n\n', badge: 'pkg', badgeColor: 'badge-pkg', desc: 'Deklarasi package Go' },
            { trigger: 'package', label: 'package main', insert: 'package main\n\n', badge: 'pkg', badgeColor: 'badge-pkg', desc: 'Deklarasi package Go' },
            { trigger: 'imp', label: 'import "fmt"', insert: 'import "fmt"\n\n', badge: 'imp', badgeColor: 'badge-pkg', desc: 'Import modul fmt' },
            { trigger: 'import', label: 'import "fmt"', insert: 'import "fmt"\n\n', badge: 'imp', badgeColor: 'badge-pkg', desc: 'Import modul fmt' },
            { trigger: 'fun', label: 'func main() { ... }', insert: 'func main() {\n    \n}', cursorOffset: -2, badge: 'func', badgeColor: 'badge-func', desc: 'Fungsi utama program' },
            { trigger: 'func', label: 'func nama() { ... }', insert: 'func () {\n    \n}', cursorOffset: -8, badge: 'func', badgeColor: 'badge-func', desc: 'Fungsi baru' },
            { trigger: 'fmt', label: 'fmt.Println(...)', insert: 'fmt.Println("")', cursorOffset: -2, badge: 'func', badgeColor: 'badge-func', desc: 'Cetak teks ke layar' },
            { trigger: 'pl', label: 'fmt.Println(...)', insert: 'fmt.Println("")', cursorOffset: -2, badge: 'func', badgeColor: 'badge-func', desc: 'Cetak teks baris baru' },
            { trigger: 'pf', label: 'fmt.Printf(...)', insert: 'fmt.Printf("%v\\n", )', cursorOffset: -1, badge: 'func', badgeColor: 'badge-func', desc: 'Cetak output format' },
            { trigger: 'scan', label: 'fmt.Scanln(&...)', insert: 'fmt.Scanln(&)', cursorOffset: -1, badge: 'func', badgeColor: 'badge-func', desc: 'Membaca input' },
            { trigger: 'var', label: 'var nama tipe', insert: 'var  int', cursorOffset: -4, badge: 'var', badgeColor: 'badge-var', desc: 'Deklarasi variabel' },
            { trigger: 'flo', label: 'var nama float64', insert: 'var  float64', cursorOffset: -8, badge: 'var', badgeColor: 'badge-var', desc: 'Variabel desimal float64' },
            { trigger: 'float', label: 'var nama float64', insert: 'var  float64', cursorOffset: -8, badge: 'var', badgeColor: 'badge-var', desc: 'Variabel desimal float64' },
            { trigger: 'float64', label: 'float64(...)', insert: 'float64()', cursorOffset: -1, badge: 'type', badgeColor: 'badge-type', desc: 'Konversi ke float64' },
            { trigger: 'con', label: 'const nama = nilai', insert: 'const  = ', cursorOffset: -3, badge: 'const', badgeColor: 'badge-ctrl', desc: 'Konstanta Go' },
            { trigger: 'pi', label: 'math.Pi', insert: 'math.Pi', badge: 'const', badgeColor: 'badge-ctrl', desc: 'Konstanta Pi (3.14159)' },
            { trigger: 'sqrt', label: 'math.Sqrt(...)', insert: 'math.Sqrt()', cursorOffset: -1, badge: 'func', badgeColor: 'badge-func', desc: 'Akar kuadrat math' },
            { trigger: 'pow', label: 'math.Pow(x, y)', insert: 'math.Pow(, )', cursorOffset: -4, badge: 'func', badgeColor: 'badge-func', desc: 'Pangkat bilangan' },
            { trigger: 'swi', label: 'switch ... { case: }', insert: 'switch {\ncase :\n    \ndefault:\n    \n}', cursorOffset: -27, badge: 'ctrl', badgeColor: 'badge-ctrl', desc: 'Percabangan switch' },
            { trigger: 'for', label: 'for i := 0; i < 10; i++ { ... }', insert: 'for i := 0; i < 10; i++ {\n    \n}', cursorOffset: -2, badge: 'loop', badgeColor: 'badge-ctrl', desc: 'Perulangan for' },
            { trigger: 'if', label: 'if kondisi { ... }', insert: 'if kondisi {\n    \n}', cursorOffset: -2, badge: 'cond', badgeColor: 'badge-ctrl', desc: 'Percabangan if' },
            { trigger: 'ife', label: 'if ... else { ... }', insert: 'if kondisi {\n    \n} else {\n    \n}', cursorOffset: -16, badge: 'cond', badgeColor: 'badge-ctrl', desc: 'Percabangan if..else' },
            { trigger: 'ret', label: 'return', insert: 'return ', badge: 'key', badgeColor: 'badge-ctrl', desc: 'Kembalikan nilai' },
            { trigger: 'int', label: 'int', insert: 'int', badge: 'type', badgeColor: 'badge-type', desc: 'Tipe data integer' },
            { trigger: 'str', label: 'string', insert: 'string', badge: 'type', badgeColor: 'badge-type', desc: 'Tipe data string' },
            { trigger: 'bool', label: 'bool', insert: 'bool', badge: 'type', badgeColor: 'badge-type', desc: 'Tipe data boolean' },
            { trigger: 'make', label: 'make([]int, 0)', insert: 'make([]int, 0)', badge: 'func', badgeColor: 'badge-func', desc: 'Buat slice / map' },
            { trigger: 'len', label: 'len(...)', insert: 'len()', cursorOffset: -1, badge: 'func', badgeColor: 'badge-func', desc: 'Panjang slice' }
        ],
        pseudocode: [
            { trigger: 'pro', label: 'program nama_program', insert: 'program nama_program\n\nkamus:\n    \n\nalgoritma:\n    \n\nendprogram', badge: 'prog', badgeColor: 'badge-pkg', desc: 'Struktur pseudocode lengkap' },
            { trigger: 'program', label: 'program nama_program', insert: 'program nama_program\n\nkamus:\n    \n\nalgoritma:\n    \n\nendprogram', badge: 'prog', badgeColor: 'badge-pkg', desc: 'Struktur pseudocode lengkap' },
            { trigger: 'kam', label: 'kamus:', insert: 'kamus:\n    ', badge: 'kamus', badgeColor: 'badge-var', desc: 'Blok deklarasi kamus' },
            { trigger: 'kamus', label: 'kamus:', insert: 'kamus:\n    ', badge: 'kamus', badgeColor: 'badge-var', desc: 'Blok deklarasi kamus' },
            { trigger: 'alg', label: 'algoritma:', insert: 'algoritma:\n    ', badge: 'alg', badgeColor: 'badge-func', desc: 'Blok instruksi algoritma' },
            { trigger: 'algoritma', label: 'algoritma:', insert: 'algoritma:\n    ', badge: 'alg', badgeColor: 'badge-func', desc: 'Blok instruksi algoritma' },
            { trigger: 'inp', label: 'input(...)', insert: 'input()', cursorOffset: -1, badge: 'i/o', badgeColor: 'badge-func', desc: 'Membaca input' },
            { trigger: 'input', label: 'input(...)', insert: 'input()', cursorOffset: -1, badge: 'i/o', badgeColor: 'badge-func', desc: 'Membaca input' },
            { trigger: 'out', label: 'output(...)', insert: 'output()', cursorOffset: -1, badge: 'i/o', badgeColor: 'badge-func', desc: 'Menampilkan output' },
            { trigger: 'output', label: 'output(...)', insert: 'output()', cursorOffset: -1, badge: 'i/o', badgeColor: 'badge-func', desc: 'Menampilkan output' },
            { trigger: 'end', label: 'endprogram', insert: 'endprogram', badge: 'end', badgeColor: 'badge-pkg', desc: 'Penutup program' },
            { trigger: 'endprogram', label: 'endprogram', insert: 'endprogram', badge: 'end', badgeColor: 'badge-pkg', desc: 'Penutup program' },
            { trigger: 'jik', label: 'jika kondisi maka ... selesai', insert: 'jika kondisi maka\n    \nselesai', cursorOffset: -9, badge: 'cond', badgeColor: 'badge-ctrl', desc: 'Percabangan jika' },
            { trigger: 'jika', label: 'jika kondisi maka ... selesai', insert: 'jika kondisi maka\n    \nselesai', cursorOffset: -9, badge: 'cond', badgeColor: 'badge-ctrl', desc: 'Percabangan jika' },
            { trigger: 'unt', label: 'untuk i = 1 sampai n lakukan', insert: 'untuk i = 1 sampai 10 lakukan\n    \nselesai', cursorOffset: -9, badge: 'loop', badgeColor: 'badge-ctrl', desc: 'Perulangan untuk' },
            { trigger: 'untuk', label: 'untuk i = 1 sampai n lakukan', insert: 'untuk i = 1 sampai 10 lakukan\n    \nselesai', cursorOffset: -9, badge: 'loop', badgeColor: 'badge-ctrl', desc: 'Perulangan untuk' },
            { trigger: 'ula', label: 'ulangi ... sampai', insert: 'ulangi\n    \nsampai kondisi', cursorOffset: -16, badge: 'loop', badgeColor: 'badge-ctrl', desc: 'Perulangan ulangi' },
            { trigger: 'ulangi', label: 'ulangi ... sampai', insert: 'ulangi\n    \nsampai kondisi', cursorOffset: -16, badge: 'loop', badgeColor: 'badge-ctrl', desc: 'Perulangan ulangi' },
            { trigger: 'sel', label: 'selesai', insert: 'selesai', badge: 'end', badgeColor: 'badge-ctrl', desc: 'Penutup percabangan/loop' },
            { trigger: 'selesai', label: 'selesai', insert: 'selesai', badge: 'end', badgeColor: 'badge-ctrl', desc: 'Penutup percabangan/loop' },
            { trigger: 'bil', label: 'bilangan', insert: 'bilangan', badge: 'type', badgeColor: 'badge-type', desc: 'Tipe data angka bulat' },
            { trigger: 'tek', label: 'teks', insert: 'teks', badge: 'type', badgeColor: 'badge-type', desc: 'Tipe data teks' },
            { trigger: 'des', label: 'desimal', insert: 'desimal', badge: 'type', badgeColor: 'badge-type', desc: 'Tipe data angka desimal' }
        ]
    };

    let autocompleteActive = false;
    let activeAutocompleteList = [];
    let activeAutocompleteIndex = 0;
    let currentTokenWord = { word: '', start: 0, end: 0 };

    function getCurrentTokenWord() {
        const pos = elements.editor.selectionStart;
        const text = elements.editor.value.substring(0, pos);
        const match = text.match(/[a-zA-Z0-9_\.]*$/);
        if (!match) return { word: '', start: pos, end: pos };
        const word = match[0];
        return {
            word: word,
            start: pos - word.length,
            end: pos
        };
    }

    function positionAutocomplete() {
        if (!elements.autocomplete) return;
        const textBefore = elements.editor.value.substring(0, elements.editor.selectionStart);
        const lines = textBefore.split('\n');
        const lineIndex = lines.length - 1;
        const colIndex = lines[lineIndex].length;

        const lineHeight = 22;
        const charWidth = 8.1;
        const padding = 16;

        let top = padding + (lineIndex + 1) * lineHeight - elements.editor.scrollTop + 4;
        let left = padding + (colIndex * charWidth) - elements.editor.scrollLeft;

        const containerHeight = elements.editorContainer ? elements.editorContainer.clientHeight : 400;
        const containerWidth = elements.editorContainer ? elements.editorContainer.clientWidth : 600;

        if (top + 220 > containerHeight) {
            top = Math.max(8, padding + (lineIndex * lineHeight) - elements.editor.scrollTop - 225);
        }

        left = Math.max(12, Math.min(left, containerWidth - 330));
        top = Math.max(8, top);

        elements.autocomplete.style.top = `${top}px`;
        elements.autocomplete.style.left = `${left}px`;
    }

    function renderAutocompleteList() {
        if (!elements.autocompleteList) return;
        let html = '';
        activeAutocompleteList.forEach((item, idx) => {
            const isActive = idx === activeAutocompleteIndex;
            html += `
                <div class="autocomplete-item ${isActive ? 'active' : ''}" data-index="${idx}">
                    <span class="autocomplete-badge ${item.badgeColor}">${item.badge}</span>
                    <span class="autocomplete-label">${item.label}</span>
                    ${item.desc ? `<span class="autocomplete-desc">${item.desc}</span>` : ''}
                </div>
            `;
        });
        elements.autocompleteList.innerHTML = html;

        elements.autocompleteList.querySelectorAll('.autocomplete-item').forEach(el => {
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                const idx = parseInt(el.dataset.index, 10);
                selectAutocompleteItem(idx);
            });
        });

        const activeEl = elements.autocompleteList.querySelector('.autocomplete-item.active');
        if (activeEl) {
            activeEl.scrollIntoView({ block: 'nearest' });
        }
    }

    function triggerAutocomplete() {
        if (!elements.autocomplete) return;
        currentTokenWord = getCurrentTokenWord();
        const query = currentTokenWord.word.toLowerCase();

        if (!query || query.length < 1) {
            hideAutocomplete();
            return;
        }

        const pool = AUTOCOMPLETE_DATA[state.currentLanguage] || [];
        const matches = [];
        const seen = new Set();
        for (const item of pool) {
            const matchesTrigger = item.trigger.toLowerCase().startsWith(query) ||
                                  item.label.toLowerCase().startsWith(query) ||
                                  (query.length >= 2 && item.label.toLowerCase().includes(query));
            if (matchesTrigger && !seen.has(item.label)) {
                seen.add(item.label);
                matches.push(item);
            }
        }

        if (matches.length === 0) {
            hideAutocomplete();
            return;
        }

        activeAutocompleteList = matches;
        activeAutocompleteIndex = 0;
        renderAutocompleteList();
        positionAutocomplete();
        elements.autocomplete.classList.remove('is-hidden');
        autocompleteActive = true;
    }

    function hideAutocomplete() {
        if (!elements.autocomplete) return;
        elements.autocomplete.classList.add('is-hidden');
        autocompleteActive = false;
        activeAutocompleteList = [];
    }

    function selectAutocompleteItem(idx) {
        const item = activeAutocompleteList[idx];
        if (!item) return;
        if (window.soundManager) window.soundManager.playTap();

        const editor = elements.editor;
        const val = editor.value;
        const start = currentTokenWord.start;
        const end = editor.selectionStart;

        const before = val.substring(0, start);
        const after = val.substring(end);
        const insertText = item.insert;

        editor.value = before + insertText + after;
        const offset = item.cursorOffset || 0;
        const newPos = start + insertText.length + offset;
        editor.selectionStart = editor.selectionEnd = newPos;
        editor.focus();

        updateLineNumbers();
        hideAutocomplete();
    }

    // =========================================================================
    // Code Editor Utilities (Line numbers, syntax highlight, tab indent, snippets)
    // =========================================================================
    function renderCodeHighlight() {
        if (!elements.codeHighlightContent) return;
        const code = elements.editor.value;
        const highlighted = CodeHighlighter.highlight(code, state.currentLanguage);
        elements.codeHighlightContent.innerHTML = highlighted + (code.endsWith('\n') ? ' ' : '');
    }

    function updateLineNumbers() {
        const lines = elements.editor.value.split('\n');
        const count = lines.length || 1;
        let numbersHtml = '';
        for (let i = 1; i <= count; i++) {
            numbersHtml += `${i}<br>`;
        }
        elements.lineNumbers.innerHTML = numbersHtml;
        renderCodeHighlight();
    }

    elements.editor.addEventListener('input', () => {
        updateLineNumbers();
        syncEditorScroll();
        triggerAutocomplete();
    });

    function syncEditorScroll() {
        elements.lineNumbers.scrollTop = elements.editor.scrollTop;
        if (elements.codeHighlight) {
            elements.codeHighlight.scrollTop = elements.editor.scrollTop;
            elements.codeHighlight.scrollLeft = elements.editor.scrollLeft;
        }
        if (autocompleteActive) {
            positionAutocomplete();
        }
    }

    elements.editor.addEventListener('scroll', syncEditorScroll);

    // Tab key handling, Autocomplete keys, & Ctrl+A Select All
    elements.editor.addEventListener('keydown', (e) => {
        if (autocompleteActive) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeAutocompleteIndex = (activeAutocompleteIndex + 1) % activeAutocompleteList.length;
                renderAutocompleteList();
                return;
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeAutocompleteIndex = (activeAutocompleteIndex - 1 + activeAutocompleteList.length) % activeAutocompleteList.length;
                renderAutocompleteList();
                return;
            } else if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                selectAutocompleteItem(activeAutocompleteIndex);
                return;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                hideAutocomplete();
                return;
            }
        }

        if (e.key === 'Tab') {
            e.preventDefault();
            const start = elements.editor.selectionStart;
            const end = elements.editor.selectionEnd;
            const val = elements.editor.value;
            elements.editor.value = val.substring(0, start) + '    ' + val.substring(end);
            elements.editor.selectionStart = elements.editor.selectionEnd = start + 4;
            updateLineNumbers();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            elements.editor.focus();
            elements.editor.setSelectionRange(0, elements.editor.value.length);
        }
    });

    document.addEventListener('click', (e) => {
        if (autocompleteActive && elements.autocomplete && !elements.autocomplete.contains(e.target) && e.target !== elements.editor) {
            hideAutocomplete();
        }
    });

    // Dedicated Select All Button
    if (elements.btnSelectAll) {
        elements.btnSelectAll.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            elements.editor.focus();
            elements.editor.setSelectionRange(0, elements.editor.value.length);
        });
    }

    // Snippet buttons for both bars
    document.querySelectorAll('.snippet-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            const insertText = btn.dataset.insert;
            const start = elements.editor.selectionStart;
            const end = elements.editor.selectionEnd;
            const val = elements.editor.value;

            elements.editor.value = val.substring(0, start) + insertText + val.substring(end);
            elements.editor.focus();
            const newCursor = start + insertText.length;
            elements.editor.selectionStart = elements.editor.selectionEnd = newCursor;
            updateLineNumbers();
        });
    });

    // Reset Code Button
    elements.btnResetCode.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playTap();
        if (state.activeTab === 'challenges') {
            const ch = CHALLENGES[state.currentChallengeIndex];
            elements.editor.value = state.currentLanguage === 'golang' 
                ? CodeTranspiler.pseudocodeToGo(ch.starterCode) 
                : ch.starterCode;
            updateLineNumbers();
        } else {
            elements.editor.value = '';
            updateLineNumbers();
        }
    });

    // Copy Code Button
    elements.btnCopyCode.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playTap();
        navigator.clipboard.writeText(elements.editor.value).then(() => {
            showNotification('Menyalin Kode', 'Kode program telah disalin ke clipboard.', 'success', 'copy');
        });
    });

    // Hint toggle
    elements.btnHint.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playTap();
        elements.hintDrawer.classList.toggle('active');
    });

    // Reveal Solution
    elements.btnSolution.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playTap();
        const ch = CHALLENGES[state.currentChallengeIndex];
        if (confirm('Tampilkan kode solusi untuk tantangan ini? Kodemu saat ini akan diganti.')) {
            elements.editor.value = state.currentLanguage === 'golang'
                ? CodeTranspiler.pseudocodeToGo(ch.solution)
                : ch.solution;
            updateLineNumbers();
        }
    });

    // =========================================================================
    // Resizable Panels, Dynamic Layout Shifting & Scrolling Features
    // =========================================================================

    // 1. Sidebar Horizontal Resizer
    if (elements.sidebarResizerHandle) {
        let isDragging = false;
        elements.sidebarResizerHandle.addEventListener('mousedown', (e) => {
            isDragging = true;
            elements.sidebarResizerHandle.classList.add('is-dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newWidth = Math.min(Math.max(e.clientX, 220), 480);
            document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
            localStorage.setItem('pseudocode_sidebar_width', `${newWidth}px`);
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                elements.sidebarResizerHandle.classList.remove('is-dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    // Restore saved sidebar width
    const savedSidebarWidth = localStorage.getItem('pseudocode_sidebar_width');
    if (savedSidebarWidth) {
        document.documentElement.style.setProperty('--sidebar-width', savedSidebarWidth);
    }

    // 2. Editor vs Execution Panel Splitter Dragging & Stacked Shift Animation
    function setStackedLayout(stacked) {
        if (!elements.codingGrid) return;
        if (stacked) {
            elements.codingGrid.classList.add('layout-stacked');
            if (elements.layoutToggleIcon) elements.layoutToggleIcon.setAttribute('data-lucide', 'rows-2');
            if (elements.btnToggleLayout) elements.btnToggleLayout.setAttribute('title', 'Kembali ke Tampilan Berdampingan');
        } else {
            elements.codingGrid.classList.remove('layout-stacked');
            if (elements.layoutToggleIcon) elements.layoutToggleIcon.setAttribute('data-lucide', 'columns-2');
            if (elements.btnToggleLayout) elements.btnToggleLayout.setAttribute('title', 'Tumpuk Panel ke Bawah');
        }
        localStorage.setItem('pseudocode_layout_stacked', stacked ? 'true' : 'false');
        if (window.lucide) window.lucide.createIcons();
    }

    if (elements.btnToggleLayout) {
        elements.btnToggleLayout.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            const isStacked = elements.codingGrid.classList.contains('layout-stacked');
            setStackedLayout(!isStacked);
        });
    }

    const savedLayout = localStorage.getItem('pseudocode_layout_stacked');
    if (savedLayout === 'true' && window.innerWidth > 1024) {
        setStackedLayout(true);
    }

    if (elements.gridResizerGutter) {
        let isDraggingGutter = false;
        elements.gridResizerGutter.addEventListener('mousedown', (e) => {
            isDraggingGutter = true;
            elements.gridResizerGutter.classList.add('is-dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingGutter) return;
            const gridRect = elements.codingGrid.getBoundingClientRect();
            const offsetX = e.clientX - gridRect.left;
            const totalWidth = gridRect.width;
            const ratio = offsetX / totalWidth;

            // Jika bar text diperbesar melewati 68% -> bar paling kanan bergeser ke bawah dengan animasi!
            if (ratio > 0.68 && !elements.codingGrid.classList.contains('layout-stacked')) {
                setStackedLayout(true);
                if (window.soundManager) window.soundManager.playTap();
            } else if (ratio <= 0.65) {
                if (elements.codingGrid.classList.contains('layout-stacked')) {
                    setStackedLayout(false);
                }
                const editorWidthPercent = Math.min(Math.max(ratio * 100, 30), 65);
                elements.codingGrid.style.setProperty('--editor-col-width', `${editorWidthPercent}%`);
            }
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingGutter) {
                isDraggingGutter = false;
                elements.gridResizerGutter.classList.remove('is-dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }

    // 3. Editor Vertical Height Dragging
    if (elements.editorHeightResizer && elements.editorContainer) {
        let isDraggingH = false;
        let startY = 0;
        let startH = 0;

        elements.editorHeightResizer.addEventListener('mousedown', (e) => {
            isDraggingH = true;
            startY = e.clientY;
            startH = elements.editorContainer.offsetHeight;
            elements.editorHeightResizer.classList.add('is-dragging');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingH) return;
            const newHeight = Math.min(Math.max(startH + (e.clientY - startY), 220), 850);
            elements.editorContainer.style.height = `${newHeight}px`;
        });

        window.addEventListener('mouseup', () => {
            if (isDraggingH) {
                isDraggingH = false;
                elements.editorHeightResizer.classList.remove('is-dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                localStorage.setItem('pseudocode_editor_height', elements.editorContainer.style.height);
            }
        });
    }

    // Restore saved editor height
    const savedEditorHeight = localStorage.getItem('pseudocode_editor_height');
    if (savedEditorHeight && elements.editorContainer) {
        elements.editorContainer.style.height = savedEditorHeight;
    }

    // 4. Terminal & Console Vertical Height Resizers
    function setupHeightResizer(resizerEl, targetEl, storageKey) {
        if (!resizerEl || !targetEl) return;
        let isDragging = false;
        let startY = 0;
        let startH = 0;

        resizerEl.addEventListener('mousedown', (e) => {
            isDragging = true;
            startY = e.clientY;
            startH = targetEl.offsetHeight;
            resizerEl.classList.add('is-dragging');
            document.body.style.cursor = 'row-resize';
            document.body.style.userSelect = 'none';
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const newHeight = Math.min(Math.max(startH + (e.clientY - startY), 100), 650);
            targetEl.style.height = `${newHeight}px`;
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                resizerEl.classList.remove('is-dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                if (storageKey) localStorage.setItem(storageKey, targetEl.style.height);
            }
        });
    }

    setupHeightResizer(elements.terminalHeightResizer, document.getElementById('web-terminal-container'), 'pseudocode_terminal_height');
    setupHeightResizer(elements.consoleHeightResizer, elements.consoleOutput, 'pseudocode_console_height');

    // 5. Snippets Bar Horizontal Scrolling (Mouse Wheel & Click-Drag)
    const accessoryBars = document.querySelectorAll('.editor-accessory-bar');
    accessoryBars.forEach(bar => {
        bar.addEventListener('wheel', (e) => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                bar.scrollLeft += e.deltaY;
            }
        }, { passive: false });

        let isDown = false;
        let startX = 0;
        let scrollLeft = 0;

        bar.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
            isDown = true;
            bar.classList.add('is-grabbing');
            startX = e.pageX - bar.offsetLeft;
            scrollLeft = bar.scrollLeft;
        });

        bar.addEventListener('mouseleave', () => {
            isDown = false;
            bar.classList.remove('is-grabbing');
        });

        bar.addEventListener('mouseup', () => {
            isDown = false;
            bar.classList.remove('is-grabbing');
        });

        bar.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - bar.offsetLeft;
            const walk = (x - startX) * 1.5;
            bar.scrollLeft = scrollLeft - walk;
        });
    });

    // =========================================================================
    // Console & Live Watch Utilities
    // =========================================================================
    function updateVarTable(env) {
        const keys = Object.keys(env);
        if (keys.length === 0) {
            resetVarTable();
            return;
        }

        elements.varTableBody.innerHTML = '';
        keys.forEach(k => {
            const val = env[k];
            const type = typeof val === 'number' ? 'angka' : typeof val === 'boolean' ? 'boolean' : 'string';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="var-name">${k}</td>
                <td class="var-val updated">${String(val)}</td>
                <td class="var-type">${type}</td>
            `;
            elements.varTableBody.appendChild(tr);

            setTimeout(() => {
                const valEl = tr.querySelector('.var-val');
                if (valEl) valEl.classList.remove('updated');
            }, 400);
        });
    }

    function resetVarTable() {
        elements.varTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="3">Jalankan program atau mode per langkah untuk memantau variabel</td>
            </tr>
        `;
    }

    function setLineHighlight(lineNum) {
        if (!lineNum) {
            elements.lineIndicator.classList.remove('active');
            return;
        }
        const topPx = 16 + (lineNum - 1) * 22;
        elements.lineIndicator.style.top = `${topPx}px`;
        elements.lineIndicator.classList.add('active');

        const scrollTop = elements.editor.scrollTop;
        const containerHeight = elements.editor.clientHeight;
        if (topPx < scrollTop || topPx > scrollTop + containerHeight - 44) {
            elements.editor.scrollTop = Math.max(0, topPx - 100);
        }
    }

    // =========================================================================
    // Console for Pseudocode
    // =========================================================================
    function printConsole(text, type = 'output') {
        if (!elements.consoleOutput) return;
        const placeholder = elements.consoleOutput.querySelector('.console-placeholder');
        if (placeholder) {
            elements.consoleOutput.innerHTML = '';
        }
        const line = document.createElement('div');
        line.className = `console-line ${type}`;
        line.textContent = text;
        elements.consoleOutput.appendChild(line);
        elements.consoleOutput.scrollTop = elements.consoleOutput.scrollHeight;
    }

    function clearConsole() {
        if (elements.consoleOutput) {
            elements.consoleOutput.innerHTML = '<div class="console-placeholder">Keluaran (output) program pseudocode akan tampil di sini...</div>';
        }
    }

    if (elements.btnClearConsole) {
        elements.btnClearConsole.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            clearConsole();
        });
    }

    // =========================================================================
    // Execution: Terminal & Fast Run
    // =========================================================================
    async function runInTerminal() {
        stopStepExecution();
        const code = elements.editor.value;

        if (!code.trim()) {
            webTerminal.print('Error: Editor kode kosong. Tulis program terlebih dahulu.', 'error');
            showNotification('Kode Gagal', 'Editor kode masih kosong.', 'error', 'alert-circle');
            return;
        }

        showNotification('Menjalankan Program', 'Menjalankan di Web Terminal...', 'info', 'terminal');

        if (state.currentLanguage === 'golang') {
            await webTerminal.executeCommand('go run main.go');
        } else {
            webTerminal.print('gopher@macbook:~/workspace$ go run main.go', 'cmd-echo');
            webTerminal.print('Transpiling pseudocode ke Go...', 'dim');
            const goCode = CodeTranspiler.pseudocodeToGo(code);
            await webTerminal.runGoCode(goCode);
        }
    }

    if (elements.btnRunTerminal) {
        elements.btnRunTerminal.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            runInTerminal();
        });
    }

    // Interactive Prompt User Input for Pseudocode Console
    function promptUserInput(varName) {
        return new Promise((resolve) => {
            if (!elements.inputModal) {
                const res = window.prompt(`Program meminta nilai untuk variabel '${varName}':`, '');
                resolve(res);
                return;
            }

            if (elements.inputPromptLabel) {
                elements.inputPromptLabel.textContent = `Program meminta nilai untuk variabel '${varName}':`;
            }
            if (elements.userInputField) {
                elements.userInputField.value = '';
            }

            elements.inputModal.classList.add('active');
            if (elements.userInputField) {
                setTimeout(() => {
                    if (elements.userInputField) elements.userInputField.focus();
                }, 60);
            }

            const cleanup = () => {
                if (elements.btnInputSubmit) elements.btnInputSubmit.removeEventListener('click', onSubmit);
                if (elements.btnInputCancel) elements.btnInputCancel.removeEventListener('click', onCancel);
                if (elements.userInputField) elements.userInputField.removeEventListener('keydown', onKeyDown);
                if (elements.inputModal) elements.inputModal.classList.remove('active');
            };

            const onSubmit = () => {
                const val = elements.userInputField ? elements.userInputField.value : '';
                cleanup();
                if (window.soundManager) window.soundManager.playTap();
                printConsole(`[Masukan ${varName}]: ${val}`, 'system');
                resolve(val);
            };

            const onCancel = () => {
                cleanup();
                if (window.soundManager) window.soundManager.playTap();
                resolve(null);
            };

            const onKeyDown = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onSubmit();
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    onCancel();
                }
            };

            if (elements.btnInputSubmit) elements.btnInputSubmit.addEventListener('click', onSubmit);
            if (elements.btnInputCancel) elements.btnInputCancel.addEventListener('click', onCancel);
            if (elements.userInputField) elements.userInputField.addEventListener('keydown', onKeyDown);
        });
    }

    // Fast Run Button (For Pseudocode)
    elements.btnRunFast.addEventListener('click', async () => {
        if (window.soundManager) window.soundManager.playTap();
        stopStepExecution();
        clearConsole();

        const code = elements.editor.value;

        if (state.currentLanguage === 'golang') {
            await runInTerminal();
            return;
        }

        showNotification('Menjalankan Program', 'Mengeksekusi pseudocode...', 'info', 'play');

        // In pseudocode mode
        const interp = new PseudocodeInterpreter();
        try {
            interp.compile(code);
        } catch (err) {
            if (window.soundManager) window.soundManager.playError();
            printConsole(`❌ Kesalahan Sintaks: ${err.message}`, 'error');
            showNotification('Kode Gagal', `Kesalahan Sintaks: ${err.message}`, 'error', 'alert-circle');
            return;
        }

        printConsole('▶ Memulai eksekusi pseudocode...', 'system');
        interp.initExecution([]);
        interp.onOutput = (line) => printConsole(line, 'output');
        interp.onEnvChange = (env) => updateVarTable(env);

        try {
            while (interp.status === 'running') {
                const res = interp.step();
                if (res.waitingInput) {
                    const inputVal = await promptUserInput(res.varName);
                    if (inputVal === null) {
                        printConsole('⚠️ Eksekusi dibatalkan.', 'system');
                        return;
                    }
                    interp.provideInput(inputVal);
                }
                if (res.done) break;
            }

            printConsole(`✔ Selesai (${interp.stepCount} langkah).`, 'system');
            updateVarTable(interp.env);
            if (window.soundManager) window.soundManager.playTap();
            showNotification('Kode Berhasil', `Program selesai (${interp.stepCount} langkah).`, 'success', 'check-circle-2');
        } catch (err) {
            if (window.soundManager) window.soundManager.playError();
            printConsole(`❌ Kesalahan Runtime: ${err.message}`, 'error');
            showNotification('Kode Gagal', `Kesalahan Runtime: ${err.message}`, 'error', 'alert-circle');
        }
    });

    // Step Execution (Debugger)
    elements.btnStartStep.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playTap();
        startStepExecution();
    });

    elements.btnNextStep.addEventListener('click', async () => {
        if (window.soundManager) window.soundManager.playStep();
        await advanceStep();
    });

    elements.btnStopStep.addEventListener('click', () => {
        if (window.soundManager) window.soundManager.playTap();
        stopStepExecution();
    });

    function startStepExecution() {
        clearConsole();
        const code = elements.editor.value;
        state.interpreter = new PseudocodeInterpreter();

        // If in Go mode, transpile to pseudocode for step inspection
        const pseudoCode = state.currentLanguage === 'golang'
            ? CodeTranspiler.goToPseudocode(code)
            : code;

        try {
            state.interpreter.compile(pseudoCode);
        } catch (err) {
            if (window.soundManager) window.soundManager.playError();
            printConsole(`❌ Kesalahan Sintaks: ${err.message}`, 'error');
            showNotification('Kode Gagal', `Kesalahan: ${err.message}`, 'error', 'alert-circle');
            return;
        }

        state.interpreter.initExecution([]);
        state.interpreter.onOutput = (line) => printConsole(line, 'output');
        state.interpreter.onEnvChange = (env) => updateVarTable(env);

        state.steppingActive = true;
        elements.btnStartStep.classList.add('is-hidden');
        elements.btnNextStep.classList.remove('is-hidden');
        elements.btnStopStep.classList.remove('is-hidden');
        elements.stepStatusTag.textContent = 'Menjalankan';
        elements.stepStatusTag.className = 'step-indicator active';

        printConsole('🐾 Mode Per Langkah aktif. Klik "Lanjut (Step)" untuk melangkah.', 'system');

        if (state.interpreter.instructions.length > 0) {
            setLineHighlight(state.interpreter.instructions[0].lineNum);
        }
    }

    async function advanceStep() {
        if (!state.steppingActive) return;

        try {
            const res = state.interpreter.step();

            if (res.waitingInput) {
                const inputVal = await promptUserInput(res.varName);
                if (inputVal === null) {
                    stopStepExecution();
                    return;
                }
                state.interpreter.provideInput(inputVal);
                if (state.interpreter.ip < state.interpreter.instructions.length) {
                    setLineHighlight(state.interpreter.instructions[state.interpreter.ip].lineNum);
                }
                return;
            }

            if (res.done) {
                printConsole('✔ Program selesai dieksekusi sampai akhir.', 'system');
                if (window.soundManager) window.soundManager.playTap();
                stopStepExecution();
                return;
            }

            setLineHighlight(res.lineNum);
        } catch (err) {
            if (window.soundManager) window.soundManager.playError();
            printConsole(`❌ Kesalahan Eksekusi: ${err.message}`, 'error');
            stopStepExecution();
        }
    }

    function stopStepExecution() {
        state.steppingActive = false;
        elements.btnStartStep.classList.remove('is-hidden');
        elements.btnNextStep.classList.add('is-hidden');
        elements.btnStopStep.classList.add('is-hidden');
        elements.stepStatusTag.textContent = 'Siap';
        elements.stepStatusTag.className = 'step-indicator';
        setLineHighlight(null);
    }

    // =========================================================================
    // Challenge Verification & Test Runner (Works for both Pseudocode & Go)
    // =========================================================================
    elements.btnCheckSolution.addEventListener('click', async () => {
        if (window.soundManager) window.soundManager.playTap();
        stopStepExecution();

        const challenge = CHALLENGES[state.currentChallengeIndex];
        const code = elements.editor.value;

        webTerminal.print(`🔎 Menguji solusi untuk "${challenge.title}" (${state.currentLanguage.toUpperCase()})...`, 'cyan');

        let allPassed = true;
        let passCount = 0;
        const total = challenge.testCases.length;
        elements.testcasesList.innerHTML = '';

        for (let i = 0; i < total; i++) {
            const tc = challenge.testCases[i];

            try {
                let actualOutputs = [];

                if (state.currentLanguage === 'golang') {
                    const goInterp = new GoInterpreter(null);
                    const res = await goInterp.run(code, [...tc.inputs]);
                    actualOutputs = res.outputs.map(s => s.trim());
                } else {
                    const interp = new PseudocodeInterpreter();
                    interp.compile(code);
                    const result = interp.runAll([...tc.inputs]);
                    actualOutputs = result.output.map(s => s.trim());
                }

                const expectedOutputs = tc.expected.map(s => s.trim());
                const isMatch = actualOutputs.join('\n').toLowerCase() === expectedOutputs.join('\n').toLowerCase();

                if (isMatch) {
                    passCount++;
                } else {
                    allPassed = false;
                }

                renderTestResultItem(i + 1, tc, actualOutputs, isMatch);
            } catch (err) {
                allPassed = false;
                renderTestResultItem(i + 1, tc, [`Error: ${err.message}`], false, true);
            }
        }

        elements.testScoreBadge.textContent = `${passCount} / ${total} Lolos`;
        elements.testScoreBadge.className = `test-score-badge ${allPassed ? 'passed' : 'failed'}`;

        if (allPassed) {
            if (window.soundManager) window.soundManager.playSuccess();
            state.completedChallenges.add(challenge.id);
            localStorage.setItem('pseudocode_completed', JSON.stringify([...state.completedChallenges]));

            if (window.confetti) {
                window.confetti({
                    particleCount: 80,
                    spread: 70,
                    origin: { y: 0.6 }
                });
            }

            elements.problemStatus.textContent = 'Selesai';
            elements.problemStatus.className = 'ios-badge badge-status completed';

            webTerminal.print(`🎉 SEMPURNA! Semua ${total} kasus uji lolos verifikasi!`, 'success');
            showNotification('Kode Berhasil', 'Semua kasus uji lolos verifikasi dengan benar!', 'success', 'check-circle-2');
            renderSidebar();
        } else {
            if (window.soundManager) window.soundManager.playError();
            webTerminal.print(`❌ Beberapa kasus uji belum sesuai. Periksa logika kodemu!`, 'error');
            showNotification('Kode Gagal', `${passCount} dari ${total} kasus uji lolos.`, 'error', 'alert-circle');
        }
    });

    function renderTestResultItem(index, tc, actualOutputs, isMatch, isError = false) {
        const item = document.createElement('div');
        item.className = 'testcase-item';

        const inStr = tc.inputs.length > 0 ? tc.inputs.join(', ') : '(tanpa input)';
        const expStr = tc.expected.join(' | ');
        const actStr = actualOutputs.join(' | ') || '(kosong)';

        item.innerHTML = `
            <div class="testcase-item-header">
                <span class="testcase-desc">Uji #${index}: ${tc.description}</span>
                <span class="testcase-pill ${isMatch ? 'passed' : 'failed'}">
                    ${isMatch ? '✓ Lolos' : '✗ Gagal'}
                </span>
            </div>
            <div class="testcase-details">
                <div class="testcase-field">Input: <b>${inStr}</b></div>
                <div class="testcase-field">Ekspektasi: <b>${expStr}</b></div>
                <div class="testcase-field" style="grid-column: span 2; color: ${isMatch ? 'var(--ios-green)' : 'var(--ios-red)'};">
                    Keluaran Kodemu: <b>${actStr}</b>
                </div>
            </div>
        `;

        elements.testcasesList.appendChild(item);
    }

    // =========================================================================
    // Cheatsheet Modal (iOS Bottom Sheet)
    // =========================================================================
    function openCheatsheet() {
        elements.cheatsheetOverlay.classList.add('active');
    }
    function closeCheatsheet() {
        elements.cheatsheetOverlay.classList.remove('active');
        document.querySelectorAll('[data-tab]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
        });
    }

    elements.btnCloseCheatsheet.addEventListener('click', closeCheatsheet);
    elements.btnCheatsheetDone.addEventListener('click', closeCheatsheet);
    elements.btnOpenHelp.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.soundManager) window.soundManager.playTap();
        openCheatsheet();
    });

    elements.cheatsheetOverlay.addEventListener('click', (e) => {
        if (e.target === elements.cheatsheetOverlay) {
            closeCheatsheet();
        }
    });

    // =========================================================================
    // User Account & Cloud Database Controller (Username & Password)
    // =========================================================================
    let activeAuthTab = 'login'; // 'login' | 'register'
    let isPassVisible = false;

    function updateAuthUI() {
        const currentUser = window.CloudDB ? window.CloudDB.getCurrentUser() : null;
        const isConfigured = window.CloudDB ? window.CloudDB.isConfigured() : false;

        // 1. Status Banner in Modal
        if (elements.cloudStatusDot && elements.cloudStatusText) {
            if (isConfigured) {
                elements.cloudStatusDot.className = 'status-indicator-dot online';
                elements.cloudStatusText.textContent = 'Cloud Database: Terhubung';
            } else {
                elements.cloudStatusDot.className = 'status-indicator-dot warning';
                elements.cloudStatusText.textContent = 'Cloud Database: Belum Terhubung (Klik Pengaturan)';
            }
        }

        // 2. Navbar & Sidebar Account Button
        const pillIconWrap = document.getElementById('auth-pill-icon-wrap');
        const sidebarAvatarWrap = document.getElementById('sidebar-avatar-wrap');

        if (currentUser) {
            if (elements.btnAuthUser) {
                elements.btnAuthUser.classList.add('logged-in');
            }
            if (elements.authStatusLabel) {
                elements.authStatusLabel.textContent = `@${currentUser}`;
            }
            if (pillIconWrap) {
                pillIconWrap.innerHTML = '<i data-lucide="user-check"></i>';
            }

            if (elements.sidebarAuthBtn) {
                elements.sidebarAuthBtn.classList.add('logged-in');
            }
            if (elements.sidebarUserDisplay) {
                elements.sidebarUserDisplay.textContent = `@${currentUser}`;
            }
            if (elements.sidebarSyncStatus) {
                elements.sidebarSyncStatus.textContent = '● Cloud Aktif & Tersinkron';
            }
            if (sidebarAvatarWrap) {
                sidebarAvatarWrap.innerHTML = '<i data-lucide="user-check"></i>';
            }

            // Modal views
            if (elements.authLoggedInView) elements.authLoggedInView.classList.remove('is-hidden');
            if (elements.authGuestView) elements.authGuestView.classList.add('is-hidden');
            if (elements.loggedUsernameDisplay) elements.loggedUsernameDisplay.textContent = `@${currentUser}`;
        } else {
            if (elements.btnAuthUser) {
                elements.btnAuthUser.classList.remove('logged-in');
            }
            if (elements.authStatusLabel) {
                elements.authStatusLabel.textContent = 'Masuk / Akun';
            }
            if (pillIconWrap) {
                pillIconWrap.innerHTML = '<i data-lucide="cloud"></i>';
            }

            if (elements.sidebarAuthBtn) {
                elements.sidebarAuthBtn.classList.remove('logged-in');
            }
            if (elements.sidebarUserDisplay) {
                elements.sidebarUserDisplay.textContent = 'Belum Masuk Akun';
            }
            if (elements.sidebarSyncStatus) {
                elements.sidebarSyncStatus.textContent = 'Klik untuk sinkronisasi cloud';
            }
            if (sidebarAvatarWrap) {
                sidebarAvatarWrap.innerHTML = '<i data-lucide="user"></i>';
            }

            // Modal views
            if (elements.authLoggedInView) elements.authLoggedInView.classList.add('is-hidden');
            if (elements.authGuestView) elements.authGuestView.classList.remove('is-hidden');
        }

        if (window.lucide && typeof window.lucide.createIcons === 'function') {
            window.lucide.createIcons();
        }
    }

    function openAuthModal() {
        if (!elements.authOverlay) {
            elements.authOverlay = document.getElementById('auth-overlay');
        }
        if (!elements.authOverlay) return;
        elements.authOverlay.style.display = 'flex';
        requestAnimationFrame(() => {
            if (elements.authOverlay) {
                elements.authOverlay.classList.add('active');
            }
        });
        if (elements.authErrorBox) elements.authErrorBox.classList.add('is-hidden');
        if (elements.authConfigDrawer) elements.authConfigDrawer.classList.add('is-hidden');
        updateAuthUI();
    }

    function closeAuthModal() {
        if (!elements.authOverlay) {
            elements.authOverlay = document.getElementById('auth-overlay');
        }
        if (!elements.authOverlay) return;
        elements.authOverlay.classList.remove('active');
        setTimeout(() => {
            if (elements.authOverlay && !elements.authOverlay.classList.contains('active')) {
                elements.authOverlay.style.display = 'none';
            }
        }, 300);
        if (elements.authErrorBox) elements.authErrorBox.classList.add('is-hidden');
    }

    // Robust Click Listeners: Direct Binding + Event Delegation
    if (elements.btnAuthUser) {
        elements.btnAuthUser.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.soundManager) window.soundManager.playTap();
            openAuthModal();
        });
    }

    if (elements.sidebarAuthBtn) {
        elements.sidebarAuthBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (window.soundManager) window.soundManager.playTap();
            closeSidebar();
            openAuthModal();
        });
    }

    // Delegated click handler on document to guarantee clicks never miss
    document.addEventListener('click', (e) => {
        const trigger = e.target.closest('#btn-auth-user, #sidebar-auth-btn');
        if (trigger) {
            e.preventDefault();
            if (window.soundManager) window.soundManager.playTap();
            if (trigger.id === 'sidebar-auth-btn') {
                closeSidebar();
            }
            openAuthModal();
        }
    });

    if (elements.btnCloseAuth) {
        elements.btnCloseAuth.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.soundManager) window.soundManager.playTap();
            closeAuthModal();
        });
    }

    if (elements.authOverlay) {
        elements.authOverlay.addEventListener('click', (e) => {
            if (e.target === elements.authOverlay) {
                closeAuthModal();
            }
        });
    }

    // Escape key closes open modals
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (elements.authOverlay && elements.authOverlay.classList.contains('active')) {
                closeAuthModal();
            }
            if (elements.cheatsheetOverlay && elements.cheatsheetOverlay.classList.contains('active')) {
                closeCheatsheet();
            }
        }
    });

    // Toggle Login / Register Tabs
    function setAuthTab(tab) {
        activeAuthTab = tab;
        if (elements.authErrorBox) elements.authErrorBox.classList.add('is-hidden');

        if (tab === 'login') {
            if (elements.btnTabLogin) elements.btnTabLogin.classList.add('active');
            if (elements.btnTabRegister) elements.btnTabRegister.classList.remove('active');
            if (elements.groupConfirmPassword) elements.groupConfirmPassword.classList.add('is-hidden');
            if (elements.authSubmitLabel) elements.authSubmitLabel.textContent = 'Masuk ke Akun';
        } else {
            if (elements.btnTabLogin) elements.btnTabLogin.classList.remove('active');
            if (elements.btnTabRegister) elements.btnTabRegister.classList.add('active');
            if (elements.groupConfirmPassword) elements.groupConfirmPassword.classList.remove('is-hidden');
            if (elements.authSubmitLabel) elements.authSubmitLabel.textContent = 'Daftar Akun & Sinkronkan';
        }
    }

    if (elements.btnTabLogin) {
        elements.btnTabLogin.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            setAuthTab('login');
        });
    }
    if (elements.btnTabRegister) {
        elements.btnTabRegister.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            setAuthTab('register');
        });
    }

    // Toggle Password Visibility
    if (elements.btnTogglePassword && elements.authInputPassword) {
        elements.btnTogglePassword.addEventListener('click', () => {
            isPassVisible = !isPassVisible;
            elements.authInputPassword.type = isPassVisible ? 'text' : 'password';
            if (elements.authInputConfirmPassword) {
                elements.authInputConfirmPassword.type = isPassVisible ? 'text' : 'password';
            }
            if (elements.iconTogglePass) {
                elements.iconTogglePass.setAttribute('data-lucide', isPassVisible ? 'eye-off' : 'eye');
                if (window.lucide) window.lucide.createIcons();
            }
        });
    }

    // Toggle Config Drawer
    if (elements.btnToggleConfigView && elements.authConfigDrawer) {
        elements.btnToggleConfigView.addEventListener('click', () => {
            elements.authConfigDrawer.classList.toggle('is-hidden');
        });
    }
    if (elements.btnCloseConfigDrawer && elements.authConfigDrawer) {
        elements.btnCloseConfigDrawer.addEventListener('click', () => {
            elements.authConfigDrawer.classList.add('is-hidden');
        });
    }

    // Save Firebase Config from Textarea
    if (elements.btnSaveFirebaseConfig && elements.firebaseConfigInput) {
        elements.btnSaveFirebaseConfig.addEventListener('click', () => {
            const raw = elements.firebaseConfigInput.value.trim();
            if (!raw) return;

            try {
                let configObj = null;
                if (raw.startsWith('{') && raw.endsWith('}')) {
                    try {
                        configObj = JSON.parse(raw);
                    } catch (e) {
                        configObj = Function('"use strict";return (' + raw + ')')();
                    }
                } else if (raw.includes('apiKey')) {
                    const match = raw.match(/\{[\s\S]*\}/);
                    if (match) {
                        configObj = Function('"use strict";return (' + match[0] + ')')();
                    }
                }

                if (!configObj || !configObj.projectId) {
                    alert('Format konfigurasi tidak valid. Pastikan berisi apiKey dan projectId.');
                    return;
                }

                const ok = window.CloudDB.saveConfig(configObj);
                if (ok) {
                    updateAuthUI();
                    if (elements.authConfigDrawer) elements.authConfigDrawer.classList.add('is-hidden');
                    showNotification('Database Terhubung!', 'Firebase Firestore berhasil dihubungkan', 'success', 'check-circle-2');
                } else {
                    alert('Gagal menghubungkan Firebase. Periksa kembali config Anda.');
                }
            } catch (err) {
                alert('Gagal memproses konfigurasi: ' + err.message);
            }
        });
    }

    // Form Submit: Login or Register
    if (elements.authForm) {
        elements.authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (window.soundManager) window.soundManager.playTap();

            const username = elements.authInputUsername.value.trim();
            const password = elements.authInputPassword.value;
            const confirmPass = elements.authInputConfirmPassword ? elements.authInputConfirmPassword.value : '';

            if (elements.authErrorBox) elements.authErrorBox.classList.add('is-hidden');

            if (elements.btnAuthSubmit) {
                elements.btnAuthSubmit.disabled = true;
                elements.btnAuthSubmit.style.opacity = '0.6';
            }

            try {
                if (activeAuthTab === 'register') {
                    if (password !== confirmPass) {
                        throw new Error('Konfirmasi password tidak cocok dengan password yang dimasukkan.');
                    }
                    const res = await window.CloudDB.register(username, password);
                    updateAuthUI();
                    renderSavedProgramsList();
                    closeAuthModal();
                    showNotification('Akun Berhasil Dibuat!', `Halo @${res.username}, program Anda kini otomatis tersimpan di cloud`, 'success', 'user-check');
                    if (window.soundManager) window.soundManager.playSuccess();
                } else {
                    const res = await window.CloudDB.login(username, password);
                    if (Array.isArray(res.programs)) {
                        savedPrograms = res.programs;
                        updateSavedProgramsBadge();
                    }
                    updateAuthUI();
                    renderSavedProgramsList();
                    closeAuthModal();
                    showNotification('Berhasil Masuk!', `Selamat datang kembali @${res.username}! Program cloud disinkronkan`, 'success', 'user-check');
                    if (window.soundManager) window.soundManager.playSuccess();
                }
            } catch (err) {
                if (elements.authErrorBox && elements.authErrorText) {
                    elements.authErrorBox.classList.remove('is-hidden');
                    elements.authErrorText.textContent = err.message || 'Terjadi kesalahan saat otentikasi.';
                }
                if (window.soundManager) window.soundManager.playError();
            } finally {
                if (elements.btnAuthSubmit) {
                    elements.btnAuthSubmit.disabled = false;
                    elements.btnAuthSubmit.style.opacity = '1';
                }
            }
        });
    }

    // Logout Button
    if (elements.btnAuthLogout) {
        elements.btnAuthLogout.addEventListener('click', () => {
            if (window.soundManager) window.soundManager.playTap();
            if (confirm('Keluar dari akun cloud? Program lokal tetap tersimpan di browser ini.')) {
                window.CloudDB.logout();
                updateAuthUI();
                closeAuthModal();
                showNotification('Keluar Akun', 'Anda sekarang dalam mode tamu (offline)', 'info', 'log-out');
            }
        });
    }

    // Manual Sync Button
    if (elements.btnManualSync) {
        elements.btnManualSync.addEventListener('click', async () => {
            if (window.soundManager) window.soundManager.playTap();
            elements.btnManualSync.disabled = true;
            elements.btnManualSync.style.opacity = '0.6';

            try {
                await window.CloudDB.syncToCloud(savedPrograms);
                const cloudProgs = await window.CloudDB.pullFromCloud();
                if (Array.isArray(cloudProgs)) {
                    savedPrograms = cloudProgs;
                    updateSavedProgramsBadge();
                }
                renderSavedProgramsList();
                showNotification('Sinkronisasi Sukses', 'Semua program cocok dengan database cloud', 'success', 'check-circle-2');
                if (window.soundManager) window.soundManager.playSuccess();
            } catch (err) {
                alert('Gagal sinkronisasi: ' + err.message);
            } finally {
                elements.btnManualSync.disabled = false;
                elements.btnManualSync.style.opacity = '1';
            }
        });
    }

    // Boot Auth & auto-pull on launch if user is logged in
    updateAuthUI();
    if (window.CloudDB && window.CloudDB.getCurrentUser() && window.CloudDB.isConfigured()) {
        window.CloudDB.pullFromCloud().then(progs => {
            if (Array.isArray(progs) && progs.length > 0) {
                savedPrograms = progs;
                updateSavedProgramsBadge();
                if (elements.savedProgramsGrid) {
                    renderSavedProgramsList(elements.savedSearchInput ? elements.savedSearchInput.value : '');
                }
            }
        }).catch(() => {});
    }

    // =========================================================================
    // Initial Boot
    // =========================================================================
    renderSidebar();
    selectChallenge(0);
    setLanguage('pseudocode');

    // Trigger 5: Dynamic Island - Selamat Datang
    setTimeout(() => {
        showNotification('Selamat Datang', 'Belajar Pseudocode & Golang dengan Terminal Interaktif', 'welcome', 'sparkles');
    }, 700);
});
