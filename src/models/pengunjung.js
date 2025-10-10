'use strict';
const {
    Model
} = require('sequelize');
const warga_binaan = require('./warga_binaan');
module.exports = (sequelize, DataTypes) => {
    class pengunjung extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            pengunjung.belongsTo(models.warga_binaan, {
                foreignKey: "wbp_id",
                as: "warga_binaan"
            })
            pengunjung.belongsTo(models.user, {
                foreignKey: "user_id",
                as: "user"
            })
            pengunjung.hasMany(models.barang_titipan, {
                foreignKey: "pengunjung_id",
                as: "barang_titipan"
            })
        }
    }
    pengunjung.init({
        user_id: DataTypes.INTEGER,
        wbp_id: DataTypes.INTEGER,
        nama: DataTypes.STRING,
        jenis_kelamin: DataTypes.ENUM("laki-laki", "perempuan"),
        nik: DataTypes.STRING,
        alamat: DataTypes.STRING,
        hp: DataTypes.STRING,
        hubungan_keluarga: DataTypes.STRING,
        tujuan: DataTypes.STRING,
        pengikut_laki_laki: DataTypes.INTEGER,
        pengikut_perempuan: DataTypes.INTEGER,
        pengikut_anak_anak: DataTypes.INTEGER,
        pengikut_bayi: DataTypes.INTEGER,
        kode: DataTypes.STRING,
        status: DataTypes.ENUM('Tidak Valid', 'Valid, Divalidasi Oleh P2U', 'Valid Divalidasi oleh Petugas Kunjungan'),
        total_pengikut: DataTypes.INTEGER,
        photo_ktp: DataTypes.TEXT,
        photo_pengunjung: DataTypes.TEXT,
        barcode: DataTypes.TEXT,
        keterangan: DataTypes.STRING,
        antrian: DataTypes.STRING,
    }, {
        sequelize,
        modelName: 'pengunjung',
        underscored: true,
        timestamps: true,
    });
    return pengunjung;
};