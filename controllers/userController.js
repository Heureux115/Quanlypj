const prisma = require("../prismaClient");
const bcrypt = require("bcrypt");

const PUBLIC_ROLES = ["STUDENT", "LECTURER"];
const ALL_ROLES = ["ADMIN", "LECTURER", "STUDENT"];
const ACCOUNT_STATUSES = ["PENDING", "ACTIVE", "REJECTED"];

const userSelect = {
    id: true,
    name: true,
    email: true,
    role: true,
    status: true,
    gitUsername: true,
    avatarUrl: true,
    createdAt: true,
};

exports.getUsers = async (req, res) => {
    try {
        const { role, status, q } = req.query;

        if (role && !ALL_ROLES.includes(role)) {
            return res.status(400).json({ error: "Invalid role filter" });
        }

        if (status && !ACCOUNT_STATUSES.includes(status)) {
            return res.status(400).json({ error: "Invalid status filter" });
        }

        if (req.user.role === "LECTURER" && role !== "STUDENT") {
            return res.status(403).json({ error: "Lecturers can only list students" });
        }

        const users = await prisma.user.findMany({
            where: {
                ...(role ? { role } : {}),
                ...(status ? { status } : {}),
                ...(q ? {
                    OR: [
                        { name: { contains: q, mode: "insensitive" } },
                        { email: { contains: q, mode: "insensitive" } },
                    ],
                } : {}),
            },
            select: userSelect,
            orderBy: { createdAt: "desc" },
        });

        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createUser = async (req, res) => {
    try {
        const { name, email, password, role = "STUDENT", gitUsername, status = "ACTIVE" } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "name, email and password are required" });
        }

        if (!PUBLIC_ROLES.includes(role)) {
            return res.status(400).json({ error: "Admin can only create STUDENT or LECTURER accounts here" });
        }

        if (!ACCOUNT_STATUSES.includes(status)) {
            return res.status(400).json({ error: "Invalid account status" });
        }

        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashed,
                role,
                status,
                gitUsername: gitUsername || null,
            },
            select: userSelect,
        });

        res.status(201).json(user);
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

exports.updateUserRole = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { role } = req.body;

        if (!PUBLIC_ROLES.includes(role)) {
            return res.status(400).json({ error: "Role can only be STUDENT or LECTURER" });
        }

        if (id === req.user.id) {
            return res.status(400).json({ error: "Admin cannot change their own role" });
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.role === "ADMIN") {
            return res.status(400).json({ error: "Admin role cannot be changed here" });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { role },
            select: userSelect,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateUserStatus = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status } = req.body;

        if (!ACCOUNT_STATUSES.includes(status)) {
            return res.status(400).json({ error: "Invalid account status" });
        }

        if (id === req.user.id) {
            return res.status(400).json({ error: "Admin cannot change their own status" });
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.role === "ADMIN") {
            return res.status(400).json({ error: "Admin account status cannot be changed here" });
        }

        const updated = await prisma.user.update({
            where: { id },
            data: { status },
            select: userSelect,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateUserGitUsername = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { gitUsername } = req.body;

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.role === "ADMIN") {
            return res.status(400).json({ error: "Admin Git username cannot be changed here" });
        }

        if (req.user.role === "LECTURER" && user.role !== "STUDENT") {
            return res.status(403).json({ error: "Lecturers can only update student Git username" });
        }

        const normalizedGitUsername = typeof gitUsername === "string" && gitUsername.trim()
            ? gitUsername.trim()
            : null;

        const updated = await prisma.user.update({
            where: { id },
            data: { gitUsername: normalizedGitUsername },
            select: userSelect,
        });

        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const id = parseInt(req.params.id);

        if (id === req.user.id) {
            return res.status(400).json({ error: "Admin cannot delete their own account" });
        }

        const user = await prisma.user.findUnique({ where: { id } });
        if (!user) return res.status(404).json({ error: "User not found" });
        if (user.role === "ADMIN") {
            return res.status(400).json({ error: "Admin account cannot be deleted here" });
        }

        await prisma.user.delete({ where: { id } });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
