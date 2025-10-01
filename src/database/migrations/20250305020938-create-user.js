'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('users', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            nama: {
                type: Sequelize.STRING
            },
            email: {
                type: Sequelize.STRING
            },
            password: {
                type: Sequelize.STRING
            },
            role: {
                type: Sequelize.ENUM("admin", "user", "p2u"),
                defaultValue: "user"
            },
            provider: {
                type: Sequelize.ENUM("local", "google"),
                defaultValue: "local"
            },
            alamat: {
                type: Sequelize.TEXT
            },
            photo: {
                type: Sequelize.TEXT
            },
            hp: {
                type: Sequelize.STRING
            },
            jenis_kelamin: {
                type: Sequelize.ENUM("laki-laki", "perempuan")
            },
            tempat_lahir: {
                type: Sequelize.STRING
            },
            tanggal_lahir: {
                type: Sequelize.DATE
            },
            kode_verifikasi: {
                type: Sequelize.STRING
            },
            terverifikasi: {
                type: Sequelize.BOOLEAN
            },
            nama_perangkat: {
                type: Sequelize.STRING
            },
            status: {
                type: Sequelize.ENUM("aktif", "tidak aktif"),
                defaultValue: "tidak aktif"
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
        await queryInterface.dropTable('users');
    }
};