// =========================================================================
// Cloud Database & Username-Password Sync Manager
// =========================================================================

(function(window) {
    let db = null;
    let isInitialized = false;

    // Helper: SHA-256 Password Hash with Username-based Salt
    async function hashPassword(username, password) {
        const cleanUser = username.trim().toLowerCase();
        const text = `${cleanUser}:${password}:pseudocode_secure_salt_2026`;
        const encoder = new TextEncoder();
        const data = encoder.encode(text);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // Initialize Firebase Firestore
    function initFirebase() {
        if (isInitialized && db) return true;

        // Check window.firebaseConfig first, then localStorage fallback
        let config = window.firebaseConfig;
        try {
            const localConfigStr = localStorage.getItem('pseudocode_firebase_config');
            if (localConfigStr) {
                const parsed = JSON.parse(localConfigStr);
                if (parsed && parsed.projectId && parsed.projectId !== 'YOUR_PROJECT_ID') {
                    config = parsed;
                }
            }
        } catch (e) {
            console.warn('Error reading saved firebase config:', e);
        }

        if (!config || !config.projectId || config.projectId === 'YOUR_PROJECT_ID') {
            return false;
        }

        if (typeof firebase === 'undefined') {
            console.warn('Firebase SDK script not loaded yet.');
            return false;
        }

        try {
            if (!firebase.apps || !firebase.apps.length) {
                firebase.initializeApp(config);
            }
            db = firebase.firestore();
            isInitialized = true;
            console.log('✓ Cloud Firestore terhubung untuk project:', config.projectId);
            return true;
        } catch (e) {
            console.error('Gagal menginisialisasi Firebase Firestore:', e);
            return false;
        }
    }

    const CloudDB = {
        init: initFirebase,

        isConfigured: function() {
            return initFirebase();
        },

        getCurrentUser: function() {
            return localStorage.getItem('pseudocode_auth_username') || null;
        },

        saveConfig: function(configObj) {
            try {
                localStorage.setItem('pseudocode_firebase_config', JSON.stringify(configObj));
                window.firebaseConfig = configObj;
                isInitialized = false;
                db = null;
                return initFirebase();
            } catch (e) {
                console.error('Failed to save Firebase config:', e);
                return false;
            }
        },

        // Buat Akun Baru (Hanya butuh Username & Password)
        register: async function(username, password) {
            if (!initFirebase()) {
                throw new Error('Database Cloud Firebase belum dikonfigurasi. Silakan masukkan konfigurasi Firebase terlebih dahulu.');
            }

            const cleanUser = username.trim().toLowerCase();
            if (!cleanUser || cleanUser.length < 3) {
                throw new Error('Username minimal 3 karakter.');
            }
            if (!/^[a-zA-Z0-9_]+$/.test(cleanUser)) {
                throw new Error('Username hanya boleh menggunakan huruf, angka, dan garis bawah (_).');
            }
            if (!password || password.length < 4) {
                throw new Error('Password minimal 4 karakter.');
            }

            const userRef = db.collection('users').doc(cleanUser);
            const userDoc = await userRef.get();

            if (userDoc.exists) {
                throw new Error(`Username "@${cleanUser}" sudah terdaftar. Silakan pilih username lain atau klik Masuk.`);
            }

            const passHash = await hashPassword(cleanUser, password);

            // Simpan info user (hanya username & hash password)
            await userRef.set({
                username: cleanUser,
                passwordHash: passHash,
                createdAt: new Date().toISOString()
            });

            // Ambil program lokal saat ini untuk di-upload pertama kali
            let localPrograms = [];
            try {
                const stored = localStorage.getItem('pseudocode_saved_programs');
                if (stored) localPrograms = JSON.parse(stored);
            } catch (e) {}

            await db.collection('user_programs').doc(cleanUser).set({
                username: cleanUser,
                programs: localPrograms,
                updatedAt: Date.now()
            });

            localStorage.setItem('pseudocode_auth_username', cleanUser);
            return { username: cleanUser, programs: localPrograms };
        },

        // Masuk ke Akun yang Sudah Ada
        login: async function(username, password) {
            if (!initFirebase()) {
                throw new Error('Database Cloud Firebase belum dikonfigurasi. Silakan periksa konfigurasi.');
            }

            const cleanUser = username.trim().toLowerCase();
            if (!cleanUser) {
                throw new Error('Harap isi username.');
            }
            if (!password) {
                throw new Error('Harap isi password.');
            }

            const userRef = db.collection('users').doc(cleanUser);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new Error(`Username "@${cleanUser}" tidak ditemukan. Silakan klik "Daftar Akun Baru".`);
            }

            const userData = userDoc.data();
            const passHash = await hashPassword(cleanUser, password);

            if (userData.passwordHash !== passHash) {
                throw new Error('Password salah. Silakan coba lagi.');
            }

            // Ambil semua program pengguna dari Cloud
            let cloudPrograms = [];
            const progRef = db.collection('user_programs').doc(cleanUser);
            const progDoc = await progRef.get();

            if (progDoc.exists && Array.isArray(progDoc.data().programs)) {
                cloudPrograms = progDoc.data().programs;
            }

            localStorage.setItem('pseudocode_auth_username', cleanUser);
            localStorage.setItem('pseudocode_saved_programs', JSON.stringify(cloudPrograms));

            return { username: cleanUser, programs: cloudPrograms };
        },

        // Keluar Akun
        logout: function() {
            localStorage.removeItem('pseudocode_auth_username');
        },

        // Sinkronisasi Program Lokal ke Cloud
        syncToCloud: async function(programs) {
            const currentUser = this.getCurrentUser();
            if (!currentUser || !initFirebase()) return false;

            try {
                await db.collection('user_programs').doc(currentUser).set({
                    username: currentUser,
                    programs: programs,
                    updatedAt: Date.now()
                }, { merge: true });
                return true;
            } catch (e) {
                console.error('Gagal sinkron ke Cloud:', e);
                return false;
            }
        },

        // Tarik Program Terbaru dari Cloud
        pullFromCloud: async function() {
            const currentUser = this.getCurrentUser();
            if (!currentUser || !initFirebase()) return null;

            try {
                const progDoc = await db.collection('user_programs').doc(currentUser).get();
                if (progDoc.exists && Array.isArray(progDoc.data().programs)) {
                    const progs = progDoc.data().programs;
                    localStorage.setItem('pseudocode_saved_programs', JSON.stringify(progs));
                    return progs;
                }
            } catch (e) {
                console.error('Gagal menarik data dari cloud:', e);
            }
            return null;
        }
    };

    window.CloudDB = CloudDB;
})(window);
