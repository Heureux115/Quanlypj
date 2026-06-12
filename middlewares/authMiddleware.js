const { verifyToken } = require("../utils/jwt");

module.exports = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing token" });
    }
    const token = header.split(" ")[1];
    try {
        const decoded = verifyToken(token);
        req.user = decoded; // { id, role, name, email }
        next();
    } catch (err) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};