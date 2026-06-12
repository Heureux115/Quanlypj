import { useEffect, useState } from "react";
import { Calendar, FolderKanban, GitBranch, Search, Users } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import MetricCard from "../components/MetricCard.jsx";

export default function MyGroups() {
  const { user, setActiveGroup } = useAuth();
  const [groups, setGroups] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    setError("");
    try {
      const result = await api.myGroups();
      setGroups(result);
    } catch (err) {
      setError(err.message);
    }
  }

  function chooseGroup(group) {
    setActiveGroup(group);
    setNotice(`Đã chọn nhóm ${group.name}.`);
  }

  const filteredGroups = groups.filter((group) =>
    `${group.name} ${group.project?.title || ""} ${group.leader?.name || ""} ${group.gitRepoUrl || ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );
  const totalTasks = groups.reduce((sum, group) => sum + (group.tasks?.length || 0), 0);
  const doneTasks = groups.reduce(
    (sum, group) => sum + (group.tasks || []).filter((task) => task.status === "DONE").length,
    0
  );

  return (
    <section className="page">
      <div className="dashboard-hero compact workspace-hero">
        <div>
          <p className="eyebrow">Nhóm của tôi</p>
          <h1>Chọn nhóm để mở workspace dự án</h1>
          <p>Mỗi nhóm mở ra công việc, trò chuyện, báo cáo và kho GitHub tương ứng. Hãy chọn đúng nhóm trước khi thao tác.</p>
        </div>
        <div className="hero-status-card">
          <span>Tài khoản</span>
          <strong>{user?.name}</strong>
          <small>{user?.role === "LECTURER" ? "Giảng viên" : user?.role === "ADMIN" ? "Quản trị viên" : "Sinh viên"}</small>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="metric-grid">
        <MetricCard label="Số nhóm" value={groups.length} icon={Users} />
        <MetricCard label="Tổng công việc" value={totalTasks} icon={FolderKanban} />
        <MetricCard label="Đã hoàn thành" value={doneTasks} tone="success" icon={Calendar} />
        <MetricCard label="Có GitHub" value={groups.filter((group) => group.gitRepoUrl).length} icon={GitBranch} />
      </div>

      <div className="panel toolbar-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            className="screen-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm theo tên nhóm, dự án, trưởng nhóm hoặc repository"
          />
        </div>
      </div>

      <div className="group-grid my-groups-grid">
        {filteredGroups.map((group) => {
          const tasks = group.tasks || [];
          const done = tasks.filter((task) => task.status === "DONE").length;
          const progress = tasks.length ? Math.round((done / tasks.length) * 100) : 0;

          return (
            <article className="group-card rich-group-card workspace-group-card" key={group.id}>
              <div className="group-card-header">
                <div>
                  <strong>{group.name}</strong>
                  <span>{group.project?.title || "Chưa rõ dự án"}</span>
                </div>
                <span className={`status-pill ${progress >= 100 ? "success" : "warning"}`}>{progress}%</span>
              </div>
              <div className="group-card-stats">
                <span>{group.members?.length || 0} thành viên</span>
                <span>{tasks.length} công việc</span>
                <span>Trưởng nhóm: {group.leader?.name || "Chưa chọn"}</span>
              </div>
              {group.gitRepoUrl ? (
                <a className="repo-link" href={group.gitRepoUrl} target="_blank" rel="noreferrer">
                  <GitBranch size={15} />
                  {group.gitRepoUrl}
                </a>
              ) : (
                <span className="muted">Chưa cấu hình repo GitHub</span>
              )}
              <div className="task-progress" aria-label={`Tiến độ ${progress}%`}>
                <div style={{ width: `${progress}%` }} />
              </div>
              <button className="primary-button" onClick={() => chooseGroup(group)}>
                Chọn nhóm này
              </button>
            </article>
          );
        })}
        {groups.length === 0 && (
          <div className="empty-state">
            <strong>Bạn chưa tham gia nhóm nào</strong>
            <span>Vào mục Không gian dự án để tìm nhóm và gửi yêu cầu tham gia.</span>
          </div>
        )}
        {groups.length > 0 && filteredGroups.length === 0 && (
          <div className="empty-state">
            <strong>Không tìm thấy nhóm phù hợp</strong>
            <span>Thử tìm bằng tên dự án, trưởng nhóm hoặc đường dẫn repo.</span>
          </div>
        )}
      </div>
    </section>
  );
}
