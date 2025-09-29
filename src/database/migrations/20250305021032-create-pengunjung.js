'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('pengunjungs', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            user_id: {
                type: Sequelize.INTEGER
            },
            wbp_id: {
                type: Sequelize.INTEGER
            },
            nama: {
                type: Sequelize.STRING
            },
            jenis_kelamin: {
                type: Sequelize.ENUM("laki-laki", "perempuan")
            },
            nik: {
                type: Sequelize.STRING
            },
            alamat: {
                type: Sequelize.STRING
            },
            hp: {
                type: Sequelize.STRING
            },
            hubungan_keluarga: {
                type: Sequelize.STRING
            },
            tujuan: {
                type: Sequelize.STRING
            },
            pengikut_laki_laki: {
                type: Sequelize.INTEGER
            },
            pengikut_perempuan: {
                type: Sequelize.INTEGER
            },
            pengikut_anak_anak: {
                type: Sequelize.INTEGER
            },
            pengikut_bayi: {
                type: Sequelize.INTEGER
            },
            kode: {
                type: Sequelize.STRING
            },
            status: {
                type: Sequelize.ENUM('Tidak Valid', 'Valid, Divalidasi Oleh P2U', 'Valid Divalidasi oleh Petugas Kunjungan'),
                defaultValue: "Tidak Valid"
            },
            total_pengikut: {
                type: Sequelize.INTEGER
            },
            photo_ktp: {
                type: Sequelize.TEXT
            },
            photo_pengunjung: {
                type: Sequelize.TEXT
            },
            barcode: {
                type: Sequelize.TEXT
            },
            keterangan: {
                type: Sequelize.STRING
            },
            antrian: {
                type: Sequelize.STRING
            },
            created_at: {
                allowNull: false,
                defaultValue: Sequelize.fn("NOW"),
                type: Sequelize.DATE
            },
            updated_at: {
                allowNull: false,
                defaultValue: Sequelize.fn("NOW"),
                type: Sequelize.DATE
            }
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('pengunjungs');
    }
};