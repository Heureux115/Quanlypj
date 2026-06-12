const prisma = require("../prismaClient");

// Giảng viên tạo project
exports.createProject = async (req, res) => {
    try {
        const { title, description, maxGroups, maxMembers, criteria, deadline } = req.body;
        if (!title || title.trim() === "") {
            return res.status(400).json({ error: "Project title is required" });
        }
        let parsedCriteria = null;

        if (criteria) {
            if (!Array.isArray(criteria)) {
                return res.status(400).json({ error: "Criteria must be an array" });
            }

            const total = criteria.reduce((s, c) => s + (c.weight || 0), 0);
            if (total !== 100) {
                return res.status(400).json({ error: "Total weight must be 100%" });
            }

            parsedCriteria = JSON.stringify(criteria);
        }
        const project = await prisma.project.create({
            data: {
                title,
                description,
                maxGroups: maxGroups || 5,
                maxMembers: maxMembers || 5,
                criteria: parsedCriteria,
                deadline: deadline ? new Date(deadline) : null,
                createdBy: req.user.id,
            },
        });
        res.json(project);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getAllProjects = async (req, res) => {
    const projects = await prisma.project.findMany({
        include: {
            lecturer: { select: { id: true, name: true, email: true } },
            groups: { include: { members: true } },
        },
    });
    res.json(projects);
};

exports.getProjectById = async (req, res) => {
    const id = parseInt(req.params.id);
    const project = await prisma.project.findUnique({
        where: { id },
        include: {
            lecturer: { select: { id: true, name: true } },
            groups: {
                include: {
                    leader: { select: { id: true, name: true } },
                    members: { include: { user: { select: { id: true, name: true, email: true, gitUsername: true } } } },
                    tasks: true,
                },
            },
        },
    });
    if (!project) return res.status(404).json({ error: "Project not found" });
    res.json(project);
};

exports.updateProject = async (req, res) => {
    const id = parseInt(req.params.id);
    const data = req.body;
    if (data.criteria) data.criteria = JSON.stringify(data.criteria);
    if (data.deadline) data.deadline = new Date(data.deadline);
    const project = await prisma.project.update({ where: { id }, data });
    res.json(project);
};

exports.deleteProject = async (req, res) => {
    const id = parseInt(req.params.id);
    await prisma.project.delete({ where: { id } });
    res.json({ ok: true });
};
