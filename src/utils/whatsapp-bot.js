const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal'); // Tambahkan ini
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
const P = require('pino');

// State management untuk setiap user
const userSessions = new Map();

let client = null;
let isConnected = false;

// [SEMUA FUNGSI HELPER DAN WhatsAppSession CLASS TETAP SAMA SEPERTI SEBELUMNYA]
// FUNGSI HELPER (tetap sama seperti sebelumnya)
// const isWithinOperatingHours = () => {
//     try {
//         const timeZone = 'Asia/Makassar';
//         const now = new Date();
//         const zonedDate = toZonedTime(now, timeZone);

//         const day = zonedDate.getDay();
//         const hour = parseInt(format(zonedDate, 'HH', { timeZone: timeZone }), 10);
//         const minute = parseInt(format(zonedDate, 'mm', { timeZone: timeZone }), 10);
//         const currentTime = hour * 60 + minute;

//         let maxTime;
//         if (day >= 1 && day <= 4) {
//             maxTime = 14 * 60 + 30;
//         } else if (day === 5) {
//             maxTime = 11 * 60 + 30;
//         } else if (day === 6) {
//             maxTime = 10 * 60 + 30;
//         } else {
//             return {
//                 isValid: false,
//                 message: '❌ *PENDAFTARAN DITUTUP*\n\nHari Minggu tidak ada layanan pendaftaran kunjungan.\n\nSilakan kembali pada hari Senin - Sabtu.'
//             };
//         }

//         if (currentTime > maxTime) {
//             const timeString = `${Math.floor(maxTime/60).toString().padStart(2, '0')}:${(maxTime%60).toString().padStart(2, '0')}`;
//             const dayNames = {
//                 1: 'Senin-Kamis',
//                 2: 'Senin-Kamis',
//                 3: 'Senin-Kamis',
//                 4: 'Senin-Kamis',
//                 5: 'Jumat',
//                 6: 'Sabtu'
//             };

//             return {
//                 isValid: false,
//                 message: `❌ *PENDAFTARAN DITUTUP*\n\nPendaftaran kunjungan hari ini sudah ditutup.\n\n🕐 *Batas Pendaftaran:*\n${dayNames[day]}: ${timeString}\n\nSilakan kembali besok pada jam yang ditentukan.`
//             };
//         }

//         return { isValid: true };
//     } catch (error) {
//         console.error('Error validasi waktu:', error);
//         return {
//             isValid: false,
//             message: '❌ Error saat validasi waktu. Silakan coba lagi.'
//         };
//     }
// };

const generateVerificationCode = () => crypto.randomBytes(3).toString("hex").toUpperCase();

const validateDailyKunjungan = async(nama, nik, tujuan, wbp_id) => {
    try {
        if (tujuan === 'menitip barang') {
            return { isValid: true };
        }

        const timeZone = 'Asia/Makassar';
        const now = new Date();
        const zonedDate = toZonedTime(now, timeZone);

        const startOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T00:00:00+08:00');
        const endOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T23:59:59.999+08:00');

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

        const cloudinaryUploadResult = await cloudinary.uploader.upload(qrCodePath, {
            folder: 'qrcodes'
        });

        const qrCodeUrl = cloudinaryUploadResult.secure_url;
        fs.unlinkSync(qrCodePath);

        return qrCodeUrl;
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
};

const generateAntrian = async() => {
    try {
        const timeZone = 'Asia/Makassar';
        const now = new Date();
        const zonedDate = toZonedTime(now, timeZone);
        const dateString = format(zonedDate, 'yyyyMMdd');

        const hour = parseInt(format(zonedDate, 'HH', { timeZone: timeZone }), 10);
        const isSesiPagi = hour >= 0 && hour < 12;
        const sesiPrefix = isSesiPagi ? '' : 'A';

        const startOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T00:00:00+08:00');
        const endOfDay = new Date(format(zonedDate, 'yyyy-MM-dd') + 'T23:59:59.999+08:00');

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
                const pureNumber = numberPart.replace('A', '');
                lastNumber = parseInt(pureNumber, 10);
            }
        }

        const newAntrianNumber = lastNumber + 1;
        const newAntrian = `${dateString}-${sesiPrefix}${newAntrianNumber.toString().padStart(3, '0')}`;

        return newAntrian;
    } catch (error) {
        console.error('Error generating antrian:', error);
        throw error;
    }
};

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

async function saveKunjunganToDB(data, existingPengunjung = null) {
    const transaction = await sequelize.transaction();

    try {
        // const timeValidation = isWithinOperatingHours();
        // if (!timeValidation.isValid) {
        //     throw new Error(timeValidation.message);
        // }

        let kodePengunjung;
        let barcodeUrl = null;

        if (existingPengunjung) {
            kodePengunjung = existingPengunjung.kode;
            barcodeUrl = existingPengunjung.barcode;
        } else {
            kodePengunjung = generateVerificationCode();
            barcodeUrl = await generateQRCode(kodePengunjung);
        }

        const antrian = await generateAntrian();
        const sessionInfo = getCurrentSessionInfo();

        const total_pengikut = data.tujuan_berkunjung === 'menitip barang' ? 0 :
            (parseInt(data.pengikut_laki) || 0) +
            (parseInt(data.pengikut_perempuan) || 0) +
            (parseInt(data.pengikut_anak) || 0) +
            (parseInt(data.pengikut_bayi) || 0);

        const pengunjungData = {
            user_id: 1,
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

        const newPengunjung = await PengunjungModel.create(pengunjungData, { transaction });

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

// [WhatsAppSession class TETAP SAMA seperti sebelumnya - copy semua method dari class sebelumnya]

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

    startKunjungan() {
        this.step = 'PILIH_MODE';
        return this.getCurrentQuestion();
    }

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
            if (this.data.tujuan_berkunjung === 'menitip barang' || this.data.tujuan_berkunjung === 'berkunjung+menitip barang') {
                return `📦 *BARANG TITIPAN*\n\nApakah ingin menambah barang titipan?\n\n1. Ya, tambah barang\n2. Tidak, lanjut simpan\n\nBalas dengan *angka* pilihan (1-2)`;
            } else {
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
                return await this.handleTujuan(response);
            
            case 'VALIDASI_TUJUAN':
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
        
        if (selectedTujuan === 'berkunjung' || selectedTujuan === 'berkunjung+menitip barang') {
            this.step = 'VALIDASI_TUJUAN';
            
            const validation = await validateDailyKunjungan(
                this.data.nama_pengunjung,
                this.data.nik,
                selectedTujuan,
                this.data.wbp_id
            );

            if (!validation.isValid) {
                this.step = 'TUJUAN';
                return { 
                    success: false, 
                    message: validation.message 
                };
            }
        }

        this.data.tujuan_berkunjung = selectedTujuan;
        this.step = 'HUBUNGAN';
        return { success: true };
    }

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

    async handleInputKode(response) {
        try {
            const pengunjung = await searchPengunjungByKode(response);
            if (!pengunjung) {
                return { 
                    success: false, 
                    message: '❌ Kode tidak ditemukan. Silakan coba lagi atau ketik *batal* untuk kembali ke menu awal.' 
                };
            }

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

// FUNGSI INITIALIZE BAILEY'S YANG DIPERBAIKI
async function initializeWhatsAppBot() {
    console.log('🚀 Memulai WhatsApp Bot dengan Bailey...');
    
    try {
        // Setup auth state
        const { state, saveCreds } = await useMultiFileAuthState('baileys_auth_info');
        
        // Fetch latest version
        const { version, isLatest } = await fetchLatestBaileysVersion();
        console.log(`Using WA v${version.join('.')}, isLatest: ${isLatest}`);
        
        // Buat socket client - HAPUS printQRInTerminal
        client = makeWASocket({
            version,
            logger: P({ level: 'silent' }),
            // HAPUS: printQRInTerminal: true,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, P({ level: 'fatal' })),
            },
            generateHighQualityLinkPreview: true,
            markOnlineOnConnect: false,
        });
        
        // Simpan credentials ketika update
        client.ev.on('creds.update', saveCreds);
        
        // Handle connection update dengan QR code handling manual
        client.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            // Handle QR code secara manual
            if (qr) {
                console.log('📱 SCAN QR CODE INI DENGAN WHATSAPP:');
                qrcode.generate(qr, { small: true });
                
                // Juga simpan QR code ke file sebagai backup
                const qrPath = path.join(__dirname, '..', 'baileys_qr.png');
                QRCode.toFile(qrPath, qr, (err) => {
                    if (err) console.error('Gagal menyimpan QR code:', err);
                    else console.log(`QR code juga disimpan di: ${qrPath}`);
                });
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Connection closed due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect);
                
                if (shouldReconnect) {
                    console.log('🔄 Menghubungkan ulang...');
                    setTimeout(() => initializeWhatsAppBot(), 5000);
                }
            } else if (connection === 'open') {
                console.log('✅ WhatsApp terhubung!');
                isConnected = true;
                console.log('🤖 BOT WHATSAPP AKTIF!');
            }
        });

        // Handle incoming messages
        client.ev.on('messages.upsert', async (m) => {
            const message = m.messages[0];
            
            // Skip jika bukan message atau dari broadcast
            if (message.key.remoteJid === 'status@broadcast') return;
            
            // Skip jika message dari bot sendiri
            if (message.key.fromMe) return;
            
            const phone = message.key.remoteJid;
            const text = message.message?.conversation || 
                        message.message?.extendedTextMessage?.text || 
                        message.message?.imageMessage?.caption || '';
            
            console.log(`📨 Pesan dari ${phone}: ${text}`);
            
            await handleIncomingMessage(message, phone, text.toLowerCase());
        });

        return client;
        
    } catch (error) {
        console.error('❌ Gagal menginisialisasi Bailey:', error);
        throw error;
    }
}

// Handler pesan untuk Bailey's
async function handleIncomingMessage(message, phone, text) {
    try {
        // Welcome message
        if (text === 'hi' || text === 'hello' || text === 'halo' || text === 'mulai' || text === 'menu') {
            const welcomeMsg = `👋 *BOT PENDATAAN KUNJUNGAN RUTAN BANTAENG*

*PERINTAH:*
• "kunjungan" - Input data kunjungan baru
• "batal" - Batalkan input
• "status" - Cek status
• "info" - Info bot

*JAM OPERASIONAL:*
🕐 Senin-Kamis: 09:00 - 14:30
🕐 Jumat: 09:00 - 11:30  
🕐 Sabtu: 09:00 - 10:30
❌ Minggu: Tutup

Ketik "kunjungan" untuk memulai!`;
            
            await sendMessage(phone, welcomeMsg);
            return;
        }

        // Perintah batal
        if (text === 'batal' || text === 'cancel') {
            if (userSessions.has(phone)) {
                userSessions.delete(phone);
            }
            await sendMessage(phone, '❌ Input dibatalkan. Ketik "menu" untuk mulai lagi.');
            return;
        }

        // Perintah status
        if (text === 'status') {
            const session = userSessions.get(phone);
            if (session) {
                await sendMessage(phone, `📊 Status: Sedang input data (Step: ${session.step})\nKetik "batal" untuk stop`);
            } else {
                await sendMessage(phone, '📊 Status: Siap menerima input\nKetik "kunjungan" untuk mulai');
            }
            return;
        }

        // Perintah info
        if (text === 'info') {
            const infoMsg = `🤖 *BOT KUNJUNGAN RUTAN BANTAENG*\n\n*Version:* 2.0 (Bailey)\n*Status:* ${isConnected ? '✅ Online' : '❌ Offline'}\n\nSupport: IT Rutan Bantaeng`;
            await sendMessage(phone, infoMsg);
            return;
        }

        // Mulai kunjungan
        if (text === 'kunjungan') {
            // Validasi waktu
            // const timeValidation = isWithinOperatingHours();
            // if (!timeValidation.isValid) {
            //     await sendMessage(phone, timeValidation.message);
            //     return;
            // }

            let session = userSessions.get(phone);
            if (session && session.step !== 'IDLE') {
                await sendMessage(phone, '⚠️ Anda memiliki session aktif. Ketik "batal" dulu.');
                return;
            }

            session = new WhatsAppSession(phone);
            userSessions.set(phone, session);
            
            const welcomeMsg = `🤖 *SISTEM KUNJUNGAN RUTAN BANTAENG*

Selamat datang! Saya akan memandu Anda mengisi data kunjungan.

${session.startKunjungan()}`;
            
            await sendMessage(phone, welcomeMsg);
            return;
        }

        // Handle session beruntun
        const session = userSessions.get(phone);
        if (session && session.step !== 'IDLE') {
            // Handle cancel dalam session
            if (text === 'batal') {
                userSessions.delete(phone);
                await sendMessage(phone, '❌ Input dibatalkan. Ketik "menu" untuk mulai lagi.');
                return;
            }

            try {
                let result = await session.handleResponse(text);
                
                // Handle pesan khusus
                if (result.message) {
                    await sendMessage(phone, result.message);
                    if (result.success) {
                        const nextQuestion = session.getCurrentQuestion();
                        await sendMessage(phone, nextQuestion);
                    }
                    return;
                }
                
                if (result.success) {
                    if (result.save) {
                        try {
                            const savedData = await saveKunjunganToDB(session.data, session.existingPengunjung);
                            
                            const totalPengikut = session.data.tujuan_berkunjung === 'menitip barang' ? 0 :
                                (parseInt(session.data.pengikut_laki) || 0) + 
                                (parseInt(session.data.pengikut_perempuan) || 0) + 
                                (parseInt(session.data.pengikut_anak) || 0) + 
                                (parseInt(session.data.pengikut_bayi) || 0);

                            const sessionInfo = getCurrentSessionInfo();
                            
//                             const successMsg = `✅ *DATA BERHASIL DISIMPAN!*

// 📋 *No. Registrasi:* ${savedData.kode}
// 🔢 *No. Antrian:* ${savedData.antrian}
// 🕐 *Sesi:* ${sessionInfo.sesi} (${sessionInfo.waktu})
// 📅 *Tanggal:* ${sessionInfo.tanggal}

// 👨‍💼 *Nama:* ${session.data.nama_pengunjung}
// 🎯 *Tujuan:* ${session.data.tujuan_berkunjung}
// ${session.data.tujuan_berkunjung !== 'menitip barang' ? `👥 *Total Pengikut:* ${totalPengikut} orang\n` : ''}

// *SIMPAN KODE INI:* *${savedData.kode}*

// Terima kasih! Data sudah tersimpan di sistem.`;
                            
//                             userSessions.delete(phone);
//                             await sendMessage(phone, successMsg);
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
                        await sendMessage(phone, successMsg);
                            
                        } catch (error) {
                            console.error('Save error:', error);
                            userSessions.delete(phone);
                            
                            if (error.message.includes('PENDAFTARAN DITUTUP')) {
                                await sendMessage(phone, error.message);
                            } else {
                                await sendMessage(phone, '❌ Gagal menyimpan data. Silakan coba lagi dengan "menu".');
                            }
                        }
                        return;
                    }
                    
                    if (result.restart) {
                        const restartMsg = `🔄 *MENGULANGI INPUT DATA*

${session.getCurrentQuestion()}`;
                        await sendMessage(phone, restartMsg);
                        return;
                    }
                    
                    const nextQuestion = session.getCurrentQuestion();
                    await sendMessage(phone, nextQuestion);
                } else {
                    await sendMessage(phone, result.message);
                }
            } catch (error) {
                console.error('Session error:', error);
                userSessions.delete(phone);
                await sendMessage(phone, '❌ Terjadi error. Ketik "menu" untuk mulai lagi.');
            }
        }
    } catch (error) {
        console.error('Error handling message:', error);
    }
}

// Fungsi untuk mengirim pesan dengan Bailey's
async function sendMessage(phone, text) {
    if (!client || !isConnected) {
        console.error('❌ Client tidak terhubung');
        return;
    }
    
    try {
        await client.sendMessage(phone, { text: text });
    } catch (error) {
        console.error('❌ Gagal mengirim pesan:', error);
    }
}

// Cleanup handlers
process.on('SIGINT', async() => {
    console.log('🔄 Menutup bot...');
    process.exit(0);
});

process.on('SIGTERM', async() => {
    console.log('🔄 Menutup bot...');
    process.exit(0);
});

// Export
module.exports = {
    initializeWhatsAppBot,
    searchPengunjungByKode,
    generateQRCode,
    generateAntrian,
    validateDailyKunjungan,
    // isWithinOperatingHours
};