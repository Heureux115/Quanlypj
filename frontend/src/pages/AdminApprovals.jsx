import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock, RefreshCw, Search, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { api } from "../api/client.js";
import MetricCard from "../components/MetricCard.jsx";

const roleLabel = {
  LECTURER: "Giảng viên",
  STUDENT: "Sinh viên"
};

export default function AdminApprovals() {
  const [requests, setRequests] = useState([]);
  const [query, setQuery] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    const value = query.trim().toLowerCase();
    return requests.filter((user) =>
      `${user.name} ${user.email} ${user.role}`.toLowerCase().includes(value)
    );
  }, [requests, query]);

  const lecturerCount = requests.filter((user) => user.role === "LECTURER").length;
  const studentCount = requests.filter((user) => user.role === "STUDENT").length;

  async function loadRequests() {
    setError("");
    try {
      const result = await api.users({ status: "PENDING" });
      setRequests(result.filter((user) => user.role !== "ADMIN"));
      setConfirmAction(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function reviewUser(userId, status) {
    const nextAction = `${userId}:${status}`;
    if (confirmAction !== nextAction) {
      setConfirmAction(nextAction);
      setNotice(status === "ACTIVE" ? "Bấm Xác nhận duyệt để kích hoạt tài khoản." : "Bấm Xác nhận từ chối để hoàn tất.");
      return;
    }

    setError("");
    setNotice("");
    try {
      await api.updateUserStatus(userId, { status });
      setRequests((current) => current.filter((user) => user.id !== userId));
      setConfirmAction(null);
      setNotice(status === "ACTIVE" ? "Đã duyệt tài khoản." : "Đã từ chối tài khoản.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page admin-approvals-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Duyệt yêu cầu</p>
          <h1>Tài khoản chờ xét duyệt</h1>
          <p className="muted">
            Kiểm tra tài khoản mới trước khi cho phép truy cập hệ thống. Mỗi thao tác duyệt hoặc từ chối cần xác nhận lần hai.
          </p>
        </div>
        <button className="secondary-button" onClick={loadRequests}>
          <RefreshCw size={16} />
          Tải lại
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className="metric-grid">
        <MetricCard label="Chờ duyệt" value={requests.length} tone={requests.length ? "warning" : "success"} icon={Clock} />
        <MetricCard label="Giảng viên" value={lecturerCount} icon={ShieldCheck} />
        <MetricCard label="Sinh viên" value={studentCount} icon={UserRound} />
        <MetricCard label="Đang hiển thị" value={filteredRequests.length} icon={Search} />
      </div>

      <div className="panel admin-approval-panel">
        <div className="toolbar-row admin-filter-bar">
          <div>
            <h2>Danh sách yêu cầu</h2>
            <p className="muted">Ưu tiên duyệt giảng viên tự đăng ký để họ có thể quản lý dự án.</p>
          </div>
          <div className="search-control">
            <Search size={16} />
            <input
              className="compact-input"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm tên, email, vai trò..."
            />
          </div>
        </div>

        <div className="approval-list">
          {filteredRequests.map((user) => {
            const approveKey = `${user.id}:ACTIVE`;
            const rejectKey = `${user.id}:REJECTED`;
            return (
              <article className="approval-card" key={user.id}>
                <div className="approval-card-main">
                  <div className="approval-avatar">
                    {(user.name || user.email || "?").slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                    <small>{roleLabel[user.role] || user.role} · tạo lúc {new Date(user.createdAt).toLocaleString("vi-VN")}</small>
                  </div>
                </div>
                <div className="approval-card-side">
                  <span className="status-pill warning">Chờ duyệt</span>
                  <div className="button-row">
                    <button
                      className={confirmAction === approveKey ? "primary-button" : "secondary-button"}
                      onClick={() => reviewUser(user.id, "ACTIVE")}
                    >
                      <CheckCircle2 size={16} />
                      {confirmAction === approveKey ? "Xác nhận duyệt" : "Duyệt"}
                    </button>
                    <button
                      className={confirmAction === rejectKey ? "danger-button" : "ghost-button"}
                      onClick={() => reviewUser(user.id, "REJECTED")}
                    >
                      <XCircle size={16} />
                      {confirmAction === rejectKey ? "Xác nhận từ chối" : "Từ chối"}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {filteredRequests.length === 0 && (
            <div className="empty-state compact">
              <strong>Không có yêu cầu chờ duyệt phù hợp</strong>
              <span>Khi tài khoản mới đăng ký và đang chờ xét duyệt, danh sách sẽ hiển thị tại đây.</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
