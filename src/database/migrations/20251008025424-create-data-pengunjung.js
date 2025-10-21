'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('data_pengunjungs', {
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
            photo_ktp: {
                type: Sequelize.TEXT
            },
            photo_pengunjung: {
                type: Sequelize.TEXT
            },
            kode: {
                type: Sequelize.STRING
            },
            barcode: {
                type: Sequelize.TEXT
            },
            created_at: {
                allowNull: false,
                type: 'TIMESTAMP',
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                allowNull: false,
                type: 'TIMESTAMP',
                defaultValue: Sequelize.literal(
                    'CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
                ),
            },
        });
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('data_pengunjungs');
    }
};