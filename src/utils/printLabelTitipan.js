const fs = require("fs");
const path = require("path");
const { print } = require("pdf-to-printer");
const PDFDocument = require("pdfkit");

async function printLabelTitipan({
    jenis_barang,
    jumlah,
    keterangan,
    pengunjung
}) {
    try {
        // Validasi data
        if (!jenis_barang || !jumlah || !pengunjung) {
            throw new Error("Data label titipan tidak lengkap!");
        }

        // Setup paths
        const tempDir = path.join(__dirname, "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempFilePath = path.join(tempDir, `label-titipan-${Date.now()}.pdf`);

        // Create PDF Document untuk thermal 80mm
        const doc = new PDFDocument({
            size: [226.77, 226.77],
            margins: { top: 0, left: 5, right: 5, bottom: 0 }, // Margin top dihapus
            layout: 'portrait'
        });

        const stream = fs.createWriteStream(tempFilePath);
        doc.pipe(stream);

        let currentY = 0; // Mulai dari paling atas

        // ===== HEADER DENGAN BACKGROUND =====
        // Background header
        doc.rect(0, currentY, 226.77, 18)
            .fill('#000000');

        currentY += 4;
        doc.font("Helvetica-Bold")
            .fontSize(12)
            .fillColor('#FFFFFF')
            .text(`TITIPAN ${jenis_barang.toUpperCase()}`, 5, currentY, {
                align: "center",
                width: 216.77
            });

        // ===== BORDER UTAMA =====
        currentY += 18;
        doc.rect(3, currentY, 220.77, 190) // Tinggi border ditambah
            .strokeColor('#000000')
            .lineWidth(1)
            .stroke();

        // ===== DATA WBP =====
        currentY += 8;
        doc.font("Helvetica-Bold")
            .fontSize(12)
            .fillColor('#000000')
            .text("DATA WBP:", 8, currentY);

        currentY += 12;
        doc.font("Helvetica")
            .fontSize(10)
            .text(`Nama WBP: ${pengunjung.warga_binaan?.nama || 'Tidak tersedia'}`, 8, currentY);

        currentY += 10;
        doc.font("Helvetica")
            .fontSize(10)
            .text(`Status WBP: ${pengunjung.warga_binaan?.status || 'Tidak tersedia'}`, 8, currentY);

        currentY += 10;

        // Handle alamat WBP dengan fixed height
        const alamatWbp = `Alamat WBP: ${pengunjung.warga_binaan?.alamat || 'Tidak tersedia'}`;
        const alamatWbpHeight = doc.heightOfString(alamatWbp, {
            width: 200,
            align: 'left'
        });

        doc.font("Helvetica")
            .fontSize(10)
            .text(alamatWbp, 8, currentY, {
                width: 200,
                align: 'left'
            });

        currentY += alamatWbpHeight + 8;

        // ===== GARIS PEMISAH =====
        doc.moveTo(8, currentY)
            .lineTo(218.77, currentY)
            .lineWidth(0.8)
            .strokeColor('#000000')
            .stroke();

        // ===== DATA PENGIRIM =====
        currentY += 10;
        doc.font("Helvetica-Bold")
            .fontSize(12)
            .text("DATA PENGIRIM:", 8, currentY);

        currentY += 12;
        doc.font("Helvetica")
            .fontSize(10)
            .text(`Nama Pengirim: ${pengunjung.nama}`, 8, currentY);

        currentY += 10;

        // Handle alamat pengirim dengan fixed height
        const alamatPengirim = `Alamat: ${pengunjung.alamat || 'Tidak tersedia'}`;
        const alamatPengirimHeight = doc.heightOfString(alamatPengirim, {
            width: 200,
            align: 'left'
        });

        doc.font("Helvetica")
            .fontSize(10)
            .text(alamatPengirim, 8, currentY, {
                width: 200,
                align: 'left'
            });

        currentY += alamatPengirimHeight + 10;

        // ===== GARIS PEMISAH =====
        doc.moveTo(8, currentY)
            .lineTo(218.77, currentY)
            .lineWidth(0.8)
            .strokeColor('#000000')
            .stroke();

        // ===== DATA BARANG =====
        currentY += 10;
        doc.font("Helvetica-Bold")
            .fontSize(14)
            .text("DATA BARANG TITIPAN", 5, currentY, {
                align: "center",
                width: 216.77
            });

        currentY += 15;
        doc.font("Helvetica-Bold")
            .fontSize(12)
            .text(`Jenis Barang: ${jenis_barang}`, 8, currentY);

        currentY += 14;
        doc.font("Helvetica-Bold")
            .fontSize(12)
            .text(`Jumlah: ${jumlah}`, 8, currentY);

        // ===== KETERANGAN =====
        if (keterangan) {
            currentY += 16;

            // Handle keterangan dengan fixed height
            const keteranganText = `Keterangan: ${keterangan}`;
            const keteranganHeight = doc.heightOfString(keteranganText, {
                width: 200,
                align: 'left'
            });

            doc.font("Helvetica-Oblique")
                .fontSize(8)
                .text(keteranganText, 8, currentY, {
                    width: 200,
                    align: 'left'
                });

            currentY += keteranganHeight + 8;
        }

        // ===== FOOTER =====
        currentY += 12;
        doc.moveTo(5, currentY)
            .lineTo(221.77, currentY)
            .lineWidth(0.8)
            .strokeColor('#000000')
            .stroke();

        currentY += 6;
        doc.font("Helvetica-Bold")
            .fontSize(7)
            .text("• BARANG TITIPAN HARAP DIAMBIL MAX 1 x 12 JAM •", 5, currentY, {
                align: "center",
                width: 216.77
            });

        currentY += 8;
        const now = new Date();
        const printTime = now.toLocaleString('id-ID');
        doc.font("Helvetica-Oblique")
            .fontSize(6)
            .text(`Dicetak: ${printTime}`, 5, currentY, {
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

        console.log("✅ Label titipan berhasil dicetak!");

        // Hapus file sementara
        setTimeout(() => {
            if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
        }, 2000);

    } catch (err) {
        console.error("❌ Gagal mencetak label titipan:", err.message);
        // Jangan throw error agar tidak mengganggu proses create
    }
}

module.exports = { printLabelTitipan };