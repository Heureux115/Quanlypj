const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

export async function apiRequest(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/api${path}`, {
    ...options,
    headers
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error || "Yêu cầu không thành công";
    throw new Error(message);
  }

  return data;
}

export const api = {
  login: (payload) =>
    apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  register: (payload) =>
    apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  me: () => apiRequest("/auth/me"),
  updateMe: (payload) =>
    apiRequest("/auth/me", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  changePassword: (payload) =>
    apiRequest("/auth/password", {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  projects: () => apiRequest("/projects"),
  createProject: (payload) =>
    apiRequest("/projects", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  project: (id) => apiRequest(`/projects/${id}`),
  createGroup: (payload) =>
    apiRequest("/groups", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  myGroups: () => apiRequest("/groups/mine/list"),
  group: (id) => apiRequest(`/groups/${id}`),
  requestToJoinGroup: (groupId, payload = {}) =>
    apiRequest(`/groups/${groupId}/join-requests`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  groupJoinRequests: (groupId, status = "PENDING") =>
    apiRequest(`/groups/${groupId}/join-requests${status ? `?status=${status}` : ""}`),
  reviewJoinRequest: (requestId, payload) =>
    apiRequest(`/groups/join-requests/${requestId}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  addGroupMember: (groupId, payload) =>
    apiRequest(`/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  setGroupLeader: (groupId, payload) =>
    apiRequest(`/groups/${groupId}/leader`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  tasksByGroup: (groupId) => apiRequest(`/tasks/group/${groupId}`),
  updateTaskProgress: (taskId, payload) =>
    apiRequest(`/tasks/${taskId}/progress`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  createTask: (payload) =>
    apiRequest("/tasks", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateTask: (taskId, payload) =>
    apiRequest(`/tasks/${taskId}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    }),
  groupReport: (groupId) => apiRequest(`/groups/${groupId}/report`),
  updateGroupRepo: (groupId, payload) =>
    apiRequest(`/git/groups/${groupId}/repo`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  syncGitHubGroup: (groupId, payload = {}) =>
    apiRequest(`/git/groups/${groupId}/sync-github`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  gitActivities: (groupId, type) =>
    apiRequest(`/git/activities/group/${groupId}${type ? `?type=${type}` : ""}`),
  dashboard: (role) => apiRequest(`/dashboard/${role.toLowerCase()}`),
  groupMessages: (groupId) => apiRequest(`/chat/groups/${groupId}/messages`),
  createGroupMessage: (groupId, payload) =>
    apiRequest(`/chat/groups/${groupId}/messages`, {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  projectGrades: (projectId) => apiRequest(`/grades/project/${projectId}`),
  gradeStudent: (payload) =>
    apiRequest("/grades", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  studentFinalGrade: (userId, projectId) =>
    apiRequest(`/grades/${userId}${projectId ? `?projectId=${projectId}` : ""}`),
  health: () => apiRequest("/health"),
  notifications: () => apiRequest("/notifications"),
  users: (params = {}) => {
    const search = new URLSearchParams();
    if (params.role) search.set("role", params.role);
    if (params.status) search.set("status", params.status);
    if (params.q) search.set("q", params.q);
    const query = search.toString();
    return apiRequest(`/users${query ? `?${query}` : ""}`);
  },
  createUser: (payload) =>
    apiRequest("/users", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  updateUserRole: (userId, payload) =>
    apiRequest(`/users/${userId}/role`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  updateUserStatus: (userId, payload) =>
    apiRequest(`/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  updateUserGitUsername: (userId, payload) =>
    apiRequest(`/users/${userId}/git-username`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    }),
  deleteUser: (userId) =>
    apiRequest(`/users/${userId}`, {
      method: "DELETE"
    }),
  createDocument: (payload) =>
    apiRequest("/documents", {
      method: "POST",
      body: JSON.stringify(payload)
    }),
  taskDocuments: (taskId) => apiRequest(`/documents/task/${taskId}`),
  deleteDocument: (documentId) =>
    apiRequest(`/documents/${documentId}`, {
      method: "DELETE"
    })
};
