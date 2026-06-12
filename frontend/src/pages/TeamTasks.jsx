import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Calendar, CheckCircle2, Clock, ListTodo, Plus, Search, UserRound } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import MetricCard from "../components/MetricCard.jsx";

const columns = [
  { status: "TODO", label: "Cần làm", color: "muted", icon: ListTodo },
  { status: "IN_PROGRESS", label: "Đang làm", color: "warning", icon: Clock },
  { status: "DONE", label: "Hoàn thành", color: "success", icon: CheckCircle2 },
  { status: "OVERDUE", label: "Quá hạn", color: "danger", icon: AlertCircle }
];

export default function TeamTasks() {
  const { activeGroup, isLeader } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [query, setQuery] = useState("");
  const [report, setReport] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [dropTarget, setDropTarget] = useState("");
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    deadline: ""
  });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeGroup?.id) return;
    api.tasksByGroup(activeGroup.id).then(setTasks).catch((err) => setError(err.message));
    api.groupReport(activeGroup.id).then(setReport).catch(() => setReport(null));
  }, [activeGroup?.id]);

  const taskStats = useMemo(() => {
    return tasks.reduce(
      (stats, task) => ({ ...stats, [task.status]: (stats[task.status] || 0) + 1 }),
      {}
    );
  }, [tasks]);

  const filteredTasks = tasks.filter((task) =>
    `${task.title} ${task.description || ""} ${task.status} ${task.assignee?.name || ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase())
  );

  async function createTask(event) {
    event.preventDefault();
    setError("");
    try {
      const task = await api.createTask({
        ...form,
        groupId: activeGroup.id,
        assignedTo: form.assignedTo ? Number(form.assignedTo) : null
      });
      setTasks((current) => [...current, task]);
      setForm({ title: "", description: "", assignedTo: "", deadline: "" });
    } catch (err) {
      setError(err.message);
    }
  }

  async function moveTask(taskId, nextStatus) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task || task.status === nextStatus) return;

    const previousTasks = tasks;
    setError("");
    setTasks((current) =>
      current.map((item) => (item.id === taskId ? { ...item, status: nextStatus } : item))
    );

    try {
      const updated = await api.updateTask(taskId, { status: nextStatus });
      setTasks((current) => current.map((item) => (item.id === taskId ? updated : item)));
      api.groupReport(activeGroup.id).then(setReport).catch(() => {});
    } catch (err) {
      setTasks(previousTasks);
      setError(err.message);
    }
  }

  function handleDragStart(event, taskId) {
    setDraggedTaskId(taskId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", String(taskId));
  }

  function handleDrop(event, status) {
    event.preventDefault();
    const taskId = Number(event.dataTransfer.getData("text/plain") || draggedTaskId);
    setDropTarget("");
    setDraggedTaskId(null);
    if (taskId) moveTask(taskId, status);
  }

  if (!isLeader) {
    return (
      <section className="page">
        <div className="info-box">Màn hình này chỉ dành cho nhóm trưởng của nhóm đang chọn.</div>
      </section>
    );
  }

  return (
    <section className="page team-board-page">
      <div className="dashboard-hero compact workspace-hero">
        <div>
          <p className="eyebrow">Nhóm trưởng</p>
          <h1>Bảng công việc nhóm</h1>
          <p>Tạo việc, giao thành viên, kéo thả trạng thái và theo dõi đóng góp của cả nhóm trong một bảng làm việc.</p>
        </div>
        <div className="hero-status-card">
          <span>Nhóm đang quản lý</span>
          <strong>{activeGroup?.name || "Chưa chọn nhóm"}</strong>
          <small>{activeGroup?.members?.length || 0} thành viên</small>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="metric-grid">
        <MetricCard label="Tổng công việc" value={tasks.length} icon={ListTodo} />
        <MetricCard label="Đang làm" value={taskStats.IN_PROGRESS || 0} tone="warning" icon={Clock} />
        <MetricCard label="Hoàn thành" value={taskStats.DONE || 0} tone="success" icon={CheckCircle2} />
        <MetricCard label="Quá hạn" value={taskStats.OVERDUE || 0} tone="warning" icon={AlertCircle} />
      </div>

      <div className="team-command-layout">
        <form className="panel form-panel task-create-panel" onSubmit={createTask}>
          <div className="panel-title-row">
            <div>
              <h2>Giao nhiệm vụ</h2>
              <p className="muted">Tạo việc mới cho nhóm đang chọn.</p>
            </div>
            <Plus size={20} />
          </div>
          <label>
            Tiêu đề
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </label>
          <label>
            Mô tả
            <textarea
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </label>
          <div className="compact-grid">
            <label>
              Giao cho
              <select
                value={form.assignedTo}
                onChange={(event) => setForm({ ...form, assignedTo: event.target.value })}
              >
                <option value="">Chưa giao</option>
                {activeGroup.members?.map((member) => (
                  <option key={member.userId || member.user?.id} value={member.userId || member.user?.id}>
                    {member.user?.name || `Thành viên #${member.userId}`}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hạn hoàn thành
              <input
                type="datetime-local"
                value={form.deadline}
                onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                required
              />
            </label>
          </div>
          <button className="primary-button">Tạo công việc</button>
        </form>

        <div className="panel contribution-chart-panel">
          <div className="panel-title-row">
            <div>
              <h2>Đóng góp thành viên</h2>
              <p className="muted">Điểm đóng góp lấy từ báo cáo nhóm hiện tại.</p>
            </div>
            <span className="status-pill success">{report?.report?.length || 0} thành viên</span>
          </div>
          {report?.report?.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={report.report}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="contributionScore" fill="oklch(0.405 0.205 258)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state compact">
              <strong>Chưa có dữ liệu báo cáo</strong>
              <span>Dữ liệu sẽ xuất hiện khi thành viên cập nhật việc hoặc đồng bộ GitHub.</span>
            </div>
          )}
        </div>
      </div>

      <div className="panel toolbar-panel">
        <div className="search-field">
          <Search size={18} />
          <input
            className="screen-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm công việc theo tiêu đề, mô tả, người được giao hoặc trạng thái"
          />
        </div>
      </div>

      <div className="kanban board-style nifty-board">
        {columns.map((column) => {
          const Icon = column.icon;
          const columnTasks = filteredTasks.filter((task) => task.status === column.status);

          return (
            <div
              className={`kanban-column ${column.color} ${dropTarget === column.status ? "drop-target" : ""}`}
              key={column.status}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setDropTarget(column.status);
              }}
              onDragLeave={() => setDropTarget((current) => (current === column.status ? "" : current))}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <div className="kanban-column-header">
                <div>
                  <Icon size={17} />
                  <h3>{column.label}</h3>
                </div>
                <span>{columnTasks.length}</span>
              </div>

              <div className="kanban-stack">
                {columnTasks.map((task) => (
                  <article
                    className={`task-card kanban-task-card ${draggedTaskId === task.id ? "dragging" : ""}`}
                    key={task.id}
                    draggable
                    onDragStart={(event) => handleDragStart(event, task.id)}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      setDropTarget("");
                    }}
                  >
                    <div className="task-card-head">
                      <strong>{task.title}</strong>
                      <span className={`status-pill ${task.status === "DONE" ? "success" : task.status === "OVERDUE" ? "warning" : ""}`}>
                        {task.progress}%
                      </span>
                    </div>
                    <p>{task.description}</p>
                    <div className="task-meta">
                      <span><UserRound size={13} /> {task.assignee?.name || "Chưa giao"}</span>
                      <span><Calendar size={13} /> {task.deadline ? new Date(task.deadline).toLocaleDateString("vi-VN") : "Chưa có hạn"}</span>
                    </div>
                    <div className="task-progress">
                      <div style={{ width: `${task.progress || 0}%` }} />
                    </div>
                  </article>
                ))}
                {columnTasks.length === 0 && (
                  <div className="empty-state compact">
                    <strong>Chưa có công việc</strong>
                    <span>Kéo thả công việc vào cột này khi cần.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
