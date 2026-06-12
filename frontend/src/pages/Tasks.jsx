import { useEffect, useState } from "react";
import { CalendarClock, FileText, Search } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

const STATUS_LABELS = {
  TODO: "Cần làm",
  IN_PROGRESS: "Đang làm",
  DONE: "Hoàn thành",
  OVERDUE: "Quá hạn"
};

function statusFromProgress(progress) {
  if (progress >= 100) return "DONE";
  if (progress > 0) return "IN_PROGRESS";
  return "TODO";
}

function statusTone(status) {
  if (status === "DONE") return "success";
  if (status === "IN_PROGRESS") return "warning";
  if (status === "OVERDUE") return "danger";
  return "";
}

export default function Tasks() {
  const { user, activeGroup } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState("");
  const [progressDrafts, setProgressDrafts] = useState({});
  const [documentsByTask, setDocumentsByTask] = useState({});
  const [documentForms, setDocumentForms] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!activeGroup?.id) return;
    api.tasksByGroup(activeGroup.id).then(setTasks).catch((err) => setError(err.message));
  }, [activeGroup?.id]);

  const myTasks = tasks.filter((task) => task.assignedTo === user?.id);
  const filteredTasks = myTasks.filter((task) =>
    `${task.title} ${task.description || ""} ${task.status}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );
  const doneCount = myTasks.filter((task) => task.status === "DONE").length;
  const overdueCount = myTasks.filter((task) => task.status === "OVERDUE").length;
  const progressAverage = myTasks.length
    ? Math.round(myTasks.reduce((sum, task) => sum + (task.progress || 0), 0) / myTasks.length)
    : 0;

  async function updateProgress(task, status, progress) {
    setError("");
    setNotice("");
    try {
      const updated = await api.updateTaskProgress(task.id, { status, progress });
      setTasks((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setProgressDrafts((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
      setNotice("Đã cập nhật tiến độ công việc.");
    } catch (err) {
      setError(err.message);
    }
  }

  function setProgressDraft(taskId, value) {
    const nextValue = Math.min(100, Math.max(0, Number(value) || 0));
    setProgressDrafts((current) => ({ ...current, [taskId]: nextValue }));
  }

  async function saveProgress(task) {
    const progress = progressDrafts[task.id] ?? task.progress ?? 0;
    await updateProgress(task, statusFromProgress(progress), progress);
  }

  async function loadDocuments(taskId) {
    setError("");
    try {
      const documents = await api.taskDocuments(taskId);
      setDocumentsByTask((current) => ({ ...current, [taskId]: documents }));
    } catch (err) {
      setError(err.message);
    }
  }

  function updateDocumentForm(taskId, patch) {
    setDocumentForms((current) => ({
      ...current,
      [taskId]: {
        fileName: "",
        fileUrl: "",
        ...(current[taskId] || {}),
        ...patch
      }
    }));
  }

  async function submitDocument(event, taskId) {
    event.preventDefault();
    setError("");
    setNotice("");
    const form = documentForms[taskId] || {};
    try {
      const document = await api.createDocument({
        taskId,
        fileName: form.fileName,
        fileUrl: form.fileUrl
      });
      setDocumentsByTask((current) => ({
        ...current,
        [taskId]: [document, ...(current[taskId] || [])]
      }));
      updateDocumentForm(taskId, { fileName: "", fileUrl: "" });
      setNotice("Đã thêm minh chứng cho công việc.");
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeDocument(taskId, documentId) {
    setError("");
    setNotice("");
    try {
      await api.deleteDocument(documentId);
      setDocumentsByTask((current) => ({
        ...current,
        [taskId]: (current[taskId] || []).filter((document) => document.id !== documentId)
      }));
      setNotice("Đã xóa minh chứng.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page task-workspace-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Công việc nhóm</p>
          <h1>Việc của tôi</h1>
          <p className="muted">
            Cập nhật tiến độ, đánh dấu hoàn thành và gắn minh chứng cho từng công việc được giao trong nhóm đang chọn.
          </p>
        </div>
        <div className="header-stats">
          <span className="badge">{myTasks.length} việc</span>
          <span className="badge success">{doneCount} đã xong</span>
          <span className="badge warning">{overdueCount} quá hạn</span>
          <span className="badge">{progressAverage}% trung bình</span>
        </div>
      </div>

      {!activeGroup && <div className="info-box">Hãy chọn nhóm ở màn hình Không gian dự án hoặc Nhóm của tôi trước.</div>}
      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="panel toolbar-panel task-toolbar">
        <div className="search-field">
          <Search size={18} />
          <input
            className="screen-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm công việc theo tiêu đề, mô tả hoặc trạng thái"
          />
        </div>
      </div>

      <div className="task-list task-list-modern">
        {filteredTasks.map((task) => {
          const form = documentForms[task.id] || { fileName: "", fileUrl: "" };
          const documents = documentsByTask[task.id] || [];
          const progressValue = progressDrafts[task.id] ?? task.progress ?? 0;

          return (
            <article className="task-card task-card-wide task-work-card" key={task.id}>
              <div className="task-card-head">
                <div>
                  <strong>{task.title}</strong>
                  <span>{task.description || "Chưa có mô tả"}</span>
                </div>
                <span className={`status-pill ${statusTone(task.status)}`}>
                  {STATUS_LABELS[task.status] || task.status}
                </span>
              </div>

              <div className="task-meta">
                <span><CalendarClock size={13} /> {task.deadline ? new Date(task.deadline).toLocaleString("vi-VN") : "Chưa có hạn"}</span>
                <span>Tiến độ hiện tại: {progressValue}%</span>
              </div>

              <div className="task-progress-control">
                <div className="progress-copy">
                  <span>Tiến độ</span>
                  <strong>{progressValue}%</strong>
                </div>
                <div className="task-progress">
                  <div style={{ width: `${progressValue}%` }} />
                </div>
                <div className="range-row">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={progressValue}
                    onChange={(event) => setProgressDraft(task.id, event.target.value)}
                  />
                  <input
                    className="progress-number"
                    type="number"
                    min="0"
                    max="100"
                    value={progressValue}
                    onChange={(event) => setProgressDraft(task.id, event.target.value)}
                  />
                  <button className="secondary-button" onClick={() => saveProgress(task)}>
                    Lưu tiến độ
                  </button>
                </div>
              </div>

              <div className="button-row">
                <button
                  className="secondary-button"
                  onClick={() => updateProgress(task, "IN_PROGRESS", Math.max(task.progress || 0, 30))}
                >
                  Đang làm
                </button>
                <button className="primary-button" onClick={() => updateProgress(task, "DONE", 100)}>
                  Hoàn thành
                </button>
                <button className="ghost-button" onClick={() => loadDocuments(task.id)}>
                  <FileText size={16} />
                  Xem minh chứng
                </button>
              </div>

              <form className="inline-form evidence-form" onSubmit={(event) => submitDocument(event, task.id)}>
                <input
                  placeholder="Tên minh chứng"
                  value={form.fileName}
                  onChange={(event) => updateDocumentForm(task.id, { fileName: event.target.value })}
                  required
                />
                <input
                  placeholder="Link tài liệu hoặc code"
                  value={form.fileUrl}
                  onChange={(event) => updateDocumentForm(task.id, { fileUrl: event.target.value })}
                  required
                />
                <button className="secondary-button">Thêm minh chứng</button>
              </form>

              {documents.length > 0 && (
                <div className="document-list evidence-list">
                  {documents.map((document) => (
                    <div className="document-row" key={document.id}>
                      <div>
                        <a href={document.fileUrl} target="_blank" rel="noreferrer">
                          {document.fileName}
                        </a>
                        <span>
                          {document.uploader?.name || "Người dùng"} · {new Date(document.uploadedAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <button className="ghost-button compact-button" onClick={() => removeDocument(task.id, document.id)}>
                        Xóa
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </article>
          );
        })}
        {activeGroup && myTasks.length === 0 && (
          <div className="empty-state">
            <strong>Bạn chưa có công việc trong nhóm đang chọn</strong>
            <span>Khi nhóm trưởng giao việc, công việc sẽ xuất hiện tại đây.</span>
          </div>
        )}
        {activeGroup && myTasks.length > 0 && filteredTasks.length === 0 && (
          <div className="empty-state">
            <strong>Không tìm thấy công việc phù hợp</strong>
            <span>Thử tìm bằng tiêu đề, mô tả hoặc trạng thái khác.</span>
          </div>
        )}
      </div>
    </section>
  );
}
