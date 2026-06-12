const { Server } = require("socket.io");
const prisma = require("./prismaClient");
const { verifyToken } = require("./utils/jwt");

async function getGroupWithAccessData(groupId) {
    return prisma.group.findUnique({
        where: { id: groupId },
        include: {
            project: true,
            members: true,
        },
    });
}

function canAccessGroupChat(user, group) {
    return user.role === "ADMIN" ||
        (user.role === "LECTURER" && group.project.createdBy === user.id) ||
        group.members.some((member) => member.userId === user.id);
}

function serializeMessage(message, sender) {
    return {
        ...message,
        sender: sender
            ? { id: sender.id, name: sender.name, email: sender.email }
            : null,
    };
}

function initSocket(server) {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_ORIGIN || "*",
            methods: ["GET", "POST"],
        },
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) return next(new Error("Missing auth token"));

            const payload = verifyToken(token);
            const user = await prisma.user.findUnique({
                where: { id: payload.id },
                select: { id: true, name: true, email: true, role: true, status: true },
            });

            if (!user || user.status !== "ACTIVE") {
                return next(new Error("User is not active"));
            }

            socket.user = user;
            next();
        } catch {
            next(new Error("Invalid auth token"));
        }
    });

    socketHandlers(io);
    return io;
}

function socketHandlers(io) {
    io.on("connection", (socket) => {
        socket.on("join_group", async ({ groupId } = {}, ack) => {
            try {
                const parsedGroupId = parseInt(groupId);
                const group = await getGroupWithAccessData(parsedGroupId);
                if (!group) throw new Error("Group not found");
                if (!canAccessGroupChat(socket.user, group)) {
                    throw new Error("Only group members, project lecturer or admin can join chat");
                }

                socket.join(`group:${parsedGroupId}`);
                ack?.({ ok: true, groupId: parsedGroupId });
            } catch (err) {
                const payload = { error: err.message };
                socket.emit("message_error", payload);
                ack?.(payload);
            }
        });

        socket.on("leave_group", ({ groupId } = {}) => {
            const parsedGroupId = parseInt(groupId);
            if (parsedGroupId) socket.leave(`group:${parsedGroupId}`);
        });

        socket.on("send_message", async ({ groupId, content } = {}, ack) => {
            try {
                const parsedGroupId = parseInt(groupId);
                const cleanContent = typeof content === "string" ? content.trim() : "";
                if (!cleanContent) throw new Error("Message content is required");

                const group = await getGroupWithAccessData(parsedGroupId);
                if (!group) throw new Error("Group not found");
                if (!canAccessGroupChat(socket.user, group)) {
                    throw new Error("Only group members, project lecturer or admin can send chat messages");
                }

                const message = await prisma.chatMessage.create({
                    data: {
                        groupId: parsedGroupId,
                        senderId: socket.user.id,
                        content: cleanContent,
                    },
                });
                const withSender = serializeMessage(message, socket.user);

                io.to(`group:${parsedGroupId}`).emit("new_message", withSender);
                ack?.({ ok: true, message: withSender });
            } catch (err) {
                const payload = { error: err.message };
                socket.emit("message_error", payload);
                ack?.(payload);
            }
        });
    });
}

module.exports = { initSocket };
