'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class barang_titipan extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
            barang_titipan.belongsTo(models.pengunjung, {
                foreignKey: "pengunjung_id",
                as: "pengunjung"
            })
            barang_titipan.belongsTo(models.user, {
                foreignKey: "user_id",
                as: "user"
            })
            barang_titipan.belongsTo(models.warga_binaan, {
                foreignKey: "wbp_id",
                as: "warga_binaan"
            })
        }
    }
    barang_titipan.init({
        user_id: DataTypes.INTEGER,
        pengunjung_id: DataTypes.INTEGER,
        wbp_id: DataTypes.INTEGER,
        jenis_barang: DataTypes.STRING,
        jumlah: DataTypes.INTEGER,
        keterangan: DataTypes.STRING
    }, {
        sequelize,
        modelName: 'barang_titipan',
        underscored: true,
    });
    return barang_titipan;
};