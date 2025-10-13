'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class data_pengunjung extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            data_pengunjung.belongsTo(models.user, {
                foreignKey: "user_id",
                as: "user"
            })
            data_pengunjung.belongsTo(models.warga_binaan, {
                foreignKey: "wbp_id",
                as: "warga_binaan"
            })
        }
    }
    data_pengunjung.init({
        user_id: DataTypes.INTEGER,
        wbp_id: DataTypes.INTEGER,
        nama: DataTypes.STRING,
        jenis_kelamin: DataTypes.ENUM("laki-laki", "perempuan"),
        nik: DataTypes.STRING,
        alamat: DataTypes.STRING,
        hp: DataTypes.STRING,
        hubungan_keluarga: DataTypes.STRING,
        photo_ktp: DataTypes.TEXT,
        photo_pengunjung: DataTypes.TEXT,
        kode: DataTypes.STRING,
        barcode: DataTypes.TEXT,
    }, {
        sequelize,
        modelName: 'data_pengunjung',
        underscored: true,
        timestamps: true,
    });
    return data_pengunjung;
};