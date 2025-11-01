// const { Client, LocalAuth } = require('whatsapp-web.js');
// const qrcode = require('qrcode-terminal');
// const {
//     user: UserModel,
//     warga_binaan: WbpModel,
//     data_pengunjung: DataPengunjungModel,
//     pengunjung: PengunjungModel,
//     barang_titipan: BarangTitipanModel,
//     sequelize
// } = require("../models");
// const { Op, Sequelize } = require("sequelize");
// const crypto = require("crypto");
// const QRCode = require('qrcode');
// const cloudinary = require('../config/cloudinary');
// const path = require('path');
// const fs = require('fs');
// const { format, toZonedTime } = require('date-fns-tz');

// // State management untuk setiap user
// const userSessions = new Map();

// // WhatsApp Client dengan session permanen
// const client = new Client({
//     authStrategy: new LocalAuth({
//         clientId: "kunjungan-bot",
//         dataPath: "./whatsapp-sessions"
//     }),
//     puppeteer: {
//         headless: true,
//         args: [
//             '--no-sandbox',
//             '--disable-setuid-sandbox',
//             '--disable-dev-shm-usage',
//             '--disable-accelerated-2d-canvas',
//             '--no-first-run',
//             '--no-zygote',
//             '--single-process',
//             '--disable-gpu'
//         ]
//     }
// });

// // Fungsi generate kode verifikasi sederhana
// const generateVerificationCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

// // FUNGSI BARU: Generate QR Code dan upload ke Cloudinary
// const generateQRCode = async(kode) => {
//     try {
//         const qrCodeData = kode;
//         const qrCodeDir = path.join(__dirname, '..', 'public', 'qrcodes');
//         if (!fs.existsSync(qrCodeDir)) {
//             fs.mkdirSync(qrCodeDir, { recursive: true });
//         }

//         const qrCodeFileName = `${kode}.png`;
//         const qrCodePath = path.join(qrCodeDir, qrCodeFileName);

//         await QRCode.toFile(qrCodePath, qrCodeData, {
//             width: 300,
//             errorCorrectionLevel: 'H'
//         });

//         console.log("QR Code created successfully:", qrCodePath);

//         // Upload QR Code ke Cloudinary
//         const cloudinaryUploadResult = await cloudinary.uploader.upload(qrCodePath, {
//             folder: 'qrcodes'
//         });

//         console.log("QR Code uploaded to Cloudinary:", cloudinaryUploadResult.secure_url);
//         const qrCodeUrl = cloudinaryUploadResult.secure_url;

//         // Hapus file lokal
//         fs.unlinkSync(qrCodePath);

//         return qrCodeUrl;
//     } catch (error) {
//         console.error('Error generating QR code:', error);
//         throw error;
//     }
// };

// // FUNGSI BARU: Generate nomor antrian dengan sistem sesi yang sama
// const generateAntrian = async() => {
//     try {
//         const timeZone = 'Asia/Makassar';
//         const now = new Date();
//         const zonedDate = toZonedTime(now, timeZone);
//         const dateString = format(zonedDate, 'yyyyMMdd');

//         // Tentukan sesi berdasarkan waktu (sama dengan kode kedua)
//         const hour = parseInt(format(zonedDate, 'HH', { timeZone: timeZone }), 10);
//         const isSesiPagi = hour >= 0 && hour < 12;
//         const sesiPrefix = isSesiPagi ? '' : 'A';

//         console.log("Tanggal hari ini:", dateString);
//         console.log("Sesi:", isSesiPagi ? "Pagi" : "Siang");
//         console.log("Prefix:", sesiPrefix);

//         // Filter batas waktu untuk hari ini
//         const startOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T00:00:00+08:00');
//         const endOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T23:59:59.999+08:00');

//         // Cari nomor antrian terbesar untuk sesi yang sama hari ini
//         const lastPengunjung = await PengunjungModel.findOne({
//             where: {
//                 antrian: {
//                     [Sequelize.Op.like]: `${dateString}-${sesiPrefix}%`
//                 },
//                 created_at: {
//                     [Sequelize.Op.between]: [startOfDay, endOfDay]
//                 }
//             },
//             order: [
//                 ['antrian', 'DESC']
//             ],
//             attributes: ['antrian']
//         });

//         let lastNumber = 0;
//         if (lastPengunjung && lastPengunjung.antrian) {
//             const lastAntrian = lastPengunjung.antrian;
//             if (typeof lastAntrian === 'string' && lastAntrian.includes('-')) {
//                 const numberPart = lastAntrian.split('-')[1];
//                 // Hapus prefix 'A' jika ada untuk mendapatkan angka murni
//                 const pureNumber = numberPart.replace('A', '');
//                 lastNumber = parseInt(pureNumber, 10);
//             }
//         }

//         // Generate nomor antrian baru
//         const newAntrianNumber = lastNumber + 1;
//         const newAntrian = `${dateString}-${sesiPrefix}${newAntrianNumber.toString().padStart(3, '0')}`;

//         console.log("Nomor antrian baru:", newAntrian);
//         return newAntrian;
//     } catch (error) {
//         console.error('Error generating antrian:', error);
//         throw error;
//     }
// };

// // FUNGSI BARU: Get informasi sesi saat ini
// const getCurrentSessionInfo = () => {
//     const timeZone = 'Asia/Makassar';
//     const now = new Date();
//     const zonedDate = toZonedTime(now, timeZone);

//     const hour = parseInt(format(zonedDate, 'HH', { timeZone: timeZone }), 10);
//     const isSesiPagi = hour >= 0 && hour < 12;
//     const sesiName = isSesiPagi ? "PAGI" : "SIANG";
//     const waktuSesi = isSesiPagi ? "09:00 - 11:30" : "13:30 - 14:30";

//     return {
//         sesi: sesiName,
//         waktu: waktuSesi,
//         jamSekarang: format(zonedDate, 'HH:mm'),
//         tanggal: format(zonedDate, 'dd/MM/yyyy')
//     };
// };

// // FUNGSI BARU: Search data pengunjung berdasarkan kode
// async function searchPengunjungByKode(kode) {
//     try {
//         return await DataPengunjungModel.findOne({
//             where: { kode: kode.toUpperCase() },
//             include: [{
//                 model: WbpModel,
//                 as: 'warga_binaan',
//                 attributes: ['id', 'nama']
//             }]
//         });
//     } catch (error) {
//         console.error('Error searching pengunjung by kode:', error);
//         throw error;
//     }
// }

// // FUNGSI BARU: Search WBP dengan query yang lebih baik
// async function searchWBP(keyword) {
//     try {
//         return await WbpModel.findAll({
//             where: {
//                 [Op.or]: [{
//                     nama: {
//                         [Op.like]: `%${keyword}%`
//                     }
//                 }]
//             },
//             attributes: ['id', 'nama'],
//             limit: 5
//         });
//     } catch (error) {
//         console.error('Error searching WBP:', error);
//         throw error;
//     }
// }

// // FUNGSI BARU: Save kunjungan ke database yang sesuai dengan migration
// async function saveKunjunganToDB(data, existingPengunjung = null) {
//     const transaction = await sequelize.transaction();

//     try {
//         let kodePengunjung;
//         let barcodeUrl = null;

//         // PERBAIKAN: Gunakan kode dari existingPengunjung jika ada, jika tidak generate baru
//         if (existingPengunjung) {
//             kodePengunjung = existingPengunjung.kode;
//             barcodeUrl = existingPengunjung.barcode;
//         } else {
//             // Generate kode baru hanya jika tidak ada data pengunjung yang sudah ada
//             kodePengunjung = generateVerificationCode();
//             // Generate QR Code untuk kode baru
//             barcodeUrl = await generateQRCode(kodePengunjung);
//         }

//         // Generate nomor antrian dengan sistem sesi
//         const antrian = await generateAntrian();
//         const sessionInfo = getCurrentSessionInfo();

//         // Hitung total pengikut
//         const total_pengikut =
//             (parseInt(data.pengikut_laki) || 0) +
//             (parseInt(data.pengikut_perempuan) || 0) +
//             (parseInt(data.pengikut_anak) || 0) +
//             (parseInt(data.pengikut_bayi) || 0);

//         // Data pengunjung sesuai migration
//         const pengunjungData = {
//             user_id: 1, // Default user ID untuk WhatsApp bot
//             wbp_id: data.wbp_id,
//             nama: data.nama_pengunjung,
//             jenis_kelamin: data.jenis_kelamin,
//             nik: data.nik,
//             alamat: data.alamat || '-',
//             hp: data.no_hp,
//             hubungan_keluarga: data.hubungan_keluarga,
//             tujuan: data.tujuan_berkunjung,
//             pengikut_laki_laki: parseInt(data.pengikut_laki) || 0,
//             pengikut_perempuan: parseInt(data.pengikut_perempuan) || 0,
//             pengikut_anak_anak: parseInt(data.pengikut_anak) || 0,
//             pengikut_bayi: parseInt(data.pengikut_bayi) || 0,
//             total_pengikut: total_pengikut,
//             kode: kodePengunjung,
//             barcode: barcodeUrl,
//             antrian: antrian,
//             keterangan: data.keterangan || '',
//             photo_ktp: null,
//             photo_pengunjung: null,
//             status: 'Tidak valid'
//         };

//         console.log('Data pengunjung yang akan disimpan:', pengunjungData);

//         // Simpan data pengunjung
//         const newPengunjung = await PengunjungModel.create(pengunjungData, { transaction });

//         // Simpan barang titipan jika ada
//         if (data.barang_titipan && data.barang_titipan.length > 0) {
//             const barangData = data.barang_titipan.map(barang => ({
//                 user_id: 1,
//                 pengunjung_id: newPengunjung.id,
//                 wbp_id: barang.wbp_id,
//                 jenis_barang: barang.jenis_barang,
//                 jumlah: barang.jumlah,
//                 keterangan: barang.keterangan || ''
//             }));

//             await BarangTitipanModel.bulkCreate(barangData, { transaction });
//         }

//         await transaction.commit();

//         // Return data lengkap termasuk info sesi
//         return {
//             ...newPengunjung.toJSON(),
//             sessionInfo: sessionInfo
//         };

//     } catch (error) {
//         await transaction.rollback();
//         console.error('Error saving kunjungan:', error);
//         throw error;
//     }
// }

// // Class untuk mengelola session user WhatsApp (DIPERBAIKI)
// class WhatsAppSession {
//     constructor(phone) {
//         this.phone = phone;
//         this.step = 'IDLE';
//         this.data = {
//             wbp_id: null,
//             nama_pengunjung: '',
//             jenis_kelamin: 'laki-laki',
//             nik: '',
//             no_hp: '',
//             alamat: '',
//             tujuan_berkunjung: '', // PERBAIKAN: Tambahkan tujuan
//             hubungan_keluarga: '',
//             pengikut_laki: 0,
//             pengikut_perempuan: 0,
//             pengikut_anak: 0,
//             pengikut_bayi: 0,
//             keterangan: '', // PERBAIKAN: Tambahkan keterangan
//             barang_titipan: []
//         };
//         this.currentBarang = null;
//         this.tempWbpResults = [];
//         this.mode = 'BARU';
//         this.existingPengunjung = null;
//     }

//     reset() {
//         this.step = 'IDLE';
//         this.data = {
//             wbp_id: null,
//             nama_pengunjung: '',
//             jenis_kelamin: 'laki-laki',
//             nik: '',
//             no_hp: '',
//             alamat: '',
//             tujuan_berkunjung: '',
//             hubungan_keluarga: '',
//             pengikut_laki: 0,
//             pengikut_perempuan: 0,
//             pengikut_anak: 0,
//             pengikut_bayi: 0,
//             keterangan: '',
//             barang_titipan: []
//         };
//         this.currentBarang = null;
//         this.tempWbpResults = [];
//         this.mode = 'BARU';
//         this.existingPengunjung = null;
//     }

//     // METHOD BARU: Mulai dengan mode pilihan
//     startKunjungan() {
//         this.step = 'PILIH_MODE';
//         return this.getCurrentQuestion();
//     }

//     // METHOD BARU: Isi data dari pengunjung yang sudah ada
//     fillFromExistingPengunjung(pengunjung) {
//         this.data.nama_pengunjung = pengunjung.nama;
//         this.data.jenis_kelamin = pengunjung.jenis_kelamin;
//         this.data.nik = pengunjung.nik;
//         this.data.no_hp = pengunjung.hp;
//         this.data.alamat = pengunjung.alamat;
//         this.data.hubungan_keluarga = pengunjung.hubungan_keluarga;
//         this.mode = 'KODE';
//         this.existingPengunjung = pengunjung;
//     }

//     getCurrentQuestion() {
//             switch (this.step) {
//                 case 'PILIH_MODE':
//                     return `🔍 *MODE INPUT DATA*\n\nPilih mode input:\n\n1. 🔄 Gunakan kode sebelumnya\n2. ✍️ Input data baru\n\nBalas dengan *angka* pilihan (1-2)`;

//                 case 'INPUT_KODE':
//                     return `🔢 *INPUT KODE PENDAFTARAN*\n\nSilakan masukkan kode pendaftaran Anda:\n\nContoh: A1B2C3\n\nKetik *batal* untuk kembali ke menu`;

//                 case 'SEARCH_WBP':
//                     return `🔍 *CARI WBP YANG DIKUNJUNGI*\n\nSilakan ketik *nama atau nomor register* WBP:\n\nContoh: budi santoso\n\nKetik *batal* untuk berhenti`;

//                 case 'CONFIRM_WBP':
//                     return `✅ *KONFIRMASI WBP*\n\nHasil pencarian:\n${this.tempWbpResults.map((wbp, index) => 
//                     `${index + 1}. *${wbp.nama}*`
//                 ).join('\n')}\n\nBalas dengan *angka* pilihan (1-${this.tempWbpResults.length})\nKetik *cari* untuk mencari ulang`;

//             case 'NAMA_PENGUNJUNG':
//                 return `👨‍💼 *DATA DIRI PENGGUNA*\n\nSilakan ketik *nama lengkap* Anda:`;

//             case 'JENIS_KELAMIN':
//                 return `⚧️ *JENIS KELAMIN*\n\nPilih jenis kelamin:\n\n1. Laki-laki\n2. Perempuan\n\nBalas dengan *angka* pilihan (1-2)`;

//             case 'NIK':
//                 return `🆔 *NIK*\n\nSilakan ketik *NIK* Anda:\n\nContoh: 3271234567890123`;

//             case 'NO_HP':
//                 return `📞 *NOMOR HP*\n\nSilakan ketik *nomor HP* aktif:`;

//             case 'ALAMAT':
//                 return `🏠 *ALAMAT*\n\nSilakan ketik *alamat lengkap*:\n\nKetik *-** untuk skip`;

//             case 'TUJUAN':
//                 return `🎯 *TUJUAN KUNJUNGAN*\n\nSilakan ketik *tujuan* kunjungan:`;

//             case 'HUBUNGAN':
//                 return `👨‍👩‍👧‍👦 *HUBUNGAN KELUARGA*\n\nPilih hubungan dengan WBP:\n\n1. Orang Tua\n2. Suami/Istri\n3. Anak\n4. Saudara\n5. Lainnya\n\nBalas dengan *angka* pilihan (1-5)`;

//             case 'PENGIKUT_LAKI':
//                 return `👨 *PENGIKUT LAKI-LAKI*\n\nJumlah pengikut laki-laki dewasa:\n*0* jika tidak ada`;

//             case 'PENGIKUT_PEREMPUAN':
//                 return `👩 *PENGIKUT PEREMPUAN*\n\nJumlah pengikut perempuan dewasa:\n*0* jika tidak ada`;

//             case 'PENGIKUT_ANAK':
//                 return `🧒 *PENGIKUT ANAK-ANAK*\n\nJumlah pengikut anak-anak (3-12 tahun):\n*0* jika tidak ada`;

//             case 'PENGIKUT_BAYI':
//                 return `👶 *PENGIKUT BAYI*\n\nJumlah pengikut bayi (0-2 tahun):\n*0* jika tidak ada`;

//             case 'KETERANGAN':
//                 return `📝 *KETERANGAN TAMBAHAN*\n\nSilakan ketik keterangan tambahan (opsional):\n\nKetik *-** untuk skip`;

//             case 'TAMBAH_BARANG':
//                 return `📦 *BARANG TITIPAN*\n\nApakah ingin menambah barang titipan?\n\n1. Ya, tambah barang\n2. Tidak, lanjut simpan\n\nBalas dengan *angka* pilihan (1-2)`;

//             case 'BARANG_WBP_SEARCH':
//                 return `🔍 *CARI WBP PENERIMA BARANG*\n\nSilakan ketik nama WBP penerima barang:\n\nKetik *selesai* jika tidak ada barang`;

//             case 'BARANG_WBP_CONFIRM':
//                 return `✅ *KONFIRMASI WBP PENERIMA*\n\nHasil pencarian:\n${this.tempWbpResults.map((wbp, index) => 
//                     `${index + 1}. *${wbp.nama}*`
//                 ).join('\n')}\n\nBalas dengan *angka* pilihan (1-${this.tempWbpResults.length})`;

//             case 'JENIS_BARANG':
//                 return `📦 *JENIS BARANG*\n\nSilakan ketik jenis barang:\n\nContoh: Susu, Roti, Pakaian`;

//             case 'JUMLAH_BARANG':
//                 return `🔢 *JUMLAH BARANG*\n\nSilakan ketik jumlah barang:\n\nContoh: 5`;

//             case 'KETERANGAN_BARANG':
//                 return `📝 *KETERANGAN BARANG*\n\nSilakan ketik keterangan (opsional):\n\nKetik *-** untuk skip`;

//             case 'TAMBAH_BARANG_LAGI':
//                 return `📦 *TAMBAH BARANG LAGI?*\n\nApakah ingin menambah barang lagi?\n\n1. Ya, tambah lagi\n2. Tidak, simpan data\n\nBalas dengan *angka* pilihan (1-2)`;

//             case 'CONFIRMATION':
//                 return this.getConfirmationMessage();

//             default:
//                 return `❌ Session error. Ketik *menu* untuk memulai lagi.`;
//         }
//     }

//     getConfirmationMessage() {
//         const totalPengikut = 
//             (parseInt(this.data.pengikut_laki) || 0) + 
//             (parseInt(this.data.pengikut_perempuan) || 0) + 
//             (parseInt(this.data.pengikut_anak) || 0) + 
//             (parseInt(this.data.pengikut_bayi) || 0);

//         let message = `✅ *KONFIRMASI DATA KUNJUNGAN*\n\n`;
//         message += `📋 *Mode:* ${this.mode === 'KODE' ? 'Menggunakan kode sebelumnya' : 'Input data baru'}\n`;
//         message += `👨‍💼 *Nama:* ${this.data.nama_pengunjung}\n`;
//         message += `⚧️ *Jenis Kelamin:* ${this.data.jenis_kelamin}\n`;
//         message += `🆔 *NIK:* ${this.data.nik}\n`;
//         message += `📞 *No. HP:* ${this.data.no_hp}\n`;
//         message += `🏠 *Alamat:* ${this.data.alamat || '-'}\n`;
//         message += `🎯 *Tujuan:* ${this.data.tujuan_berkunjung}\n`;
//         message += `👨‍👩‍👧‍👦 *Hubungan:* ${this.data.hubungan_keluarga}\n`;
//         message += `👥 *Pengikut:* Laki-laki (${this.data.pengikut_laki}), Perempuan (${this.data.pengikut_perempuan}), Anak (${this.data.pengikut_anak}), Bayi (${this.data.pengikut_bayi})\n`;
//         message += `📊 *Total Pengikut:* ${totalPengikut} orang\n`;
//         message += `📝 *Keterangan:* ${this.data.keterangan || '-'}\n`;

//         if (this.data.barang_titipan.length > 0) {
//             message += `\n📦 *BARANG TITIPAN:*\n`;
//             this.data.barang_titipan.forEach((barang, index) => {
//                 message += `${index + 1}. ${barang.jenis_barang} (${barang.jumlah}x) - ${barang.keterangan || '-'}\n`;
//             });
//         } else {
//             message += `\n📦 *Barang Titipan:* Tidak ada\n`;
//         }

//         message += `\nApakah data sudah benar?\n\n1. ✅ Ya, simpan data\n2. ❌ Tidak, ulangi dari awal\n\nBalas dengan *angka* pilihan (1-2)`;

//         return message;
//     }

//     async handleResponse(response) {
//         switch (this.step) {
//             case 'PILIH_MODE':
//                 return this.handlePilihMode(response);

//             case 'INPUT_KODE':
//                 return await this.handleInputKode(response);

//             case 'SEARCH_WBP':
//                 return await this.handleSearchWbp(response);

//             case 'CONFIRM_WBP':
//                 return this.handleConfirmWbp(response);

//             case 'NAMA_PENGUNJUNG':
//                 this.data.nama_pengunjung = response;
//                 this.step = 'JENIS_KELAMIN';
//                 return { success: true };

//             case 'JENIS_KELAMIN':
//                 if (response === '1') {
//                     this.data.jenis_kelamin = 'laki-laki';
//                 } else if (response === '2') {
//                     this.data.jenis_kelamin = 'perempuan';
//                 } else {
//                     return { success: false, message: '❌ Pilih 1 atau 2:' };
//                 }
//                 this.step = 'NIK';
//                 return { success: true };

//             case 'NIK':
//                 this.data.nik = response;
//                 this.step = 'NO_HP';
//                 return { success: true };

//             case 'NO_HP':
//                 this.data.no_hp = response;
//                 this.step = 'ALAMAT';
//                 return { success: true };

//             case 'ALAMAT':
//                 this.data.alamat = response === '-**' ? '' : response;
//                 this.step = 'TUJUAN';
//                 return { success: true };

//             case 'TUJUAN':
//                 this.data.tujuan_berkunjung = response;
//                 this.step = 'HUBUNGAN';
//                 return { success: true };

//             case 'HUBUNGAN':
//                 return this.handleHubungan(response);

//             case 'PENGIKUT_LAKI':
//                 this.data.pengikut_laki = parseInt(response) || 0;
//                 this.step = 'PENGIKUT_PEREMPUAN';
//                 return { success: true };

//             case 'PENGIKUT_PEREMPUAN':
//                 this.data.pengikut_perempuan = parseInt(response) || 0;
//                 this.step = 'PENGIKUT_ANAK';
//                 return { success: true };

//             case 'PENGIKUT_ANAK':
//                 this.data.pengikut_anak = parseInt(response) || 0;
//                 this.step = 'PENGIKUT_BAYI';
//                 return { success: true };

//             case 'PENGIKUT_BAYI':
//                 this.data.pengikut_bayi = parseInt(response) || 0;
//                 this.step = 'KETERANGAN';
//                 return { success: true };

//             case 'KETERANGAN':
//                 this.data.keterangan = response === '-**' ? '' : response;
//                 this.step = 'TAMBAH_BARANG';
//                 return { success: true };

//             case 'TAMBAH_BARANG':
//                 return this.handleTambahBarang(response);

//             case 'BARANG_WBP_SEARCH':
//                 return await this.handleBarangWbpSearch(response);

//             case 'BARANG_WBP_CONFIRM':
//                 return this.handleBarangWbpConfirm(response);

//             case 'JENIS_BARANG':
//                 this.currentBarang.jenis_barang = response;
//                 this.step = 'JUMLAH_BARANG';
//                 return { success: true };

//             case 'JUMLAH_BARANG':
//                 this.currentBarang.jumlah = parseInt(response) || 1;
//                 this.step = 'KETERANGAN_BARANG';
//                 return { success: true };

//             case 'KETERANGAN_BARANG':
//                 this.currentBarang.keterangan = response === '-**' ? '' : response;
//                 this.data.barang_titipan.push({ ...this.currentBarang });
//                 this.step = 'TAMBAH_BARANG_LAGI';
//                 return { success: true };

//             case 'TAMBAH_BARANG_LAGI':
//                 return this.handleTambahBarangLagi(response);

//             case 'CONFIRMATION':
//                 return this.handleConfirmation(response);

//             default:
//                 return { success: false, message: 'Session error' };
//         }
//     }

//     // METHOD BARU: Handle pilih mode
//     handlePilihMode(response) {
//         if (response === '1') {
//             this.step = 'INPUT_KODE';
//             return { success: true };
//         } else if (response === '2') {
//             this.step = 'SEARCH_WBP';
//             return { success: true };
//         } else {
//             return { 
//                 success: false, 
//                 message: '❌ Pilihan tidak valid. Silakan pilih 1 atau 2:' 
//             };
//         }
//     }

//     // METHOD BARU: Handle input kode
//     async handleInputKode(response) {
//         try {
//             const pengunjung = await searchPengunjungByKode(response);
//             if (!pengunjung) {
//                 return { 
//                     success: false, 
//                     message: '❌ Kode tidak ditemukan. Silakan coba lagi atau ketik *batal* untuk kembali ke menu awal.' 
//                 };
//             }

//             // Isi data dari pengunjung yang ditemukan
//             this.fillFromExistingPengunjung(pengunjung);
//             this.step = 'SEARCH_WBP';
//             return { 
//                 success: true, 
//                 message: `✅ Data ditemukan!\n\nNama: ${pengunjung.nama}\nNIK: ${pengunjung.nik}\nNo. HP: ${pengunjung.hp}\n\nSekarang silakan cari WBP yang akan dikunjungi:` 
//             };
//         } catch (error) {
//             console.error('Error search pengunjung by kode:', error);
//             return { 
//                 success: false, 
//                 message: '❌ Error saat mencari kode. Silakan coba lagi:' 
//             };
//         }
//     }

//     async handleSearchWbp(response) {
//         try {
//             const results = await searchWBP(response);
//             if (results.length === 0) {
//                 return { 
//                     success: false, 
//                     message: '❌ WBP tidak ditemukan. Silakan ketik nama WBP lagi:' 
//                 };
//             }

//             this.tempWbpResults = results;
//             this.step = 'CONFIRM_WBP';
//             return { success: true };
//         } catch (error) {
//             console.error('Error searching WBP:', error);
//             return { success: false, message: '❌ Error saat mencari WBP. Coba lagi:' };
//         }
//     }

//     handleConfirmWbp(response) {
//         if (response.toLowerCase() === 'cari') {
//             this.step = 'SEARCH_WBP';
//             return { success: true };
//         }

//         const selectedIndex = parseInt(response) - 1;
//         if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= this.tempWbpResults.length) {
//             return { 
//                 success: false, 
//                 message: `❌ Pilihan tidak valid. Silakan pilih angka 1-${this.tempWbpResults.length}:` 
//             };
//         }

//         this.data.wbp_id = this.tempWbpResults[selectedIndex].id;

//         // Jika mode KODE, langsung ke tujuan kunjungan
//         if (this.mode === 'KODE') {
//             this.step = 'TUJUAN';
//         } else {
//             this.step = 'NAMA_PENGUNJUNG';
//         }
//         return { success: true };
//     }

//     handleHubungan(response) {
//         const hubunganMap = {
//             '1': 'Orang Tua',
//             '2': 'Suami/Istri',
//             '3': 'Anak',
//             '4': 'Saudara',
//             '5': 'Lainnya'
//         };

//         if (!hubunganMap[response]) {
//             return { 
//                 success: false, 
//                 message: '❌ Pilihan tidak valid. Silakan pilih angka 1-5:' 
//             };
//         }

//         this.data.hubungan_keluarga = hubunganMap[response];
//         this.step = 'PENGIKUT_LAKI';
//         return { success: true };
//     }

//     handleTambahBarang(response) {
//         if (response === '1') {
//             this.step = 'BARANG_WBP_SEARCH';
//             this.currentBarang = {};
//             return { success: true };
//         } else if (response === '2') {
//             this.step = 'CONFIRMATION';
//             return { success: true };
//         } else {
//             return { 
//                 success: false, 
//                 message: '❌ Pilihan tidak valid. Silakan pilih 1 atau 2:' 
//             };
//         }
//     }

//     async handleBarangWbpSearch(response) {
//         if (response.toLowerCase() === 'selesai') {
//             this.step = 'CONFIRMATION';
//             return { success: true };
//         }

//         try {
//             const results = await searchWBP(response);
//             if (results.length === 0) {
//                 return { 
//                     success: false, 
//                     message: '❌ WBP tidak ditemukan. Silakan ketik nama WBP lagi atau ketik *selesai*:' 
//                 };
//             }

//             this.tempWbpResults = results;
//             this.step = 'BARANG_WBP_CONFIRM';
//             return { success: true };
//         } catch (error) {
//             console.error('Error searching WBP for barang:', error);
//             return { success: false, message: '❌ Error saat mencari WBP. Coba lagi:' };
//         }
//     }

//     handleBarangWbpConfirm(response) {
//         const selectedIndex = parseInt(response) - 1;
//         if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= this.tempWbpResults.length) {
//             return { 
//                 success: false, 
//                 message: `❌ Pilihan tidak valid. Silakan pilih angka 1-${this.tempWbpResults.length}:` 
//             };
//         }

//         this.currentBarang.wbp_id = this.tempWbpResults[selectedIndex].id;
//         this.step = 'JENIS_BARANG';
//         return { success: true };
//     }

//     handleTambahBarangLagi(response) {
//         if (response === '1') {
//             this.step = 'BARANG_WBP_SEARCH';
//             this.currentBarang = {};
//             return { success: true };
//         } else if (response === '2') {
//             this.step = 'CONFIRMATION';
//             return { success: true };
//         } else {
//             return { 
//                 success: false, 
//                 message: '❌ Pilihan tidak valid. Silakan pilih 1 atau 2:' 
//             };
//         }
//     }

//     handleConfirmation(response) {
//         if (response === '1') {
//             this.step = 'SAVING';
//             return { success: true, save: true };
//         } else if (response === '2') {
//             this.reset();
//             this.step = 'PILIH_MODE';
//             return { success: true, restart: true };
//         } else {
//             return { 
//                 success: false, 
//                 message: '❌ Pilihan tidak valid. Silakan pilih 1 atau 2:' 
//             };
//         }
//     }
// }

// // WhatsApp event handlers
// client.on('qr', (qr) => {
//     console.log('📱 SCAN QR CODE INI DENGAN WHATSAPP:');
//     qrcode.generate(qr, { small: true });
// });

// client.on('authenticated', () => {
//     console.log('✅ WhatsApp Authenticated! Session tersimpan.');
// });

// client.on('ready', () => {
//     console.log('🤖 BOT WHATSAPP AKTIF!');
//     console.log(`📞 NOMOR BOT: ${client.info.wid.user}`);
//     console.log('💡 User bisa kirim pesan ke nomor ini!');
// });

// // Handler pesan WhatsApp (DIPERBAIKI)
// client.on('message', async (message) => {
//     if (message.fromMe) return;

//     const phone = message.from;
//     const text = message.body.toLowerCase().trim();

//     // Welcome message untuk new user
//     if (text === 'hi' || text === 'hello' || text === 'halo' || text === 'mulai') {
//         const welcomeMsg = `👋 *BOT PENDATAAN KUNJUNGAN*

// 🤖 *BOT RESMI LAPAS*

// *PERINTAH:*
// • "menu" - Tampilkan menu
// • "kunjungan" - Input data kunjungan  
// • "sesi" - Cek sesi kunjungan saat ini
// • "batal" - Batalkan input
// • "status" - Cek status

// *SISTEM SESI:*
// 🕐 Sesi Pagi: 09:00 - 11: 30 (senin-jum'at)
// 🕐 Sesi Pagi: 09:00 - 10: 30 (sabtu)
// 🕐 Sesi Siang: 13:30 - 14:30 (senin-kamis)
// 🔢 Setiap sesi memiliki nomor antrian sendiri

// *FITUR BARU:*
// 🔄 Gunakan kode sebelumnya untuk input cepat!

// Bot ini untuk input data kunjungan dan barang titipan ke database.`;

//         return message.reply(welcomeMsg);
//     }

//     // Perintah menu
//     if (text === 'menu' || text === 'help') {
//         const menuMsg = `📋 *MENU BOT KUNJUNGAN*

// *PERINTAH:*
// 1. "kunjungan" - Input data kunjungan baru
// 2. "batal" - Batalkan input sedang berjalan  
// 3. "status" - Cek status session
// 4. "info" - Info bot

// *FITUR BARU:*
// 🔄 Input cepat dengan kode sebelumnya
// ✅ Ambil data dari kunjungan lama
// ✅ Tidak perlu input data berulang

// *FITUR LAIN:*
// ✅ Input data kunjungan
// ✅ Cari data WBP  
// ✅ Barang titipan
// ✅ Simpan ke database

// *CARA PAKAI:*
// 1. Ketik "kunjungan"
// 2. Pilih mode input
// 3. Ikuti pertanyaan beruntun
// 4. Konfirmasi data
// 5. Data otomatis tersimpan!`;

//         return message.reply(menuMsg);
//     }

//     // Perintah batal
//     if (text === 'batal' || text === 'cancel') {
//         if (userSessions.has(phone)) {
//             userSessions.delete(phone);
//         }
//         return message.reply('❌ Input dibatalkan. Ketik "menu" untuk mulai lagi.');
//     }

//     // Perintah status
//     if (text === 'status') {
//         const session = userSessions.get(phone);
//         if (session) {
//             return message.reply(`📊 Status: Sedang input data (Step: ${session.step})\nMode: ${session.mode}\nKetik "batal" untuk stop`);
//         } else {
//             return message.reply('📊 Status: Siap menerima input\nKetik "kunjungan" untuk mulai');
//         }
//     }

//     // Perintah info
//     if (text === 'info') {
//         return message.reply(`🤖 *BOT KUNJUNGAN LAPAS*

// *Nomor:* ${client.info.wid.user}
// *Status:* ✅ Online
// *Version:* 2.0

// *Fitur Baru:*
// • Input cepat dengan kode
// • Ambil data dari kunjungan lama
// • Tidak perlu input berulang

// *Fitur Lain:*
// • Input data kunjungan
// • Pencarian WBP
// • Barang titipan
// • Simpan ke database

// *Support:* IT Lapas`);
//     }

//     // Mulai kunjungan
//     if (text === 'kunjungan') {
//         let session = userSessions.get(phone);
//         if (session && session.step !== 'IDLE') {
//             return message.reply('⚠️ Anda memiliki session aktif. Ketik "batal" dulu.');
//         }

//         session = new WhatsAppSession(phone);
//         userSessions.set(phone, session);

//         const welcomeMsg = `🤖 *SISTEM KUNJUNGAN LAPAS*

// Selamat datang! Saya akan memandu Anda mengisi data kunjungan.

// *FITUR BARU:* Sekarang Anda bisa menggunakan kode kunjungan sebelumnya untuk input cepat!

// ${session.startKunjungan()}`;

//         return message.reply(welcomeMsg);
//     }

//     // Handle session beruntun (DIPERBAIKI)
//     const session = userSessions.get(phone);
//     if (session && session.step !== 'IDLE') {
//         // Handle cancel dalam session
//         if (text === 'batal') {
//             userSessions.delete(phone);
//             return message.reply('❌ Input dibatalkan. Ketik "menu" untuk mulai lagi.');
//         }

//         try {
//             let result = await session.handleResponse(message.body);

//             // Handle pesan khusus untuk mode KODE
//             if (result.message) {
//                 await message.reply(result.message);
//                 if (result.success) {
//                     const nextQuestion = session.getCurrentQuestion();
//                     return message.reply(nextQuestion);
//                 } else {
//                     return; // Tetap di step yang sama dengan pesan error
//                 }
//             }

//             if (result.success) {
//                 // Dalam handler message, bagian result.save
// if (result.save) {
//     try {
//         const savedData = await saveKunjunganToDB(session.data, session.existingPengunjung);

//         const totalPengikut = 
//             (parseInt(session.data.pengikut_laki) || 0) + 
//             (parseInt(session.data.pengikut_perempuan) || 0) + 
//             (parseInt(session.data.pengikut_anak) || 0) + 
//             (parseInt(session.data.pengikut_bayi) || 0);

//         const sessionInfo = getCurrentSessionInfo();

//         const successMsg = `✅ *DATA BERHASIL DISIMPAN KE DATABASE!*

// 📋 *No. Registrasi:* ${savedData.kode}
// 🔢 *No. Antrian:* ${savedData.antrian}
// 🕐 *Sesi Kunjungan:* ${sessionInfo.sesi} (${sessionInfo.waktu})
// 📅 *Tanggal:* ${sessionInfo.tanggal}
// ⏰ *Jam Input:* ${sessionInfo.jamSekarang}

// 👨‍💼 *Nama Pengunjung:* ${session.data.nama_pengunjung}
// 📞 *No. HP:* ${session.data.no_hp}
// 🎯 *Tujuan:* ${session.data.tujuan_berkunjung}
// 👥 *Total Pengikut:* ${totalPengikut} orang
// 📦 *Barang Titipan:* ${session.data.barang_titipan.length} item
// 🔢 *Mode Input:* ${session.mode === 'KODE' ? 'Menggunakan kode sebelumnya' : 'Input data baru'}

// *Status:* ✅ Tersimpan di Sistem

// ${session.mode === 'KODE' ? `*KODE ANDA TETAP SAMA:* *${savedData.kode}*` : `*SIMPAN KODE INI:* *${savedData.kode}*`}
// ${session.mode === 'KODE' ? 'Kode Anda tetap sama karena menggunakan data sebelumnya!' : 'Gunakan kode ini untuk kunjungan berikutnya!'}

// 📱 *Barcode/QR Code:* ${savedData.barcode ? `Tersimpan di sistem dengan link : ${savedData.barcode}  ` : 'Tidak tersedia'}



// *INFORMASI SESI:*
// - Sesi ${sessionInfo.sesi}: ${sessionInfo.waktu}
// - Nomor antrian sudah termasuk dalam sistem sesi
// - Pastikan datang sesuai jadwal kunjungan

// Terima kasih! Data kunjungan Anda sudah berhasil disimpan.`;

//         userSessions.delete(phone);
//         return message.reply(successMsg);

//     } catch (error) {
//         console.error('Save error:', error);
//         userSessions.delete(phone);
//         return message.reply('❌ Gagal menyimpan data. Silakan coba lagi dengan "menu".');
//     }
// }

//                 if (result.restart) {
//                     const restartMsg = `🔄 *MENGULANGI INPUT DATA*

// ${session.getCurrentQuestion()}`;
//                     return message.reply(restartMsg);
//                 }

//                 const nextQuestion = session.getCurrentQuestion();
//                 return message.reply(nextQuestion);
//             } else {
//                 return message.reply(result.message);
//             }
//         } catch (error) {
//             console.error('Session error:', error);
//             userSessions.delete(phone);
//             return message.reply('❌ Terjadi error. Ketik "menu" untuk mulai lagi.');
//         }
//     }
// });

// // Fungsi untuk initialize bot
// function initializeWhatsAppBot() {
//     client.initialize();
//     return client;
// }

// // Export untuk digunakan di file lain
// module.exports = {
//     initializeWhatsAppBot,
//     client,
//     userSessions,
//     searchPengunjungByKode,
//     generateQRCode,
//     generateAntrian
// };

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const {
    user: UserModel,
    warga_binaan: WbpModel,
    data_pengunjung: DataPengunjungModel,
    pengunjung: PengunjungModel,
    barang_titipan: BarangTitipanModel,
    sequelize
} = require("../models");
const { Op, Sequelize } = require("sequelize");
const crypto = require("crypto");
const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');
const path = require('path');
const fs = require('fs');
const { format, toZonedTime } = require('date-fns-tz');

// State management untuk setiap user
const userSessions = new Map();

// WhatsApp Client dengan session permanen
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "kunjungan-bot",
        dataPath: "./whatsapp-sessions"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
            '--disable-gpu'
        ]
    }
});

// Fungsi generate kode verifikasi sederhana
const generateVerificationCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

// FUNGSI BARU: Validasi kunjungan harian SEBELUM memilih tujuan
const validateDailyKunjungan = async(nama, nik, tujuan, wbp_id) => {
    try {
        // Untuk tujuan menitip barang, selalu diizinkan
        if (tujuan === 'menitip barang') {
            return { isValid: true };
        }

        const timeZone = 'Asia/Makassar';
        const now = new Date();
        const zonedDate = toZonedTime(now, timeZone);

        // Filter untuk hari ini saja
        const startOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T00:00:00+08:00');
        const endOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T23:59:59.999+08:00');

        console.log('Validasi kunjungan untuk:', { nama, nik, tujuan, wbp_id });
        console.log('Rentang waktu:', startOfDay, 'sampai', endOfDay);

        // Cek apakah sudah ada kunjungan dengan nama dan NIK yang sama hari ini untuk WBP yang sama
        const existingKunjungan = await PengunjungModel.findOne({
            where: {
                nama: nama,
                nik: nik,
                wbp_id: wbp_id,
                tujuan: {
                    [Op.in]: ['berkunjung', 'berkunjung+menitip barang']
                },
                created_at: {
                    [Sequelize.Op.between]: [startOfDay, endOfDay]
                }
            }
        });

        if (existingKunjungan) {
            console.log('Kunjungan ditemukan:', existingKunjungan.tujuan);

            return {
                isValid: false,
                message: `❌ *VALIDASI GAGAL*\n\nAnda sudah melakukan pendaftaran kunjungan hari ini untuk WBP yang sama.\n\n*Detail Kunjungan Sebelumnya:*\n📅 Tanggal: ${format(zonedDate, 'dd/MM/yyyy')}\n🎯 Tujuan: ${existingKunjungan.tujuan}\n🔢 No. Antrian: ${existingKunjungan.antrian}\n\n⚠️ *Aturan:*\n• Berkunjung hanya boleh 1x per hari\n• Menitip barang bisa beberapa kali\n• Berkunjung+menitip barang hanya boleh 1x per hari\n\nSilakan pilih tujuan *"Menitip Barang"* atau batalkan kunjungan.`
            };
        }

        return { isValid: true };
    } catch (error) {
        console.error('Error validasi kunjungan:', error);
        return {
            isValid: false,
            message: '❌ Error saat validasi data. Silakan coba lagi.'
        };
    }
};

// FUNGSI BARU: Generate QR Code dan upload ke Cloudinary
const generateQRCode = async(kode) => {
    try {
        const qrCodeData = kode;
        const qrCodeDir = path.join(__dirname, '..', 'public', 'qrcodes');
        if (!fs.existsSync(qrCodeDir)) {
            fs.mkdirSync(qrCodeDir, { recursive: true });
        }

        const qrCodeFileName = `${kode}.png`;
        const qrCodePath = path.join(qrCodeDir, qrCodeFileName);

        await QRCode.toFile(qrCodePath, qrCodeData, {
            width: 300,
            errorCorrectionLevel: 'H'
        });

        console.log("QR Code created successfully:", qrCodePath);

        // Upload QR Code ke Cloudinary
        const cloudinaryUploadResult = await cloudinary.uploader.upload(qrCodePath, {
            folder: 'qrcodes'
        });

        console.log("QR Code uploaded to Cloudinary:", cloudinaryUploadResult.secure_url);
        const qrCodeUrl = cloudinaryUploadResult.secure_url;

        // Hapus file lokal
        fs.unlinkSync(qrCodePath);

        return qrCodeUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
};

// FUNGSI BARU: Generate nomor antrian dengan sistem sesi yang sama
const generateAntrian = async() => {
    try {
        const timeZone = 'Asia/Makassar';
        const now = new Date();
        const zonedDate = toZonedTime(now, timeZone);
        const dateString = format(zonedDate, 'yyyyMMdd');

        // Tentukan sesi berdasarkan waktu (sama dengan kode kedua)
        const hour = parseInt(format(zonedDate, 'HH', { timeZone: timeZone }), 10);
        const isSesiPagi = hour >= 0 && hour < 12;
        const sesiPrefix = isSesiPagi ? '' : 'A';

        console.log("Tanggal hari ini:", dateString);
        console.log("Sesi:", isSesiPagi ? "Pagi" : "Siang");
        console.log("Prefix:", sesiPrefix);

        // Filter batas waktu untuk hari ini
        const startOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T00:00:00+08:00');
        const endOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T23:59:59.999+08:00');

        // Cari nomor antrian terbesar untuk sesi yang sama hari ini
        const lastPengunjung = await PengunjungModel.findOne({
            where: {
                antrian: {
                    [Sequelize.Op.like]: `${dateString}-${sesiPrefix}%`
                },
                created_at: {
                    [Sequelize.Op.between]: [startOfDay, endOfDay]
                }
            },
            order: [
                ['antrian', 'DESC']
            ],
            attributes: ['antrian']
        });

        let lastNumber = 0;
        if (lastPengunjung && lastPengunjung.antrian) {
            const lastAntrian = lastPengunjung.antrian;
            if (typeof lastAntrian === 'string' && lastAntrian.includes('-')) {
                const numberPart = lastAntrian.split('-')[1];
                // Hapus prefix 'A' jika ada untuk mendapatkan angka murni
                const pureNumber = numberPart.replace('A', '');
                lastNumber = parseInt(pureNumber, 10);
            }
        }

        // Generate nomor antrian baru
        const newAntrianNumber = lastNumber + 1;
        const newAntrian = `${dateString}-${sesiPrefix}${newAntrianNumber.toString().padStart(3, '0')}`;

        console.log("Nomor antrian baru:", newAntrian);
        return newAntrian;
    } catch (error) {
        console.error('Error generating antrian:', error);
        throw error;
    }
};

// FUNGSI BARU: Get informasi sesi saat ini
const getCurrentSessionInfo = () => {
    const timeZone = 'Asia/Makassar';
    const now = new Date();
    const zonedDate = toZonedTime(now, timeZone);

    const hour = parseInt(format(zonedDate, 'HH', { timeZone: timeZone }), 10);
    const isSesiPagi = hour >= 0 && hour < 12;
    const sesiName = isSesiPagi ? "PAGI" : "SIANG";
    const waktuSesi = isSesiPagi ? "09:00 - 11:30" : "13:30 - 14:30";

    return {
        sesi: sesiName,
        waktu: waktuSesi,
        jamSekarang: format(zonedDate, 'HH:mm'),
        tanggal: format(zonedDate, 'dd/MM/yyyy')
    };
};

// FUNGSI BARU: Search data pengunjung berdasarkan kode
async function searchPengunjungByKode(kode) {
    try {
        return await DataPengunjungModel.findOne({
            where: { kode: kode.toUpperCase() },
            include: [{
                model: WbpModel,
                as: 'warga_binaan',
                attributes: ['id', 'nama']
            }]
        });
    } catch (error) {
        console.error('Error searching pengunjung by kode:', error);
        throw error;
    }
}

// FUNGSI BARU: Search WBP dengan query yang lebih baik
async function searchWBP(keyword) {
    try {
        return await WbpModel.findAll({
            where: {
                [Op.or]: [{
                    nama: {
                        [Op.like]: `%${keyword}%`
                    }
                }]
            },
            attributes: ['id', 'nama'],
            limit: 5
        });
    } catch (error) {
        console.error('Error searching WBP:', error);
        throw error;
    }
}

// FUNGSI BARU: Save kunjungan ke database yang sesuai dengan migration
async function saveKunjunganToDB(data, existingPengunjung = null) {
    const transaction = await sequelize.transaction();

    try {
        let kodePengunjung;
        let barcodeUrl = null;

        // PERBAIKAN: Gunakan kode dari existingPengunjung jika ada, jika tidak generate baru
        if (existingPengunjung) {
            kodePengunjung = existingPengunjung.kode;
            barcodeUrl = existingPengunjung.barcode;
        } else {
            // Generate kode baru hanya jika tidak ada data pengunjung yang sudah ada
            kodePengunjung = generateVerificationCode();
            // Generate QR Code untuk kode baru
            barcodeUrl = await generateQRCode(kodePengunjung);
        }

        // Generate nomor antrian dengan sistem sesi
        const antrian = await generateAntrian();
        const sessionInfo = getCurrentSessionInfo();

        // Hitung total pengikut - untuk menitip barang selalu 0
        const total_pengikut = data.tujuan_berkunjung === 'menitip barang' ? 0 :
            (parseInt(data.pengikut_laki) || 0) +
            (parseInt(data.pengikut_perempuan) || 0) +
            (parseInt(data.pengikut_anak) || 0) +
            (parseInt(data.pengikut_bayi) || 0);

        // Data pengunjung sesuai migration
        const pengunjungData = {
            user_id: 1, // Default user ID untuk WhatsApp bot
            wbp_id: data.wbp_id,
            nama: data.nama_pengunjung,
            jenis_kelamin: data.jenis_kelamin,
            nik: data.nik,
            alamat: data.alamat || '-',
            hp: data.no_hp,
            hubungan_keluarga: data.hubungan_keluarga,
            tujuan: data.tujuan_berkunjung,
            pengikut_laki_laki: data.tujuan_berkunjung === 'menitip barang' ? 0 : (parseInt(data.pengikut_laki) || 0),
            pengikut_perempuan: data.tujuan_berkunjung === 'menitip barang' ? 0 : (parseInt(data.pengikut_perempuan) || 0),
            pengikut_anak_anak: data.tujuan_berkunjung === 'menitip barang' ? 0 : (parseInt(data.pengikut_anak) || 0),
            pengikut_bayi: data.tujuan_berkunjung === 'menitip barang' ? 0 : (parseInt(data.pengikut_bayi) || 0),
            total_pengikut: total_pengikut,
            kode: kodePengunjung,
            barcode: barcodeUrl,
            antrian: antrian,
            keterangan: data.keterangan || '',
            photo_ktp: null,
            photo_pengunjung: null,
            status: 'Tidak valid'
        };

        console.log('Data pengunjung yang akan disimpan:', pengunjungData);

        // Simpan data pengunjung
        const newPengunjung = await PengunjungModel.create(pengunjungData, { transaction });

        // Simpan barang titipan jika ada dan tujuan termasuk menitip barang
        if ((data.tujuan_berkunjung === 'menitip barang' || data.tujuan_berkunjung === 'berkunjung+menitip barang') &&
            data.barang_titipan && data.barang_titipan.length > 0) {

            const barangData = data.barang_titipan.map(barang => ({
                user_id: 1,
                pengunjung_id: newPengunjung.id,
                wbp_id: barang.wbp_id,
                jenis_barang: barang.jenis_barang,
                jumlah: barang.jumlah,
                keterangan: barang.keterangan || ''
            }));

            await BarangTitipanModel.bulkCreate(barangData, { transaction });
        }

        await transaction.commit();

        // Return data lengkap termasuk info sesi
        return {
            ...newPengunjung.toJSON(),
            sessionInfo: sessionInfo
        };

    } catch (error) {
        await transaction.rollback();
        console.error('Error saving kunjungan:', error);
        throw error;
    }
}

// Class untuk mengelola session user WhatsApp (DIPERBAIKI)
class WhatsAppSession {
    constructor(phone) {
        this.phone = phone;
        this.step = 'IDLE';
        this.data = {
            wbp_id: null,
            nama_pengunjung: '',
            jenis_kelamin: 'laki-laki',
            nik: '',
            no_hp: '',
            alamat: '',
            tujuan_berkunjung: '',
            hubungan_keluarga: '',
            pengikut_laki: 0,
            pengikut_perempuan: 0,
            pengikut_anak: 0,
            pengikut_bayi: 0,
            keterangan: '',
            barang_titipan: []
        };
        this.currentBarang = null;
        this.tempWbpResults = [];
        this.mode = 'BARU';
        this.existingPengunjung = null;
    }

    reset() {
        this.step = 'IDLE';
        this.data = {
            wbp_id: null,
            nama_pengunjung: '',
            jenis_kelamin: 'laki-laki',
            nik: '',
            no_hp: '',
            alamat: '',
            tujuan_berkunjung: '',
            hubungan_keluarga: '',
            pengikut_laki: 0,
            pengikut_perempuan: 0,
            pengikut_anak: 0,
            pengikut_bayi: 0,
            keterangan: '',
            barang_titipan: []
        };
        this.currentBarang = null;
        this.tempWbpResults = [];
        this.mode = 'BARU';
        this.existingPengunjung = null;
    }

    // METHOD BARU: Mulai dengan mode pilihan
    startKunjungan() {
        this.step = 'PILIH_MODE';
        return this.getCurrentQuestion();
    }

    // METHOD BARU: Isi data dari pengunjung yang sudah ada
    fillFromExistingPengunjung(pengunjung) {
        this.data.nama_pengunjung = pengunjung.nama;
        this.data.jenis_kelamin = pengunjung.jenis_kelamin;
        this.data.nik = pengunjung.nik;
        this.data.no_hp = pengunjung.hp;
        this.data.alamat = pengunjung.alamat;
        this.data.hubungan_keluarga = pengunjung.hubungan_keluarga;
        this.mode = 'KODE';
        this.existingPengunjung = pengunjung;
    }

    getCurrentQuestion() {
            switch (this.step) {
                case 'PILIH_MODE':
                    return `🔍 *MODE INPUT DATA*\n\nPilih mode input:\n\n1. 🔄 Gunakan kode sebelumnya\n2. ✍️ Input data baru\n\nBalas dengan *angka* pilihan (1-2)`;

                case 'INPUT_KODE':
                    return `🔢 *INPUT KODE PENDAFTARAN*\n\nSilakan masukkan kode pendaftaran Anda:\n\nContoh: A1B2C3\n\nKetik *batal* untuk kembali ke menu`;

                case 'SEARCH_WBP':
                    return `🔍 *CARI WBP YANG DIKUNJUNGI*\n\nSilakan ketik *nama atau nomor register* WBP:\n\nContoh: budi santoso\n\nKetik *batal* untuk berhenti`;

                case 'CONFIRM_WBP':
                    return `✅ *KONFIRMASI WBP*\n\nHasil pencarian:\n${this.tempWbpResults.map((wbp, index) => 
                    `${index + 1}. *${wbp.nama}*`
                ).join('\n')}\n\nBalas dengan *angka* pilihan (1-${this.tempWbpResults.length})\nKetik *cari* untuk mencari ulang`;
            
            case 'NAMA_PENGUNJUNG':
                return `👨‍💼 *DATA DIRI PENGGUNA*\n\nSilakan ketik *nama lengkap* Anda:`;
            
            case 'JENIS_KELAMIN':
                return `⚧️ *JENIS KELAMIN*\n\nPilih jenis kelamin:\n\n1. Laki-laki\n2. Perempuan\n\nBalas dengan *angka* pilihan (1-2)`;
            
            case 'NIK':
                return `🆔 *NIK*\n\nSilakan ketik *NIK* Anda:\n\nContoh: 3271234567890123`;
            
            case 'NO_HP':
                return `📞 *NOMOR HP*\n\nSilakan ketik *nomor HP* aktif:`;
            
            case 'ALAMAT':
                return `🏠 *ALAMAT*\n\nSilakan ketik *alamat lengkap*:\n\nKetik *-** untuk skip`;
            
            case 'TUJUAN':
                return `🎯 *PILIH TUJUAN KUNJUNGAN*\n\nPilih tujuan kunjungan:\n\n1. 📝 Berkunjung (1x per hari)\n2. 📦 Menitip Barang (beberapa kali)\n3. 📝📦 Berkunjung + Menitip Barang (1x per hari)\n\n⚠️ *Aturan:*\n• Berkunjung hanya boleh 1x per hari\n• Menitip barang bisa beberapa kali\n• Berkunjung+menitip barang hanya boleh 1x per hari\n\nBalas dengan *angka* pilihan (1-3)`;
            
            case 'VALIDASI_TUJUAN':
                return `⏳ *MEMVALIDASI TUJUAN*...\n\nMohon tunggu sebentar, sistem sedang memvalidasi pilihan tujuan Anda...`;
            
            case 'HUBUNGAN':
                return `👨‍👩‍👧‍👦 *HUBUNGAN KELUARGA*\n\nPilih hubungan dengan WBP:\n\n1. Orang Tua\n2. Suami/Istri\n3. Anak\n4. Saudara\n5. Lainnya\n\nBalas dengan *angka* pilihan (1-5)`;
            
            case 'PENGIKUT_LAKI':
                return `👨 *PENGIKUT LAKI-LAKI*\n\nJumlah pengikut laki-laki dewasa:\n*0* jika tidak ada`;
            
            case 'PENGIKUT_PEREMPUAN':
                return `👩 *PENGIKUT PEREMPUAN*\n\nJumlah pengikut perempuan dewasa:\n*0* jika tidak ada`;
            
            case 'PENGIKUT_ANAK':
                return `🧒 *PENGIKUT ANAK-ANAK*\n\nJumlah pengikut anak-anak (3-12 tahun):\n*0* jika tidak ada`;
            
            case 'PENGIKUT_BAYI':
                return `👶 *PENGIKUT BAYI*\n\nJumlah pengikut bayi (0-2 tahun):\n*0* jika tidak ada`;
            
            case 'KETERANGAN':
                return `📝 *KETERANGAN TAMBAHAN*\n\nSilakan ketik keterangan tambahan (opsional):\n\nKetik *-** untuk skip`;
            
            case 'TAMBAH_BARANG':
                // Hanya tampilkan opsi barang jika tujuan termasuk menitip barang
                if (this.data.tujuan_berkunjung === 'menitip barang' || this.data.tujuan_berkunjung === 'berkunjung+menitip barang') {
                    return `📦 *BARANG TITIPAN*\n\nApakah ingin menambah barang titipan?\n\n1. Ya, tambah barang\n2. Tidak, lanjut simpan\n\nBalas dengan *angka* pilihan (1-2)`;
                } else {
                    // Langsung ke konfirmasi jika tidak menitip barang
                    this.step = 'CONFIRMATION';
                    return this.getCurrentQuestion();
                }
            
            case 'BARANG_WBP_SEARCH':
                return `🔍 *CARI WBP PENERIMA BARANG*\n\nSilakan ketik nama WBP penerima barang:\n\nKetik *selesai* jika tidak ada barang`;
            
            case 'BARANG_WBP_CONFIRM':
                return `✅ *KONFIRMASI WBP PENERIMA*\n\nHasil pencarian:\n${this.tempWbpResults.map((wbp, index) => 
                    `${index + 1}. *${wbp.nama}*`
                ).join('\n')}\n\nBalas dengan *angka* pilihan (1-${this.tempWbpResults.length})`;
            
            case 'JENIS_BARANG':
                return `📦 *JENIS BARANG*\n\nSilakan ketik jenis barang:\n\nContoh: Susu, Roti, Pakaian`;
            
            case 'JUMLAH_BARANG':
                return `🔢 *JUMLAH BARANG*\n\nSilakan ketik jumlah barang:\n\nContoh: 5`;
            
            case 'KETERANGAN_BARANG':
                return `📝 *KETERANGAN BARANG*\n\nSilakan ketik keterangan (opsional):\n\nKetik *-** untuk skip`;
            
            case 'TAMBAH_BARANG_LAGI':
                return `📦 *TAMBAH BARANG LAGI?*\n\nApakah ingin menambah barang lagi?\n\n1. Ya, tambah lagi\n2. Tidak, simpan data\n\nBalas dengan *angka* pilihan (1-2)`;
            
            case 'CONFIRMATION':
                return this.getConfirmationMessage();
            
            default:
                return `❌ Session error. Ketik *menu* untuk memulai lagi.`;
        }
    }

    getConfirmationMessage() {
        const totalPengikut = this.data.tujuan_berkunjung === 'menitip barang' ? 0 :
            (parseInt(this.data.pengikut_laki) || 0) + 
            (parseInt(this.data.pengikut_perempuan) || 0) + 
            (parseInt(this.data.pengikut_anak) || 0) + 
            (parseInt(this.data.pengikut_bayi) || 0);

        let message = `✅ *KONFIRMASI DATA KUNJUNGAN*\n\n`;
        message += `📋 *Mode:* ${this.mode === 'KODE' ? 'Menggunakan kode sebelumnya' : 'Input data baru'}\n`;
        message += `🎯 *Tujuan:* ${this.data.tujuan_berkunjung}\n`;
        message += `👨‍💼 *Nama:* ${this.data.nama_pengunjung}\n`;
        message += `⚧️ *Jenis Kelamin:* ${this.data.jenis_kelamin}\n`;
        message += `🆔 *NIK:* ${this.data.nik}\n`;
        message += `📞 *No. HP:* ${this.data.no_hp}\n`;
        message += `🏠 *Alamat:* ${this.data.alamat || '-'}\n`;
        message += `👨‍👩‍👧‍👦 *Hubungan:* ${this.data.hubungan_keluarga}\n`;
        
        // Hanya tampilkan pengikut jika bukan menitip barang
        if (this.data.tujuan_berkunjung !== 'menitip barang') {
            message += `👥 *Pengikut:* Laki-laki (${this.data.pengikut_laki}), Perempuan (${this.data.pengikut_perempuan}), Anak (${this.data.pengikut_anak}), Bayi (${this.data.pengikut_bayi})\n`;
            message += `📊 *Total Pengikut:* ${totalPengikut} orang\n`;
        }
        
        message += `📝 *Keterangan:* ${this.data.keterangan || '-'}\n`;
        
        if (this.data.barang_titipan.length > 0) {
            message += `\n📦 *BARANG TITIPAN:*\n`;
            this.data.barang_titipan.forEach((barang, index) => {
                message += `${index + 1}. ${barang.jenis_barang} (${barang.jumlah}x) - ${barang.keterangan || '-'}\n`;
            });
        } else if (this.data.tujuan_berkunjung === 'menitip barang' || this.data.tujuan_berkunjung === 'berkunjung+menitip barang') {
            message += `\n📦 *Barang Titipan:* Tidak ada\n`;
        }
        
        message += `\nApakah data sudah benar?\n\n1. ✅ Ya, simpan data\n2. ❌ Tidak, ulangi dari awal\n\nBalas dengan *angka* pilihan (1-2)`;
        
        return message;
    }

    async handleResponse(response) {
        switch (this.step) {
            case 'PILIH_MODE':
                return this.handlePilihMode(response);
            
            case 'INPUT_KODE':
                return await this.handleInputKode(response);
            
            case 'SEARCH_WBP':
                return await this.handleSearchWbp(response);
            
            case 'CONFIRM_WBP':
                return this.handleConfirmWbp(response);
            
            case 'NAMA_PENGUNJUNG':
                this.data.nama_pengunjung = response;
                this.step = 'JENIS_KELAMIN';
                return { success: true };
            
            case 'JENIS_KELAMIN':
                if (response === '1') {
                    this.data.jenis_kelamin = 'laki-laki';
                } else if (response === '2') {
                    this.data.jenis_kelamin = 'perempuan';
                } else {
                    return { success: false, message: '❌ Pilih 1 atau 2:' };
                }
                this.step = 'NIK';
                return { success: true };
            
            case 'NIK':
                this.data.nik = response;
                this.step = 'NO_HP';
                return { success: true };
            
            case 'NO_HP':
                this.data.no_hp = response;
                this.step = 'ALAMAT';
                return { success: true };
            
            case 'ALAMAT':
                this.data.alamat = response === '-**' ? '' : response;
                this.step = 'TUJUAN';
                return { success: true };
            
            case 'TUJUAN':
                return await this.handleTujuan(response); // SEKARANG ASYNC
            
            case 'VALIDASI_TUJUAN':
                // Step ini hanya untuk menampilkan pesan tunggu, langsung lanjut ke hubungan
                this.step = 'HUBUNGAN';
                return { success: true };
            
            case 'HUBUNGAN':
                return this.handleHubungan(response);
            
            case 'PENGIKUT_LAKI':
                this.data.pengikut_laki = parseInt(response) || 0;
                this.step = 'PENGIKUT_PEREMPUAN';
                return { success: true };
            
            case 'PENGIKUT_PEREMPUAN':
                this.data.pengikut_perempuan = parseInt(response) || 0;
                this.step = 'PENGIKUT_ANAK';
                return { success: true };
            
            case 'PENGIKUT_ANAK':
                this.data.pengikut_anak = parseInt(response) || 0;
                this.step = 'PENGIKUT_BAYI';
                return { success: true };
            
            case 'PENGIKUT_BAYI':
                this.data.pengikut_bayi = parseInt(response) || 0;
                this.step = 'KETERANGAN';
                return { success: true };
            
            case 'KETERANGAN':
                this.data.keterangan = response === '-**' ? '' : response;
                this.step = 'TAMBAH_BARANG';
                return { success: true };
            
            case 'TAMBAH_BARANG':
                return this.handleTambahBarang(response);
            
            case 'BARANG_WBP_SEARCH':
                return await this.handleBarangWbpSearch(response);
            
            case 'BARANG_WBP_CONFIRM':
                return this.handleBarangWbpConfirm(response);
            
            case 'JENIS_BARANG':
                this.currentBarang.jenis_barang = response;
                this.step = 'JUMLAH_BARANG';
                return { success: true };
            
            case 'JUMLAH_BARANG':
                this.currentBarang.jumlah = parseInt(response) || 1;
                this.step = 'KETERANGAN_BARANG';
                return { success: true };
            
            case 'KETERANGAN_BARANG':
                this.currentBarang.keterangan = response === '-**' ? '' : response;
                this.data.barang_titipan.push({ ...this.currentBarang });
                this.step = 'TAMBAH_BARANG_LAGI';
                return { success: true };
            
            case 'TAMBAH_BARANG_LAGI':
                return this.handleTambahBarangLagi(response);
            
            case 'CONFIRMATION':
                return this.handleConfirmation(response);
            
            default:
                return { success: false, message: 'Session error' };
        }
    }

    // METHOD BARU: Handle pilih tujuan dengan validasi
    async handleTujuan(response) {
        const tujuanMap = {
            '1': 'berkunjung',
            '2': 'menitip barang',
            '3': 'berkunjung+menitip barang'
        };

        if (!tujuanMap[response]) {
            return { 
                success: false, 
                message: '❌ Pilihan tidak valid. Silakan pilih angka 1-3:' 
            };
        }

        const selectedTujuan = tujuanMap[response];
        
        // VALIDASI SEKARANG DILAKUKAN DI SINI
        if (selectedTujuan === 'berkunjung' || selectedTujuan === 'berkunjung+menitip barang') {
            // Tampilkan pesan validasi
            this.step = 'VALIDASI_TUJUAN';
            
            // Lakukan validasi
            const validation = await validateDailyKunjungan(
                this.data.nama_pengunjung,
                this.data.nik,
                selectedTujuan,
                this.data.wbp_id
            );

            if (!validation.isValid) {
                // Kembali ke step tujuan dengan pesan error
                this.step = 'TUJUAN';
                return { 
                    success: false, 
                    message: validation.message 
                };
            }
        }

        // Jika validasi berhasil atau tujuan menitip barang
        this.data.tujuan_berkunjung = selectedTujuan;
        this.step = 'HUBUNGAN';
        return { success: true };
    }

    // METHOD BARU: Handle pilih mode
    handlePilihMode(response) {
        if (response === '1') {
            this.step = 'INPUT_KODE';
            return { success: true };
        } else if (response === '2') {
            this.step = 'SEARCH_WBP';
            return { success: true };
        } else {
            return { 
                success: false, 
                message: '❌ Pilihan tidak valid. Silakan pilih 1 atau 2:' 
            };
        }
    }

    // METHOD BARU: Handle input kode
    async handleInputKode(response) {
        try {
            const pengunjung = await searchPengunjungByKode(response);
            if (!pengunjung) {
                return { 
                    success: false, 
                    message: '❌ Kode tidak ditemukan. Silakan coba lagi atau ketik *batal* untuk kembali ke menu awal.' 
                };
            }

            // Isi data dari pengunjung yang ditemukan
            this.fillFromExistingPengunjung(pengunjung);
            this.step = 'SEARCH_WBP';
            return { 
                success: true, 
                message: `✅ Data ditemukan!\n\nNama: ${pengunjung.nama}\nNIK: ${pengunjung.nik}\nNo. HP: ${pengunjung.hp}\n\nSekarang silakan cari WBP yang akan dikunjungi:` 
            };
        } catch (error) {
            console.error('Error search pengunjung by kode:', error);
            return { 
                success: false, 
                message: '❌ Error saat mencari kode. Silakan coba lagi:' 
            };
        }
    }

    async handleSearchWbp(response) {
        try {
            const results = await searchWBP(response);
            if (results.length === 0) {
                return { 
                    success: false, 
                    message: '❌ WBP tidak ditemukan. Silakan ketik nama WBP lagi:' 
                };
            }
            
            this.tempWbpResults = results;
            this.step = 'CONFIRM_WBP';
            return { success: true };
        } catch (error) {
            console.error('Error searching WBP:', error);
            return { success: false, message: '❌ Error saat mencari WBP. Coba lagi:' };
        }
    }

    handleConfirmWbp(response) {
        if (response.toLowerCase() === 'cari') {
            this.step = 'SEARCH_WBP';
            return { success: true };
        }

        const selectedIndex = parseInt(response) - 1;
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= this.tempWbpResults.length) {
            return { 
                success: false, 
                message: `❌ Pilihan tidak valid. Silakan pilih angka 1-${this.tempWbpResults.length}:` 
            };
        }

        this.data.wbp_id = this.tempWbpResults[selectedIndex].id;
        
        // Jika mode KODE, langsung ke tujuan kunjungan
        if (this.mode === 'KODE') {
            this.step = 'TUJUAN';
        } else {
            this.step = 'NAMA_PENGUNJUNG';
        }
        return { success: true };
    }

    handleHubungan(response) {
        const hubunganMap = {
            '1': 'Orang Tua',
            '2': 'Suami/Istri',
            '3': 'Anak',
            '4': 'Saudara',
            '5': 'Lainnya'
        };

        if (!hubunganMap[response]) {
            return { 
                success: false, 
                message: '❌ Pilihan tidak valid. Silakan pilih angka 1-5:' 
            };
        }

        this.data.hubungan_keluarga = hubunganMap[response];
        
        // MODIFIKASI: Skip pertanyaan pengikut jika tujuan hanya menitip barang
        if (this.data.tujuan_berkunjung === 'menitip barang') {
            this.step = 'KETERANGAN';
        } else {
            this.step = 'PENGIKUT_LAKI';
        }
        return { success: true };
    }

    handleTambahBarang(response) {
        if (response === '1') {
            this.step = 'BARANG_WBP_SEARCH';
            this.currentBarang = {};
            return { success: true };
        } else if (response === '2') {
            this.step = 'CONFIRMATION';
            return { success: true };
        } else {
            return { 
                success: false, 
                message: '❌ Pilihan tidak valid. Silakan pilih 1 atau 2:' 
            };
        }
    }

    async handleBarangWbpSearch(response) {
        if (response.toLowerCase() === 'selesai') {
            this.step = 'CONFIRMATION';
            return { success: true };
        }

        try {
            const results = await searchWBP(response);
            if (results.length === 0) {
                return { 
                    success: false, 
                    message: '❌ WBP tidak ditemukan. Silakan ketik nama WBP lagi atau ketik *selesai*:' 
                };
            }
            
            this.tempWbpResults = results;
            this.step = 'BARANG_WBP_CONFIRM';
            return { success: true };
        } catch (error) {
            console.error('Error searching WBP for barang:', error);
            return { success: false, message: '❌ Error saat mencari WBP. Coba lagi:' };
        }
    }

    handleBarangWbpConfirm(response) {
        const selectedIndex = parseInt(response) - 1;
        if (isNaN(selectedIndex) || selectedIndex < 0 || selectedIndex >= this.tempWbpResults.length) {
            return { 
                success: false, 
                message: `❌ Pilihan tidak valid. Silakan pilih angka 1-${this.tempWbpResults.length}:` 
            };
        }

        this.currentBarang.wbp_id = this.tempWbpResults[selectedIndex].id;
        this.step = 'JENIS_BARANG';
        return { success: true };
    }

    handleTambahBarangLagi(response) {
        if (response === '1') {
            this.step = 'BARANG_WBP_SEARCH';
            this.currentBarang = {};
            return { success: true };
        } else if (response === '2') {
            this.step = 'CONFIRMATION';
            return { success: true };
        } else {
            return { 
                success: false, 
                message: '❌ Pilihan tidak valid. Silakan pilih 1 atau 2:' 
            };
        }
    }

    handleConfirmation(response) {
        if (response === '1') {
            this.step = 'SAVING';
            return { success: true, save: true };
        } else if (response === '2') {
            this.reset();
            this.step = 'PILIH_MODE';
            return { success: true, restart: true };
        } else {
            return { 
                success: false, 
                message: '❌ Pilihan tidak valid. Silakan pilih 1 atau 2:' 
            };
        }
    }
}

// WhatsApp event handlers
client.on('qr', (qr) => {
    console.log('📱 SCAN QR CODE INI DENGAN WHATSAPP:');
    qrcode.generate(qr, { small: true });
});

client.on('authenticated', () => {
    console.log('✅ WhatsApp Authenticated! Session tersimpan.');
});

client.on('ready', () => {
    console.log('🤖 BOT WHATSAPP AKTIF!');
    console.log(`📞 NOMOR BOT: ${client.info.wid.user}`);
    console.log('💡 User bisa kirim pesan ke nomor ini!');
});

// Handler pesan WhatsApp (DIPERBAIKI)
client.on('message', async (message) => {
    if (message.fromMe) return;
    
    const phone = message.from;
    const text = message.body.toLowerCase().trim();

    // Welcome message untuk new user
    if (text === 'hi' || text === 'hello' || text === 'halo' || text === 'mulai') {
        const welcomeMsg = `👋 *BOT PENDATAAN KUNJUNGAN*

🤖 *BOT RESMI LAPAS*

*PERINTAH:*
• "menu" - Tampilkan menu
• "kunjungan" - Input data kunjungan  
• "sesi" - Cek sesi kunjungan saat ini
• "batal" - Batalkan input
• "status" - Cek status

*SISTEM SESI:*
🕐 Sesi Pagi: 09:00 - 11:30 (senin-jum'at)
🕐 Sesi Pagi: 09:00 - 10:30 (sabtu)
🕐 Sesi Siang: 13:30 - 14:30 (senin-kamis)
🔢 Setiap sesi memiliki nomor antrian sendiri

*ATURAN KUNJUNGAN:*
✅ *Berkunjung* - Hanya 1x per hari
✅ *Menitip Barang* - Bisa beberapa kali
✅ *Berkunjung+Menitip Barang* - Hanya 1x per hari

*FITUR BARU:*
🔄 Gunakan kode sebelumnya untuk input cepat!
⏱️ Validasi otomatis sebelum input data!

Bot ini untuk input data kunjungan dan barang titipan ke database.`;
        
        return message.reply(welcomeMsg);
    }

    // Perintah menu
    if (text === 'menu' || text === 'help') {
        const menuMsg = `📋 *MENU BOT KUNJUNGAN*

*PERINTAH:*
1. "kunjungan" - Input data kunjungan baru
2. "batal" - Batalkan input sedang berjalan  
3. "status" - Cek status session
4. "info" - Info bot

*ATURAN KUNJUNGAN:*
✅ *Berkunjung* - Hanya 1x per hari
✅ *Menitip Barang* - Bisa beberapa kali  
✅ *Berkunjung+Menitip Barang* - Hanya 1x per hari

*KEUNGGULAN:*
⏱️ Validasi otomatis di awal
🔄 Input cepat dengan kode sebelumnya
✅ Tidak perlu input data berulang

*FITUR LAIN:*
✅ Input data kunjungan
✅ Cari data WBP  
✅ Barang titipan
✅ Simpan ke database

*CARA PAKAI:*
1. Ketik "kunjungan"
2. Pilih mode input
3. Ikuti pertanyaan beruntun
4. Sistem validasi otomatis
5. Konfirmasi data
6. Data tersimpan!`;

        return message.reply(menuMsg);
    }

    // Perintah batal
    if (text === 'batal' || text === 'cancel') {
        if (userSessions.has(phone)) {
            userSessions.delete(phone);
        }
        return message.reply('❌ Input dibatalkan. Ketik "menu" untuk mulai lagi.');
    }

    // Perintah status
    if (text === 'status') {
        const session = userSessions.get(phone);
        if (session) {
            return message.reply(`📊 Status: Sedang input data (Step: ${session.step})\nMode: ${session.mode}\nKetik "batal" untuk stop`);
        } else {
            return message.reply('📊 Status: Siap menerima input\nKetik "kunjungan" untuk mulai');
        }
    }

    // Perintah info
    if (text === 'info') {
        return message.reply(`🤖 *BOT KUNJUNGAN LAPAS*

*Nomor:* ${client.info.wid.user}
*Status:* ✅ Online
*Version:* 2.0

*Aturan Kunjungan:*
• Berkunjung: 1x per hari
• Menitip Barang: Beberapa kali  
• Berkunjung+Menitip Barang: 1x per hari

*Keunggulan:*
• Validasi otomatis di awal
• Input cepat dengan kode
• Tidak perlu input berulang

*Fitur Lain:*
• Input data kunjungan
• Pencarian WBP
• Barang titipan
• Simpan ke database

*Support:* IT Lapas`);
    }

    // Mulai kunjungan
    if (text === 'kunjungan') {
        let session = userSessions.get(phone);
        if (session && session.step !== 'IDLE') {
            return message.reply('⚠️ Anda memiliki session aktif. Ketik "batal" dulu.');
        }

        session = new WhatsAppSession(phone);
        userSessions.set(phone, session);
        
        const welcomeMsg = `🤖 *SISTEM KUNJUNGAN LAPAS*

Selamat datang! Saya akan memandu Anda mengisi data kunjungan.

*ATURAN BARU:*
✅ *Berkunjung* - Hanya 1x per hari
✅ *Menitip Barang* - Bisa beberapa kali
✅ *Berkunjung+Menitip Barang* - Hanya 1x per hari

*KEUNGGULAN:*
⏱️ Validasi otomatis sebelum input data
🔄 Gunakan kode sebelumnya untuk input cepat!

${session.startKunjungan()}`;
        
        return message.reply(welcomeMsg);
    }

    // Handle session beruntun (DIPERBAIKI)
    const session = userSessions.get(phone);
    if (session && session.step !== 'IDLE') {
        // Handle cancel dalam session
        if (text === 'batal') {
            userSessions.delete(phone);
            return message.reply('❌ Input dibatalkan. Ketik "menu" untuk mulai lagi.');
        }

        try {
            let result = await session.handleResponse(message.body);
            
            // Handle pesan khusus untuk mode KODE
            if (result.message) {
                await message.reply(result.message);
                if (result.success) {
                    const nextQuestion = session.getCurrentQuestion();
                    return message.reply(nextQuestion);
                } else {
                    return; // Tetap di step yang sama dengan pesan error
                }
            }
            
            if (result.success) {
                // Dalam handler message, bagian result.save
                if (result.save) {
                    try {
                        // TIDAK PERLU VALIDASI LAGI KARENA SUDAH DILAKUKAN DI AWAL
                        const savedData = await saveKunjunganToDB(session.data, session.existingPengunjung);
                        
                        const totalPengikut = session.data.tujuan_berkunjung === 'menitip barang' ? 0 :
                            (parseInt(session.data.pengikut_laki) || 0) + 
                            (parseInt(session.data.pengikut_perempuan) || 0) + 
                            (parseInt(session.data.pengikut_anak) || 0) + 
                            (parseInt(session.data.pengikut_bayi) || 0);

                        const sessionInfo = getCurrentSessionInfo();
                        
                        const successMsg = `✅ *DATA BERHASIL DISIMPAN KE DATABASE!*

📋 *No. Registrasi:* ${savedData.kode}
🔢 *No. Antrian:* ${savedData.antrian}
🕐 *Sesi Kunjungan:* ${sessionInfo.sesi} (${sessionInfo.waktu})
📅 *Tanggal:* ${sessionInfo.tanggal}
⏰ *Jam Input:* ${sessionInfo.jamSekarang}

👨‍💼 *Nama Pengunjung:* ${session.data.nama_pengunjung}
📞 *No. HP:* ${session.data.no_hp}
🎯 *Tujuan:* ${session.data.tujuan_berkunjung}
${session.data.tujuan_berkunjung !== 'menitip barang' ? `👥 *Total Pengikut:* ${totalPengikut} orang\n` : ''}📦 *Barang Titipan:* ${session.data.barang_titipan.length} item
🔢 *Mode Input:* ${session.mode === 'KODE' ? 'Menggunakan kode sebelumnya' : 'Input data baru'}

*Status:* ✅ Tersimpan di Sistem

${session.mode === 'KODE' ? `*KODE ANDA TETAP SAMA:* *${savedData.kode}*` : `*SIMPAN KODE INI:* *${savedData.kode}*`}
${session.mode === 'KODE' ? 'Kode Anda tetap sama karena menggunakan data sebelumnya!' : 'Gunakan kode ini untuk kunjungan berikutnya!'}

📱 *Barcode/QR Code:* ${savedData.barcode ? `Tersimpan di sistem dengan link : ${savedData.barcode}  ` : 'Tidak tersedia'}

*INFORMASI SESI:*
- Sesi ${sessionInfo.sesi}: ${sessionInfo.waktu}
- Nomor antrian sudah termasuk dalam sistem sesi
- Pastikan datang sesuai jadwal kunjungan

Terima kasih! Data kunjungan Anda sudah berhasil disimpan.`;
                        
                        userSessions.delete(phone);
                        return message.reply(successMsg);
                        
                    } catch (error) {
                        console.error('Save error:', error);
                        userSessions.delete(phone);
                        return message.reply('❌ Gagal menyimpan data. Silakan coba lagi dengan "menu".');
                    }
                }
                
                if (result.restart) {
                    const restartMsg = `🔄 *MENGULANGI INPUT DATA*

${session.getCurrentQuestion()}`;
                    return message.reply(restartMsg);
                }
                
                const nextQuestion = session.getCurrentQuestion();
                return message.reply(nextQuestion);
            } else {
                return message.reply(result.message);
            }
        } catch (error) {
            console.error('Session error:', error);
            userSessions.delete(phone);
            return message.reply('❌ Terjadi error. Ketik "menu" untuk mulai lagi.');
        }
    }
});

// Fungsi untuk initialize bot
function initializeWhatsAppBot() {
    client.initialize();
    return client;
}

// Export untuk digunakan di file lain
module.exports = {
    initializeWhatsAppBot,
    client,
    userSessions,
    searchPengunjungByKode,
    generateQRCode,
    generateAntrian,
    validateDailyKunjungan
};