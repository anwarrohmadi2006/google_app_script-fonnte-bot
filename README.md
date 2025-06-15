# WhatsApp Bot dengan Google Apps Script, Gemini, dan Fonnte

Bot WhatsApp sederhana yang ditenagai oleh Google Apps Script, menggunakan Google Gemini (via `gemini-1.5-flash`) untuk menghasilkan respons cerdas dan Fonnte sebagai gateway WhatsApp. Bot ini dapat menyimpan riwayat percakapan ke Google Sheets dan menggunakan Google Docs sebagai basis pengetahuan (knowledge base).

## ✨ Fitur

-   **Respons AI**: Menggunakan model Gemini dari Google untuk memahami dan merespons pesan pengguna secara dinamis.
-   **Koneksi WhatsApp**: Terintegrasi dengan layanan Fonnte untuk mengirim dan menerima pesan WhatsApp.
-   **Log Percakapan**: Setiap pesan yang masuk dicatat secara otomatis ke dalam Google Spreadsheet untuk analisis.
-   **Basis Pengetahuan**: Mengambil informasi dari dokumen Google Docs untuk memberikan jawaban yang konsisten dan berbasis data.
-   **Dukungan Multi-bahasa**: Dapat diatur untuk merespons dalam berbagai bahasa (misalnya, Indonesia, Inggris, Jepang).
-   **Tanpa Server**: Berjalan sepenuhnya di platform Google Apps Script, tidak memerlukan hosting atau server sendiri.

---

## 🛠️ Penyiapan (Setup)

Untuk menjalankan bot ini, Anda perlu menyiapkan beberapa hal di lingkungan Google dan Fonnte.

### 1. Prasyarat

-   Akun **Google** (untuk Apps Script, Sheets, dan Docs).
-   Akun **Fonnte** ([fonnte.com](https://fonnte.com/)) dan token API yang aktif.
-   **Project Google Cloud** untuk mengaktifkan Gemini API dan mendapatkan API Key.

### 2. Dapatkan Kredensial

Anda memerlukan kredensial berikut:

-   `GEMINI_API_KEY`: Dari [Google AI Studio](https://aistudio.google.com/app/apikey) atau Google Cloud Console. Pastikan Generative Language API telah diaktifkan untuk proyek Anda.
-   `FONNTE_TOKEN`: Dari dashboard Fonnte Anda.
-   `SPREADSHEET_ID`: ID dari Google Spreadsheet yang akan Anda gunakan. Buat spreadsheet baru, dan salin ID dari URL-nya: `https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_INI/edit`.
-   `KNOWLEDGE_DOC_ID`: ID dari Google Docs yang akan menjadi basis pengetahuan. Buat dokumen baru dan salin ID dari URL: `https://docs.google.com/document/d/DOC_ID_INI/edit`.

### 3. Konfigurasi Skrip

1.  Buat proyek **Google Apps Script** baru di [script.google.com](https://script.google.com).
2.  Salin dan tempel kode dari file `Code.gs` ke dalam editor skrip.
3.  Buka bagian `KONFIGURASI` di bagian atas skrip.
4.  Masukkan semua kredensial yang telah Anda dapatkan pada langkah sebelumnya ke dalam variabel yang sesuai.

```javascript
// --- KONFIGURASI ---
const SCRIPT_CONFIG = {
  GEMINI_API_KEY: "MASUKKAN_KUNCI_API_GEMINI_ANDA",
  FONNTE_TOKEN: "MASUKKAN_TOKEN_FONNTE_ANDA",
  SPREADSHEET_ID: "MASUKKAN_ID_SPREADSHEET_ANDA",
  KNOWLEDGE_DOC_ID: "MASUKKAN_ID_GOOGLE_DOCS_ANDA"
};
```

### 4. Deploy sebagai Web App

1.  Di editor Apps Script, klik **Deploy** > **New deployment**.
2.  Pilih jenis deployment **Web app**.
3.  Pada bagian **Execute as**, pilih **Me**.
4.  Pada bagian **Who has access**, pilih **Anyone**. Ini penting agar webhook Fonnte dapat mengaksesnya.
5.  Klik **Deploy**.
6.  Salin **Web app URL** yang diberikan. Ini adalah URL webhook Anda.

### 5. Hubungkan ke Fonnte

1.  Masuk ke dashboard Fonnte Anda.
2.  Pergi ke pengaturan webhook.
3.  Tempel **Web app URL** yang Anda salin dari Google Apps Script ke kolom URL webhook.
4.  Simpan pengaturan.

---

## 🚀 Penggunaan

Setelah semua penyiapan selesai, kirim pesan ke nomor WhatsApp yang terhubung dengan akun Fonnte Anda. Skrip akan menerima pesan, memprosesnya melalui Gemini, dan mengirimkan balasan.

---

## ⚠️ Keamanan: Jangan Simpan Kredensial di Repositori Publik!

Kode ini dirancang agar mudah dibaca, tetapi menyimpan kunci API dan token langsung di dalam kode sangat **tidak aman** jika Anda akan membagikannya atau menyimpannya di repositori Git publik seperti GitHub.

**Praktik Terbaik:**

Gunakan **Script Properties** untuk menyimpan kredensial Anda dengan aman.

1.  Di editor Apps Script, pergi ke **Project Settings** (ikon gerigi ⚙️).
2.  Gulir ke bawah ke bagian **Script Properties**.
3.  Klik **Add script property** dan tambahkan properti untuk setiap kredensial:
    -   `GEMINI_API_KEY`
    -   `FONNTE_TOKEN`
    -   `SPREADSHEET_ID`
    -   `KNOWLEDGE_DOC_ID`
4.  Kemudian, ubah kode Anda untuk membaca dari Script Properties daripada dari konstanta:

```javascript
// Ambil kredensial dari Script Properties yang lebih aman
const SCRIPT_PROPS = PropertiesService.getScriptProperties();

const SCRIPT_CONFIG = {
  GEMINI_API_KEY: SCRIPT_PROPS.getProperty("GEMINI_API_KEY"),
  FONNTE_TOKEN: SCRIPT_PROPS.getProperty("FONNTE_TOKEN"),
  // ...dan seterusnya
};
```
