/**
 * AI Code Assistant & Problem Reader (AI Asisten & Pembaca Soal)
 * Features:
 * 1. Analyzes user code against problem requirements (from active challenge or custom question).
 * 2. Pinpoints exact faulty line numbers & logic mistakes.
 * 3. Provides progressive hints (Level 1: Concept, Level 2: Clue, Level 3: Guidance) WITHOUT spoiling the solution.
 * 4. Provides an explicit on-demand option to reveal the corrected code with explanation & 1-click apply to editor.
 * 5. Dual-engine: Works 100% offline via Intelligent AST & Runtime Analyzer, or supercharged via Google Gemini API.
 */

class AIAssistantEngine {
    constructor() {
        this.apiKeyStorageKey = 'pseudocode_gemini_api_key';
    }

    getApiKey() {
        try {
            return localStorage.getItem(this.apiKeyStorageKey) || '';
        } catch (e) {
            return '';
        }
    }

    setApiKey(key) {
        try {
            if (key) {
                localStorage.setItem(this.apiKeyStorageKey, key.trim());
            } else {
                localStorage.removeItem(this.apiKeyStorageKey);
            }
            return true;
        } catch (e) {
            return false;
        }
    }

    /**
     * Main analysis method
     * @param {Object} params
     * @param {string} params.problem - The question / problem text
     * @param {string} params.code - Student's code
     * @param {string} params.language - 'pseudocode' | 'golang'
     * @param {string} [params.challengeId] - Active challenge ID if any
     * @returns {Promise<Object>} Analysis result
     */
    async analyze({ problem, code, language = 'pseudocode', challengeId = null }) {
        const apiKey = this.getApiKey();

        if (apiKey) {
            try {
                const geminiResult = await this.callGeminiAPI({ problem, code, language, apiKey });
                if (geminiResult && geminiResult.hints) {
                    geminiResult.engine = 'gemini';
                    return geminiResult;
                }
            } catch (err) {
                console.warn('Gemini API call failed, falling back to built-in local analyzer:', err);
            }
        }

        // Built-in intelligent static & runtime analyzer
        const localResult = this.analyzeLocally({ problem, code, language, challengeId });
        localResult.engine = 'local';
        return localResult;
    }

    /**
     * Call Google Gemini API (gemini-1.5-flash / gemini-2.0-flash)
     */
    async callGeminiAPI({ problem, code, language, apiKey }) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

        const prompt = `Anda adalah asisten tutor pemrograman komputer yang ramah, sabar, dan sangat ahli untuk mahasiswa dan pemula yang sedang belajar Pseudocode dan Golang.

TUGAS ANDA:
Periksa kode siswa berikut ini berdasarkan deskripsi soal yang diberikan. Temukan letak kesalahan sintaks atau logikanya, lalu berikan PETUNJUK (HINT) bertingkat secara bertahap TANPA langsung membocorkan jawaban lengkap di dalam petunjuk. Namun, sediakan kode perbaikan lengkap di bagian khusus agar siswa dapat membukanya jika menyerah.

BAHASA PEMROGRAMAN: ${language === 'golang' ? 'Golang' : 'Pseudocode (Standar English: program, kamus, algoritma, endprogram, if-then-else-endif, for-to-do-endfor, while-do-endwhile)'}

SOAL / MASALAH:
${problem || '(Tidak ada deskripsi soal spesifik, periksa kebenaran struktur algoritma dan kemungkinan bug)'}

KODE SISWA:
\`\`\`${language === 'golang' ? 'go' : 'pascal'}
${code}
\`\`\`

INSTRUKSI PENTING:
1. Periksa apakah kode memiliki:
   - Kesalahan sintaks (syntax error, keyword salah, struktur kamus/algoritma tidak pas, kurung kurawal/endif tertinggal).
   - Kesalahan logika (logic error, percabangan salah arah, rumus perhitungan keliru, variabel belum diinisialisasi, loop off-by-one).
   - Ketidaksesuaian dengan permintaan soal (tipe input/output tidak cocok).
2. Jika kode SUDAH BENAR dan memenuhi soal:
   - Berikan apresiasi dan jelaskan secara singkat mengapa kode sudah tepat.
3. Jika kode ADA KESALAHAN:
   - Tentukan nomor baris yang salah (faultyLine).
   - Buat 3 tingkatan Hint yang mendidik:
     * Hint 1 (Konsep Umum): Beri tahu konsep apa yang belum tepat tanpa menyebut kode perbaikan.
     * Hint 2 (Letak & Clue Logika): Arahkan siswa ke baris atau variabel tertentu dan berikan petunjuk logika.
     * Hint 3 (Langkah Perbaikan): Berikan langkah spesifik cara memperbaiki masalah tersebut tanpa menulis ulang seluruh program.
   - Sediakan "correctedCode" (kode lengkap yang sudah 100% benar dan siap dijalankan) beserta penjelasan singkat perubahannya.

KEMBALIKAN HANYA JSON VALID (tanpa backticks markdown di luar json) dengan format berikut:
{
  "isCorrect": boolean,
  "statusTitle": "string ringkas (contoh: 'Ditemukan Kesalahan Logika pada Baris 12' atau 'Kode Sudah Tepat!')",
  "summary": "penjelasan singkat dan ramah",
  "faultyLine": number | null,
  "faultySnippet": "potongan kode di baris yang bermasalah" | null,
  "hints": [
    {
      "level": 1,
      "title": "Konsep Umum",
      "content": "penjelasan konsep"
    },
    {
      "level": 2,
      "title": "Petunjuk Letak & Logika",
      "content": "petunjuk spesifik baris/variabel"
    },
    {
      "level": 3,
      "title": "Panduan Solusi",
      "content": "langkah praktis perbaikan"
    }
  ],
  "correctedCode": "kode lengkap yang sudah diperbaiki",
  "explanation": "penjelasan poin-poin yang diperbaiki"
}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json'
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`Gemini API HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const candidate = data.candidates && data.candidates[0];
        const rawText = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;
        if (!rawText) throw new Error('Format respon Gemini kosong.');

        // Clean any markdown wrapper if present
        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Respon Gemini bukan JSON valid.');
        return JSON.parse(jsonMatch[0]);
    }

    /**
     * Built-in Intelligent Static & Runtime Code Analyzer (Works 100% offline without API key)
     */
    analyzeLocally({ problem, code, language, challengeId }) {
        if (!code || !code.trim()) {
            return {
                isCorrect: false,
                statusTitle: 'Editor Masih Kosong',
                summary: 'Silakan tulis kodemu terlebih dahulu di editor sebelum meminta AI memeriksa.',
                faultyLine: null,
                faultySnippet: null,
                hints: [
                    { level: 1, title: 'Langkah Pertama', content: 'Mulailah dengan menulis struktur utama program.' },
                    { level: 2, title: 'Gunakan Snippet', content: 'Kamu bisa menekan tombol snippet di atas editor seperti "program #####" atau "package main".' }
                ],
                correctedCode: language === 'golang' ? 'package main\n\nimport "fmt"\n\nfunc main() {\n    // tulis kodemu di sini\n}' : 'program contoh\nkamus\n    // deklarasi variabel\nalgoritma\n    // instruksi\nendprogram',
                explanation: 'Program membutuhkan kerangka dasar agar dapat dieksekusi.'
            };
        }

        if (language === 'golang') {
            return this.analyzeGolangLocally({ problem, code });
        } else {
            return this.analyzePseudocodeLocally({ problem, code, challengeId });
        }
    }

    /**
     * Offline Analyzer for Pseudocode
     */
    analyzePseudocodeLocally({ problem, code, challengeId }) {
        const lines = code.split('\n');
        let interp;

        // 1. Syntax Check via PseudocodeInterpreter
        try {
            if (typeof PseudocodeInterpreter === 'function') {
                interp = new PseudocodeInterpreter();
                interp.compile(code);
            }
        } catch (compileErr) {
            const errMsg = compileErr.message || String(compileErr);
            const lineMatch = errMsg.match(/baris\s+(\d+)/i) || errMsg.match(/line\s+(\d+)/i);
            const lineNum = lineMatch ? parseInt(lineMatch[1], 10) : null;
            const snippet = (lineNum && lines[lineNum - 1]) ? lines[lineNum - 1].trim() : null;

            // Generate contextual hints based on the compile error
            let hint1 = 'Terjadi kesalahan penulisan sintaks dalam kodemu.';
            let hint2 = errMsg;
            let hint3 = 'Periksa ejaan kata kunci dan pastikan tanda kurung, titik dua, atau blok penutup sudah lengkap.';
            let fixCode = code;

            if (/Sintaks tidak dikenali/i.test(errMsg) || /Syntax/i.test(errMsg)) {
                hint1 = 'Penerjemah menemukan perintah atau kata kunci yang tidak dikenal.';
                if (snippet) {
                    if (/\bjika\b/i.test(snippet) || /\bmaka\b/i.test(snippet)) {
                        hint2 = `Di baris ${lineNum}: Format percabangan diatur ke bahasa Inggris: gunakan 'if <kondisi> then' bukan 'jika..maka'.`;
                        hint3 = `Ganti '${snippet}' menjadi versi bahasa Inggris: gunakan 'if', 'then', 'else', dan 'endif'.`;
                    } else if (/\buntuk\b/i.test(snippet) || /\bsampai\b/i.test(snippet)) {
                        hint2 = `Di baris ${lineNum}: Format perulangan menggunakan 'for <var> <- <awal> to <akhir> do' bukan 'untuk..sampai'.`;
                        hint3 = `Gunakan kata kunci bahasa Inggris 'for', 'to', 'do', dan tutup dengan 'endfor'.`;
                    } else if (/\bselama\b/i.test(snippet)) {
                        hint2 = `Di baris ${lineNum}: Format perulangan while menggunakan 'while <kondisi> do'.`;
                        hint3 = `Gunakan 'while <kondisi> do' dan tutup blok dengan 'endwhile'.`;
                    }
                }
            } else if (/Blok IF.*belum ditutup/i.test(errMsg) || /endif/i.test(errMsg)) {
                hint1 = 'Setiap blok percabangan "if" wajib memiliki penutup "endif".';
                hint2 = 'Ada blok "if" yang belum ditutup sebelum akhir program.';
                hint3 = 'Tambahkan baris "endif" tepat setelah blok instruksi percabangan selesai.';
                fixCode = code + '\n    endif';
            } else if (/Blok FOR.*belum ditutup/i.test(errMsg) || /endfor/i.test(errMsg)) {
                hint1 = 'Setiap perulangan "for" wajib memiliki penutup "endfor".';
                hint2 = 'Ada blok loop "for" yang belum ditutup.';
                hint3 = 'Tambahkan baris "endfor" di bawah isi perulangan.';
                fixCode = code + '\n    endfor';
            } else if (/Blok WHILE.*belum ditutup/i.test(errMsg) || /endwhile/i.test(errMsg)) {
                hint1 = 'Setiap perulangan "while" wajib memiliki penutup "endwhile".';
                hint2 = 'Ada blok loop "while" yang belum ditutup.';
                hint3 = 'Tambahkan baris "endwhile" di bawah isi perulangan.';
                fixCode = code + '\n    endwhile';
            } else if (/kamus/i.test(errMsg) || /deklarasi/i.test(errMsg)) {
                hint1 = 'Deklarasi variabel harus diletakkan di dalam bagian "kamus".';
                hint2 = 'Format deklarasi variabel: "<nama_variabel> : <tipe_data>". Contoh: "x : integer".';
                hint3 = 'Pastikan nama variabel ditulis sebelum tanda titik dua (:), diikuti tipe data (integer, real, string, char, boolean).';
            }

            return {
                isCorrect: false,
                statusTitle: `Kesalahan Sintaks${lineNum ? ` di Baris ${lineNum}` : ''}`,
                summary: `Program gagal dikompilasi karena ada sintaks yang belum sesuai aturan pseudocode.`,
                faultyLine: lineNum,
                faultySnippet: snippet,
                hints: [
                    { level: 1, title: 'Konsep Aturan Sintaks', content: hint1 },
                    { level: 2, title: 'Letak & Masalah', content: hint2 },
                    { level: 3, title: 'Langkah Perbaikan', content: hint3 }
                ],
                correctedCode: this.autoFixPseudocodeSyntax(code),
                explanation: `Memperbaiki struktur sintaks agar sesuai dengan spesifikasi pseudocode (kamus, algoritma, if..then..endif, for..to..do..endfor).`
            };
        }

        // 2. Structural Checks (Structure sanity)
        const upper = code.toUpperCase();
        if (!upper.includes('PROGRAM')) {
            return {
                isCorrect: false,
                statusTitle: 'Struktur Program Belum Lengkap',
                summary: 'Program pseudocode harus diawali dengan judul `program <nama_program>`.',
                faultyLine: 1,
                faultySnippet: lines[0],
                hints: [
                    { level: 1, title: 'Kepala Program', content: 'Setiap pseudocode yang valid harus memiliki baris pembuka "program <nama_program>".' },
                    { level: 2, title: 'Contoh Penulisan', content: 'Tuliskan "program latihan" di baris paling atas.' },
                    { level: 3, title: 'Langkah', content: 'Tambahkan "program nama_program" di baris 1 dan pastikan ditutup dengan "endprogram" di baris terakhir.' }
                ],
                correctedCode: `program solusi\n${code}\nendprogram`,
                explanation: 'Menambahkan header `program solusi` dan penutup `endprogram`.'
            };
        }

        if (!upper.includes('ALGORITMA') && !upper.includes('DESKRIPSI') && !upper.includes('BEGIN')) {
            return {
                isCorrect: false,
                statusTitle: 'Bagian Algoritma Tidak Ditemukan',
                summary: 'Instruksi program harus berada di dalam blok `algoritma`.',
                faultyLine: null,
                faultySnippet: null,
                hints: [
                    { level: 1, title: 'Struktur Utama', content: 'Pseudocode dibagi menjadi: "program ...", "kamus", dan "algoritma".' },
                    { level: 2, title: 'Pemisah Blok', content: 'Tuliskan kata "algoritma" sebelum instruksi input, perhitungan, percabangan, atau output dimulai.' },
                    { level: 3, title: 'Langkah', content: 'Bagi kodemu menjadi dua bagian: deklarasi di bawah "kamus", dan instruksi di bawah "algoritma".' }
                ],
                correctedCode: this.wrapPseudocodeStructure(code),
                explanation: 'Menyusun kode ke dalam struktur standar `program`, `kamus`, dan `algoritma`.'
            };
        }

        // 3. Logic & Test Case Evaluation (If matching a known challenge)
        const challenge = this.findMatchingChallenge(challengeId, problem, code);
        if (challenge && challenge.testCases && challenge.testCases.length > 0) {
            for (let idx = 0; idx < challenge.testCases.length; idx++) {
                const tc = challenge.testCases[idx];
                try {
                    const testInterp = new PseudocodeInterpreter();
                    testInterp.compile(code);
                    testInterp.initExecution([...tc.inputs]);
                    while (testInterp.status === 'running') {
                        testInterp.step();
                    }
                    const actualOut = testInterp.output.join('\n').trim();
                    const expectedOut = tc.expected.join('\n').trim();

                    if (actualOut !== expectedOut) {
                        // Locate likely faulty line in student's code
                        const logicAnalysis = this.analyzeLogicMismatch(code, challenge, tc, actualOut, expectedOut);
                        return {
                            isCorrect: false,
                            statusTitle: `Logika Belum Sesuai pada Kasus Uji #${idx + 1}`,
                            summary: `Ketika diberikan masukan (${tc.inputs.join(', ')}), programmu menghasilkan "${actualOut || '(kosong)'}", sedangkan yang diharapkan adalah "${expectedOut}".`,
                            faultyLine: logicAnalysis.lineNum,
                            faultySnippet: logicAnalysis.snippet,
                            hints: [
                                {
                                    level: 1,
                                    title: 'Perbedaan Hasil Output',
                                    content: `Input yang diuji: [${tc.inputs.join(', ')}]. Diharapkan: "${expectedOut}", tetapi kodemu mencetak: "${actualOut || '(tidak ada output)'}".`
                                },
                                {
                                    level: 2,
                                    title: 'Petunjuk Logika',
                                    content: logicAnalysis.clue
                                },
                                {
                                    level: 3,
                                    title: 'Arah Perbaikan',
                                    content: logicAnalysis.direction
                                }
                            ],
                            correctedCode: challenge.solution || this.autoFixPseudocodeSyntax(code),
                            explanation: `Solusi yang tepat menggunakan logika perhitungan dan percabangan sesuai spesifikasi soal "${challenge.title}".`
                        };
                    }
                } catch (runErr) {
                    return {
                        isCorrect: false,
                        statusTitle: `Kesalahan Runtime saat Menjalankan Input`,
                        summary: `Terjadi error saat kode memproses input (${tc.inputs.join(', ')}): ${runErr.message}`,
                        faultyLine: null,
                        faultySnippet: null,
                        hints: [
                            { level: 1, title: 'Runtime Error', content: 'Kode berhasil dikompilasi, tetapi berhenti di tengah jalan saat memproses data.' },
                            { level: 2, title: 'Detail Masalah', content: runErr.message },
                            { level: 3, title: 'Panduan', content: 'Periksa operasi pembagian dengan 0, indeks array di luar batas, atau variabel yang belum terdefinisi.' }
                        ],
                        correctedCode: challenge.solution || code,
                        explanation: 'Memperbaiki logika runtime dan inisialisasi variabel.'
                    };
                }
            }

            // All test cases passed!
            return {
                isCorrect: true,
                statusTitle: 'Hebat! Kodemu 100% Benar',
                summary: `Selamat! Kodemu telah berhasil melewati seluruh skenario kasus uji untuk soal "${challenge.title}".`,
                faultyLine: null,
                faultySnippet: null,
                hints: [
                    { level: 1, title: 'Kode Optimal', content: 'Struktur kode rapi, semua kondisi percabangan dan perulangan telah memenuhi persyaratan soal.' }
                ],
                correctedCode: code,
                explanation: 'Tidak ada perbaikan yang diperlukan. Kodemu sudah bekerja dengan benar.'
            };
        }

        // 4. General Logic Heuristics for Custom Questions / Playground
        const customAnalysis = this.analyzeCustomCodeHeuristics(code, 'pseudocode');
        if (!customAnalysis.isCorrect) {
            return customAnalysis;
        }

        return {
            isCorrect: true,
            statusTitle: 'Sintaks & Eksekusi Valid',
            summary: 'Kode pseudocodemu berhasil dikompilasi dan dieksekusi tanpa error. Jika ada hasil yang belum sesuai dengan soal spesifikmu, periksa nilai rumus atau kondisi percabangan.',
            faultyLine: null,
            faultySnippet: null,
            hints: [
                { level: 1, title: 'Pemeriksaan Mandiri', content: 'Pastikan rumus matematika dan urutan input/output sudah sesuai dengan soal yang kamu kerjakan.' }
            ],
            correctedCode: code,
            explanation: 'Sintaks program sudah sesuai standar pseudocode.'
        };
    }

    /**
     * Offline Analyzer for Golang
     */
    analyzeGolangLocally({ problem, code }) {
        const lines = code.split('\n');

        // Check package main
        if (!code.includes('package main')) {
            return {
                isCorrect: false,
                statusTitle: 'Deklarasi Paket Tidak Ditemukan',
                summary: 'Setiap file program Go mandiri harus diawali dengan `package main`.',
                faultyLine: 1,
                faultySnippet: lines[0],
                hints: [
                    { level: 1, title: 'Package Header', content: 'Bahasa Go mewajibkan baris pertama program executable berupa "package main".' },
                    { level: 2, title: 'Langkah', content: 'Tambahkan "package main" di baris paling atas kodemu.' }
                ],
                correctedCode: `package main\n\n${code}`,
                explanation: 'Menambahkan `package main` pada baris pertama.'
            };
        }

        // Check func main
        if (!code.includes('func main()') && !code.includes('func main ()')) {
            return {
                isCorrect: false,
                statusTitle: 'Fungsi main() Tidak Ditemukan',
                summary: 'Program Go membutuhkan fungsi titik masuk utama: `func main() { ... }`.',
                faultyLine: null,
                faultySnippet: null,
                hints: [
                    { level: 1, title: 'Entry Point', content: 'Eksekusi program Go selalu dimulai dari fungsi "func main()".' },
                    { level: 2, title: 'Langkah', content: 'Bungkus logika programmu di dalam blok "func main() { ... }".' }
                ],
                correctedCode: `package main\n\nimport "fmt"\n\nfunc main() {\n${lines.map(l => '    ' + l).join('\n')}\n}`,
                explanation: 'Membungkus instruksi ke dalam fungsi `func main()`.'
            };
        }

        // Transpile Check
        try {
            if (typeof CodeTranspiler === 'object' && typeof GoInterpreter === 'function') {
                const goInterp = new GoInterpreter();
                goInterp.transpile(code);
            }
        } catch (transpileErr) {
            const errMsg = transpileErr.message || String(transpileErr);
            return {
                isCorrect: false,
                statusTitle: 'Kesalahan Sintaks Go',
                summary: `Kompilasi program Go mendeteksi kesalahan: ${errMsg}`,
                faultyLine: null,
                faultySnippet: null,
                hints: [
                    { level: 1, title: 'Sintaks Go', content: 'Periksa tanda kurung kurawal {}, deklarasi variabel (:= atau var), atau nama fungsi fmt.' },
                    { level: 2, title: 'Pesan Error', content: errMsg }
                ],
                correctedCode: code,
                explanation: 'Memeriksa penulisan sintaks Go yang valid.'
            };
        }

        return {
            isCorrect: true,
            statusTitle: 'Sintaks Go Valid',
            summary: 'Kode Golang valid dan siap dijalankan dengan perintah `go run main.go`.',
            faultyLine: null,
            faultySnippet: null,
            hints: [
                { level: 1, title: 'Siap Jalankan', content: 'Kamu bisa menekan tombol "Jalankan di Terminal" untuk menguji interaktif program Go ini.' }
            ],
            correctedCode: code,
            explanation: 'Tidak ada error sintaks yang ditemukan.'
        };
    }

    /**
     * Helper to match code against active or known challenges
     */
    findMatchingChallenge(challengeId, problem, code) {
        if (typeof window !== 'undefined' && window.CHALLENGES) {
            if (challengeId) {
                const found = window.CHALLENGES.find(c => c.id === challengeId);
                if (found) return found;
            }

            // Match by problem text similarity
            if (problem) {
                const probLower = problem.toLowerCase();
                for (const ch of window.CHALLENGES) {
                    if (probLower.includes(ch.title.toLowerCase()) || probLower.includes(ch.id)) {
                        return ch;
                    }
                }
            }

            // Match by code variable/title similarity
            const codeLower = code.toLowerCase();
            for (const ch of window.CHALLENGES) {
                if (codeLower.includes(ch.id.replace('-', '_')) || codeLower.includes(ch.title.toLowerCase())) {
                    return ch;
                }
            }
        }
        return null;
    }

    /**
     * Logic mismatch analyzer for challenges
     */
    analyzeLogicMismatch(code, challenge, tc, actualOut, expectedOut) {
        const lines = code.split('\n');
        let lineNum = null;
        let snippet = null;
        let clue = 'Periksa alur logika percabangan atau rumus perulanganmu.';
        let direction = 'Pastikan kondisi if atau rentang loop sudah sesuai.';

        // Challenge specific heuristics:
        if (challenge.id === 'ganjil-genap') {
            const ifIdx = lines.findIndex(l => /if\s+.*mod\s+2/i.test(l) || /jika\s+.*mod\s+2/i.test(l));
            if (ifIdx !== -1) {
                lineNum = ifIdx + 1;
                snippet = lines[ifIdx].trim();
                clue = 'Periksa kondisi di percabangan: bilangan habis dibagi 2 jika sisa baginya adalah 0 (`bilangan mod 2 = 0`), bukan 1.';
                direction = 'Jika `bilangan mod 2 = 0`, maka cetak "Genap", dan pada bagian else cetak "Ganjil".';
            }
        } else if (challenge.id === 'kelulusan-siswa') {
            const ifIdx = lines.findIndex(l => /nilai\s*(>=|>|<=|<)/i.test(l));
            if (ifIdx !== -1) {
                lineNum = ifIdx + 1;
                snippet = lines[ifIdx].trim();
                clue = 'Periksa tanda pembanding: syarat lulus adalah nilai 75 ke atas (`nilai >= 75`). Jika hanya menggunakan `>`, maka nilai 75 akan dianggap tidak lulus.';
                direction = 'Gunakan operator `>=` (lebih besar atau sama dengan 75) untuk menyatakan LULUS.';
            }
        } else if (challenge.id === 'angka-terbesar') {
            const ifIdx = lines.findIndex(l => /if\s+[ab]\s*[><]/i.test(l));
            if (ifIdx !== -1) {
                lineNum = ifIdx + 1;
                snippet = lines[ifIdx].trim();
                clue = 'Pastikan membandingkan `a > b`. Jika benar, angka terbesar adalah `a`. Jika salah, angka terbesar adalah `b`.';
                direction = 'Cek kembali variabel yang dicetak di dalam blok `if` vs blok `else`.';
            }
        } else if (challenge.id === 'total-penjumlahan') {
            const loopIdx = lines.findIndex(l => /for\s+.*to/i.test(l) || /untuk\s+.*sampai/i.test(l));
            if (loopIdx !== -1) {
                lineNum = loopIdx + 1;
                snippet = lines[loopIdx].trim();
                clue = 'Pastikan loop berjalan dari 1 hingga `n` (`for i <- 1 to n do`), dan variabel `total` dimulai dari 0.';
                direction = 'Pastikan perintah `output(total)` berada di LUAR perulangan (setelah `endfor`), bukan di dalam loop.';
            }
        } else if (challenge.id === 'hitung-faktorial') {
            const initIdx = lines.findIndex(l => /hasil\s*<-\s*0/i.test(l));
            if (initIdx !== -1) {
                lineNum = initIdx + 1;
                snippet = lines[initIdx].trim();
                clue = 'Nilai awal faktorial: jika `hasil <- 0`, maka perkalian apapun dengan 0 akan menghasilkan 0!';
                direction = 'Ubah inisialisasi awal menjadi `hasil <- 1` (identitas perkalian).';
            }
        } else if (challenge.id === 'diskon-belanja') {
            const ifIdx = lines.findIndex(l => /totalbelanja\s*(>=|>)/i.test(l));
            if (ifIdx !== -1) {
                lineNum = ifIdx + 1;
                snippet = lines[ifIdx].trim();
                clue = 'Diskon 10% dihitung dengan mengalikan `totalBelanja * 0.1` atau `totalBelanja * 10 / 100`.';
                direction = 'Jumlah yang dibayar adalah `totalBelanja - (totalBelanja * 0.1)`. Untuk belanja di bawah 100000, bayar tanpa potongan diskon.';
            }
        }

        return { lineNum, snippet, clue, direction };
    }

    /**
     * Checks common bug patterns in arbitrary user code
     */
    analyzeCustomCodeHeuristics(code, language) {
        const lines = code.split('\n');

        // Check for ASCII char subtraction bug: h - 32 or h - 'a'
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            // Check assignment with single = instead of <- in strict contexts
            if (/\bif\b\s+.*[^=!<>]=[^=]/i.test(l)) {
                return {
                    isCorrect: false,
                    statusTitle: `Kemungkinan Typo Operator di Baris ${i + 1}`,
                    summary: `Di baris ${i + 1}, ditemukan operator '=' tunggal dalam kondisi 'if'.`,
                    faultyLine: i + 1,
                    faultySnippet: l.trim(),
                    hints: [
                        { level: 1, title: 'Operator Perbandingan', content: 'Operator "=" tunggal biasanya digunakan untuk penugasan (assignment), sedangkan perbandingan kesamaan nilai menggunakan "==".' },
                        { level: 2, title: 'Letak Baris', content: `Periksa baris ${i + 1}: ${l.trim()}` },
                        { level: 3, title: 'Solusi', content: 'Ganti "=" menjadi "==" untuk menguji kesamaan dua nilai.' }
                    ],
                    correctedCode: code.replace(/(\bif\s+.*?)([^=!<>]=[^=])(.*?then)/i, '$1==$3'),
                    explanation: 'Mengubah operator penugasan `=` menjadi operator perbandingan kesamaan `==` di dalam kondisi `if`.'
                };
            }
        }

        return { isCorrect: true };
    }

    /**
     * Smart helper to fix pseudocode syntax automatically
     */
    autoFixPseudocodeSyntax(code) {
        let fixed = code;
        // Translate Indonesian if/then/else/endif
        fixed = fixed.replace(/\bjika\b\s+(.+?)\s+\bmaka\b/gi, 'if $1 then');
        fixed = fixed.replace(/\blainnya\s+jika\b\s+(.+?)\s+\bmaka\b/gi, 'else if $1 then');
        fixed = fixed.replace(/\blainnya\b/gi, 'else');
        fixed = fixed.replace(/\b(?:selesai_jika|selesai\s+jika)\b/gi, 'endif');

        // Translate Indonesian for/to/do/endfor
        fixed = fixed.replace(/\buntuk\b\s+([a-zA-Z0-9_]+)\s*(<-|:=|=)\s*(.+?)\s+\bsampai\b\s+(.+?)(?:\s+\blakukan\b)?/gi, 'for $1 <- $3 to $4 do');
        fixed = fixed.replace(/\b(?:selesai_untuk|selesai\s+untuk)\b/gi, 'endfor');

        // Translate Indonesian while/do/endwhile
        fixed = fixed.replace(/\bselama\b\s+(.+?)(?:\s+\blakukan\b)?/gi, 'while $1 do');
        fixed = fixed.replace(/\b(?:selesai_selama|selesai\s+selama)\b/gi, 'endwhile');

        // Ensure program and endprogram wrapping
        if (!fixed.toUpperCase().includes('PROGRAM')) {
            fixed = `program solusi\nkamus\n\nalgoritma\n${fixed}\nendprogram`;
        }

        return fixed;
    }

    wrapPseudocodeStructure(code) {
        return `program solusi\nkamus\n    // deklarasikan variabelmu di sini\nalgoritma\n${code}\nendprogram`;
    }
}

// Global Export
if (typeof window !== 'undefined') {
    window.AIAssistant = new AIAssistantEngine();
}
if (typeof module !== 'undefined') {
    module.exports = { AIAssistantEngine };
}
