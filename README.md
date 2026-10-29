# 📱 Pseudocodê & Go — iOS & Web Terminal Studio

Website interaktif untuk belajar, menulis, dan menguji algoritma **Pseudocode** dan bahasa pemrograman **Go (Golang)** dengan tampilan modern bergaya **Apple iOS**, **Terminal Interaktif di dalam website**, animasi tombol kenyal (*haptic spring bounce*), dan responsif di desktop maupun smartphone.

---

## ✨ Fitur Terbaru: Bahasa Golang & Web Terminal Interaktif

1. **🐹 Dukungan Bahasa Go (Golang)**:
   - **Pengalih Bahasa Instan**: Beralih antara mode `[ 📝 Pseudocode ]` dan `[ 🐹 Golang ]` langsung dari header editor.
   - **Transpiler Dua Arah (Pseudocode ⇄ Golang)**: Cukup satu klik tombol **"Ke Golang"**, pseudocode buatanmu langsung dikonversi menjadi kode Go yang rapi dan siap dikompilasi!
   - **Bilah Snippet Go**: Tombol cepat untuk `package main`, `func main()`, `fmt.Println()`, `fmt.Scan(&x)`, `:=`, `var .. int`, `for loop`, dan `if..else`.
   - **Penyelesaian Soal dengan Go**: Seluruh 9 modul tantangan bisa dikerjakan menggunakan Pseudocode maupun Golang! Kasus uji (*test cases*) otomatis memvalidasi keluaran Go.

2. **💻 Terminal Interaktif di dalam Website (macOS Style Web Terminal)**:
   - **Animasi Slide Otomatis**: Terminal otomatis muncul dengan animasi *slide-down* saat memilih menu **Golang**, dan menghilang dengan animasi *slide-close/collapse* yang mulus saat kembali ke menu **Pseudocode**.
   - Terminal terintegrasi langsung di layar website tanpa perlu membuka terminal eksternal.
   - **Eksekusi Nyata (`go run main.go`)**: Kompilasi dan jalankan program Go langsung di dalam terminal web.
   - **Masukan Interaktif (*Interactive Stdin*)**: Saat program Go memanggil `fmt.Scan(&x)`, terminal web akan beralih ke mode input interaktif. Kamu mengetik langsung di terminal, menekan Enter, dan program akan melanjutkan eksekusinya!
   - **Perintah Shell yang Didukung**:
     - `go run main.go` — Kompilasi & jalankan program Go.
     - `go version` — Tampilkan versi Golang (`go1.27.2`).
     - `go build` — Uji kompilasi binary.
     - `cat main.go` — Cetak isi kode editor ke terminal.
     - `ls` — Tampilkan daftar file.
     - `clear` — Bersihkan layar terminal.
     - `help` — Bantuan daftar perintah shell.
   - **Kontrol Jendela macOS**: Titik kontrol Merah (Clear), Kuning (Resize/Minimize), Hijau (Expand Terminal).

3. **💾 Fitur Menyimpan Program (Program Saya)**:
   - Simpan program Pseudocode maupun Golang ke penyimpanan lokal (*localStorage*) dengan shortcut `Cmd + S` / `Ctrl + S`.
   - Galeri kartu program tersimpan dengan aksi Buka, Unduh file (`.go` / `.pseudo`), Duplikasi, dan Hapus.
   - Ekspor/Impor cadangan seluruh program (JSON).

4. **📖 Kamus Sintaks Lengkap (Pseudocode & Golang)**:
   - Perbandingan sintaks berdampingan antara Pseudocode huruf kecil standar dan Golang.
   - Struktur program, input/output, percabangan, dan perulangan.

---

## 🎨 Tampilan & Desain iOS

- *Frosted Glassmorphism* (`backdrop-filter: blur(24px)`).
- *iOS Dynamic Island* untuk notifikasi status program di bagian atas layar.
- Efek animasi tombol sentuh kenyal (*Spring bounce scale & tactile press feedback*).
- Mode Gelap (*Dark Mode*) & Terang (*Light Mode*) khas iOS dengan transisi halus.
- Efek suara sintetis Web Audio API (Tap, Chime sukses, Thud error, Step tick) tanpa perlu koneksi internet.

---

## 🚀 Cara Menjalankan Website

Buka file `index.html` langsung di browser favorit Anda:

### Menggunakan Terminal Mac:
```bash
open index.html
```

Atau jalankan server lokal sederhana jika diinginkan:
```bash
python3 -m http.server 8000
```
Lalu buka [http://localhost:8000](http://localhost:8000) di browser.

---

## 📁 Struktur Berkas

```
website pseudocode/
├── index.html           # Struktur antarmuka iOS, web terminal, editor & modal
├── css/
│   └── style.css        # Desain iOS, macOS Web Terminal, glassmorphism & animasi
├── js/
│   ├── audio.js         # Generator efek suara haptik iOS (Web Audio API)
│   ├── interpreter.js   # Parser & interpreter pseudocode mandiri
│   ├── go-interpreter.js# Runtime interpreter Golang & transpiler dua arah
│   ├── terminal.js      # Terminal interaktif di dalam web (stdin, stdout, shell commands)
│   ├── challenges.js    # Database kurikulum materi (valid untuk Pseudocode & Go)
│   └── app.js           # UI logic, language switcher, terminal controller
└── README.md            # Dokumentasi proyek
```
