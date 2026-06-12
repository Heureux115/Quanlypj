const prisma = require("../prismaClient");
const { syncGitHubGroup } = require("../utils/githubSync");

async function getGroupForGitAccess(groupId) {
    return prisma.group.findUnique({
        where: { id: groupId },
        include: {
            project: true,
            members: true,
        },
    });
}

function isGroupMember(req, group) {
    return group.members.some((member) => member.userId === req.user.id);
}

function canManageGit(req, group) {
    return req.user.role === "ADMIN" ||
        (req.user.role === "LECTURER" && group.project.createdBy === req.user.id) ||
        (req.user.role === "STUDENT" && group.leaderId === req.user.id);
}

function canViewGit(req, group) {
    return canManageGit(req, group) || isGroupMember(req, group);
}

async function findCommitAuthor(groupId, commit) {
    const email = commit.authorEmail?.toLowerCase();
    const username = commit.authorUsername?.toLowerCase();
    if (!email && !username) return null;

    const memberships = await prisma.groupMember.findMany({
        where: { groupId },
        include: { user: true },
    });

    return memberships.find((membership) => {
        const user = membership.user;
        return (email && user.email?.toLowerCase() === email) ||
            (username && user.gitUsername?.toLowerCase() === username);
    })?.user || null;
}

exports.syncCommits = async (req, res) => {
    try {
        const { groupId, commits } = req.body;
        const parsedGroupId = parseInt(groupId);
        const group = await getGroupForGitAccess(parsedGroupId);
        if (!group) return res.status(404).json({ error: "Group not found" });
        if (!canManageGit(req, group)) {
            return res.status(403).json({ error: "Only group leader, project lecturer or admin can sync Git data" });
        }

        const results = [];
        for (const c of commits || []) {
            const author = await findCommitAuthor(parsedGroupId, c);
            const externalId = `manual:commit:${parsedGroupId}:${c.hash}`;

            let commit = null;
            if (author) {
                commit = await prisma.commit.upsert({
                    where: { hash: c.hash },
                    update: {
                        message: c.message,
                        loc: c.loc || 0,
                        authorId: author.id,
                        groupId: parsedGroupId,
                        committedAt: new Date(c.committedAt),
                    },
                    create: {
                        hash: c.hash,
                        message: c.message,
                        loc: c.loc || 0,
                        authorId: author.id,
                        groupId: parsedGroupId,
                        committedAt: new Date(c.committedAt),
                    },
                });
                results.push(commit);
            }

            await prisma.gitActivity.upsert({
                where: { externalId },
                update: {
                    userId: author?.id || null,
                    authorName: c.authorName,
                    authorEmail: c.authorEmail,
                    authorUsername: c.authorUsername,
                    message: c.message,
                    loc: c.loc || 0,
                    occurredAt: new Date(c.committedAt),
                },
                create: {
                    type: "COMMIT",
                    externalId,
                    groupId: parsedGroupId,
                    userId: author?.id || null,
                    authorName: c.authorName,
                    authorEmail: c.authorEmail,
                    authorUsername: c.authorUsername,
                    message: c.message,
                    loc: c.loc || 0,
                    occurredAt: new Date(c.committedAt),
                    metadata: JSON.stringify({ source: "manual" }),
                },
            });
        }
        res.json({ imported: results.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.syncGitHubGroup = async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const group = await getGroupForGitAccess(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });
        if (!canManageGit(req, group)) {
            return res.status(403).json({ error: "Only group leader, project lecturer or admin can sync GitHub data" });
        }

        const result = await syncGitHubGroup(groupId, req.body || {});
        res.json(result);
    } catch (err) {
        res.status(err.statusCode || 500).json({ error: err.message });
    }
};

exports.updateGroupRepo = async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const { gitRepoUrl } = req.body;
        const group = await getGroupForGitAccess(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });
        if (!canManageGit(req, group)) {
            return res.status(403).json({ error: "Only group leader, project lecturer or admin can update Git repo" });
        }
        const updated = await prisma.group.update({
            where: { id: groupId },
            data: { gitRepoUrl },
        });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getCommitsByGroup = async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const group = await getGroupForGitAccess(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });
        if (!canViewGit(req, group)) {
            return res.status(403).json({ error: "Only group members, project lecturer or admin can view commits" });
        }

        const commits = await prisma.commit.findMany({
            where: { groupId },
            include: { author: { select: { id: true, name: true, email: true, gitUsername: true } } },
            orderBy: { committedAt: "desc" },
        });
        res.json(commits);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getActivitiesByGroup = async (req, res) => {
    try {
        const groupId = parseInt(req.params.groupId);
        const { type } = req.query;
        const group = await getGroupForGitAccess(groupId);
        if (!group) return res.status(404).json({ error: "Group not found" });
        if (!canViewGit(req, group)) {
            return res.status(403).json({ error: "Only group members, project lecturer or admin can view Git activity" });
        }

        const activities = await prisma.gitActivity.findMany({
            where: {
                groupId,
                ...(type ? { type } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true, gitUsername: true } } },
            orderBy: { occurredAt: "desc" },
            take: 300,
        });
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
