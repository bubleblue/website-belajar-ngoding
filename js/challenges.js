/**
 * Challenges database for learning pseudocode (Format Huruf Kecil & Standar Kamus/Algoritma)
 */

const CHALLENGES = [
    {
        id: 'hello-world',
        title: '1. Halo Dunia (Hello World)',
        category: 'Dasar',
        difficulty: 'Mudah',
        description: 'Tulis algoritma pseudocode sederhana yang mencetak teks **"Halo Dunia!"** (tanpa tanda kutip) ke layar menggunakan `output()`.',
        instructions: [
            'Gunakan struktur `program #####`, `kamus`, `algoritma`, dan `endprogram`.',
            'Gunakan fungsi `output("Halo Dunia!")` untuk mencetak teks ke layar.',
            'Tulis dalam huruf kecil sesuai standar.'
        ],
        hint: 'Ketik: `output("Halo Dunia!")` di dalam blok `algoritma`.',
        starterCode: `program halo_dunia
kamus
    // tidak membutuhkan variabel

algoritma
    // tulis kode cetak di bawah ini:
    output("Halo Dunia!")
endprogram`,
        solution: `program halo_dunia
kamus
algoritma
    output("Halo Dunia!")
endprogram`,
        testCases: [
            {
                inputs: [],
                expected: ['Halo Dunia!'],
                description: 'Cetak pesan salam'
            }
        ]
    },
    {
        id: 'luas-persegi-panjang',
        title: '2. Luas Persegi Panjang',
        category: 'Aritmatika',
        difficulty: 'Mudah',
        description: 'Buat program untuk menghitung luas persegi panjang. Program menerima dua masukan: `panjang` dan `lebar`, lalu menghitung `luas <- panjang * lebar` dan mencetak hasilnya.',
        instructions: [
            'Gunakan `input(panjang)` dan `input(lebar)`.',
            'Hitung `luas <- panjang * lebar`.',
            'Cetak hasil perhitungan dengan `output(luas)`.'
        ],
        hint: 'Gunakan operator perkalian `*` dan simpan ke variabel `luas`.',
        starterCode: `program hitung_luas_persegi_panjang
kamus
    panjang, lebar, luas : integer

algoritma
    input(panjang)
    input(lebar)
    
    // hitung luas dan cetak di sini:
    luas <- panjang * lebar
    output(luas)
endprogram`,
        solution: `program hitung_luas
kamus
    panjang, lebar, luas : integer
algoritma
    input(panjang)
    input(lebar)
    luas <- panjang * lebar
    output(luas)
endprogram`,
        testCases: [
            {
                inputs: [5, 10],
                expected: ['50'],
                description: 'Panjang 5, Lebar 10'
            },
            {
                inputs: [8, 4],
                expected: ['32'],
                description: 'Panjang 8, Lebar 4'
            },
            {
                inputs: [12, 12],
                expected: ['144'],
                description: 'Panjang 12, Lebar 12'
            }
        ]
    },
    {
        id: 'ganjil-genap',
        title: '3. Bilangan Ganjil atau Genap',
        category: 'Percabangan',
        difficulty: 'Mudah',
        description: 'Menerima masukan sebuah bilangan bulat `bilangan`. Periksa apakah bilangan tersebut **Genap** atau **Ganjil**. Jika habis dibagi 2 (`bilangan mod 2 = 0`), cetak `"Genap"`, selain itu cetak `"Ganjil"`.',
        instructions: [
            'Gunakan `input(bilangan)`.',
            'Gunakan percabangan `jika bilangan mod 2 = 0 maka ... lainnya ... selesai_jika`.',
            'Cetak `"Genap"` jika benar, dan `"Ganjil"` di dalam blok `lainnya`.'
        ],
        hint: 'Gunakan operator `mod` untuk menghitung sisa bagi bilangan dengan 2.',
        starterCode: `program cek_ganjil_genap
kamus
    bilangan : integer

algoritma
    input(bilangan)

    jika bilangan mod 2 = 0 maka
        output("Genap")
    lainnya
        output("Ganjil")
    selesai_jika
endprogram`,
        solution: `program cek_ganjil_genap
kamus
    bilangan : integer
algoritma
    input(bilangan)
    jika bilangan mod 2 = 0 maka
        output("Genap")
    lainnya
        output("Ganjil")
    selesai_jika
endprogram`,
        testCases: [
            {
                inputs: [4],
                expected: ['Genap'],
                description: 'Angka 4 adalah Genap'
            },
            {
                inputs: [7],
                expected: ['Ganjil'],
                description: 'Angka 7 adalah Ganjil'
            },
            {
                inputs: [0],
                expected: ['Genap'],
                description: 'Angka 0 adalah Genap'
            },
            {
                inputs: [23],
                expected: ['Ganjil'],
                description: 'Angka 23 adalah Ganjil'
            }
        ]
    },
    {
        id: 'kelulusan-siswa',
        title: '4. Status Kelulusan Siswa',
        category: 'Percabangan',
        difficulty: 'Mudah',
        description: 'Siswa dinyatakan **"LULUS"** jika nilai ujian yang dimasukkan bernilai **75 atau lebih** (`nilai >= 75`). Jika nilainya di bawah 75, maka siswa dinyatakan **"REMIDI"**.',
        instructions: [
            'Minta masukan variabel `nilai` dengan `input(nilai)`.',
            'Gunakan kondisi `jika nilai >= 75 maka`.',
            'Cetak `"LULUS"` atau `"REMIDI"`.'
        ],
        hint: 'Perhatikan tanda `>=` (lebih besar atau sama dengan) dan tutup percabangan dengan `selesai_jika`.',
        starterCode: `program status_kelulusan
kamus
    nilai : integer

algoritma
    input(nilai)
    
    // tulis logika kelulusan di sini:
    jika nilai >= 75 maka
        output("LULUS")
    lainnya
        output("REMIDI")
    selesai_jika
endprogram`,
        solution: `program status_kelulusan
kamus
    nilai : integer
algoritma
    input(nilai)
    jika nilai >= 75 maka
        output("LULUS")
    lainnya
        output("REMIDI")
    selesai_jika
endprogram`,
        testCases: [
            {
                inputs: [85],
                expected: ['LULUS'],
                description: 'Nilai 85 -> LULUS'
            },
            {
                inputs: [75],
                expected: ['LULUS'],
                description: 'Nilai pas KKM 75 -> LULUS'
            },
            {
                inputs: [68],
                expected: ['REMIDI'],
                description: 'Nilai 68 -> REMIDI'
            }
        ]
    },
    {
        id: 'angka-terbesar',
        title: '5. Nilai Maksimum (Terbesar)',
        category: 'Percabangan',
        difficulty: 'Sedang',
        description: 'Menerima dua angka `a` dan `b`. Tentukan dan cetak angka mana yang nilainya lebih besar menggunakan `jika ... maka`. Jika nilainya sama, cetak salah satunya.',
        instructions: [
            'Gunakan `input(a)` dan `input(b)`.',
            'Bandingkan apakah `a > b`.',
            'Cetak nilai terbesar dengan `output()`.'
        ],
        hint: 'Jika `a > b` maka `output(a)`, lainnya `output(b)`.',
        starterCode: `program nilai_terbesar
kamus
    a, b : integer

algoritma
    input(a)
    input(b)

    // tentukan angka terbesar:
    jika a > b maka
        output(a)
    lainnya
        output(b)
    selesai_jika
endprogram`,
        solution: `program nilai_terbesar
kamus
    a, b : integer
algoritma
    input(a)
    input(b)
    jika a > b maka
        output(a)
    lainnya
        output(b)
    selesai_jika
endprogram`,
        testCases: [
            {
                inputs: [15, 42],
                expected: ['42'],
                description: 'Antara 15 dan 42, terbesar 42'
            },
            {
                inputs: [100, 3],
                expected: ['100'],
                description: 'Antara 100 dan 3, terbesar 100'
            },
            {
                inputs: [50, 50],
                expected: ['50'],
                description: 'Nilai sama 50'
            }
        ]
    },
    {
        id: 'cetak-deret-angka',
        title: '6. Perulangan Angka 1 sampai N',
        category: 'Perulangan',
        difficulty: 'Sedang',
        description: 'Menerima masukan sebuah angka `n`. Cetak deret angka dari 1 sampai dengan `n` secara berurutan baris demi baris menggunakan perulangan `untuk ... sampai ... lakukan`.',
        instructions: [
            'Minta masukan `n` dengan `input(n)`.',
            'Gunakan loop `untuk i <- 1 sampai n lakukan`.',
            'Di dalam loop, cetak variabel pencacah dengan `output(i)`.',
            'Tutup loop dengan `selesai_untuk`.'
        ],
        hint: 'Loop dimulai dari 1 sampai ke n.',
        starterCode: `program deret_angka
kamus
    n, i : integer

algoritma
    input(n)

    // lakukan perulangan dari 1 sampai n:
    untuk i <- 1 sampai n lakukan
        output(i)
    selesai_untuk
endprogram`,
        solution: `program deret_angka
kamus
    n, i : integer
algoritma
    input(n)
    untuk i <- 1 sampai n lakukan
        output(i)
    selesai_untuk
endprogram`,
        testCases: [
            {
                inputs: [3],
                expected: ['1', '2', '3'],
                description: 'Cetak 1 sampai 3'
            },
            {
                inputs: [5],
                expected: ['1', '2', '3', '4', '5'],
                description: 'Cetak 1 sampai 5'
            }
        ]
    },
    {
        id: 'total-penjumlahan',
        title: '7. Jumlah Total Deret (1 + 2 + ... + N)',
        category: 'Perulangan',
        difficulty: 'Sedang',
        description: 'Menerima sebuah bilangan bulat `n`. Hitunglah total penjumlahan angka dari 1 hingga `n` (contoh jika n=4 maka total = 1 + 2 + 3 + 4 = 10). Cetak hanya hasil total akhirnya.',
        instructions: [
            'Inisialisasi `total <- 0`.',
            'Lakukan perulangan `i` dari 1 sampai `n`.',
            'Tambahkan nilai `i` ke `total`: `total <- total + i`.',
            'Setelah perulangan selesai, cetak `output(total)`.'
        ],
        hint: 'Pastikan perintah `output(total)` diletakkan SETELAH `selesai_untuk`.',
        starterCode: `program total_deret
kamus
    n, i, total : integer

algoritma
    input(n)
    total <- 0

    untuk i <- 1 sampai n lakukan
        total <- total + i
    selesai_untuk

    output(total)
endprogram`,
        solution: `program total_deret
kamus
    n, i, total : integer
algoritma
    input(n)
    total <- 0
    untuk i <- 1 sampai n lakukan
        total <- total + i
    selesai_untuk
    output(total)
endprogram`,
        testCases: [
            {
                inputs: [5],
                expected: ['15'],
                description: '1+2+3+4+5 = 15'
            },
            {
                inputs: [10],
                expected: ['55'],
                description: 'Total deret 1 s.d 10 = 55'
            },
            {
                inputs: [1],
                expected: ['1'],
                description: 'Total untuk n = 1'
            }
        ]
    },
    {
        id: 'hitung-faktorial',
        title: '8. Hitung Faktorial (N!)',
        category: 'Perulangan',
        difficulty: 'Menantang',
        description: 'Menerima input `n`. Hitung nilai faktorial dari n (n! = 1 * 2 * ... * n). Contoh jika n = 4, maka 4! = 1 * 2 * 3 * 4 = 24. Cetak hasil akhirnya.',
        instructions: [
            'Inisialisasi variabel akumulator `hasil <- 1` (jangan mulai dari 0 karena perkalian).',
            'Gunakan perulangan dari 1 sampai `n`.',
            'Kalikan: `hasil <- hasil * i`.',
            'Cetak `output(hasil)` di luar perulangan.'
        ],
        hint: 'Ingat perkalian identitas adalah 1: `hasil <- 1`.',
        starterCode: `program hitung_faktorial
kamus
    n, i, hasil : integer

algoritma
    input(n)
    hasil <- 1

    untuk i <- 1 sampai n lakukan
        hasil <- hasil * i
    selesai_untuk

    output(hasil)
endprogram`,
        solution: `program hitung_faktorial
kamus
    n, i, hasil : integer
algoritma
    input(n)
    hasil <- 1
    untuk i <- 1 sampai n lakukan
        hasil <- hasil * i
    selesai_untuk
    output(hasil)
endprogram`,
        testCases: [
            {
                inputs: [3],
                expected: ['6'],
                description: '3! = 6'
            },
            {
                inputs: [4],
                expected: ['24'],
                description: '4! = 24'
            },
            {
                inputs: [5],
                expected: ['120'],
                description: '5! = 120'
            }
        ]
    },
    {
        id: 'diskon-belanja',
        title: '9. Kasir & Diskon Belanja',
        category: 'Studi Kasus',
        difficulty: 'Menantang',
        description: 'Toko memberikan diskon 10% jika total belanja minimal Rp 100.000 (`totalBelanja >= 100000`). Jika di bawah itu, tidak mendapat diskon. Menerima input `totalBelanja`, lalu hitung dan cetak jumlah akhir yang harus dibayarkan.',
        instructions: [
            'Minta masukan `input(totalBelanja)`.',
            'Jika `totalBelanja >= 100000`, maka `bayar <- totalBelanja - (totalBelanja * 0.1)`.',
            'Jika tidak, `bayar <- totalBelanja`.',
            'Cetak nilai `bayar` dengan `output(bayar)`.'
        ],
        hint: 'Diskon 10% dihitung dengan `totalBelanja * 0.1` atau `totalBelanja * 10 / 100`.',
        starterCode: `program hitung_diskon
kamus
    totalBelanja, bayar : real

algoritma
    input(totalBelanja)

    jika totalBelanja >= 100000 maka
        bayar <- totalBelanja - (totalBelanja * 0.1)
    lainnya
        bayar <- totalBelanja
    selesai_jika

    output(bayar)
endprogram`,
        solution: `program hitung_diskon
kamus
    totalBelanja, bayar : real
algoritma
    input(totalBelanja)
    jika totalBelanja >= 100000 maka
        bayar <- totalBelanja - (totalBelanja * 0.1)
    lainnya
        bayar <- totalBelanja
    selesai_jika
    output(bayar)
endprogram`,
        testCases: [
            {
                inputs: [150000],
                expected: ['135000'],
                description: 'Belanja 150.000 dapat diskon 10% -> 135.000'
            },
            {
                inputs: [80000],
                expected: ['80000'],
                description: 'Belanja 80.000 tanpa diskon -> 80.000'
            },
            {
                inputs: [100000],
                expected: ['90000'],
                description: 'Belanja pas 100.000 dapat diskon 10% -> 90.000'
            }
        ]
    }
];

window.CHALLENGES = CHALLENGES;
