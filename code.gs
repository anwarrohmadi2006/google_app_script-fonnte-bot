/**
 * @fileoverview Script to create a WhatsApp bot using Google Apps Script,
 * integrated with Google Gemini for AI responses and Fonnte for messaging.
 * It saves conversation logs to a Google Sheet.
 */

// --- KONFIGURASI ---
// Ganti nilai-nilai di bawah ini dengan kredensial dan ID Anda.
const SCRIPT_CONFIG = {
  GEMINI_API_KEY: "YOUR_GEMINI_API_KEY", // Ganti dengan Kunci API Google Gemini Anda
  FONNTE_TOKEN: "YOUR_FONNTE_TOKEN",     // Ganti dengan Token Fonnte Anda
  SPREADSHEET_ID: "YOUR_SPREADSHEET_ID", // Ganti dengan ID Google Spreadsheet Anda
  KNOWLEDGE_DOC_ID: "YOUR_GOOGLE_DOC_ID" // Ganti dengan ID Google Docs untuk basis pengetahuan
};

/**
 * Entry point untuk menangani permintaan POST dari webhook.
 */
function doPost(e) {
  // Ambil data dari request atau gunakan data pengujian jika e tidak tersedia
  const data = e && e.postData ? JSON.parse(e.postData.contents) : getTestData();

  // Ambil informasi penting dari payload
  const { sender, message, name } = data;

  // Pastikan ada pengirim dan pesan
  if (!sender || !message) {
    Logger.log("Permintaan tidak valid: pengirim atau pesan tidak ada.");
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Invalid request" })).setMimeType(ContentService.MimeType.JSON);
  }

  // Simpan pesan ke Spreadsheet
  writeToSpreadsheet({ name, sender, message });

  // Tentukan bahasa yang diinginkan pengguna
  const preferredLanguage = getPreferredLanguage(message);

  // Ambil pengetahuan dasar dari Google Docs
  const documentContent = getDocumentContent(SCRIPT_CONFIG.KNOWLEDGE_DOC_ID);

  // Ambil riwayat percakapan sebelumnya
  let conversationHistory = PropertiesService.getScriptProperties().getProperty('conversationHistory') || '';

  // Bangun prompt untuk Gemini
  const prompt = buildPrompt(conversationHistory, message, preferredLanguage, documentContent);

  // Panggil Gemini API dan format hasilnya
  let geminiResponse = callGemini(prompt);
  geminiResponse = formatWhatsAppMessage(geminiResponse);

  // Siapkan balasan untuk dikirim via Fonnte
  const reply = {
    message: geminiResponse,
    url: ""
  };
  sendFonnte(sender, reply);

  // Simpan riwayat percakapan baru (opsional: batasi panjang riwayat)
  conversationHistory += `User: ${message}\nGemini: ${geminiResponse}\n`;
  PropertiesService.getScriptProperties().setProperty('conversationHistory', conversationHistory);

  // Kembalikan respons sukses
  return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Menentukan bahasa yang lebih disukai berdasarkan kata kunci dalam pesan.
 * @param {string} message - Pesan dari pengguna.
 * @returns {string} Bahasa yang terdeteksi (default: "Indonesia").
 */
function getPreferredLanguage(message) {
  let preferredLanguage = "Indonesia"; // Default
  const languageKeywords = {
    "english": "English",
    "japanese": "Japanese",
    "german": "German"
    // Tambahkan kata kunci dan bahasa lain sesuai kebutuhan
  };
  const lowerCaseMessage = message.toLowerCase();
  for (const keyword in languageKeywords) {
    if (lowerCaseMessage.includes(keyword)) {
      preferredLanguage = languageKeywords[keyword];
      break;
    }
  }
  return preferredLanguage;
}

/**
 * Mengambil konten teks dari file Google Docs yang ditentukan.
 * @param {string} documentId - ID dari file Google Docs.
 * @returns {string} Konten teks dari dokumen atau string kosong jika gagal.
 */
function getDocumentContent(documentId) {
  try {
    const document = DocumentApp.openById(documentId);
    return document.getBody().getText();
  } catch (e) {
    Logger.log(`Gagal mengakses Google Docs dengan ID ${documentId}: ${e.message}`);
    return ""; // Kembalikan string kosong jika terjadi kesalahan
  }
}

/**
 * Membangun prompt lengkap untuk dikirim ke Gemini API.
 * @param {string} history - Riwayat percakapan.
 * @param {string} message - Pesan terbaru dari pengguna.
 * @param {string} language - Bahasa yang diinginkan untuk respons.
 * @param {string} knowledge - Teks basis pengetahuan dari Google Docs.
 * @returns {string} Prompt yang telah diformat.
 */
function buildPrompt(history, message, language, knowledge) {
  return `Anda adalah asisten AI yang ramah dan membantu.
Riwayat Percakapan:
${history}

Pengguna baru saja mengirim: "${message}"

Tugas Anda adalah merespons pesan pengguna dengan tepat dalam bahasa ${language}.
Gunakan informasi dari basis pengetahuan di bawah ini jika relevan.

**Basis Pengetahuan:**
${knowledge}
`;
}

/**
 * Memanggil Gemini API untuk menghasilkan respons berdasarkan prompt.
 * @param {string} prompt - Prompt untuk dikirim ke model AI.
 * @returns {string} Respons teks yang dihasilkan oleh Gemini atau pesan kesalahan.
 */
function callGemini(prompt) {
  const apiKey = SCRIPT_CONFIG.GEMINI_API_KEY;
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      topP: 1.0,
      topK: 40,
    }
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true // Mencegah script berhenti jika ada error HTTP
  };

  try {
    const response = UrlFetchApp.fetch(endpoint, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode !== 200) {
      Logger.log(`Error dari Gemini API: ${responseCode} - ${responseBody}`);
      return "Maaf, terjadi kesalahan saat menghubungi asisten AI kami.";
    }

    const result = JSON.parse(responseBody);
    if (result.candidates && result.candidates.length > 0) {
      return result.candidates[0].content.parts[0].text;
    } else {
      Logger.log("Respons dari Gemini tidak valid: " + responseBody);
      return "Maaf, saya tidak dapat menghasilkan respons saat ini.";
    }
  } catch (e) {
    Logger.log("Error saat memanggil Gemini API: " + e.message);
    return "Terjadi kesalahan teknis. Silakan coba lagi nanti.";
  }
}

/**
 * Mengirim pesan balasan menggunakan Fonnte API.
 * @param {string} target - Nomor penerima.
 * @param {object} messageData - Objek yang berisi pesan dan detail lainnya.
 */
function sendFonnte(target, messageData) {
  const options = {
    method: "post",
    payload: {
      target: target,
      message: messageData.message,
      url: messageData.url || "",
      filename: messageData.filename || ""
    },
    headers: {
      Authorization: SCRIPT_CONFIG.FONNTE_TOKEN
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch("https://api.fonnte.com/send", options);
    Logger.log("Respons Fonnte: " + response.getContentText());
  } catch (e) {
    Logger.log("Error saat mengirim pesan via Fonnte: " + e.message);
  }
}

/**
 * Memformat teks agar lebih sesuai untuk tampilan WhatsApp.
 * @param {string} message - Teks asli dari Gemini.
 * @returns {string} Teks yang telah diformat.
 */
function formatWhatsAppMessage(message) {
  // Mengganti penanda tebal markdown standar (**) menjadi penanda tebal WhatsApp (*)
  let formattedMessage = message.replace(/\*\*(.*?)\*\*/g, '*$1*');
  
  // Contoh penambahan format lain jika diperlukan
  // formattedMessage = formattedMessage.replace(/__(.*?)__/g, '_$1_'); // Miring

  return formattedMessage;
}

/**
 * Menyediakan data dummy untuk tujuan pengujian tanpa webhook.
 * @returns {object} Objek data pengujian.
 */
function getTestData() {
  return {
    sender: "YOUR_TEST_PHONE_NUMBER", // Ganti dengan nomor telepon untuk pengujian
    message: "Halo, tolong jelaskan apa saja layanan Anda dalam bahasa inggris",
    name: "Penguji"
  };
}

/**
 * Menulis data log percakapan ke Google Spreadsheet.
 * @param {object} data - Data yang akan ditulis, berisi nama, pengirim, dan pesan.
 */
function writeToSpreadsheet(data) {
  try {
    const sheet = SpreadsheetApp.openById(SCRIPT_CONFIG.SPREADSHEET_ID).getSheetByName('Sheet1');
    // Kolom: Timestamp, Nama, Nomor Pengirim, Pesan
    sheet.appendRow([new Date(), data.name || 'N/A', data.sender, data.message]);
  } catch (e) {
    Logger.log(`Gagal menulis ke Spreadsheet ID ${SCRIPT_CONFIG.SPREADSHEET_ID}: ${e.message}`);
  }
}
