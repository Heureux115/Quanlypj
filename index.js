require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { initSocket } = require("./socket");

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

// routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/project"));
app.use("/api/groups", require("./routes/group"));
app.use("/api/tasks", require("./routes/task"));
app.use("/api/evaluations", require("./routes/evaluation"));
app.use("/api/git", require("./routes/git"));
app.use("/api/grades", require("./routes/grade"));
app.use("/api/warnings", require("./routes/warning"));
app.use("/api/users", require("./routes/user"));
app.use("/api/documents", require("./routes/document"));
app.use("/api/chat", require("./routes/chat"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use("/api/notifications", require("./routes/notification"));
app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "Student Project Management API" });
});
app.get("/", (req, res) => res.send("Student Project Management API"));

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
const io = initSocket(server);

module.exports = { app, server, io };
