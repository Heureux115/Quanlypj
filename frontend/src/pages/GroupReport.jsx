import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, FileText, GitCommit, RefreshCw, Users } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import MetricCard from "../components/MetricCard.jsx";

export default function GroupReport() {
  const { activeGroup } = useAuth();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!activeGroup?.id) return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id]);

  async function loadReport() {
    setError("");
    try {
      const result = await api.groupReport(activeGroup.id);
      setReport(result);
    } catch (err) {
      setError(err.message);
    }
  }

  const lowCount = report?.report?.filter((item) => item.lowContribution).length || 0;
  const unmatchedGitActivities = report?.unmatchedGitActivities || [];

  return (
    <section className="page report-page lecturer-report-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Báo cáo cần duyệt</p>
          <h1>Báo cáo nhóm và tiến độ dự án</h1>
          <p className="muted">
            Đọc đóng góp, minh chứng, commit, điểm chéo và cảnh báo của nhóm đang chọn trước khi chấm điểm.
          </p>
        </div>
        {activeGroup && (
          <button className="secondary-button" onClick={loadReport}>
            <RefreshCw size={16} />
            Tải lại
          </button>
        )}
      </div>

      {!activeGroup && (
        <div className="panel empty-state">
          <FileText size={38} />
          <strong>Chọn nhóm để xem báo cáo</strong>
          <span>Giảng viên có thể chọn nhóm từ trang Dự án phụ trách rồi quay lại khu vực báo cáo.</span>
        </div>
      )}
      {error && <div className="error-box">{error}</div>}

      {report && (
        <>
          <div className="metric-grid">
            <MetricCard label="Nhóm" value={report.groupName} icon={Users} />
            <MetricCard label="Điểm trung bình" value={report.avgScore} />
            <MetricCard label="Thành viên" value={report.report.length} icon={Users} />
            <MetricCard label="Cảnh báo" value={lowCount} tone={lowCount ? "warning" : "success"} icon={AlertTriangle} />
            <MetricCard label="Git chưa khớp" value={unmatchedGitActivities.length} tone={unmatchedGitActivities.length ? "warning" : "success"} icon={GitCommit} />
          </div>

          <div className="report-layout lecturer-report-layout">
            <div className="panel report-chart-panel">
              <div className="panel-title-row">
                <div>
                  <h2>Biểu đồ đóng góp</h2>
                  <p className="muted">So sánh điểm đóng góp của từng thành viên để phát hiện lệch tải công việc.</p>
                </div>
                <span className="badge">{report.report.length} thành viên</span>
              </div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={report.report}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="contributionScore" fill="oklch(0.405 0.205 258)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <aside className="panel review-note-panel lecturer-review-note">
              <FileText size={24} />
              <h2>Gợi ý review</h2>
              <p className="muted">
                Ưu tiên kiểm tra thành viên có cảnh báo, commit chưa khớp và sinh viên chưa có điểm chéo trước khi nhập điểm cuối kỳ.
              </p>
              <div className="stack-list">
                <span className={`badge ${lowCount ? "warning" : ""}`}>Cảnh báo: {lowCount}</span>
                <span className={`badge ${unmatchedGitActivities.length ? "warning" : ""}`}>Git chưa khớp: {unmatchedGitActivities.length}</span>
                <span className="badge">Minh chứng: {report.report.reduce((sum, item) => sum + (item.evidenceCount || 0), 0)}</span>
              </div>
            </aside>
          </div>

          <div className="panel lecturer-member-report-panel">
            <div className="panel-title-row">
              <div>
                <h2>Chi tiết thành viên</h2>
                <p className="muted">Mỗi thẻ là một hồ sơ đóng góp dùng cho review và chấm điểm.</p>
              </div>
              {lowCount > 0 && <span className="status-pill warning">{lowCount} cần chú ý</span>}
            </div>
            <div className="table-list">
              {report.report.map((item) => (
                <div className="report-row report-card lecturer-report-card" key={item.userId}>
                  <div>
                    <div className="report-member-head">
                      <strong>{item.name}</strong>
                      <span className={`status-pill ${item.lowContribution ? "warning" : "success"}`}>
                        {item.lowContribution ? "Cần xem kỹ" : "Ổn định"}
                      </span>
                    </div>
                    <div className="report-metrics">
                      <span>Công việc: {item.tasksDone}/{item.tasksAssigned}</span>
                      <span>Tiến độ TB: {item.avgProgress}%</span>
                      <span>Commit: {item.commits}</span>
                      <span>Push: {item.pushEvents}</span>
                      <span>LOC: {item.totalLoc}</span>
                      <span>Minh chứng: {item.evidenceCount}</span>
                      <span>Đánh giá chéo: {item.avgPeerScore ?? "Chưa có"}</span>
                    </div>
                    {item.warningReasons?.length > 0 && (
                      <ul className="warning-list">
                        {item.warningReasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="report-score-badge">
                    <span>Điểm đóng góp</span>
                    <strong>{item.contributionScore}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title-row">
              <div>
                <h2>Commit chưa xác định tác giả</h2>
                <p className="muted">Dùng để nhắc sinh viên cập nhật GitHub username hoặc kiểm tra email commit.</p>
              </div>
              <span className={`status-pill ${unmatchedGitActivities.length ? "warning" : "success"}`}>{unmatchedGitActivities.length}</span>
            </div>
            {unmatchedGitActivities.length === 0 && (
              <div className="empty-state compact">
                <strong>Không có Git activity chưa khớp</strong>
                <span>Dữ liệu Git hiện tại đã khớp với thành viên nhóm.</span>
              </div>
            )}
            {unmatchedGitActivities.length > 0 && (
              <div className="table-list">
                {unmatchedGitActivities.map((activity) => (
                  <div className="report-row" key={activity.id}>
                    <div>
                      <strong>{activity.authorUsername || activity.authorName || "Không rõ tác giả"}</strong>
                      <span>{activity.authorEmail || "Không có email"} · {activity.type}</span>
                      <span>{activity.message || "Không có nội dung"}</span>
                      <span>{new Date(activity.occurredAt).toLocaleString("vi-VN")} · LOC: {activity.loc || 0}</span>
                    </div>
                    <span className="status-pill warning">Chưa khớp</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
