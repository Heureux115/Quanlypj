import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Filter,
  RefreshCw,
  Save,
  Search,
  Shield,
  Trash2,
  UserPlus,
  Users
} from "lucide-react";
import { api } from "../api/client.js";
import MetricCard from "../components/MetricCard.jsx";

const initialCreateForm = {
  name: "",
  email: "",
  password: "",
  role: "STUDENT",
  status: "ACTIVE",
  gitUsername: ""
};

const statusLabels = {
  PENDING: "Chờ duyệt",
  ACTIVE: "Đang hoạt động",
  REJECTED: "Đã từ chối"
};

const roleLabels = {
  STUDENT: "Sinh viên",
  LECTURER: "Giảng viên",
  ADMIN: "Quản trị viên"
};

function statusTone(status) {
  if (status === "PENDING") return "warning";
  if (status === "REJECTED") return "danger";
  return "success";
}

export default function AdminUsers() {
  const [health, setHealth] = useState(null);
  const [users, setUsers] = useState([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [createForm, setCreateForm] = useState(initialCreateForm);
  const [gitForms, setGitForms] = useState({});
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userStats = useMemo(() => {
    return users.reduce(
      (stats, user) => ({
        ...stats,
        [user.role]: (stats[user.role] || 0) + 1,
        [user.status]: (stats[user.status] || 0) + 1
      }),
      {}
    );
  }, [users]);

  async function loadUsers(next = {}) {
    setError("");
    try {
      const result = await api.users({
        role: next.role ?? roleFilter,
        status: next.status ?? statusFilter,
        q: next.q ?? query
      });
      setUsers(result);
      setGitForms(Object.fromEntries(result.map((user) => [user.id, user.gitUsername || ""])));
      setConfirmDeleteId(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function createUser(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setCreating(true);
    try {
      const created = await api.createUser({
        ...createForm,
        gitUsername: createForm.gitUsername || undefined
      });
      setUsers((current) => [created, ...current]);
      setCreateForm(initialCreateForm);
      setNotice("Đã tạo tài khoản. Tài khoản admin vẫn chỉ tạo thủ công bằng Prisma.");
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function changeRole(userId, role) {
    setError("");
    setNotice("");
    try {
      const updated = await api.updateUserRole(userId, { role });
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      setNotice("Đã cập nhật vai trò người dùng.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeStatus(userId, status) {
    setError("");
    setNotice("");
    try {
      const updated = await api.updateUserStatus(userId, { status });
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      setNotice(status === "ACTIVE" ? "Đã duyệt tài khoản." : "Đã cập nhật trạng thái tài khoản.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function changeGitUsername(userId) {
    setError("");
    setNotice("");
    try {
      const updated = await api.updateUserGitUsername(userId, {
        gitUsername: gitForms[userId] || ""
      });
      setUsers((current) => current.map((user) => (user.id === updated.id ? updated : user)));
      setGitForms((current) => ({ ...current, [updated.id]: updated.gitUsername || "" }));
      setNotice("Đã cập nhật GitHub username.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteUser(userId) {
    if (confirmDeleteId !== userId) {
      setConfirmDeleteId(userId);
      setNotice("Bấm Xác nhận xóa để hoàn tất thao tác.");
      return;
    }

    setError("");
    setNotice("");
    try {
      await api.deleteUser(userId);
      setUsers((current) => current.filter((user) => user.id !== userId));
      setConfirmDeleteId(null);
      setNotice("Đã xóa tài khoản.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page admin-users-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Quản trị hệ thống</p>
          <h1>Quản lý người dùng</h1>
          <p className="muted">
            Tạo tài khoản sinh viên hoặc giảng viên, lọc theo vai trò, cập nhật trạng thái truy cập và quản lý GitHub username.
          </p>
        </div>
        <button className="secondary-button" onClick={() => loadUsers()}>
          <RefreshCw size={16} />
          Tải lại
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="metric-grid">
        <MetricCard label="Cổng API" value={health?.ok ? "Hoạt động" : "Chưa kết nối"} tone={health?.ok ? "success" : "warning"} icon={Shield} />
        <MetricCard label="Sinh viên" value={userStats.STUDENT || 0} icon={Users} />
        <MetricCard label="Giảng viên" value={userStats.LECTURER || 0} icon={Users} />
        <MetricCard label="Chờ duyệt" value={userStats.PENDING || 0} tone={(userStats.PENDING || 0) > 0 ? "warning" : "success"} icon={CheckCircle2} />
      </div>

      <div className="admin-users-layout">
        <form className="panel form-panel admin-create-user-panel" onSubmit={createUser}>
          <div className="panel-title-row">
            <div>
              <h2>Tạo tài khoản</h2>
              <p className="muted">Admin chỉ tạo tài khoản sinh viên hoặc giảng viên trong giao diện này.</p>
            </div>
            <UserPlus size={22} />
          </div>

          <label>
            Họ tên
            <input
              value={createForm.name}
              onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={createForm.email}
              onChange={(event) => setCreateForm({ ...createForm, email: event.target.value })}
              required
            />
          </label>

          <label>
            Mật khẩu
            <input
              type="password"
              value={createForm.password}
              onChange={(event) => setCreateForm({ ...createForm, password: event.target.value })}
              required
            />
          </label>

          <div className="compact-grid">
            <label>
              Vai trò
              <select
                value={createForm.role}
                onChange={(event) => setCreateForm({ ...createForm, role: event.target.value })}
              >
                <option value="STUDENT">Sinh viên</option>
                <option value="LECTURER">Giảng viên</option>
              </select>
            </label>

            <label>
              Trạng thái
              <select
                value={createForm.status}
                onChange={(event) => setCreateForm({ ...createForm, status: event.target.value })}
              >
                <option value="ACTIVE">Hoạt động ngay</option>
                <option value="PENDING">Chờ duyệt</option>
              </select>
            </label>
          </div>

          <label>
            Git username
            <input
              value={createForm.gitUsername}
              onChange={(event) => setCreateForm({ ...createForm, gitUsername: event.target.value })}
              placeholder="Tùy chọn"
            />
          </label>

          <button className="primary-button" disabled={creating}>
            <UserPlus size={16} />
            {creating ? "Đang tạo..." : "Tạo tài khoản"}
          </button>
        </form>

        <div className="panel admin-table-panel">
          <div className="toolbar-row admin-filter-bar">
            <div>
              <h2>Danh sách người dùng</h2>
              <p className="muted">Thao tác nhạy cảm được khóa với tài khoản admin.</p>
            </div>
            <div className="toolbar-actions">
              <div className="search-control">
                <Search size={16} />
                <input
                  placeholder="Tìm tên hoặc email"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
                <option value="">Tất cả vai trò</option>
                <option value="STUDENT">Sinh viên</option>
                <option value="LECTURER">Giảng viên</option>
                <option value="ADMIN">Quản trị viên</option>
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Chờ duyệt</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="REJECTED">Đã từ chối</option>
              </select>
              <button className="secondary-button" onClick={() => loadUsers()}>
                <Filter size={16} />
                Lọc
              </button>
            </div>
          </div>

          <div className="admin-user-table">
            <div className="admin-user-table-head">
              <span>Người dùng</span>
              <span>Vai trò</span>
              <span>Trạng thái</span>
              <span>GitHub</span>
              <span>Thao tác</span>
            </div>
            {users.map((user) => (
              <div className="admin-user-row" key={user.id}>
                <div className="admin-user-identity">
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                  <small>ID: {user.id}</small>
                </div>
                <select
                  value={user.role}
                  disabled={user.role === "ADMIN"}
                  onChange={(event) => changeRole(user.id, event.target.value)}
                >
                  <option value="STUDENT">Sinh viên</option>
                  <option value="LECTURER">Giảng viên</option>
                  {user.role === "ADMIN" && <option value="ADMIN">Quản trị viên</option>}
                </select>
                <div className="admin-status-cell">
                  <span className={`status-pill ${statusTone(user.status)}`}>
                    {statusLabels[user.status] || user.status}
                  </span>
                  <select
                    value={user.status || "ACTIVE"}
                    disabled={user.role === "ADMIN"}
                    onChange={(event) => changeStatus(user.id, event.target.value)}
                  >
                    <option value="PENDING">Chờ duyệt</option>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="REJECTED">Từ chối</option>
                  </select>
                </div>
                <div className="admin-git-cell">
                  <input
                    className="compact-input"
                    placeholder="GitHub username"
                    value={gitForms[user.id] ?? user.gitUsername ?? ""}
                    disabled={user.role === "ADMIN"}
                    onChange={(event) =>
                      setGitForms((current) => ({ ...current, [user.id]: event.target.value }))
                    }
                  />
                  <button
                    className="secondary-button icon-button-text"
                    disabled={user.role === "ADMIN"}
                    onClick={() => changeGitUsername(user.id)}
                  >
                    <Save size={15} />
                    Lưu
                  </button>
                </div>
                <div className="admin-actions-cell">
                  {user.status === "PENDING" && user.role !== "ADMIN" && (
                    <>
                      <button className="secondary-button" onClick={() => changeStatus(user.id, "ACTIVE")}>
                        Duyệt
                      </button>
                      <button className="ghost-button" onClick={() => changeStatus(user.id, "REJECTED")}>
                        Từ chối
                      </button>
                    </>
                  )}
                  <button
                    className={confirmDeleteId === user.id ? "danger-button" : "ghost-button"}
                    disabled={user.role === "ADMIN"}
                    onClick={() => deleteUser(user.id)}
                  >
                    <Trash2 size={15} />
                    {confirmDeleteId === user.id ? "Xác nhận xóa" : "Xóa"}
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <div className="empty-state compact">
                <strong>Không có người dùng phù hợp</strong>
                <span>Thử đổi từ khóa tìm kiếm hoặc bỏ bớt bộ lọc.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
