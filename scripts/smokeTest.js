if (!process.env.API_BASE_URL && process.env.SMOKE_START_SERVER !== "false") {
    process.env.PORT = process.env.PORT || "5010";
}

const API_BASE_URL = process.env.API_BASE_URL || `http://127.0.0.1:${process.env.PORT || 5000}/api`;
const bootedServer = process.env.SMOKE_START_SERVER === "false" ? null : require("../index").server;

const accounts = {
    lecturer: { email: "lecturer@itss.local", password: "123456" },
    student: { email: "student1@itss.local", password: "123456" },
    admin: { email: "admin@test.com", password: "123456" },
};

async function request(path, options = {}, token) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    const text = await response.text();
    let data = null;
    if (text) {
        try {
            data = JSON.parse(text);
        } catch {
            throw new Error(`${options.method || "GET"} ${path} returned non-JSON ${response.status}: ${text.slice(0, 120)}`);
        }
    }
    if (!response.ok) {
        throw new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${data?.error || text}`);
    }
    return data;
}

async function login(account) {
    const result = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(account),
    });
    return result.token;
}

async function main() {
    console.log(`Smoke testing ${API_BASE_URL}`);
    await request("/health");

    const lecturerToken = await login(accounts.lecturer);
    const studentToken = await login(accounts.student);
    const adminToken = await login(accounts.admin);

    await request("/dashboard/lecturer", {}, lecturerToken);
    await request("/dashboard/student", {}, studentToken);
    await request("/dashboard/admin", {}, adminToken);

    const projects = await request("/projects", {}, lecturerToken);
    const demoProject = projects.find((project) => project.title === "Hệ thống quản lý nhóm dự án") || projects[0];
    if (!demoProject) throw new Error("No project found. Run npm run seed first.");

    const project = await request(`/projects/${demoProject.id}`, {}, lecturerToken);
    const group = project.groups[0];
    if (!group) throw new Error("No group found in demo project.");

    await request(`/groups/${group.id}/report`, {}, lecturerToken);
    await request(`/dashboard/student`, {}, studentToken);
    await request(`/chat/groups/${group.id}/messages`, {}, studentToken);
    await request(`/chat/groups/${group.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content: `Smoke test message ${new Date().toISOString()}` }),
    }, studentToken);

    const tasks = await request(`/tasks/group/${group.id}`, {}, studentToken);
    if (tasks.length > 0) {
        await request(`/documents/task/${tasks[0].id}`, {}, studentToken);
    }

    await request(`/grades/project/${demoProject.id}`, {}, lecturerToken);

    const users = await request("/users?role=STUDENT", {}, lecturerToken);
    if (!users.length) throw new Error("No students found from user API.");

    console.log("Smoke test passed.");
}

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => {
        if (bootedServer) {
            bootedServer.close();
        }
    });
