'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class warga_binaan extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            warga_binaan.hasMany(models.pengunjung, {
                foreignKey: "wbp_id",
                as: "pengunjung"
            })
            warga_binaan.belongsTo(models.user, {
                foreignKey: "user_id",
                as: "user"
            })
        }
    }
    warga_binaan.init({
        user_id: DataTypes.INTEGER,
        pengunjung_id: DataTypes.INTEGER,
        nama: DataTypes.STRING,
        alamat: DataTypes.STRING,
        tempat_lahir: DataTypes.STRING,
        tanggal_lahir: DataTypes.STRING,
        jenis_kelamin: DataTypes.STRING,
        warga_negara: DataTypes.ENUM("WNI", "WNA"),
        agama: DataTypes.STRING,
        status_perkawinan: DataTypes.ENUM("menikah", "belum menikah"),
        tingkat_pendidikan: DataTypes.STRING,
        nik: DataTypes.STRING,
        jenis_kejahatan: DataTypes.STRING,
        sepertiga_masa_pidana: DataTypes.DATE,
        seperdua_masa_pidana: DataTypes.DATE,
        duapertiga_masa_pidana: DataTypes.DATE,
        pekerjaan: DataTypes.STRING,
        lokasi_blok: DataTypes.STRING,
        status: DataTypes.ENUM("aktif", "tidak aktif"),
        nama_ayah: DataTypes.STRING,
        nama_ibu: DataTypes.STRING,
        photo: DataTypes.TEXT,
        keterangan: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'warga_binaan',
        underscored: true,
    });
    return warga_binaan;
};