/**
 * AI Code Assistant & Problem Reader (AI Tutor & Pemeriksa Soal)
 * Features:
 * 1. Deep Semantic Problem Reader: Extracts problem requirements, expected I/O, formulas, and test cases directly from problem text.
 * 2. Accurate Fault Detection: Traces code execution against extracted test cases and pinpoints exact faulty lines.
 * 3. Progressive Hints: Level 1 (Concept), Level 2 (Clue at line X), Level 3 (Guidance) WITHOUT spoiling the solution.
 * 4. On-Demand Solution Reveal: Shows the 100% working corrected code, diff explanations, and 1-click apply to editor.
 * 5. Dual Engine: 100% offline smart semantic analyzer + optional Google Gemini LLM API integration.
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

        // Built-in intelligent semantic & runtime analyzer
        const localResult = this.analyzeLocally({ problem, code, language, challengeId });
        localResult.engine = 'local';
        return localResult;
    }

    /**
     * Call Google Gemini API (gemini-1.5-flash / gemini-2.0-flash)
     */
    async callGeminiAPI({ problem, code, language, apiKey }) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

        const prompt = `Anda adalah asisten tutor pemrograman komputer yang ramah, teliti, dan ahli untuk mahasiswa dan pemula yang sedang belajar Pseudocode dan Golang.

TUGAS ANDA:
1. Baca dan pahami SOAL yang diberikan (termasuk contoh masukan/keluaran, rumus, dan ketentuan).
2. Periksa KODE SISWA secara mendalam: bandingkan logika kode dengan apa yang diminta oleh soal.
3. Temukan di mana letak kesalahannya (nomor baris dan penyebab kesalahan).
4. Berikan PETUNJUK (HINT) bertingkat secara bertahap TANPA langsung membocorkan jawaban lengkap di dalam petunjuk.
5. Sediakan KODE PERBAIKAN LENGKAP (correctedCode) yang 100% benar dan siap dijalankan, beserta penjelasan perubahannya.

BAHASA: ${language === 'golang' ? 'Golang' : 'Pseudocode (Standar English: program, kamus, algoritma, endprogram, if-then-else-endif, for-to-do-endfor, while-do-endwhile)'}

SOAL:
${problem || '(Periksa struktur algoritma dan bug umum)'}

KODE SISWA:
\`\`\`${language === 'golang' ? 'go' : 'pascal'}
${code}
\`\`\`

KEMBALIKAN HANYA JSON VALID dengan format:
{
  "isCorrect": boolean,
  "statusTitle": "string ringkas (contoh: 'Ditemukan Kesalahan Logika pada Baris 9' atau 'Kode Sudah Tepat!')",
  "summary": "penjelasan ramah mengapa kode keliru atau benar terhadap soal",
  "faultyLine": number | null,
  "faultySnippet": "potongan kode di baris yang salah" | null,
  "hints": [
    { "level": 1, "title": "Konsep Masalah", "content": "penjelasan konsep tanpa spoiler kode" },
    { "level": 2, "title": "Petunjuk Letak & Logika", "content": "arahan ke baris tertentu dan petunjuk logikanya" },
    { "level": 3, "title": "Arah Perbaikan", "content": "langkah praktis perbaikan" }
  ],
  "correctedCode": "kode lengkap yang 100% benar dan siap dieksekusi",
  "explanation": "penjelasan poin-poin yang diperbaiki"
}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
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
        if (!rawText) throw new Error('Respon Gemini kosong.');

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Respon Gemini bukan JSON valid.');
        return JSON.parse(jsonMatch[0]);
    }

    /**
     * Local Semantic Code Analyzer
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
                    { level: 1, title: 'Langkah Awal', content: 'Mulailah dengan menulis struktur utama program.' },
                    { level: 2, title: 'Bantuan Snippet', content: 'Tekan tombol snippet di atas editor seperti "program #####" atau "if..then".' }
                ],
                correctedCode: language === 'golang' ? 'package main\n\nimport "fmt"\n\nfunc main() {\n    // tulis kodemu di sini\n}' : 'program solusi\nkamus\n    // deklarasi variabel\nalgoritma\n    // instruksi\nendprogram',
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
     * Deep Semantic Analyzer for Pseudocode
     */
    analyzePseudocodeLocally({ problem, code, challengeId }) {
        const lines = code.split('\n');

        // 1. Check Indonesian keywords in code (Encourage standard English pseudocode)
        for (let i = 0; i < lines.length; i++) {
            const l = lines[i];
            if (/\b(?:jika|maka|selesai_jika|lainnya|untuk|sampai|selesai_untuk|selama|selesai_selama)\b/i.test(l)) {
                return {
                    isCorrect: false,
                    statusTitle: `Gunakan Kata Kunci Bahasa Inggris di Baris ${i + 1}`,
                    summary: `Di baris ${i + 1}, terdeteksi kata kunci bahasa Indonesia ('${l.trim()}'). Standar pseudocode aplikasi ini menggunakan kata kunci bahasa Inggris.`,
                    faultyLine: i + 1,
                    faultySnippet: l.trim(),
                    hints: [
                        { level: 1, title: 'Standar Bahasa', content: 'Pseudocode diatur menggunakan kata kunci bahasa Inggris agar terbiasa dengan sintaks pemrograman modern.' },
                        { level: 2, title: 'Aturan Padanan', content: "Gunakan 'if..then..else..endif' (bukan jika..maka), 'for..to..do..endfor' (bukan untuk..sampai), dan 'while..do..endwhile' (bukan selama..lakukan)." },
                        { level: 3, title: 'Langkah Perbaikan', content: `Ganti '${l.trim()}' dengan padanan bahasa Inggrisnya.` }
                    ],
                    correctedCode: this.autoFixPseudocodeSyntax(code),
                    explanation: 'Mengubah semua kata kunci bahasa Indonesia menjadi bahasa Inggris standar (if-then-else-endif, for-to-do-endfor).'
                };
            }
        }

        // 2. Syntax Check via PseudocodeInterpreter
        let interp;
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

            let hint1 = 'Terjadi kesalahan penulisan sintaks dalam kodemu.';
            let hint2 = errMsg;
            let hint3 = 'Periksa ejaan kata kunci, pastikan tanda titik dua (:) pada kamus lengkap, dan setiap blok if/for ditutup dengan endif/endfor.';

            if (/endif/i.test(errMsg) || /Blok IF/i.test(errMsg)) {
                hint1 = 'Setiap blok percabangan "if" wajib memiliki penutup "endif".';
                hint3 = 'Tambahkan baris "endif" tepat setelah instruksi percabangan selesai.';
            } else if (/endfor/i.test(errMsg) || /Blok FOR/i.test(errMsg)) {
                hint1 = 'Setiap loop "for" wajib memiliki penutup "endfor".';
                hint3 = 'Tambahkan baris "endfor" di akhir blok loop.';
            }

            return {
                isCorrect: false,
                statusTitle: `Kesalahan Sintaks${lineNum ? ` di Baris ${lineNum}` : ''}`,
                summary: `Program gagal dikompilasi: ${errMsg}`,
                faultyLine: lineNum,
                faultySnippet: snippet,
                hints: [
                    { level: 1, title: 'Aturan Sintaks', content: hint1 },
                    { level: 2, title: 'Detail Kesalahan', content: hint2 },
                    { level: 3, title: 'Cara Memperbaiki', content: hint3 }
                ],
                correctedCode: this.autoFixPseudocodeSyntax(code),
                explanation: 'Memperbaiki kesalahan sintaks agar struktur pseudocode valid.'
            };
        }

        // 3. Problem Semantic Understanding & Test Case Extraction
        const domainInfo = this.detectProblemDomain(problem);
        const extractedTestCases = this.extractTestCasesFromProblem(problem);
        const activeChallenge = this.findMatchingChallenge(challengeId, problem, code);

        // Merge test cases: priority to active challenge > extracted test cases > domain default test cases
        let testCasesToRun = [];
        if (activeChallenge && activeChallenge.testCases && activeChallenge.testCases.length > 0) {
            testCasesToRun = activeChallenge.testCases.map(tc => ({
                inputs: [...tc.inputs],
                expected: tc.expected.join('\n').trim(),
                description: tc.description || ''
            }));
        } else if (extractedTestCases.length > 0) {
            testCasesToRun = extractedTestCases;
        } else if (domainInfo && domainInfo.defaultTestCases) {
            testCasesToRun = domainInfo.defaultTestCases;
        }

        // 4. Test Case Execution & Discrepancy Analysis
        if (testCasesToRun.length > 0 && typeof PseudocodeInterpreter === 'function') {
            for (let tIdx = 0; tIdx < testCasesToRun.length; tIdx++) {
                const tc = testCasesToRun[tIdx];
                try {
                    const testInterp = new PseudocodeInterpreter();
                    testInterp.compile(code);
                    testInterp.initExecution([...tc.inputs]);
                    while (testInterp.status === 'running') {
                        testInterp.step();
                    }
                    const actualOut = testInterp.output.join('\n').trim();
                    const expectedOut = tc.expected.trim();

                    if (actualOut !== expectedOut) {
                        // Locate the exact bug in the student's code using domain rules + token diff
                        const bugDetails = this.pinpointLogicBug(code, problem, domainInfo, tc, actualOut, expectedOut);

                        return {
                            isCorrect: false,
                            statusTitle: bugDetails.title || `Logika Belum Sesuai pada Kasus Uji #${tIdx + 1}`,
                            summary: `Ketika diberikan masukan (${tc.inputs.join(', ')}), programmu menghasilkan "${actualOut || '(kosong)'}", sedangkan soal meminta hasil "${expectedOut}".`,
                            faultyLine: bugDetails.faultyLine,
                            faultySnippet: bugDetails.faultySnippet,
                            hints: [
                                {
                                    level: 1,
                                    title: 'Perbedaan Keluaran',
                                    content: `Masukan: [${tc.inputs.join(', ')}]. Diharapkan: "${expectedOut}", tetapi kodemu mencetak: "${actualOut || '(kosong)'}".`
                                },
                                {
                                    level: 2,
                                    title: 'Petunjuk Letak & Logika',
                                    content: bugDetails.clue
                                },
                                {
                                    level: 3,
                                    title: 'Arah Perbaikan',
                                    content: bugDetails.direction
                                }
                            ],
                            correctedCode: bugDetails.correctedCode || this.synthesizeSolutionCode(code, domainInfo, activeChallenge),
                            explanation: bugDetails.explanation || 'Memperbaiki logika perhitungan dan kondisi percabangan agar sesuai dengan soal.'
                        };
                    }
                } catch (runErr) {
                    return {
                        isCorrect: false,
                        statusTitle: 'Kesalahan Runtime saat Eksekusi',
                        summary: `Terjadi error saat menjalankan program dengan masukan (${tc.inputs.join(', ')}): ${runErr.message}`,
                        faultyLine: null,
                        faultySnippet: null,
                        hints: [
                            { level: 1, title: 'Runtime Error', content: 'Program berhenti di tengah jalan sebelum selesai dieksekusi.' },
                            { level: 2, title: 'Penyebab', content: runErr.message },
                            { level: 3, title: 'Panduan', content: 'Periksa operasi perhitungan, pembagian dengan 0, atau variabel yang belum terisi.' }
                        ],
                        correctedCode: this.synthesizeSolutionCode(code, domainInfo, activeChallenge),
                        explanation: 'Memperbaiki kesalahan alur eksekusi runtime program.'
                    };
                }
            }

            // All test cases passed!
            return {
                isCorrect: true,
                statusTitle: 'Hebat! Kodemu 100% Sesuai Soal',
                summary: `Selamat! Kodemu telah berhasil dieksekusi dan seluruh skenario kasus uji (${testCasesToRun.length} kasus) menghasilkan keluaran yang tepat sesuai permintaan soal.`,
                faultyLine: null,
                faultySnippet: null,
                hints: [
                    { level: 1, title: 'Sempurna', content: 'Logika perhitungan, percabangan, dan format output sudah tepat.' }
                ],
                correctedCode: code,
                explanation: 'Tidak ada kesalahan. Kodemu sudah benar dan optimal.'
            };
        }

        // 5. Domain Specific Pitfall Checks (Even if no explicit test cases)
        if (domainInfo) {
            const domainCheck = this.checkDomainSpecificPitfalls(code, domainInfo);
            if (!domainCheck.isCorrect) {
                return domainCheck;
            }
        }

        return {
            isCorrect: true,
            statusTitle: 'Sintaks & Struktur Valid',
            summary: 'Struktur kode pseudocodemu sudah valid. Pastikan rumus dan nilai yang kamu gunakan sudah sesuai dengan instruksi spesifik soalmu.',
            faultyLine: null,
            faultySnippet: null,
            hints: [
                { level: 1, title: 'Verifikasi Mandiri', content: 'Periksa kembali variabel masukan dan rumus perhitungan matematika.' }
            ],
            correctedCode: code,
            explanation: 'Sintaks program sudah sesuai kaidah pseudocode.'
        };
    }

    /**
     * Extracts test cases from arbitrary problem text
     */
    extractTestCasesFromProblem(problemText) {
        if (!problemText) return [];
        const testCases = [];

        // Pattern 1: Masukan: e Keluaran: E 5 true
        const regex1 = /(?:masukan|input)\s*[:=]\s*([^\n\r]+?)\s*(?:->|=>|:|\s{2,}|\t)\s*(?:keluaran|output)?\s*[:=]?\s*([^\n\r]+)/gi;
        let match;
        while ((match = regex1.exec(problemText)) !== null) {
            const inpStr = match[1].trim();
            const outStr = match[2].trim().replace(/\s*;\s*$/, '');
            if (inpStr && outStr && !/sebuah|karakter|bilangan/i.test(inpStr)) {
                testCases.push({
                    inputs: inpStr.split(/[\s,]+/).filter(Boolean),
                    expected: outStr,
                    description: `Input: ${inpStr} -> Expected: ${outStr}`
                });
            }
        }

        // Pattern 2: Multiline format
        if (testCases.length === 0) {
            const lines = problemText.split('\n');
            for (let i = 0; i < lines.length - 1; i++) {
                const mIn = lines[i].match(/^\s*(?:masukan|input)\s*[:=]\s*([a-zA-Z0-9_\-\.]+)\s*$/i);
                const mOut = lines[i + 1].match(/^\s*(?:keluaran|output)\s*[:=]\s*(.+)$/i);
                if (mIn && mOut) {
                    testCases.push({
                        inputs: [mIn[1].trim()],
                        expected: mOut[1].trim(),
                        description: `Input: ${mIn[1].trim()}`
                    });
                }
            }
        }

        return testCases;
    }

    /**
     * Detect problem domain semantics and knowledge base
     */
    detectProblemDomain(problemText) {
        if (!problemText) return null;
        const text = problemText.toLowerCase();

        // 1. Huruf Kapital, ASCII, Alfabet, Vokal
        if ((text.includes('huruf') || text.includes('alfabet') || text.includes('karakter')) &&
            (text.includes('kapital') || text.includes('vokal') || text.includes('ascii') || text.includes('urutan'))) {
            return {
                id: 'huruf_kapital',
                name: 'Huruf Kapital, Urutan Alfabet & Vokal',
                defaultTestCases: [
                    { inputs: ['e'], expected: 'E 5 true' },
                    { inputs: ['k'], expected: 'K 11 false' },
                    { inputs: ['u'], expected: 'U 21 true' },
                    { inputs: ['z'], expected: 'Z 26 false' }
                ],
                rules: {
                    kapital: { op: '-', value: 32, trap: '+' },
                    urutan: { op: '-', offset: "'a'", add: 1, trapNoAdd: true },
                    vokal: ['a', 'i', 'u', 'e', 'o']
                }
            };
        }

        // 2. Ganjil Genap
        if (text.includes('ganjil') || text.includes('genap') || text.includes('mod 2')) {
            return {
                id: 'ganjil_genap',
                name: 'Bilangan Ganjil atau Genap',
                defaultTestCases: [
                    { inputs: [4], expected: 'Genap' },
                    { inputs: [7], expected: 'Ganjil' },
                    { inputs: [0], expected: 'Genap' }
                ]
            };
        }

        // 3. Kelulusan
        if (text.includes('lulus') || text.includes('remidi') || text.includes('kkm')) {
            return {
                id: 'kelulusan',
                name: 'Status Kelulusan Siswa',
                defaultTestCases: [
                    { inputs: [85], expected: 'LULUS' },
                    { inputs: [75], expected: 'LULUS' },
                    { inputs: [60], expected: 'REMIDI' }
                ]
            };
        }

        // 4. Terbesar / Maksimum
        if (text.includes('terbesar') || text.includes('maksimum') || text.includes('maksimal')) {
            return {
                id: 'maksimum',
                name: 'Nilai Maksimum',
                defaultTestCases: [
                    { inputs: [15, 42], expected: '42' },
                    { inputs: [100, 3], expected: '100' }
                ]
            };
        }

        // 5. Faktorial
        if (text.includes('faktorial') || text.includes('n!')) {
            return {
                id: 'faktorial',
                name: 'Hitung Faktorial',
                defaultTestCases: [
                    { inputs: [3], expected: '6' },
                    { inputs: [4], expected: '24' },
                    { inputs: [5], expected: '120' }
                ]
            };
        }

        // 6. Total Penjumlahan Deret
        if (text.includes('total') || text.includes('penjumlahan deret') || text.includes('jumlah deret')) {
            return {
                id: 'total_deret',
                name: 'Total Penjumlahan Deret',
                defaultTestCases: [
                    { inputs: [5], expected: '15' },
                    { inputs: [10], expected: '55' }
                ]
            };
        }

        // 7. Diskon Belanja
        if (text.includes('diskon') || text.includes('potongan') || text.includes('belanja')) {
            return {
                id: 'diskon',
                name: 'Kasir & Diskon Belanja',
                defaultTestCases: [
                    { inputs: [150000], expected: '135000' },
                    { inputs: [80000], expected: '80000' }
                ]
            };
        }

        return null;
    }

    /**
     * Pinpoints the exact faulty line and logic misconception
     */
    pinpointLogicBug(code, problemText, domainInfo, tc, actualOut, expectedOut) {
        const lines = code.split('\n');

        // Check Domain: Huruf Kapital
        if (domainInfo && domainInfo.id === 'huruf_kapital') {
            // Check kapital: h + 32 vs h - 32
            const plus32Idx = lines.findIndex(l => /h\s*\+\s*32/i.test(l));
            if (plus32Idx !== -1) {
                return {
                    title: `Kesalahan Arah Konversi ASCII di Baris ${plus32Idx + 1}`,
                    faultyLine: plus32Idx + 1,
                    faultySnippet: lines[plus32Idx].trim(),
                    clue: "Kode ASCII huruf kecil 'a' adalah 97, sedangkan huruf kapital 'A' adalah 65. Nilai huruf kapital LEBIH KECIL dari huruf kecil, sehingga nilainya harus dikurangi 32, bukan ditambah 32.",
                    direction: "Ubah `h + 32` menjadi `h - 32` agar menghasilkan huruf kapital yang tepat.",
                    correctedCode: code.replace(/h\s*\+\s*32/gi, 'h - 32'),
                    explanation: "Mengubah `h + 32` menjadi `h - 32` karena selisih ASCII huruf kecil ke kapital adalah pengurangan 32."
                };
            }

            // Check urutan: h - 'a' (forgot + 1)
            const forgotPlus1Idx = lines.findIndex(l => /h\s*-\s*('a'|97)(?!\s*\+\s*1)/i.test(l));
            if (forgotPlus1Idx !== -1) {
                return {
                    title: `Lupa Menambahkan +1 pada Urutan Alfabet di Baris ${forgotPlus1Idx + 1}`,
                    faultyLine: forgotPlus1Idx + 1,
                    faultySnippet: lines[forgotPlus1Idx].trim(),
                    clue: "Perhitungan `h - 'a'` untuk huruf 'a' akan menghasilkan nilai 0 (97 - 97 = 0). Padahal dalam urutan alfabet, huruf 'a' adalah urutan ke-1, 'b' ke-2, dst.",
                    direction: "Tambahkan `+ 1` di akhir rumus: `urutan = h - 'a' + 1`.",
                    correctedCode: code.replace(/h\s*-\s*('a'|97)/gi, "h - 'a' + 1"),
                    explanation: "Menambahkan `+ 1` agar urutan alfabet dimulai dari 1 ('a' = 1, 'b' = 2)."
                };
            }

            // Check vokal: h == 'a' or 'i' (invalid expression)
            const vokalBadIdx = lines.findIndex(l => /h\s*==\s*['"][a-z]['"]\s+or\s+['"][a-z]['"]/i.test(l));
            if (vokalBadIdx !== -1) {
                return {
                    title: `Pengecekan Huruf Vokal Keliru di Baris ${vokalBadIdx + 1}`,
                    faultyLine: vokalBadIdx + 1,
                    faultySnippet: lines[vokalBadIdx].trim(),
                    clue: "Dalam logika pemrograman, setiap kondisi 'or' harus membandingkan variabel secara utuh: `h == 'a' or h == 'i' or ...`, bukan `h == 'a' or 'i'`.",
                    direction: "Tuliskan `h ==` sebelum setiap huruf vokal.",
                    correctedCode: code.replace(/vokal\s*(?:<-|:=|=)\s*.+/i, "vokal = h == 'a' or h == 'i' or h == 'u' or h == 'e' or h == 'o'"),
                    explanation: "Melengkapi perbandingan kesamaan variabel `h ==` untuk setiap huruf vokal."
                };
            }
        }

        // Check Faktorial: hasil <- 0
        if (domainInfo && domainInfo.id === 'faktorial') {
            const init0Idx = lines.findIndex(l => /hasil\s*(?:<-|:=|=)\s*0\b/i.test(l));
            if (init0Idx !== -1) {
                return {
                    title: `Inisialisasi Nilai Awal Faktorial Keliru di Baris ${init0Idx + 1}`,
                    faultyLine: init0Idx + 1,
                    faultySnippet: lines[init0Idx].trim(),
                    clue: "Faktorial adalah operasi perkalian berulang. Jika variabel penampung dimulai dari 0 (`hasil <- 0`), maka perkalian apapun dengan 0 akan menghasilkan 0!",
                    direction: "Ubah inisialisasi awal menjadi `hasil <- 1` (identitas perkalian).",
                    correctedCode: code.replace(/hasil\s*(?:<-|:=|=)\s*0/i, 'hasil <- 1'),
                    explanation: "Mengubah nilai awal penampung faktorial menjadi 1 agar perkalian berulang menghasilkan nilai yang benar."
                };
            }
        }

        // Check Loop Series Output inside loop instead of after loop
        if (domainInfo && domainInfo.id === 'total_deret') {
            const outInsideLoop = lines.findIndex(l => /output/i.test(l) && !lines.slice(l).some(x => /endfor/i.test(x)));
            // Check if output is printed inside loop
            let inLoop = false;
            let outIdx = -1;
            for (let i = 0; i < lines.length; i++) {
                if (/for\s+/i.test(lines[i])) inLoop = true;
                if (inLoop && /output/i.test(lines[i])) {
                    outIdx = i;
                    break;
                }
                if (/endfor/i.test(lines[i])) inLoop = false;
            }
            if (outIdx !== -1) {
                return {
                    title: `Perintah Output Berada di Dalam Loop di Baris ${outIdx + 1}`,
                    faultyLine: outIdx + 1,
                    faultySnippet: lines[outIdx].trim(),
                    clue: "Perintah `output(total)` yang diletakkan di dalam perulangan `for` akan mencetak nilai total berkali-kali pada setiap putaran.",
                    direction: "Pindahkan baris `output(total)` ke LUAR perulangan (setelah baris `endfor`).",
                    correctedCode: this.synthesizeSolutionCode(code, domainInfo),
                    explanation: "Memindahkan perintah `output(total)` ke luar blok loop `endfor` agar hanya mencetak total akhir."
                };
            }
        }

        // Generic fallback line locator: find lines with operators, conditions, or calculations
        let candidateLine = null;
        let candidateSnippet = null;
        for (let i = lines.length - 1; i >= 0; i--) {
            const l = lines[i].trim();
            if (l.includes('<-') || l.includes(':=') || l.includes('=') || l.includes('output')) {
                if (!l.startsWith('program') && !l.startsWith('kamus') && !l.startsWith('input')) {
                    candidateLine = i + 1;
                    candidateSnippet = l;
                    break;
                }
            }
        }

        return {
            title: `Perbedaan Hasil Perhitungan${candidateLine ? ` di Sekitar Baris ${candidateLine}` : ''}`,
            faultyLine: candidateLine,
            faultySnippet: candidateSnippet,
            clue: `Untuk masukan (${tc.inputs.join(', ')}), programmu mencetak "${actualOut}", padahal yang diharapkan adalah "${expectedOut}". Periksa rumus perhitungan atau kondisi percabangannya.`,
            direction: `Sesuaikan nilai rumus atau variabel yang dicetak agar menghasilkan "${expectedOut}".`,
            correctedCode: this.synthesizeSolutionCode(code, domainInfo),
            explanation: `Memperbaiki logika instruksi agar menghasilkan output yang sesuai dengan kasus uji.`
        };
    }

    /**
     * Checks domain specific pitfalls even if no explicit test cases were executed
     */
    checkDomainSpecificPitfalls(code, domainInfo) {
        const lines = code.split('\n');
        if (domainInfo.id === 'huruf_kapital') {
            const plus32Idx = lines.findIndex(l => /h\s*\+\s*32/i.test(l));
            if (plus32Idx !== -1) {
                return {
                    isCorrect: false,
                    statusTitle: `Kesalahan Arah Konversi ASCII di Baris ${plus32Idx + 1}`,
                    summary: `Di baris ${plus32Idx + 1}, kamu menulis 'h + 32'. Huruf kapital memiliki kode ASCII yang lebih kecil dari huruf kecil.`,
                    faultyLine: plus32Idx + 1,
                    faultySnippet: lines[plus32Idx].trim(),
                    hints: [
                        { level: 1, title: 'Konsep Kode ASCII', content: "Kode ASCII 'a' = 97 dan 'A' = 65. Untuk menuju ke kapital, nilainya harus dikurangi 32, bukan ditambah 32." },
                        { level: 2, title: 'Letak Baris', content: `Periksa baris ${plus32Idx + 1}: ${lines[plus32Idx].trim()}` },
                        { level: 3, title: 'Perbaikan', content: "Ubah `h + 32` menjadi `h - 32`." }
                    ],
                    correctedCode: code.replace(/h\s*\+\s*32/gi, 'h - 32'),
                    explanation: "Mengubah `h + 32` menjadi `h - 32` agar menghasilkan huruf kapital yang sesuai."
                };
            }
        }
        return { isCorrect: true };
    }

    /**
     * Synthesizes 100% correct, idiomatic code for the detected problem domain
     */
    synthesizeSolutionCode(code, domainInfo, activeChallenge) {
        if (activeChallenge && activeChallenge.solution) {
            return activeChallenge.solution;
        }

        if (domainInfo) {
            if (domainInfo.id === 'huruf_kapital') {
                return `program HurufKapital
kamus
    h, kapital : char
    urutan : integer
    vokal : boolean
algoritma
    input(h)
    kapital = h - 32
    urutan = h - 'a' + 1
    vokal = h == 'a' or h == 'i' or h == 'u' or h == 'e' or h == 'o'
    output(kapital, urutan, vokal)
endprogram`;
            } else if (domainInfo.id === 'ganjil_genap') {
                return `program cek_ganjil_genap
kamus
    bilangan : integer
algoritma
    input(bilangan)
    if bilangan mod 2 = 0 then
        output("Genap")
    else
        output("Ganjil")
    endif
endprogram`;
            } else if (domainInfo.id === 'kelulusan') {
                return `program status_kelulusan
kamus
    nilai : integer
algoritma
    input(nilai)
    if nilai >= 75 then
        output("LULUS")
    else
        output("REMIDI")
    endif
endprogram`;
            } else if (domainInfo.id === 'maksimum') {
                return `program nilai_terbesar
kamus
    a, b : integer
algoritma
    input(a)
    input(b)
    if a > b then
        output(a)
    else
        output(b)
    endif
endprogram`;
            } else if (domainInfo.id === 'faktorial') {
                return `program hitung_faktorial
kamus
    n, i, hasil : integer
algoritma
    input(n)
    hasil <- 1
    for i <- 1 to n do
        hasil <- hasil * i
    endfor
    output(hasil)
endprogram`;
            } else if (domainInfo.id === 'total_deret') {
                return `program total_deret
kamus
    n, i, total : integer
algoritma
    input(n)
    total <- 0
    for i <- 1 to n do
        total <- total + i
    endfor
    output(total)
endprogram`;
            } else if (domainInfo.id === 'diskon') {
                return `program hitung_diskon
kamus
    totalBelanja, bayar : real
algoritma
    input(totalBelanja)
    if totalBelanja >= 100000 then
        bayar <- totalBelanja - (totalBelanja * 0.1)
    else
        bayar <- totalBelanja
    endif
    output(bayar)
endprogram`;
            }
        }

        return this.autoFixPseudocodeSyntax(code);
    }

    /**
     * Offline Analyzer for Golang
     */
    analyzeGolangLocally({ problem, code }) {
        const lines = code.split('\n');

        if (!code.includes('package main')) {
            return {
                isCorrect: false,
                statusTitle: 'Deklarasi package main Tidak Ditemukan',
                summary: 'Setiap file program Go mandiri harus diawali dengan `package main`.',
                faultyLine: 1,
                faultySnippet: lines[0],
                hints: [
                    { level: 1, title: 'Package Header', content: 'Bahasa Go mewajibkan baris pertama berupa "package main".' },
                    { level: 2, title: 'Langkah', content: 'Tambahkan "package main" di baris 1.' }
                ],
                correctedCode: `package main\n\n${code}`,
                explanation: 'Menambahkan `package main` pada baris pertama.'
            };
        }

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

        // Test with GoInterpreter
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
                { level: 1, title: 'Siap Jalankan', content: 'Tekan "Jalankan di Terminal" untuk menguji interaktif program Go ini.' }
            ],
            correctedCode: code,
            explanation: 'Tidak ada error sintaks yang ditemukan.'
        };
    }

    autoFixPseudocodeSyntax(code) {
        let fixed = code;
        fixed = fixed.replace(/\bjika\b\s+(.+?)\s+\bmaka\b/gi, 'if $1 then');
        fixed = fixed.replace(/\blainnya\s+jika\b\s+(.+?)\s+\bmaka\b/gi, 'else if $1 then');
        fixed = fixed.replace(/\blainnya\b/gi, 'else');
        fixed = fixed.replace(/\b(?:selesai_jika|selesai\s+jika)\b/gi, 'endif');
        fixed = fixed.replace(/\buntuk\b\s+([a-zA-Z0-9_]+)\s*(<-|:=|=)\s*(.+?)\s+\bsampai\b\s+(.+?)(?:\s+\blakukan\b)?/gi, 'for $1 <- $3 to $4 do');
        fixed = fixed.replace(/\b(?:selesai_untuk|selesai\s+untuk)\b/gi, 'endfor');
        fixed = fixed.replace(/\bselama\b\s+(.+?)(?:\s+\blakukan\b)?/gi, 'while $1 do');
        fixed = fixed.replace(/\b(?:selesai_selama|selesai\s+selama)\b/gi, 'endwhile');

        if (!fixed.toUpperCase().includes('PROGRAM')) {
            fixed = `program solusi\nkamus\n\nalgoritma\n${fixed}\nendprogram`;
        }
        return fixed;
    }

    findMatchingChallenge(challengeId, problem, code) {
        if (typeof window !== 'undefined' && window.CHALLENGES) {
            if (challengeId) {
                const found = window.CHALLENGES.find(c => c.id === challengeId);
                if (found) return found;
            }
            if (problem) {
                const probLower = problem.toLowerCase();
                for (const ch of window.CHALLENGES) {
                    if (probLower.includes(ch.title.toLowerCase()) || probLower.includes(ch.id)) {
                        return ch;
                    }
                }
            }
            const codeLower = code.toLowerCase();
            for (const ch of window.CHALLENGES) {
                if (codeLower.includes(ch.id.replace('-', '_')) || codeLower.includes(ch.title.toLowerCase())) {
                    return ch;
                }
            }
        }
        return null;
    }
}

// Global Export
if (typeof window !== 'undefined') {
    window.AIAssistant = new AIAssistantEngine();
}
if (typeof module !== 'undefined') {
    module.exports = { AIAssistantEngine };
}
