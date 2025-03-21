'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('warga_binaans', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            user_id: {
                type: Sequelize.INTEGER
            },
            pengunjung_id: {
                type: Sequelize.INTEGER
            },
            nama: {
                type: Sequelize.STRING
            },
            alamat: {
                type: Sequelize.STRING
            },
            tempat_lahir: {
                type: Sequelize.STRING
            },
            tanggal_lahir: {
                type: Sequelize.STRING
            },
            jenis_kelamin: {
                type: Sequelize.STRING
            },
            warga_negara: {
                type: Sequelize.ENUM("WNI", "WNA")
            },
            agama: {
                type: Sequelize.STRING
            },
            status_perkawinan: {
                type: Sequelize.ENUM("menikah", "belum menikah")
            },
            tingkat_pendidikan: {
                type: Sequelize.STRING
            },
            nik: {
                type: Sequelize.STRING
            },
            jenis_kejahatan: {
                type: Sequelize.STRING
            },
            sepertiga_masa_pidana: {
                type: Sequelize.DATE
            },
            seperdua_masa_pidana: {
                type: Sequelize.DATE
            },
            duapertiga_masa_pidana: {
                type: Sequelize.DATE
            },
            pekerjaan: {
                type: Sequelize.STRING
            },
            lokasi_blok: {
                type: Sequelize.STRING
            },
            status: {
                type: Sequelize.ENUM("aktif", "tidak aktif"),
                defaultValue: "aktif"
            },
            nama_ayah: {
                type: Sequelize.STRING
            },
            nama_ibu: {
                type: Sequelize.STRING
            },
            photo: {
                type: Sequelize.TEXT
            },
            keterangan: {
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
        await queryInterface.dropTable('warga_binaans');
    }
};