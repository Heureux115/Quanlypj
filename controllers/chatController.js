const prisma = require("../prismaClient");

async function getGroupWithAccessData(groupId) {
    return prisma.group.findUnique({
        where: { id: groupId },
        include: {
            project: true,
            members: true,
        },
    });
}

function canAccessGroupChat(req, group) {
    return req.user.role === "ADMIN" ||
        (req.user.role === "LECTURER" && group.project.createdBy === req.user.id) ||
        group.members.some((member) => member.userId === req.user.id);
}

async function attachSenders(messages) {
    const senderIds = [...new Set(messages.map((message) => message.senderId))];
    const users = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true, email: true },
    });
    const userById = new Map(users.map((user) => [user.id, user]));

    return messages.map((message) => ({
        ...message,
        sender: userById.get(message.senderId) || null,
    }));
}

exports.getGroupMessages = async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const group = await getGroupWithAccessData(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canAccessGroupChat(req, group)) {
            return res.status(403).json({ error: "Only group members, project lecturer or admin can view chat" });
        }

        const messages = await prisma.chatMessage.findMany({
            where: { groupId },
            orderBy: { sentAt: "asc" },
            take: 200,
        });

        res.json(await attachSenders(messages));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.createGroupMessage = async (req, res) => {
    try {
        const groupId = parseInt(req.params.id);
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: "Message content is required" });
        }

        const group = await getGroupWithAccessData(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!canAccessGroupChat(req, group)) {
            return res.status(403).json({ error: "Only group members, project lecturer or admin can send chat messages" });
        }

        const message = await prisma.chatMessage.create({
            data: {
                groupId,
                senderId: req.user.id,
                content: content.trim(),
            },
        });

        const [withSender] = await attachSenders([message]);
        res.status(201).json(withSender);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
