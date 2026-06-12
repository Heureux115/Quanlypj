import { useEffect, useMemo, useState } from "react";
import { GitBranch, Search, Users } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Projects() {
  const { user, setActiveGroup } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectQuery, setProjectQuery] = useState("");
  const [groupQuery, setGroupQuery] = useState("");
  const [requestedGroups, setRequestedGroups] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.projects().then(setProjects).catch((err) => setError(err.message));
  }, []);

  const joinedGroupId = useMemo(() => {
    if (!selectedProject || !user) return null;
    const group = selectedProject.groups.find((item) => item.members?.some((member) => member.userId === user.id));
    return group?.id || null;
  }, [selectedProject, user]);

  const filteredProjects = projects.filter((project) =>
    `${project.title} ${project.description || ""} ${project.lecturer?.name || ""}`
      .toLowerCase()
      .includes(projectQuery.trim().toLowerCase())
  );

  const filteredGroups = (selectedProject?.groups || []).filter((group) =>
    `${group.name} ${group.leader?.name || ""} ${group.gitRepoUrl || ""}`
      .toLowerCase()
      .includes(groupQuery.trim().toLowerCase())
  );

  async function openProject(id) {
    setError("");
    setNotice("");
    setGroupQuery("");
    try {
      const project = await api.project(id);
      setSelectedProject(project);
    } catch (err) {
      setError(err.message);
    }
  }

  async function requestJoin(group) {
    setError("");
    setNotice("");
    try {
      await api.requestToJoinGroup(group.id, {
        message: `Sinh viên ${user.name} xin tham gia nhóm ${group.name}`
      });
      setRequestedGroups((current) => ({ ...current, [group.id]: true }));
      setNotice("Đã gửi yêu cầu. Nhóm trưởng hoặc giảng viên sẽ xét duyệt.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page project-hub-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Không gian dự án</p>
          <h1>Chọn dự án, xem nhóm và bắt đầu làm việc</h1>
          <p className="muted">
            Mỗi dự án là một hub gồm nhóm, repository, thành viên và quyền tham gia. Chọn dự án để xem các nhóm đang mở.
          </p>
        </div>
        <div className="header-stats">
          <span className="badge">{projects.length} dự án</span>
          <span className="badge">{selectedProject?.groups?.length || 0} nhóm đang xem</span>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="project-hub-layout">
        <aside className="panel project-browser">
          <div className="panel-title-row">
            <h2>Dự án hiện có</h2>
            <span className="badge">{filteredProjects.length}</span>
          </div>
          <div className="search-field">
            <Search size={18} />
            <input
              className="screen-search"
              value={projectQuery}
              onChange={(event) => setProjectQuery(event.target.value)}
              placeholder="Tìm theo tên dự án hoặc giảng viên"
            />
          </div>
          <div className="project-list project-hub-list">
            {filteredProjects.map((project) => (
              <button
                className={`project-row project-hub-item ${selectedProject?.id === project.id ? "selected" : ""}`}
                key={project.id}
                onClick={() => openProject(project.id)}
              >
                <div>
                  <strong>{project.title}</strong>
                  <span>{project.lecturer?.name || "Chưa rõ giảng viên"}</span>
                </div>
                <small>{project.groups?.length || 0} nhóm</small>
              </button>
            ))}
            {filteredProjects.length === 0 && (
              <div className="empty-state compact">
                <strong>Không tìm thấy dự án</strong>
                <span>Thử tìm bằng tên khác hoặc tên giảng viên.</span>
              </div>
            )}
          </div>
        </aside>

        <div className="panel project-detail-panel">
          <div className="panel-title-row">
            <div>
              <h2>{selectedProject ? selectedProject.title : "Hub dự án"}</h2>
              <p className="muted">
                {selectedProject
                  ? selectedProject.description || "Dự án chưa có mô tả."
                  : "Chọn một dự án ở danh sách bên trái để xem nhóm, trưởng nhóm, thành viên và repository."}
              </p>
            </div>
            {selectedProject && <span className="badge">{selectedProject.groups?.length || 0} nhóm</span>}
          </div>

          {!selectedProject && (
            <div className="empty-state">
              <strong>Chọn một dự án để mở hub nhóm</strong>
              <span>Thông tin nhóm, số lượng thành viên, trạng thái tham gia và repository sẽ hiển thị tại đây.</span>
            </div>
          )}

          {selectedProject && (
            <div className="detail-stack">
              <div className="project-focus-card compact">
                <div>
                  <span>Số nhóm</span>
                  <strong>{selectedProject.groups?.length || 0}</strong>
                </div>
                <div>
                  <span>Thành viên tối đa</span>
                  <strong>{selectedProject.maxMembers}/nhóm</strong>
                </div>
                <div>
                  <span>Hạn nộp</span>
                  <strong>{selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString("vi-VN") : "Chưa có"}</strong>
                </div>
              </div>

              <div className="search-field">
                <Search size={18} />
                <input
                  className="screen-search"
                  value={groupQuery}
                  onChange={(event) => setGroupQuery(event.target.value)}
                  placeholder="Tìm nhóm theo tên, trưởng nhóm hoặc repo"
                />
              </div>

              <div className="group-grid project-group-grid">
                {filteredGroups.map((group) => {
                  const joined = group.members?.some((member) => member.userId === user.id);
                  const blockedByOtherGroup = Boolean(joinedGroupId && joinedGroupId !== group.id);
                  const pending = requestedGroups[group.id];

                  return (
                    <article className="group-card project-group-card" key={group.id}>
                      <div className="group-card-header">
                        <div>
                          <strong>{group.name}</strong>
                          <span>Trưởng nhóm: {group.leader?.name || "Chưa chọn"}</span>
                        </div>
                        {joined && <span className="status-pill success">Đã tham gia</span>}
                        {pending && <span className="status-pill warning">Chờ duyệt</span>}
                      </div>
                      <div className="group-card-stats">
                        <span><Users size={13} /> {group.members?.length || 0}/{selectedProject.maxMembers} thành viên</span>
                      </div>
                      {group.gitRepoUrl ? (
                        <a className="repo-link" href={group.gitRepoUrl} target="_blank" rel="noreferrer">
                          <GitBranch size={15} />
                          {group.gitRepoUrl}
                        </a>
                      ) : (
                        <span className="muted">Chưa cấu hình kho Git</span>
                      )}
                      <div className="button-row">
                        <button className="secondary-button" onClick={() => setActiveGroup(group)}>
                          Chọn nhóm
                        </button>
                        <button
                          className="ghost-button"
                          disabled={joined || pending || blockedByOtherGroup}
                          onClick={() => requestJoin(group)}
                        >
                          {joined
                            ? "Đã tham gia"
                            : pending
                              ? "Đang chờ duyệt"
                              : blockedByOtherGroup
                                ? "Đã ở nhóm khác"
                                : "Xin vào nhóm"}
                        </button>
                      </div>
                    </article>
                  );
                })}
                {filteredGroups.length === 0 && (
                  <div className="empty-state compact">
                    <strong>Không tìm thấy nhóm phù hợp</strong>
                    <span>Thử tìm theo tên nhóm, trưởng nhóm hoặc repository.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
