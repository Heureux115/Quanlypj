import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, GraduationCap, Save, Users } from "lucide-react";
import { api } from "../api/client.js";
import MetricCard from "../components/MetricCard.jsx";

function buildGroupBuckets(rows = []) {
  const buckets = new Map();

  rows.forEach((row) => {
    const groupId = row.group?.id || "unknown";
    const groupName = row.group?.name || "Chưa rõ nhóm";
    if (!buckets.has(groupId)) {
      buckets.set(groupId, {
        id: groupId,
        name: groupName,
        rows: []
      });
    }
    buckets.get(groupId).rows.push(row);
  });

  return Array.from(buckets.values());
}

export default function FinalGrades() {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [gradeData, setGradeData] = useState(null);
  const [forms, setForms] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    api.projects().then(setProjects).catch((err) => setError(err.message));
  }, []);

  const groups = useMemo(() => buildGroupBuckets(gradeData?.rows || []), [gradeData]);
  const activeGroup = groups.find((group) => String(group.id) === String(selectedGroupId)) || groups[0] || null;
  const visibleRows = activeGroup?.rows || [];
  const totalRows = gradeData?.rows || [];
  const gradedCount = totalRows.filter((row) => row.finalGrade).length;
  const groupGradedCount = visibleRows.filter((row) => row.finalGrade).length;

  async function loadGrades(projectId) {
    setError("");
    setNotice("");
    setSelectedProjectId(projectId);
    setSelectedGroupId("");
    if (!projectId) {
      setGradeData(null);
      return;
    }

    try {
      const result = await api.projectGrades(projectId);
      setGradeData(result);
      const nextForms = {};
      result.rows.forEach((row) => {
        nextForms[row.user.id] = {
          score: row.finalGrade?.score ?? "",
          comment: row.finalGrade?.comment ?? ""
        };
      });
      setForms(nextForms);
      const firstGroupId = result.rows[0]?.group?.id;
      if (firstGroupId) setSelectedGroupId(String(firstGroupId));
    } catch (err) {
      setError(err.message);
    }
  }

  function updateForm(userId, patch) {
    setForms((current) => ({
      ...current,
      [userId]: {
        ...(current[userId] || { score: "", comment: "" }),
        ...patch
      }
    }));
  }

  async function saveGrade(row) {
    setError("");
    setNotice("");
    const form = forms[row.user.id] || {};
    try {
      const grade = await api.gradeStudent({
        userId: row.user.id,
        projectId: Number(selectedProjectId),
        score: Number(form.score),
        comment: form.comment
      });
      setGradeData((current) => ({
        ...current,
        rows: current.rows.map((item) =>
          item.user.id === row.user.id ? { ...item, finalGrade: grade } : item
        )
      }));
      setNotice(`Đã lưu điểm cho ${row.user.name}.`);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page grades-page lecturer-grades-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Chấm điểm</p>
          <h1>Điểm & đánh giá cuối kỳ</h1>
          <p className="muted">
            Chọn dự án, sau đó chấm theo từng nhóm để so sánh đóng góp đúng bối cảnh làm việc của nhóm đó.
          </p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="panel form-panel grade-selector-panel">
        <label>
          Dự án cần chấm
          <select value={selectedProjectId} onChange={(event) => loadGrades(event.target.value)}>
            <option value="">Chọn dự án</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.title}
              </option>
            ))}
          </select>
        </label>
      </div>

      {!gradeData && (
        <div className="panel empty-state">
          <GraduationCap size={38} />
          <strong>Chọn dự án để bắt đầu chấm điểm</strong>
          <span>Bảng chấm sẽ được chia theo từng nhóm trong dự án.</span>
        </div>
      )}

      {gradeData && (
        <>
          <div className="metric-grid">
            <MetricCard label="Dự án" value={gradeData.project.title} icon={GraduationCap} />
            <MetricCard label="Nhóm" value={groups.length} icon={Users} />
            <MetricCard label="Đã có điểm" value={`${gradedCount}/${totalRows.length}`} tone="success" icon={CheckCircle2} />
            <MetricCard label="Nhóm đang chấm" value={activeGroup?.name || "Chưa có nhóm"} />
          </div>

          <div className="panel grade-group-panel">
            <div className="panel-title-row">
              <div>
                <h2>Chọn nhóm để chấm</h2>
                <p className="muted">Mỗi nhóm có bảng chấm riêng để tránh so sánh lẫn giữa các nhóm khác nhau.</p>
              </div>
              <span className="badge">{groups.length} nhóm</span>
            </div>
            <div className="grade-group-tabs">
              {groups.map((group) => {
                const done = group.rows.filter((row) => row.finalGrade).length;
                return (
                  <button
                    className={`grade-group-tab ${String(activeGroup?.id) === String(group.id) ? "active" : ""}`}
                    key={group.id}
                    onClick={() => setSelectedGroupId(String(group.id))}
                  >
                    <strong>{group.name}</strong>
                    <span>{done}/{group.rows.length} đã chấm</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="panel lecturer-grade-workbench">
            <div className="panel-title-row">
              <div>
                <h2>{activeGroup?.name || gradeData.project.title}</h2>
                <p className="muted">
                  Chỉ hiển thị thành viên của nhóm đang chọn. Dữ liệu task, commit, LOC và điểm chéo đều thuộc nhóm này.
                </p>
              </div>
              <span className="badge">{groupGradedCount}/{visibleRows.length} đã chấm</span>
            </div>
            <div className="table-list">
              {visibleRows.map((row) => {
                const form = forms[row.user.id] || { score: "", comment: "" };
                const taskTotal = row.taskStats.total || 0;
                const taskProgress = taskTotal ? Math.round((row.taskStats.done / taskTotal) * 100) : 0;
                return (
                  <div className="grade-row grade-review-card lecturer-grade-card" key={row.user.id}>
                    <div>
                      <div className="grade-student-head">
                        <div>
                          <strong>{row.user.name}</strong>
                          <span>{row.user.email}</span>
                        </div>
                        <span className={`status-pill ${row.finalGrade ? "success" : "warning"}`}>
                          {row.finalGrade ? "Đã lưu điểm" : "Chưa lưu điểm"}
                        </span>
                      </div>
                      <div className="grade-evidence-grid">
                        <span>Công việc: {row.taskStats.done}/{row.taskStats.total}</span>
                        <span>Tiến độ TB: {row.taskStats.avgProgress}%</span>
                        <span>Hoàn thành: {taskProgress}%</span>
                        <span>Commit: {row.commitStats.commits}</span>
                        <span>LOC: {row.commitStats.totalLoc}</span>
                        <span>Điểm chéo: {row.avgPeerScore ?? "Chưa có"}</span>
                      </div>
                    </div>
                    <div className="grade-form lecturer-grade-form">
                      <label>
                        Điểm
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          placeholder="0 - 10"
                          value={form.score}
                          onChange={(event) => updateForm(row.user.id, { score: event.target.value })}
                        />
                      </label>
                      <label>
                        Nhận xét
                        <input
                          placeholder="Nhận xét ngắn cho sinh viên"
                          value={form.comment}
                          onChange={(event) => updateForm(row.user.id, { comment: event.target.value })}
                        />
                      </label>
                      <button className="primary-button" onClick={() => saveGrade(row)}>
                        <Save size={16} />
                        Lưu điểm
                      </button>
                    </div>
                  </div>
                );
              })}
              {visibleRows.length === 0 && (
                <div className="empty-state compact">
                  <strong>Nhóm chưa có thành viên</strong>
                  <span>Khi nhóm có sinh viên, phiếu chấm sẽ hiển thị tại đây.</span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
