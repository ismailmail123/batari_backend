'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class user extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            user.hasMany(models.pengunjung, {
                foreignKey: "user_id",
                as: "pengunjung"
            })
            user.hasMany(models.pengunjung, {
                foreignKey: "user_id",
                as: "data-pengunjung"
            })
            user.hasMany(models.warga_binaan, {
                foreignKey: "user_id",
                as: "warga_binaan"
            })
            user.hasMany(models.barang_titipan, {
                foreignKey: "user_id",
                as: "barang_titipan"
            })
        }
    }
    user.init({
        nama: DataTypes.STRING,
        email: DataTypes.STRING,
        password: DataTypes.STRING,
        role: DataTypes.ENUM("admin", "user", "p2u"),
        provider: DataTypes.ENUM("local", "google"),
        alamat: DataTypes.TEXT,
        photo: DataTypes.TEXT,
        hp: DataTypes.STRING,
        jenis_kelamin: DataTypes.ENUM("laki-laki", "perempuan"),
        tempat_lahir: DataTypes.STRING,
        tanggal_lahir: DataTypes.DATE,
        kode_verifikasi: DataTypes.STRING,
        terverifikasi: DataTypes.BOOLEAN,
        nama_perangkat: DataTypes.STRING,
        status: DataTypes.ENUM("aktif", "tidak aktif")
    }, {
        sequelize,
        modelName: 'user',
        underscored: true,
    });
    return user;
};