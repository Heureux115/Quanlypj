const prisma = require("../prismaClient");
const bcrypt = require("bcrypt");
const { signToken } = require("../utils/jwt");

exports.register = async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        const requestedRole = role || "STUDENT";

        if (requestedRole === "ADMIN") {
            return res.status(403).json({ error: "Admin accounts cannot be created from public registration" });
        }

        if (!["STUDENT", "LECTURER"].includes(requestedRole)) {
            return res.status(400).json({ error: "Invalid role" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const status = requestedRole === "LECTURER" ? "PENDING" : "ACTIVE";
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashed,
                role: requestedRole,
                status,
            },
        });
        const { password: _, ...safe } = user;
        res.json({
            ...safe,
            message: status === "PENDING"
                ? "Lecturer account is pending admin approval"
                : "Account created successfully",
        });
    } catch (err) {
        if (err.code === "P2002") {
            const target = err.meta?.target || [];
            const field = Array.isArray(target) ? target.join(", ") : String(target);
            const message = field.includes("email")
                ? "Email already exists"
                : "Account id sequence is out of sync. Run npm run db:fix-sequences and try again.";
            return res.status(409).json({ error: message });
        }
        res.status(500).json({ error: err.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: "User not found" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(400).json({ error: "Wrong password" });

        if (user.status !== "ACTIVE") {
            const message = user.status === "PENDING"
                ? "Account is pending admin approval"
                : "Account is not active";
            return res.status(403).json({ error: message });
        }

        const token = signToken({
            id: user.id,
            role: user.role,
            name: user.name,
            email: user.email,
        });

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                status: user.status,
                gitUsername: user.gitUsername,
                avatarUrl: user.avatarUrl,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.me = async (req, res) => {
    const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { id: true, name: true, email: true, role: true, status: true, gitUsername: true, avatarUrl: true },
    });
    res.json(user);
};

exports.updateMe = async (req, res) => {
    try {
        const { gitUsername, avatarUrl } = req.body;
        const normalizedGitUsername = typeof gitUsername === "string" && gitUsername.trim()
            ? gitUsername.trim()
            : null;
        const normalizedAvatarUrl = typeof avatarUrl === "string" && avatarUrl.trim()
            ? avatarUrl.trim()
            : null;

        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { gitUsername: normalizedGitUsername, avatarUrl: normalizedAvatarUrl },
            select: { id: true, name: true, email: true, role: true, status: true, gitUsername: true, avatarUrl: true },
        });

        res.json(user);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: "Current password and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ error: "New password must be at least 6 characters" });
        }

        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        if (!user) return res.status(404).json({ error: "User not found" });

        const ok = await bcrypt.compare(currentPassword, user.password);
        if (!ok) return res.status(400).json({ error: "Current password is incorrect" });

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { password: hashed },
        });

        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
