const prisma = require("../prismaClient");

const VALID_STATUSES = ["TODO", "IN_PROGRESS", "DONE", "OVERDUE"];
const MANAGER_TASK_FIELDS = ["title", "description", "assignedTo", "deadline", "status", "progress"];

async function getGroupForTaskAccess(groupId) {
    return prisma.group.findUnique({
        where: { id: groupId },
        include: {
            project: true,
            members: true,
        },
    });
}

async function getTaskForAccess(taskId) {
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

function isGroupMember(userId, group) {
    return group.members.some((member) => member.userId === userId);
}

function parseOptionalUserId(value) {
    if (value === undefined || value === null || value === "") return null;
    const parsed = parseInt(value);
    return Number.isNaN(parsed) ? NaN : parsed;
}

function validateTaskStatus(status) {
    return !status || VALID_STATUSES.includes(status);
}

function validateProgress(progress) {
    if (progress === undefined) return true;
    return Number.isInteger(progress) && progress >= 0 && progress <= 100;
}

function parseDeadline(deadline) {
    if (!deadline) return null;
    const parsed = new Date(deadline);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function ensureAssigneeIsGroupMember(assignedTo, group) {
    if (!assignedTo) return;

    const membership = await prisma.groupMember.findUnique({
        where: {
            groupId_userId: {
                groupId: group.id,
                userId: assignedTo,
            },
        },
    });

    if (!membership) {
        const error = new Error("Assignee must be a member of the group");
        error.statusCode = 400;
        throw error;
    }
}

exports.createTask = async (req, res) => {
    try {
        const { title, description, groupId, assignedTo, deadline, status, progress } = req.body;
        const parsedGroupId = parseInt(groupId);
        const parsedAssignedTo = parseOptionalUserId(assignedTo);
        const parsedDeadline = parseDeadline(deadline);

        if (!title || !description || !parsedGroupId || !parsedDeadline) {
            return res.status(400).json({ error: "title, description, groupId and deadline are required" });
        }

        if (Number.isNaN(parsedAssignedTo)) {
            return res.status(400).json({ error: "assignedTo must be a valid user id" });
        }

        if (!validateTaskStatus(status)) {
            return res.status(400).json({ error: "Invalid task status" });
        }

        if (!validateProgress(progress)) {
            return res.status(400).json({ error: "Progress must be an integer from 0 to 100" });
        }

        const group = await getGroupForTaskAccess(parsedGroupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!isGroupManager(req, group)) {
            return res.status(403).json({ error: "Only group leader, project lecturer or admin can create tasks" });
        }

        await ensureAssigneeIsGroupMember(parsedAssignedTo, group);

        const task = await prisma.task.create({
            data: {
                title,
                description,
                groupId: parsedGroupId,
                assignedTo: parsedAssignedTo,
                deadline: parsedDeadline,
                status: status || undefined,
                progress: progress !== undefined ? progress : undefined,
            },
            include: { assignee: { select: { id: true, name: true } } },
        });

        res.status(201).json(task);
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};

exports.getTasksByGroup = async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const group = await getGroupForTaskAccess(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });

        if (!isGroupManager(req, group) && !isGroupMember(req.user.id, group)) {
            return res.status(403).json({ error: "Only group members, project lecturer or admin can view tasks" });
        }

        const tasks = await prisma.task.findMany({
            where: { groupId },
            include: { assignee: { select: { id: true, name: true } } },
            orderBy: { deadline: "asc" },
        });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTaskProgress = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const { status, progress } = req.body;

        if (!validateTaskStatus(status)) {
            return res.status(400).json({ error: "Invalid task status" });
        }

        if (!validateProgress(progress)) {
            return res.status(400).json({ error: "Progress must be an integer from 0 to 100" });
        }

        const task = await getTaskForAccess(id);
        if (!task) return res.status(404).json({ error: "Task not found" });

        const canManage = isGroupManager(req, task.group);
        const isAssignee = task.assignedTo === req.user.id;
        if (!canManage && !isAssignee) {
            return res.status(403).json({ error: "Students can only update progress for their assigned tasks" });
        }

        const data = {};
        if (status !== undefined) data.status = status;
        if (progress !== undefined) data.progress = progress;

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "status or progress is required" });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data,
            include: { assignee: { select: { id: true, name: true } } },
        });
        res.json(updatedTask);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.updateTask = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const task = await getTaskForAccess(id);
        if (!task) return res.status(404).json({ error: "Task not found" });

        if (!isGroupManager(req, task.group)) {
            return res.status(403).json({ error: "Only group leader, project lecturer or admin can update tasks" });
        }

        const data = {};
        for (const field of MANAGER_TASK_FIELDS) {
            if (req.body[field] !== undefined) {
                data[field] = req.body[field];
            }
        }

        if (Object.keys(data).length === 0) {
            return res.status(400).json({ error: "No supported task fields provided" });
        }

        if (data.assignedTo !== undefined) {
            data.assignedTo = parseOptionalUserId(data.assignedTo);
            if (Number.isNaN(data.assignedTo)) {
                return res.status(400).json({ error: "assignedTo must be a valid user id" });
            }
            await ensureAssigneeIsGroupMember(data.assignedTo, task.group);
        }

        if (data.deadline !== undefined) {
            data.deadline = parseDeadline(data.deadline);
            if (!data.deadline) {
                return res.status(400).json({ error: "deadline must be a valid date" });
            }
        }

        if (!validateTaskStatus(data.status)) {
            return res.status(400).json({ error: "Invalid task status" });
        }

        if (!validateProgress(data.progress)) {
            return res.status(400).json({ error: "Progress must be an integer from 0 to 100" });
        }

        const updatedTask = await prisma.task.update({
            where: { id },
            data,
            include: { assignee: { select: { id: true, name: true } } },
        });
        res.json(updatedTask);
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};

exports.deleteTask = async (req, res) => {
    try {
        const id = parseInt(req.params.id);
        const task = await getTaskForAccess(id);
        if (!task) return res.status(404).json({ error: "Task not found" });

        if (!isGroupManager(req, task.group)) {
            return res.status(403).json({ error: "Only group leader, project lecturer or admin can delete tasks" });
        }

        await prisma.task.delete({ where: { id } });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
