const prisma = require("../prismaClient");

function parseGitHubRepoUrl(repoUrl) {
    if (!repoUrl) return null;

    const httpsMatch = repoUrl.match(/^https?:\/\/github\.com\/([^/]+)\/([^/.#?]+)(?:\.git)?/i);
    if (httpsMatch) {
        return { owner: httpsMatch[1], repo: httpsMatch[2] };
    }

    const sshMatch = repoUrl.match(/^git@github\.com:([^/]+)\/([^/.#?]+)(?:\.git)?$/i);
    if (sshMatch) {
        return { owner: sshMatch[1], repo: sshMatch[2] };
    }

    const shortMatch = repoUrl.match(/^([^/]+)\/([^/]+)$/);
    if (shortMatch) {
        return { owner: shortMatch[1], repo: shortMatch[2].replace(/\.git$/, "") };
    }

    return null;
}

function githubHeaders({ includeToken = true } = {}) {
    return {
        Accept: "application/vnd.github+json",
        "User-Agent": "itss-project-management",
        ...(includeToken && process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
    };
}

async function requestGitHub(path, { includeToken = true } = {}) {
    const response = await fetch(`https://api.github.com${path}`, {
        headers: githubHeaders({ includeToken }),
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    return { response, data, text };
}

async function githubRequest(path) {
    let result = await requestGitHub(path);

    if (
        result.response.status === 401 &&
        process.env.GITHUB_TOKEN &&
        result.data?.message?.toLowerCase() === "bad credentials"
    ) {
        console.warn("GITHUB_TOKEN is invalid. Retrying public GitHub request without token.");
        result = await requestGitHub(path, { includeToken: false });
    }

    if (!result.response.ok) {
        const message = result.data?.message || result.text || "GitHub API request failed";
        const error = new Error(message);
        error.statusCode = result.response.status;
        throw error;
    }

    return result.data;
}

async function findAuthorUser({ email, username, groupMembers }) {
    if (!email && !username) return null;

    const normalizedEmail = email?.toLowerCase();
    const normalizedUsername = username?.toLowerCase();

    return groupMembers.find((member) => {
        const user = member.user;
        return (normalizedEmail && user.email?.toLowerCase() === normalizedEmail) ||
            (normalizedUsername && user.gitUsername?.toLowerCase() === normalizedUsername);
    })?.user || null;
}

async function importCommitActivity({ group, commitDetail, groupMembers }) {
    const sha = commitDetail.sha;
    const authorEmail = commitDetail.commit?.author?.email || null;
    const authorName = commitDetail.commit?.author?.name || null;
    const authorUsername = commitDetail.author?.login || null;
    const message = commitDetail.commit?.message || "";
    const occurredAt = new Date(commitDetail.commit?.author?.date || commitDetail.commit?.committer?.date);
    const loc = commitDetail.stats?.total || 0;
    const authorUser = await findAuthorUser({
        email: authorEmail,
        username: authorUsername,
        groupMembers,
    });

    const activity = await prisma.gitActivity.upsert({
        where: { externalId: `github:commit:${group.id}:${sha}` },
        update: {
            userId: authorUser?.id || null,
            authorName,
            authorEmail,
            authorUsername,
            message,
            loc,
            occurredAt,
            metadata: JSON.stringify({
                sha,
                htmlUrl: commitDetail.html_url,
                additions: commitDetail.stats?.additions || 0,
                deletions: commitDetail.stats?.deletions || 0,
            }),
        },
        create: {
            type: "COMMIT",
            externalId: `github:commit:${group.id}:${sha}`,
            groupId: group.id,
            userId: authorUser?.id || null,
            authorName,
            authorEmail,
            authorUsername,
            message,
            loc,
            occurredAt,
            metadata: JSON.stringify({
                sha,
                htmlUrl: commitDetail.html_url,
                additions: commitDetail.stats?.additions || 0,
                deletions: commitDetail.stats?.deletions || 0,
            }),
        },
    });

    let commit = null;
    if (authorUser) {
        commit = await prisma.commit.upsert({
            where: { hash: sha },
            update: {
                message,
                loc,
                authorId: authorUser.id,
                groupId: group.id,
                committedAt: occurredAt,
            },
            create: {
                hash: sha,
                message,
                loc,
                authorId: authorUser.id,
                groupId: group.id,
                committedAt: occurredAt,
            },
        });
    }

    return { activity, commit, matched: Boolean(authorUser) };
}

async function importPushActivity({ group, event, groupMembers }) {
    const actorUsername = event.actor?.login || null;
    const actorUser = await findAuthorUser({
        username: actorUsername,
        groupMembers,
    });
    const commits = event.payload?.commits || [];
    const message = `Push ${commits.length} commit(s)`;

    return prisma.gitActivity.upsert({
        where: { externalId: `github:push:${group.id}:${event.id}` },
        update: {
            userId: actorUser?.id || null,
            authorUsername: actorUsername,
            message,
            occurredAt: new Date(event.created_at),
            metadata: JSON.stringify({
                eventId: event.id,
                ref: event.payload?.ref,
                size: event.payload?.size,
                commits,
            }),
        },
        create: {
            type: "PUSH",
            externalId: `github:push:${group.id}:${event.id}`,
            groupId: group.id,
            userId: actorUser?.id || null,
            authorUsername: actorUsername,
            message,
            loc: 0,
            occurredAt: new Date(event.created_at),
            metadata: JSON.stringify({
                eventId: event.id,
                ref: event.payload?.ref,
                size: event.payload?.size,
                commits,
            }),
        },
    });
}

async function syncGitHubGroup(groupId, options = {}) {
    const maxCommits = Math.min(parseInt(options.maxCommits || 50), 100);
    const includePushEvents = options.includePushEvents !== false;
    const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
            members: {
                include: { user: true },
            },
        },
    });

    if (!group) {
        const error = new Error("Group not found");
        error.statusCode = 404;
        throw error;
    }

    const repo = parseGitHubRepoUrl(group.gitRepoUrl);
    if (!repo) {
        const error = new Error("Group gitRepoUrl must be a valid GitHub repository URL");
        error.statusCode = 400;
        throw error;
    }

    const commits = await githubRequest(`/repos/${repo.owner}/${repo.repo}/commits?per_page=${maxCommits}`);
    let importedCommits = 0;
    let matchedCommits = 0;

    for (const commit of commits) {
        const detail = await githubRequest(`/repos/${repo.owner}/${repo.repo}/commits/${commit.sha}`);
        const result = await importCommitActivity({ group, commitDetail: detail, groupMembers: group.members });
        importedCommits += 1;
        if (result.matched) matchedCommits += 1;
    }

    let importedPushEvents = 0;
    if (includePushEvents) {
        const events = await githubRequest(`/repos/${repo.owner}/${repo.repo}/events?per_page=100`);
        const pushEvents = events.filter((event) => event.type === "PushEvent");
        for (const event of pushEvents) {
            await importPushActivity({ group, event, groupMembers: group.members });
            importedPushEvents += 1;
        }
    }

    return {
        repo,
        importedCommits,
        matchedCommits,
        importedPushEvents,
    };
}

module.exports = {
    parseGitHubRepoUrl,
    syncGitHubGroup,
};
