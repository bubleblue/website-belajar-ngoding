// =========================================================================
// Cloud Database & Username-Password Sync Manager
// =========================================================================

(function(window) {
    let db = null;
    let isInitialized = false;

    // Pure JS SHA-256 fallback (works offline and on non-secure contexts like Safari file://)
    function sha256Fallback(str) {
        const ascii = unescape(encodeURIComponent(str));
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        const mathPow = Math.pow;
        const maxWord = mathPow(2, 32);
        const lengthProperty = 'length';
        let i, j;
        let result = '';

        const words = [];
        const asciiBitLength = ascii[lengthProperty] * 8;
        
        let hash = [];
        const k = [];
        let primeCounter = 0;

        const isComposite = {};
        for (let candidate = 2; primeCounter < 64; candidate++) {
            if (!isComposite[candidate]) {
                for (i = 0; i < 313; i += candidate) {
                    isComposite[i] = candidate;
                }
                hash[primeCounter] = (mathPow(candidate, .5) * maxWord) | 0;
                k[primeCounter++] = (mathPow(candidate, 1/3) * maxWord) | 0;
            }
        }
        
        let s = ascii + '\x80';
        while (s[lengthProperty] % 64 - 56) s += '\x00';
        for (i = 0; i < s[lengthProperty]; i++) {
            j = s.charCodeAt(i);
            words[i >> 2] |= j << ((3 - i) % 4) * 8;
        }
        words[words[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
        words[words[lengthProperty]] = (asciiBitLength);
        
        hash = hash.slice(0, 8);
        for (j = 0; j < words[lengthProperty];) {
            const w = words.slice(j, j += 16);
            const oldHash = hash;
            hash = hash.slice(0, 8);
            
            for (i = 0; i < 64; i++) {
                const w15 = w[i - 15], w2 = w[i - 2];
                const a = hash[0], e = hash[4];
                const temp1 = hash[7]
                    + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25))
                    + ((e & hash[5]) ^ ((~e) & hash[6]))
                    + k[i]
                    + (w[i] = (i < 16) ? w[i] : (
                            w[i - 16]
                            + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                            + w[i - 7]
                            + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))
                        ) | 0
                    );
                const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22))
                    + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]));
                
                hash = [(temp1 + temp2) | 0].concat(hash);
                hash[4] = (hash[4] + temp1) | 0;
                hash.length = 8;
            }
            
            for (i = 0; i < 8; i++) {
                hash[i] = (hash[i] + oldHash[i]) | 0;
            }
        }
        
        for (i = 0; i < 8; i++) {
            for (let b = 3; b >= 0; b--) {
                const byte = (hash[i] >> (8 * b)) & 255;
                result += byte.toString(16).padStart(2, '0');
            }
        }
        return result;
    }

    // Helper: SHA-256 Password Hash with Username-based Salt
    async function hashPassword(username, password) {
        const cleanUser = username.trim().toLowerCase();
        const text = `${cleanUser}:${password}:pseudocode_secure_salt_2026`;

        // Check if Web Cryptography API is available in current context (HTTPS / modern browser)
        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle && typeof window.crypto.subtle.digest === 'function') {
            try {
                const encoder = new TextEncoder();
                const data = encoder.encode(text);
                const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (e) {
                console.warn('crypto.subtle error, using fallback:', e);
            }
        }

        // Reliable fallback for file:// protocol, older Safari, or insecure contexts
        return sha256Fallback(text);
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
            try {
                db.settings({
                    experimentalForceLongPolling: true,
                    merge: true
                });
            } catch (settingErr) {
                // Settings can only be applied once on init
            }
            isInitialized = true;
            console.log('✓ Cloud Firestore terhubung untuk project:', config.projectId);
            return true;
        } catch (e) {
            console.error('Gagal menginisialisasi Firebase Firestore:', e);
            return false;
        }
    }

    function handleFirestoreError(err) {
        const msg = (err && err.message) ? err.message : String(err);
        if (msg.includes('client is offline') || msg.includes('unavailable') || msg.includes('SERVICE_DISABLED') || msg.includes('has not been used')) {
            return new Error('Database Cloud Firestore belum diaktifkan di project Firebase Anda. Buka console.firebase.google.com -> Firestore Database -> Klik "Create Database" (Mulai dalam mode uji).');
        }
        if (msg.includes('Missing or insufficient permissions') || msg.includes('permission-denied') || msg.includes('PERMISSION_DENIED')) {
            return new Error('Izin Firestore ditolak (Rules). Pastikan Rules di Firebase Console diatur ke "allow read, write: if true;".');
        }
        return err;
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
                throw new Error('Database Cloud Firebase belum dikonfigurasi. Silakan periksa konfigurasi Firebase.');
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

            try {
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
            } catch (err) {
                throw handleFirestoreError(err);
            }
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

            try {
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
            } catch (err) {
                throw handleFirestoreError(err);
            }
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
                console.error('Gagal sinkron ke Cloud:', handleFirestoreError(e));
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
                console.error('Gagal menarik data dari cloud:', handleFirestoreError(e));
            }
            return null;
        }
    };

    window.CloudDB = CloudDB;
})(window);
