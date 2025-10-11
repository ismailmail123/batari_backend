// const fs = require("fs");
// const path = require("path");
// const { print } = require("pdf-to-printer");
// const PDFDocument = require("pdfkit");

// // Fungsi untuk membuat file PDF sementara dan langsung cetak
// async function printTicket(pengunjung) {
//     try {
//         const tempFilePath = path.join(__dirname, `antrian-${kode}.pdf`);

//         // Buat PDF sederhana untuk struk antrian
//         const doc = new PDFDocument({ margin: 20, size: [226.77, 600] }); // 80mm = 226.77 pt
//         const stream = fs.createWriteStream(tempFilePath);
//         doc.pipe(stream);

//         doc.fontSize(14).text("BATARI SYSTEM", { align: "center" });
//         doc.moveDown();
//         doc.fontSize(12).text("NOMOR ANTRIAN", { align: "center" });
//         doc.moveDown();
//         doc.fontSize(24).text(antrian, { align: "center" });
//         doc.moveDown();
//         doc.fontSize(10).text(`Nama: ${nama}`, { align: "center" });
//         doc.text(`Kode: ${kode}`, { align: "center" });
//         doc.moveDown();
//         doc.text("Terima kasih telah berkunjung 🙏", { align: "center" });

//         doc.end();

//         await new Promise((resolve) => stream.on("finish", resolve));

//         // Cetak langsung ke printer thermal (ganti nama printer sesuai daftar kamu)
//         await print(tempFilePath, {
//             printer: "POS-80", // ganti sesuai nama printer kamu di Windows
//             scale: "noscale",
//             monochrome: true,
//         });

//         console.log("✅ Tiket berhasil dicetak!");

//         // Hapus file sementara
//         fs.unlink(tempFilePath, (err) => {
//             if (err) console.warn("Gagal hapus file temp:", err);
//         });
//     } catch (err) {
//         console.error("⚠️ Gagal mencetak tiket:", err);
//     }
// }

// module.exports = { printTicket };



const fs = require("fs");
const path = require("path");
const { print } = require("pdf-to-printer");
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");

async function printTicket({ antrian, nama, barcode, kode, tanggal }) {
    try {
        // Validasi data
        if (!antrian || !kode || !nama || !barcode || !tanggal) {
            throw new Error("Data pengunjung tidak lengkap!");
        }

        // Ambil 3 digit terakhir dari nomor antrian
        const nomorAntrian = String(antrian).slice(-3).padStart(3, '0');

        // Setup paths
        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempFilePath = path.join(tempDir, `antrian-${kode}.pdf`);
        const qrPath = path.join(tempDir, `qr-${kode}.png`);

        // Generate QR Code
        await QRCode.toFile(qrPath, String(kode), {
            width: 70, // Diperbesar sedikit
            margin: 0,
            color: { dark: "#000000", light: "#FFFFFF" },
            errorCorrectionLevel: 'H'
        });

        // Create PDF Document untuk thermal 80mm
        const doc = new PDFDocument({
            size: [226.77, 226.77],
            margins: { top: 0, left: 5, right: 5, bottom: 0 }, // Margin top dikurangi
            layout: 'portrait'
        });

        const stream = fs.createWriteStream(tempFilePath);
        doc.pipe(stream);

        // ===== HEADER - Start dari Y yang lebih kecil =====
        let currentY = 2; // Mulai dari posisi yang lebih rapat

        doc.font("Helvetica-Bold")
            .fontSize(10) // Diperbesar dari 8
            .text("SISTEM KUNJUNGAN DIGITAL", 5, currentY, {
                align: "center",
                width: 216.77
            });

        currentY += 10; // Jarak dikurangi
        doc.font("Helvetica-Bold")
            .fontSize(9) // Diperbesar dari 7
            .text("RUTAN KELAS IIB BANTAENG", 5, currentY, {
                align: "center",
                width: 216.77
            });

        // Garis pemisah tipis
        currentY += 9; // Jarak dikurangi
        doc.moveTo(5, currentY)
            .lineTo(221.77, currentY)
            .lineWidth(0.5) // Garis sedikit lebih tebal
            .strokeColor('#000000')
            .stroke();

        // ===== NOMOR ANTRIAN =====
        currentY += 6; // Jarak dikurangi
        doc.font("Helvetica-Bold")
            .fontSize(10) // Diperbesar dari 8
            .text("NOMOR ANTRIAN", 5, currentY, {
                align: "center",
                width: 216.77,
                marginBottom: 2
            });

        // Nomor antrian besar
        currentY += 10; // Jarak dikurangi
        doc.font("Helvetica-Bold")
            .fontSize(38) // Diperbesar dari 32
            .text(`A-${nomorAntrian}`, 5, currentY, {
                align: "center",
                width: 216.77
            });

        // ===== QR CODE =====
        currentY += 40; // Jarak dikurangi
        doc.image(qrPath, (226.77 - 70) / 2, currentY, { // QR code diperbesar
            width: 70,
            height: 70
        });

        // ===== INFORMASI DETAIL =====
        currentY += 75; // Jarak disesuaikan

        doc.font("Helvetica-Bold")
            .fontSize(9) // Diperbesar dari 7
            .text(`KODE: ${kode}`, 5, currentY, {
                align: "center",
                width: 216.77,
                marginBottom: 2
            });

        currentY += 9; // Jarak dikurangi
        doc.font("Helvetica")
            .fontSize(8) // Diperbesar dari 6
            .text(`NAMA: ${nama.toUpperCase()}`, 5, currentY, {
                align: "center",
                width: 216.77
            });

        currentY += 8; // Jarak dikurangi
        doc.font("Helvetica")
            .fontSize(8) // Diperbesar dari 6
            .text(`TANGGAL: ${tanggal}`, 5, currentY, {
                align: "center",
                width: 216.77
            });

        // ===== FOOTER =====
        currentY += 10; // Jarak dikurangi
        doc.moveTo(5, currentY)
            .lineTo(221.77, currentY)
            .lineWidth(0.5) // Garis sedikit lebih tebal
            .strokeColor('#000000')
            .stroke();

        currentY += 5; // Jarak dikurangi
        doc.font("Helvetica-Bold")
            .fontSize(7) // Diperbesar dari 5
            .text("• HARAP SIMPAN TIKET INI •", 5, currentY, {
                align: "center",
                width: 216.77
            });

        currentY += 7; // Jarak dikurangi
        doc.font("Helvetica")
            .fontSize(6) // Diperbesar dari 5
            .text("Tunggu hingga nomor antrian dipanggil", 5, currentY, {
                align: "center",
                width: 216.77
            });

        currentY += 6; // Jarak dikurangi
        doc.font("Helvetica-Oblique")
            .fontSize(5) // Diperbesar dari 4
            .text("Terima kasih atas kunjungan Anda", 5, currentY, {
                align: "center",
                width: 216.77
            });

        doc.end();

        // Tunggu hingga PDF selesai dibuat
        await new Promise((resolve, reject) => {
            stream.on('finish', resolve);
            stream.on('error', reject);
        });

        // Print ke printer thermal
        await print(tempFilePath, {
            printer: "POS-80",
            scale: "fit",
            paperSize: "80mm",
            monochrome: true
        });

        console.log("✅ Tiket berhasil dicetak!");

        // Hapus file sementara
        setTimeout(() => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
            if (fs.existsSync(qrPath)) fs.unlinkSync(qrPath);
        }, 2000);

    } catch (err) {
        console.error("❌ Gagal mencetak tiket:", err.message);
        throw err;
    }
}

module.exports = { printTicket };