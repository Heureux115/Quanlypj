const prisma = require("../prismaClient");

async function getTaskWithGroup(taskId) {
    return prisma.task.findUnique({
        where: { id: taskId },
        include: {
            group: {
                include: {
                    project: true,
                    members: true,
                },
            },
        },
    });
}

function isGroupManager(req, group) {
    return req.user.role === "ADMIN" ||
        (req.user.role === "LECTURER" && group.project.createdBy === req.user.id) ||
        (req.user.role === "STUDENT" && group.leaderId === req.user.id);
}

function isGroupMember(req, group) {
    return group.members.some((member) => member.userId === req.user.id);
}

function canViewTaskDocuments(req, task) {
    return isGroupManager(req, task.group) || isGroupMember(req, task.group);
}

function canCreateTaskDocument(req, task) {
    return isGroupManager(req, task.group) || task.assignedTo === req.user.id;
}

exports.createDocument = async (req, res) => {
    try {
        const { fileName, fileUrl, taskId } = req.body;
        const parsedTaskId = parseInt(taskId);

        if (!fileName || !fileUrl || !parsedTaskId) {
            return res.status(400).json({ error: "fileName, fileUrl and taskId are required" });
        }

        const task = await getTaskWithGroup(parsedTaskId);
        if (!task) return res.status(404).json({ error: "Task not found" });

        if (!canCreateTaskDocument(req, task)) {
            return res.status(403).json({ error: "Only assignee, group leader, project lecturer or admin can upload evidence" });
        }

        const document = await prisma.document.create({
            data: {
                fileName,
                fileUrl,
                taskId: parsedTaskId,
                uploadedBy: req.user.id,
            },
            include: {
                uploader: { select: { id: true, name: true, email: true } },
            },
        });

        res.status(201).json(document);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getTaskDocuments = async (req, res) => {
    try {
        const taskId = parseInt(req.params.taskId);
        const task = await getTaskWithGroup(taskId);
        if (!task) return res.status(404).json({ error: "Task not found" });

        if (!canViewTaskDocuments(req, task)) {
            return res.status(403).json({ error: "Only group members, project lecturer or admin can view documents" });
        }

        const documents = await prisma.document.findMany({
            where: { taskId },
            include: {
                uploader: { select: { id: true, name: true, email: true } },
            },
            orderBy: { uploadedAt: "desc" },
        });

        res.json(documents);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.deleteDocument = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const document = await prisma.document.findUnique({
            where: { id },
            include: {
                task: {
                    include: {
                        group: {
                            include: {
                                project: true,
                                members: true,
                            },
                        },
                    },
                },
            },
        });

        if (!document) return res.status(404).json({ error: "Document not found" });
        if (!document.task) return res.status(400).json({ error: "Document is not attached to a task" });

        const canDelete = document.uploadedBy === req.user.id || isGroupManager(req, document.task.group);
        if (!canDelete) {
            return res.status(403).json({ error: "Only uploader, group leader, project lecturer or admin can delete documents" });
        }

        await prisma.document.delete({ where: { id } });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
