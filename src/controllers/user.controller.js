const { user: UserModel, pengunjung: PengunjungModel } = require("../models");

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */
const index = async(req, res, _next) => {
    try {
        // Dapatkan informasi user yang login dari request (asumsi dari middleware auth)
        const loggedInUser = req.user;

        // Tentukan kondisi query berdasarkan role
        const queryOptions = {
            attributes: { exclude: ['password'] }, // Selalu kecualikan password
            include: [{
                model: PengunjungModel,
                as: "pengunjung",
            }],
        };

        // Jika bukan admin, filter berdasarkan user yang login
        if (loggedInUser.role !== 'admin') {
            queryOptions.where = { id: loggedInUser.id };
        }

        const users = await UserModel.findAll(queryOptions);

        return res.send({
            message: "Success",
            data: users, // Perbaikan: variabel yang benar adalah 'users'
        });
    } catch (error) {
        console.log("Error:", error);
        return res.status(500).send({ message: "Internal Server Error" });
    }
};

module.exports = {
    index
};