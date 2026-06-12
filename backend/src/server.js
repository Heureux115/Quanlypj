require("dotenv").config();

const app = require("./app");
const { initSocket } = require("./socket");

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

const io = initSocket(server);

module.exports = { app, server, io };
