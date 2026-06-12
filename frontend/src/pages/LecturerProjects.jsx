import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CalendarClock,
  CheckCircle2,
  FolderKanban,
  GitBranch,
  Plus,
  RefreshCw,
  Search,
  UserPlus,
  Users
} from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import MetricCard from "../components/MetricCard.jsx";

const defaultCriteria = [
  { name: "Task hoàn thành", weight: 40 },
  { name: "Đóng góp Git", weight: 30 },
  { name: "Đánh giá chéo", weight: 30 }
];

const defaultProjectForm = {
  title: "",
  description: "",
  maxGroups: 3,
  maxMembers: 4,
  deadline: "",
  criteria: defaultCriteria
};

function formatDate(value) {
  if (!value) return "Chưa có hạn nộp";
  return new Date(value).toLocaleString("vi-VN");
}

export default function LecturerProjects() {
  const { setActiveGroup } = useAuth();
  const [projects, setProjects] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [projectForm, setProjectForm] = useState(defaultProjectForm);
  const [groupForm, setGroupForm] = useState({ name: "", gitRepoUrl: "" });
  const [memberForm, setMemberForm] = useState({ userId: "", makeLeader: false });
  const [studentQuery, setStudentQuery] = useState("");
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentGitForms, setStudentGitForms] = useState({});
  const [repoUrl, setRepoUrl] = useState("");
  const [syncResult, setSyncResult] = useState(null);
  const [leaderId, setLeaderId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadProjects();
    api.users({ role: "STUDENT" })
      .then((result) => {
        setStudents(result);
        setStudentGitForms(Object.fromEntries(result.map((student) => [student.id, student.gitUsername || ""])));
      })
      .catch(() => setStudents([]));
  }, []);

  const selectedGroupMembers = useMemo(() => selectedGroup?.members || [], [selectedGroup]);
  const selectedMemberIds = useMemo(
    () => new Set(selectedGroupMembers.map((member) => member.userId)),
    [selectedGroupMembers]
  );
  const filteredStudents = useMemo(() => {
    const query = studentQuery.trim().toLowerCase();
    return students.filter((student) => {
      const matched = `${student.name} ${student.email} ${student.gitUsername || ""}`.toLowerCase().includes(query);
      return matched && !selectedMemberIds.has(student.id);
    });
  }, [students, studentQuery, selectedMemberIds]);
  const selectedStudent = useMemo(
    () => students.find((student) => student.id === Number(memberForm.userId)),
    [students, memberForm.userId]
  );
  const criteriaTotal = useMemo(
    () => projectForm.criteria.reduce((sum, item) => sum + Number(item.weight || 0), 0),
    [projectForm.criteria]
  );

  const projectGroups = selectedProject?.groups || [];
  const totalMembers = projectGroups.reduce((sum, group) => sum + (group.members?.length || 0), 0);
  const filledSlots = selectedProject ? `${totalMembers}/${projectGroups.length * selectedProject.maxMembers || 0}` : "0";

  async function loadProjects() {
    setError("");
    try {
      const result = await api.projects();
      setProjects(result);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openProject(id) {
    setError("");
    setNotice("");
    try {
      const project = await api.project(id);
      setSelectedProject(project);
      setSelectedGroup(null);
      setLeaderId("");
      setGroupForm({ name: "", gitRepoUrl: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  function updateCriteria(index, patch) {
    setProjectForm((current) => ({
      ...current,
      criteria: current.criteria.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    }));
  }

  async function createProject(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (criteriaTotal !== 100) {
      setError("Tổng trọng số tiêu chí phải bằng 100%.");
      return;
    }

    try {
      const project = await api.createProject({
        title: projectForm.title,
        description: projectForm.description,
        maxGroups: Number(projectForm.maxGroups),
        maxMembers: Number(projectForm.maxMembers),
        deadline: projectForm.deadline || null,
        criteria: projectForm.criteria.map((item) => ({
          name: item.name,
          weight: Number(item.weight)
        }))
      });
      setProjects((current) => [project, ...current]);
      setProjectForm({
        ...defaultProjectForm,
        criteria: defaultCriteria.map((item) => ({ ...item }))
      });
      setShowCreateProject(false);
      setNotice("Đã tạo dự án mới. Bạn có thể tạo nhóm cho dự án này ở bước tiếp theo.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function createGroup(event) {
    event.preventDefault();
    if (!selectedProject) return;
    setError("");
    setNotice("");

    try {
      const group = await api.createGroup({
        name: groupForm.name,
        projectId: selectedProject.id,
        gitRepoUrl: groupForm.gitRepoUrl || null
      });
      const freshProject = await api.project(selectedProject.id);
      setSelectedProject(freshProject);
      setProjects((current) =>
        current.map((project) =>
          project.id === selectedProject.id
            ? { ...project, groups: freshProject.groups }
            : project
        )
      );
      setGroupForm({ name: "", gitRepoUrl: "" });
      setNotice(`Đã tạo nhóm "${group.name}".`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function openGroup(groupId) {
    setError("");
    setNotice("");
    try {
      const group = await api.group(groupId);
      setSelectedGroup(group);
      setActiveGroup(group);
      setLeaderId(group.leaderId || "");
      setRepoUrl(group.gitRepoUrl || "");
      setStudentGitForms((current) => ({
        ...current,
        ...Object.fromEntries((group.members || []).map((member) => [member.userId, member.user?.gitUsername || ""]))
      }));
      setSyncResult(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function addMember(event) {
    event.preventDefault();
    if (!selectedGroup) return;
    setError("");
    setNotice("");
    try {
      const result = await api.addGroupMember(selectedGroup.id, {
        userId: Number(memberForm.userId),
        makeLeader: memberForm.makeLeader
      });
      const freshGroup = await api.group(selectedGroup.id);
      setSelectedGroup(freshGroup);
      setActiveGroup(freshGroup);
      setLeaderId(freshGroup.leaderId || "");
      setMemberForm({ userId: "", makeLeader: false });
      setStudentQuery("");
      setStudentPickerOpen(false);
      setNotice(result.group ? "Đã thêm sinh viên và đặt làm nhóm trưởng." : "Đã thêm sinh viên vào nhóm.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function setLeader(event) {
    event.preventDefault();
    if (!selectedGroup || !leaderId) return;
    setError("");
    setNotice("");
    try {
      await api.setGroupLeader(selectedGroup.id, { userId: Number(leaderId) });
      const freshGroup = await api.group(selectedGroup.id);
      setSelectedGroup(freshGroup);
      setActiveGroup(freshGroup);
      setNotice("Đã cập nhật nhóm trưởng.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function updateStudentGitUsername(userId) {
    setError("");
    setNotice("");
    try {
      const updated = await api.updateUserGitUsername(userId, {
        gitUsername: studentGitForms[userId] || ""
      });
      setStudents((current) => current.map((student) => (student.id === updated.id ? updated : student)));
      if (selectedGroup) {
        setSelectedGroup({
          ...selectedGroup,
          members: selectedGroup.members.map((member) =>
            member.userId === updated.id ? { ...member, user: updated } : member
          )
        });
      }
      setStudentGitForms((current) => ({ ...current, [updated.id]: updated.gitUsername || "" }));
      setNotice("Đã cập nhật GitHub username của sinh viên.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveRepo(event) {
    event.preventDefault();
    if (!selectedGroup) return;
    setError("");
    setNotice("");
    try {
      const group = await api.updateGroupRepo(selectedGroup.id, { gitRepoUrl: repoUrl });
      const freshGroup = await api.group(group.id);
      setSelectedGroup(freshGroup);
      setActiveGroup(freshGroup);
      setRepoUrl(freshGroup.gitRepoUrl || "");
      setNotice("Đã cập nhật repository Git cho nhóm.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function syncGitHub() {
    if (!selectedGroup) return;
    setError("");
    setNotice("");
    setSyncResult(null);
    try {
      const result = await api.syncGitHubGroup(selectedGroup.id, {
        maxCommits: 50,
        includePushEvents: true
      });
      setSyncResult(result);
      setNotice("Đã đồng bộ dữ liệu GitHub.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page lecturer-projects-page">
      <div className="page-header lecturer-command-header">
        <div>
          <p className="eyebrow">Dự án phụ trách</p>
          <h1>Không gian giám sát dự án</h1>
          <p className="muted">
            Tạo đề tài, theo dõi nhóm sinh viên, phân công nhóm trưởng, kiểm tra repository và chuyển nhanh sang duyệt báo cáo.
          </p>
        </div>
        <div className="toolbar-actions">
          <button className="secondary-button" onClick={loadProjects}>
            <RefreshCw size={16} />
            Tải lại
          </button>
          <button className="primary-button" onClick={() => setShowCreateProject((value) => !value)}>
            <Plus size={16} />
            {showCreateProject ? "Đóng biểu mẫu" : "Tạo dự án"}
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="metric-grid">
        <MetricCard label="Dự án phụ trách" value={projects.length} icon={FolderKanban} />
        <MetricCard label="Nhóm trong dự án" value={projectGroups.length} icon={Users} />
        <MetricCard label="Sinh viên đã xếp nhóm" value={filledSlots} icon={UserPlus} />
        <MetricCard label="Hạn nộp dự án" value={selectedProject ? formatDate(selectedProject.deadline) : "Chọn dự án"} icon={CalendarClock} />
      </div>

      {showCreateProject && (
        <form className="panel form-panel lecturer-create-panel" onSubmit={createProject}>
          <div className="panel-title-row">
            <div>
              <h2>Tạo dự án mới</h2>
              <p className="muted">Thiết lập giới hạn nhóm, hạn nộp và tiêu chí chấm điểm ngay từ đầu.</p>
            </div>
            <span className={`status-pill ${criteriaTotal === 100 ? "success" : "warning"}`}>
              Tổng tiêu chí {criteriaTotal}%
            </span>
          </div>
          <div className="split-layout">
            <div className="form-panel">
              <label>
                Tên dự án
                <input
                  value={projectForm.title}
                  onChange={(event) => setProjectForm({ ...projectForm, title: event.target.value })}
                  required
                />
              </label>
              <label>
                Mô tả
                <textarea
                  value={projectForm.description}
                  onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })}
                  required
                />
              </label>
              <div className="compact-grid">
                <label>
                  Số nhóm tối đa
                  <input
                    type="number"
                    min="1"
                    value={projectForm.maxGroups}
                    onChange={(event) => setProjectForm({ ...projectForm, maxGroups: event.target.value })}
                    required
                  />
                </label>
                <label>
                  Thành viên mỗi nhóm
                  <input
                    type="number"
                    min="1"
                    value={projectForm.maxMembers}
                    onChange={(event) => setProjectForm({ ...projectForm, maxMembers: event.target.value })}
                    required
                  />
                </label>
              </div>
              <label>
                Hạn nộp
                <input
                  type="datetime-local"
                  value={projectForm.deadline}
                  onChange={(event) => setProjectForm({ ...projectForm, deadline: event.target.value })}
                />
              </label>
            </div>

            <div className="form-panel">
              <h2>Tiêu chí đánh giá</h2>
              <div className="criteria-list">
                {projectForm.criteria.map((criterion, index) => (
                  <div className="criteria-row" key={index}>
                    <input
                      value={criterion.name}
                      onChange={(event) => updateCriteria(index, { name: event.target.value })}
                      required
                    />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={criterion.weight}
                      onChange={(event) => updateCriteria(index, { weight: event.target.value })}
                      required
                    />
                  </div>
                ))}
              </div>
              <button className="primary-button">Lưu dự án</button>
            </div>
          </div>
        </form>
      )}

      <div className="lecturer-supervision-layout">
        <aside className="panel project-browser lecturer-project-browser">
          <div className="panel-title-row">
            <div>
              <h2>Dự án</h2>
              <p className="muted">Chọn một dự án để mở bảng giám sát.</p>
            </div>
          </div>
          <div className="project-list project-hub-list">
            {projects.map((project) => (
              <button
                className={`project-row project-hub-item ${selectedProject?.id === project.id ? "selected" : ""}`}
                key={project.id}
                onClick={() => openProject(project.id)}
              >
                <div>
                  <strong>{project.title}</strong>
                  <span>{project.description || "Chưa có mô tả"}</span>
                </div>
                <small>{project.groups?.length || 0} nhóm</small>
              </button>
            ))}
            {projects.length === 0 && (
              <div className="empty-state compact">
                <strong>Chưa có dự án</strong>
                <span>Tạo dự án mới để bắt đầu phân nhóm sinh viên.</span>
              </div>
            )}
          </div>
        </aside>

        <main className="lecturer-project-workspace">
          {!selectedProject && (
            <div className="panel empty-state">
              <FolderKanban size={36} />
              <strong>Chọn dự án để giám sát</strong>
              <span>Bảng nhóm, thành viên, GitHub và các hành động duyệt sẽ xuất hiện tại đây.</span>
            </div>
          )}

          {selectedProject && (
            <>
              <div className="panel project-focus-card lecturer-focus-card">
                <div>
                  <span>Dự án</span>
                  <strong>{selectedProject.title}</strong>
                  <small>{selectedProject.description || "Chưa có mô tả"}</small>
                </div>
                <div>
                  <span>Nhóm</span>
                  <strong>{projectGroups.length}/{selectedProject.maxGroups}</strong>
                  <small>Tối đa {selectedProject.maxMembers} thành viên/nhóm</small>
                </div>
                <div>
                  <span>Hạn nộp</span>
                  <strong>{formatDate(selectedProject.deadline)}</strong>
                </div>
              </div>

              <div className="panel form-panel">
                <div className="panel-title-row">
                  <div>
                    <h2>Tạo nhóm sinh viên</h2>
                    <p className="muted">Nhóm mới được gắn trực tiếp vào dự án đang chọn.</p>
                  </div>
                </div>
                <form className="inline-form" onSubmit={createGroup}>
                  <input
                    placeholder="Tên nhóm"
                    value={groupForm.name}
                    onChange={(event) => setGroupForm({ ...groupForm, name: event.target.value })}
                    required
                  />
                  <input
                    placeholder="GitHub repo URL (tùy chọn)"
                    value={groupForm.gitRepoUrl}
                    onChange={(event) => setGroupForm({ ...groupForm, gitRepoUrl: event.target.value })}
                  />
                  <button className="primary-button">
                    <Plus size={16} />
                    Tạo nhóm
                  </button>
                </form>
              </div>

              <div className="panel">
                <div className="panel-title-row">
                  <div>
                    <h2>Theo dõi nhóm sinh viên</h2>
                    <p className="muted">Mở nhóm để quản lý thành viên, trưởng nhóm, GitHub và báo cáo.</p>
                  </div>
                  <span className="badge">{projectGroups.length} nhóm</span>
                </div>
                <div className="group-grid lecturer-group-grid">
                  {projectGroups.map((group) => (
                    <article className={`group-card lecturer-group-card ${selectedGroup?.id === group.id ? "selected" : ""}`} key={group.id}>
                      <div>
                        <strong>{group.name}</strong>
                        <span>Trưởng nhóm: {group.leader?.name || "Chưa chọn"}</span>
                        <span>{group.members?.length || 0}/{selectedProject.maxMembers} thành viên</span>
                      </div>
                      <div className="button-row">
                        <button className="secondary-button" onClick={() => openGroup(group.id)}>
                          Quản lý
                        </button>
                        <Link className="ghost-button" to="/reports" onClick={() => setActiveGroup(group)}>
                          Xem báo cáo
                        </Link>
                        <Link className="ghost-button" to="/join-requests" onClick={() => setActiveGroup(group)}>
                          Duyệt yêu cầu
                        </Link>
                      </div>
                    </article>
                  ))}
                  {projectGroups.length === 0 && (
                    <div className="empty-state compact">
                      <strong>Chưa có nhóm</strong>
                      <span>Tạo nhóm đầu tiên để bắt đầu theo dõi sinh viên.</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {selectedGroup && (
        <div className="lecturer-group-detail">
          <div className="panel form-panel">
            <div className="panel-title-row">
              <div>
                <h2>{selectedGroup.name}</h2>
                <p className="muted">Quản lý thành viên và GitHub username dùng để khớp commit.</p>
              </div>
              <span className="status-pill success">{selectedGroupMembers.length} thành viên</span>
            </div>
            <div className="member-list">
              {selectedGroupMembers.map((member) => (
                <div className="member-row lecturer-member-row" key={member.userId}>
                  <div>
                    <strong>{member.user?.name || `Thành viên #${member.userId}`}</strong>
                    <span>{member.user?.email}</span>
                    <span>GitHub: {member.user?.gitUsername || "Chưa khai báo"}</span>
                  </div>
                  <div className="button-row">
                    <input
                      className="compact-input"
                      placeholder="GitHub username"
                      value={studentGitForms[member.userId] ?? member.user?.gitUsername ?? ""}
                      onChange={(event) =>
                        setStudentGitForms((current) => ({ ...current, [member.userId]: event.target.value }))
                      }
                    />
                    <button className="secondary-button" onClick={() => updateStudentGitUsername(member.userId)}>
                      Lưu Git
                    </button>
                  </div>
                  {selectedGroup.leaderId === member.userId && <span className="status-pill success">Nhóm trưởng</span>}
                </div>
              ))}
              {selectedGroupMembers.length === 0 && (
                <div className="empty-state compact">
                  <strong>Nhóm chưa có thành viên</strong>
                  <span>Thêm sinh viên từ danh sách bên cạnh.</span>
                </div>
              )}
            </div>
          </div>

          <div className="panel form-panel lecturer-actions-panel">
            <form className="form-panel" onSubmit={addMember}>
              <h2>Thêm sinh viên</h2>
              <label>
                Chọn sinh viên
                <div className="combo-box">
                  <Search className="input-leading-icon" size={16} />
                  <input
                    value={studentPickerOpen ? studentQuery : selectedStudent?.name || studentQuery}
                    onFocus={() => {
                      setStudentPickerOpen(true);
                      if (selectedStudent) setStudentQuery("");
                    }}
                    onChange={(event) => {
                      setStudentQuery(event.target.value);
                      setStudentPickerOpen(true);
                      setMemberForm({ ...memberForm, userId: "" });
                    }}
                    placeholder="Gõ tên, email hoặc GitHub username..."
                    required={!memberForm.userId}
                  />
                  {studentPickerOpen && (
                    <div className="combo-menu">
                      {filteredStudents.map((student) => (
                        <button
                          type="button"
                          key={student.id}
                          onMouseDown={() => {
                            setMemberForm({ ...memberForm, userId: String(student.id) });
                            setStudentQuery(student.name);
                            setStudentPickerOpen(false);
                          }}
                        >
                          <strong>{student.name}</strong>
                          <span>{student.email}{student.gitUsername ? ` - ${student.gitUsername}` : ""}</span>
                        </button>
                      ))}
                      {filteredStudents.length === 0 && (
                        <p className="muted">Không tìm thấy sinh viên phù hợp hoặc sinh viên đã ở trong nhóm.</p>
                      )}
                    </div>
                  )}
                </div>
              </label>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={memberForm.makeLeader}
                  onChange={(event) => setMemberForm({ ...memberForm, makeLeader: event.target.checked })}
                />
                Đặt làm nhóm trưởng sau khi thêm
              </label>
              <button className="primary-button">
                <UserPlus size={16} />
                Thêm vào nhóm
              </button>
            </form>

            <form className="form-panel" onSubmit={setLeader}>
              <h2>Chọn nhóm trưởng</h2>
              <label>
                Thành viên
                <select value={leaderId} onChange={(event) => setLeaderId(event.target.value)} required>
                  <option value="">Chọn sinh viên</option>
                  {selectedGroupMembers.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {member.user?.name || `Thành viên #${member.userId}`}
                    </option>
                  ))}
                </select>
              </label>
              <button className="secondary-button">
                <CheckCircle2 size={16} />
                Cập nhật nhóm trưởng
              </button>
            </form>

            <form className="form-panel" onSubmit={saveRepo}>
              <h2>Tích hợp GitHub</h2>
              <label>
                Repository URL
                <input
                  placeholder="https://github.com/owner/repo"
                  value={repoUrl}
                  onChange={(event) => setRepoUrl(event.target.value)}
                />
              </label>
              <div className="button-row">
                <button className="secondary-button">
                  <GitBranch size={16} />
                  Lưu repo
                </button>
                <button type="button" className="primary-button" onClick={syncGitHub}>
                  <RefreshCw size={16} />
                  Đồng bộ GitHub
                </button>
              </div>
              {syncResult && (
                <div className="info-box">
                  Commit nhập: {syncResult.importedCommits}, khớp thành viên: {syncResult.matchedCommits}, lượt push: {syncResult.importedPushEvents}
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
