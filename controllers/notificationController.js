const prisma = require("../prismaClient");

async function getAccessibleGroupIds(user) {
    if (user.role === "LECTURER") {
        const groups = await prisma.group.findMany({
            where: { project: { createdBy: user.id } },
            select: { id: true },
        });
        return groups.map((group) => group.id);
    }

    if (user.role === "STUDENT") {
        const memberships = await prisma.groupMember.findMany({
            where: { userId: user.id },
            select: { groupId: true },
        });
        return memberships.map((membership) => membership.groupId);
    }

    return [];
}

exports.getNotifications = async (req, res) => {
    try {
        const notifications = [];

        if (req.user.role === "ADMIN") {
            const pendingAccounts = await prisma.user.findMany({
                where: { status: "PENDING", role: { not: "ADMIN" } },
                orderBy: { createdAt: "desc" },
                take: 12,
                select: { id: true, name: true, role: true, createdAt: true },
            });

            pendingAccounts.forEach((account) => {
                notifications.push({
                    id: `account:${account.id}`,
                    type: "ACCOUNT_PENDING",
                    title: "Tài khoản chờ duyệt",
                    message: `${account.name} (${account.role}) đang chờ xét duyệt.`,
                    createdAt: account.createdAt,
                    href: "/admin/approvals",
                });
            });

            return res.json({
                unreadCount: notifications.length,
                notifications,
            });
        }

        const groupIds = await getAccessibleGroupIds(req.user);
        if (groupIds.length > 0) {
            const pendingJoinRequests = await prisma.groupJoinRequest.findMany({
                where: {
                    status: "PENDING",
                    groupId: { in: groupIds },
                    ...(req.user.role === "STUDENT" ? { group: { leaderId: req.user.id } } : {}),
                },
                include: {
                    user: { select: { id: true, name: true } },
                    group: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
                take: 8,
            });

            pendingJoinRequests.forEach((request) => {
                notifications.push({
                    id: `join:${request.id}`,
                    type: "JOIN_REQUEST",
                    title: "Yêu cầu vào nhóm",
                    message: `${request.user.name} xin vào ${request.group.name}.`,
                    groupId: request.groupId,
                    createdAt: request.createdAt,
                    href: "/join-requests",
                });
            });

            const recentMessages = await prisma.chatMessage.findMany({
                where: {
                    groupId: { in: groupIds },
                    senderId: { not: req.user.id },
                },
                include: {
                    group: { select: { id: true, name: true } },
                },
                orderBy: { sentAt: "desc" },
                take: 8,
            });

            const senderIds = [...new Set(recentMessages.map((message) => message.senderId))];
            const senders = senderIds.length
                ? await prisma.user.findMany({
                    where: { id: { in: senderIds } },
                    select: { id: true, name: true },
                })
                : [];
            const senderById = new Map(senders.map((sender) => [sender.id, sender]));

            recentMessages.forEach((message) => {
                const sender = senderById.get(message.senderId);
                notifications.push({
                    id: `message:${message.id}`,
                    type: "CHAT_MESSAGE",
                    title: "Tin nhắn nhóm",
                    message: `${sender?.name || `User #${message.senderId}`} trong ${message.group.name}: ${message.content}`,
                    groupId: message.groupId,
                    createdAt: message.sentAt,
                    href: "/chat",
                });
            });
        }

        notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json({
            unreadCount: notifications.length,
            notifications: notifications.slice(0, 12),
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
