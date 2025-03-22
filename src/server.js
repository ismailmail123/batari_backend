// // const path = require("path");

// // // require("dotenv").config({ path: path.join(__dirname, "../.env") });
// // require('dotenv').config()

// // const express = require("express");
// // const cookieParser = require('cookie-parser');
// // const cors = require('cors');

// // const app = express();



// // const authRouter = require("./routes/auth.router")
// // const wbpRouter = require("./routes/wbp.router")
// // const pengunjungRouter = require("./routes/pengunjung.router")
// //     // const orderRouter = require("./routes/order.router")
// //     // const cartRouter = require("./routes/cart.router")
// //     // const productRouter = require("./routes/product.router")
// //     // const shippingRouter = require("./routes/shipping.router")
// //     // const categoryRouter = require("./routes/category.router")
// //     // const ratingRouter = require("./routes/rating.router")

// // app.use(
// //     cors({
// //         origin: "http://localhost:5173", // Izinkan permintaan dari frontend
// //         credentials: true, // Izinkan pengiriman credentials (cookie, token, dll.)
// //     })
// // );

// // app.use(express.urlencoded({ extended: true }));
// // app.use(express.json());
// // app.use(cookieParser());

// // app.use(
// //     cors({
// //         origin: "http://localhost:5173", // Izinkan permintaan dari frontend
// //         credentials: true, // Izinkan pengiriman credentials (cookie, token, dll.)
// //     })
// // );

// // if (!process.env.JWT_SECRET) {
// //     console.error(
// //         "JWT_SECRET is not provided, fill it with random string or generate it using 'openssl rand -base64/-hex 32'"
// //     );
// //     process.exit(1);
// // }

// // app.use(cors());

// // app.use("/api/auth", authRouter)
// // app.use("/api/wargabinaan", wbpRouter)
// // app.use("/api/pengunjung", pengunjungRouter)
// //     // app.use("/api/orders", orderRouter)
// //     // app.use("/api/carts", cartRouter)
// //     // app.use("/api/products", productRouter)
// //     // app.use("/api/shippings", shippingRouter)
// //     // app.use("/api/categories", categoryRouter)
// //     // app.use("/api", ratingRouter)

// // app.listen(process.env.SERVER_PORT || 3000, () => {
// //     console.log("Server Running");
// // });

// const path = require("path");
// require('dotenv').config();
// const express = require("express");
// const cookieParser = require('cookie-parser');
// const cors = require('cors');

// const app = express();

// // Middleware CORS
// app.use(
//     cors({
//         origin: "*", // Izinkan permintaan dari frontend
//         credentials: true, // Izinkan pengiriman credentials (cookie, token, dll.)
//     })
// );

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// app.use(cookieParser());

// // Route
// const authRouter = require("./routes/auth.router");
// const wbpRouter = require("./routes/wbp.router");
// const pengunjungRouter = require("./routes/pengunjung.router");
// const barang_titipanRouter = require("./routes/barang_titipan.router");

// app.use("/api/auth", authRouter);
// app.use("/api/wargabinaan", wbpRouter);
// app.use("/api/pengunjung", pengunjungRouter);
// app.use("/api/barang-titipan", barang_titipanRouter);

// // Jalankan server
// app.listen(process.env.SERVER_PORT || 8000, () => {
//     console.log("Server Running");
// });

// require("dotenv").config({ path: path.join(__dirname, "../.env") });
// require('dotenv').config()

// const express = require("express");

// const app = express();


// // Route
// const authRouter = require("./routes/auth.router");
// const wbpRouter = require("./routes/wbp.router");
// const pengunjungRouter = require("./routes/pengunjung.router");
// const barang_titipanRouter = require("./routes/barang_titipan.router");

// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());
// const cors = require("cors");

// if (!process.env.JWT_SECRET) {
//     console.error(
//         "JWT_SECRET is not provided, fill it with random string or generate it using 'openssl rand -base64/-hex 32'"
//     );
//     process.exit(1);
// }

// app.use(cors());

// app.use("/api/auth", authRouter);
// app.use("/api/wargabinaan", wbpRouter);
// app.use("/api/pengunjung", pengunjungRouter);
// app.use("/api/barang-titipan", barang_titipanRouter);

// // Jalankan server
// app.listen(process.env.SERVER_PORT || 8000, () => {
//     console.log("Server Running");
// });

// require("dotenv").config({ path: path.join(__dirname, "../.env") });
require('dotenv').config()

const express = require("express");

const app = express();

const authRouter = require("./routes/auth.router");
const wbpRouter = require("./routes/wbp.router");
const pengunjungRouter = require("./routes/pengunjung.router");
const barang_titipanRouter = require("./routes/barang_titipan.router");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const cors = require("cors");

if (!process.env.JWT_SECRET) {
    console.error(
        "JWT_SECRET is not provided, fill it with random string or generate it using 'openssl rand -base64/-hex 32'"
    );
    process.exit(1);
}

app.use(cors());


app.use("/api/auth", authRouter);
app.use("/api/wargabinaan", wbpRouter);
app.use("/api/pengunjung", pengunjungRouter);
app.use("/api/barang-titipan", barang_titipanRouter);
app.listen(process.env.SERVER_PORT || 3000, () => {
    console.log("Server Running");
});