import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  FolderKanban,
  GitBranch,
  Inbox,
  ListTodo,
  MessageSquare,
  Server,
  Shield,
  UserCog,
  Users
} from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import MetricCard from "../components/MetricCard.jsx";

function roleLabel(role, isLeader) {
  if (isLeader) return "Nhóm trưởng";
  if (role === "LECTURER") return "Giảng viên";
  if (role === "ADMIN") return "Quản trị viên";
  return "Sinh viên";
}

function statusText(status) {
  const labels = {
    TODO: "Cần làm",
    IN_PROGRESS: "Đang làm",
    DONE: "Hoàn thành",
    OVERDUE: "Quá hạn"
  };
  return labels[status] || status;
}

function formatDate(value) {
  if (!value) return "Chưa có hạn";
  return new Date(value).toLocaleString("vi-VN");
}

export default function Dashboard() {
  const { user, isLeader, activeGroup } = useAuth();
  const [summary, setSummary] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    if (!user?.role) return;
    api.dashboard(user.role).then(setSummary).catch(() => setSummary(null));
    api.health().then(setHealth).catch(() => setHealth(null));
  }, [user?.role]);

  const displayRole = roleLabel(user?.role, isLeader);
  const taskDone = summary?.taskStats?.done || 0;
  const taskTotal = summary?.taskStats?.total || 0;
  const taskProgress = taskTotal ? Math.round((taskDone / taskTotal) * 100) : 0;
  const activeProject = activeGroup?.project?.title || "Chưa chọn dự án";
  const recentMessages = summary?.recentMessages || summary?.messages || [];
  const lecturerPending = summary?.pendingReports || summary?.reportsWaiting || summary?.pendingJoinRequests || 0;
  const lecturerProgress = summary?.groupCount
    ? Math.min(100, Math.round(((summary?.studentSlotsUsed || 0) / Math.max(summary.groupCount, 1)) * 25))
    : 0;
  const pendingAccounts = summary?.statusStats?.PENDING || 0;
  const activeAccounts = summary?.statusStats?.ACTIVE || 0;
  const rejectedAccounts = summary?.statusStats?.REJECTED || 0;

  const hero = useMemo(() => {
    if (user?.role === "ADMIN") {
      return {
        label: "Tổng quan hệ thống",
        title: `Xin chào, ${user?.name || "quản trị viên"}`,
        description: "Theo dõi sức khỏe API, tài khoản người dùng, yêu cầu chờ duyệt và các thao tác quản trị quan trọng.",
        statusLabel: "Tài khoản chờ duyệt",
        statusValue: pendingAccounts,
        statusMeta: health?.ok ? "API đang hoạt động" : "API chưa sẵn sàng"
      };
    }
    if (user?.role === "LECTURER") {
      return {
        label: "Tổng quan giảng viên",
        title: `Xin chào, ${user?.name || "giảng viên"}`,
        description: "Điều phối dự án phụ trách, theo dõi nhóm sinh viên, duyệt báo cáo và chấm điểm trong một không gian làm việc.",
        statusLabel: "Dự án phụ trách",
        statusValue: summary?.projectCount || 0,
        statusMeta: `${summary?.groupCount || 0} nhóm sinh viên`
      };
    }
    return {
      label: displayRole,
      title: `Xin chào, ${user?.name || "sinh viên"}`,
      description: isLeader
        ? "Điều phối bảng việc nhóm, kiểm tra yêu cầu tham gia và theo dõi đóng góp trong cùng một không gian."
        : "Theo dõi dự án đang tham gia, việc được giao, hạn nộp, trao đổi nhóm và minh chứng cá nhân.",
      statusLabel: "Nhóm đang chọn",
      statusValue: activeGroup?.name || "Chưa chọn nhóm",
      statusMeta: activeGroup?.project?.title || displayRole
    };
  }, [activeGroup, displayRole, health?.ok, isLeader, pendingAccounts, summary, user?.name, user?.role]);

  return (
    <section className="page dashboard-page">
      <div className={`dashboard-hero workspace-hero ${user?.role === "LECTURER" ? "lecturer-dashboard-hero" : ""} ${user?.role === "ADMIN" ? "admin-dashboard-hero" : ""}`}>
        <div>
          <p className="eyebrow">{hero.label}</p>
          <h1>{hero.title}</h1>
          <p>{hero.description}</p>
          {user?.role === "STUDENT" && (
            <div className="hero-actions">
              <Link className="primary-button" to={isLeader ? "/team-tasks" : "/tasks"}>
                {isLeader ? "Mở bảng việc nhóm" : "Xem việc của tôi"}
              </Link>
              <Link className="secondary-button" to="/my-groups">Chọn nhóm làm việc</Link>
              <Link className="ghost-button" to="/chat">Mở trò chuyện</Link>
            </div>
          )}
          {user?.role === "LECTURER" && (
            <div className="hero-actions">
              <Link className="primary-button" to="/lecturer/projects">
                <FolderKanban size={16} />
                Giám sát dự án
              </Link>
              <Link className="secondary-button" to="/reports">
                <ClipboardCheck size={16} />
                Duyệt báo cáo
              </Link>
              <Link className="ghost-button" to="/grades">
                <BarChart3 size={16} />
                Chấm điểm
              </Link>
            </div>
          )}
          {user?.role === "ADMIN" && (
            <div className="hero-actions">
              <Link className="primary-button" to="/admin/approvals">
                <Inbox size={16} />
                Duyệt yêu cầu
              </Link>
              <Link className="secondary-button" to="/admin/users">
                <UserCog size={16} />
                Quản lý người dùng
              </Link>
              <Link className="ghost-button" to="/profile">
                Hồ sơ cá nhân
              </Link>
            </div>
          )}
        </div>
        <div className="hero-status-card">
          <span>{hero.statusLabel}</span>
          <strong>{hero.statusValue}</strong>
          <small>{hero.statusMeta}</small>
        </div>
      </div>

      {user?.role === "ADMIN" && (
        <>
          <div className="metric-grid">
            <MetricCard label="Cổng API" value={health?.ok ? "Hoạt động" : "Chưa kết nối"} tone={health?.ok ? "success" : "warning"} icon={Server} />
            <MetricCard label="Chờ duyệt" value={pendingAccounts} tone={pendingAccounts ? "warning" : "success"} icon={Inbox} />
            <MetricCard label="Sinh viên" value={summary?.userStats?.STUDENT || 0} icon={Users} />
            <MetricCard label="Giảng viên" value={summary?.userStats?.LECTURER || 0} icon={Shield} />
          </div>

          <div className="admin-dashboard-layout">
            <div className="panel admin-system-panel">
              <div className="panel-title-row">
                <div>
                  <h2>Thống kê hệ thống</h2>
                  <p className="muted">Tổng quan tài khoản theo trạng thái để admin nắm tải vận hành hiện tại.</p>
                </div>
                <span className={`status-pill ${health?.ok ? "success" : "warning"}`}>
                  {health?.ok ? "API ổn định" : "Cần kiểm tra API"}
                </span>
              </div>
              <div className="admin-status-grid">
                <div>
                  <span>Đang hoạt động</span>
                  <strong>{activeAccounts}</strong>
                </div>
                <div>
                  <span>Chờ duyệt</span>
                  <strong>{pendingAccounts}</strong>
                </div>
                <div>
                  <span>Đã từ chối</span>
                  <strong>{rejectedAccounts}</strong>
                </div>
              </div>
            </div>

            <aside className="panel admin-review-panel">
              <h2>Việc cần xử lý</h2>
              <div className="progress-ring" style={{ "--progress": pendingAccounts ? "68%" : "100%" }}>
                <strong>{pendingAccounts}</strong>
                <span>Chờ duyệt</span>
              </div>
              <div className="stack-list">
                <span className={`badge ${pendingAccounts ? "warning" : ""}`}>Tài khoản mới: {pendingAccounts}</span>
                <span className="badge">Sinh viên: {summary?.userStats?.STUDENT || 0}</span>
                <span className="badge">Giảng viên: {summary?.userStats?.LECTURER || 0}</span>
              </div>
              <Link className="primary-button" to="/admin/approvals">Mở hàng chờ duyệt</Link>
            </aside>
          </div>

          <div className="panel admin-action-board">
            <div className="panel-title-row">
              <div>
                <h2>Hành động quản trị</h2>
                <p className="muted">Các khu vực admin thường dùng trong vận hành hệ thống.</p>
              </div>
            </div>
            <div className="quick-action-grid">
              <Link className="quick-action-card" to="/admin/approvals">
                <Inbox size={22} />
                <strong>Duyệt yêu cầu</strong>
                <span>Xem tài khoản đang chờ và xác nhận kích hoạt hoặc từ chối.</span>
              </Link>
              <Link className="quick-action-card" to="/admin/users">
                <UserCog size={22} />
                <strong>Quản lý người dùng</strong>
                <span>Tạo tài khoản, lọc người dùng, đổi vai trò và trạng thái.</span>
              </Link>
              <Link className="quick-action-card" to="/profile">
                <Shield size={22} />
                <strong>Hồ sơ cá nhân</strong>
                <span>Cập nhật thông tin tài khoản quản trị và mật khẩu.</span>
              </Link>
            </div>
          </div>
        </>
      )}

      {user?.role === "LECTURER" && (
        <>
          <div className="metric-grid">
            <MetricCard label="Dự án phụ trách" value={summary?.projectCount || 0} icon={FolderKanban} />
            <MetricCard label="Nhóm sinh viên" value={summary?.groupCount || 0} icon={Users} />
            <MetricCard label="Sinh viên trong nhóm" value={summary?.studentSlotsUsed || 0} icon={Users} />
            <MetricCard label="Cần xử lý" value={lecturerPending} tone={lecturerPending ? "warning" : "success"} icon={Inbox} />
          </div>

          <div className="lecturer-dashboard-layout">
            <div className="panel lecturer-supervision-panel">
              <div className="panel-title-row">
                <div>
                  <h2>Dự án phụ trách</h2>
                  <p className="muted">Các dự án gần đây và trạng thái nhóm để giảng viên mở nhanh vùng giám sát.</p>
                </div>
                <Link className="secondary-button" to="/lecturer/projects">Quản lý dự án</Link>
              </div>
              <div className="table-list">
                {summary?.recentProjects?.map((project) => (
                  <div className="dashboard-list-row lecturer-project-row" key={project.id}>
                    <div>
                      <strong>{project.title}</strong>
                      <span>{project.groups} nhóm sinh viên</span>
                    </div>
                    <span><CalendarClock size={14} /> {project.deadline ? new Date(project.deadline).toLocaleDateString("vi-VN") : "Chưa có hạn nộp"}</span>
                  </div>
                ))}
                {!summary?.recentProjects?.length && (
                  <div className="empty-state compact">
                    <strong>Chưa có dự án gần đây</strong>
                    <span>Dự án phụ trách sẽ xuất hiện sau khi được tạo.</span>
                  </div>
                )}
              </div>
            </div>

            <aside className="panel lecturer-review-panel">
              <h2>Việc cần chú ý</h2>
              <div className="progress-ring" style={{ "--progress": `${lecturerProgress}%` }}>
                <strong>{lecturerProgress}%</strong>
                <span>Lấp đầy nhóm</span>
              </div>
              <div className="stack-list">
                <span className="badge">Dự án: {summary?.projectCount || 0}</span>
                <span className="badge">Nhóm: {summary?.groupCount || 0}</span>
                <span className={`badge ${lecturerPending ? "warning" : ""}`}>Chờ duyệt: {lecturerPending}</span>
              </div>
              <div className="button-row">
                <Link className="primary-button" to="/reports">Xem báo cáo</Link>
                <Link className="secondary-button" to="/grades">Chấm điểm</Link>
              </div>
            </aside>
          </div>
        </>
      )}

      {user?.role === "STUDENT" && (
        <>
          <div className="metric-grid">
            <MetricCard label="Dự án đang làm" value={activeProject} icon={FolderKanban} />
            <MetricCard label="Nhóm đã tham gia" value={summary?.groups?.length || 0} icon={Users} />
            <MetricCard label="Việc được giao" value={taskTotal} icon={ListTodo} />
            <MetricCard label="Hoàn thành" value={taskDone} tone="success" helper={`${taskProgress}% tiến độ`} icon={CheckCircle2} />
          </div>

          <div className="workspace-overview">
            <div className="panel project-focus-panel">
              <div className="panel-title-row">
                <div>
                  <h2>Không gian dự án</h2>
                  <p className="muted">Bối cảnh làm việc hiện tại của bạn.</p>
                </div>
                <span className={`status-pill ${activeGroup ? "success" : "warning"}`}>
                  {activeGroup ? "Đã chọn nhóm" : "Cần chọn nhóm"}
                </span>
              </div>
              <div className="project-focus-card">
                <div>
                  <span>Dự án</span>
                  <strong>{activeProject}</strong>
                </div>
                <div>
                  <span>Nhóm</span>
                  <strong>{activeGroup?.name || "Chưa chọn nhóm"}</strong>
                </div>
                <div>
                  <span>Thành viên</span>
                  <strong>{activeGroup?.members?.length || 0}</strong>
                </div>
                {activeGroup?.gitRepoUrl && (
                  <a className="repo-link" href={activeGroup.gitRepoUrl} target="_blank" rel="noreferrer">
                    <GitBranch size={15} />
                    Kho GitHub của nhóm
                  </a>
                )}
              </div>
              <div className="button-row">
                <Link className="secondary-button" to="/my-groups">Đổi nhóm</Link>
                <Link className="ghost-button" to="/reports">Xem báo cáo</Link>
              </div>
            </div>

            <div className="panel contribution-panel">
              <h2>Tiến độ cá nhân</h2>
              <div className="progress-ring" style={{ "--progress": `${taskProgress}%` }}>
                <strong>{taskProgress}%</strong>
                <span>Hoàn thành</span>
              </div>
              <div className="stack-list">
                <span className="badge">Đang làm: {summary?.taskStats?.inProgress || 0}</span>
                <span className="badge warning">Quá hạn: {summary?.taskStats?.overdue || 0}</span>
                <span className="badge">Minh chứng: {summary?.documents || 0}</span>
                <span className="badge">Xin vào nhóm: {summary?.pendingJoinRequests || 0}</span>
              </div>
            </div>
          </div>

          <div className="dashboard-grid">
            <div className="panel">
              <div className="panel-title-row">
                <h2>Việc cần ưu tiên</h2>
                <Link className="secondary-button" to={isLeader ? "/team-tasks" : "/tasks"}>Xem tất cả</Link>
              </div>
              <div className="table-list">
                {summary?.upcomingTasks?.map((task) => (
                  <div className="dashboard-list-row task-priority-row" key={task.id}>
                    <div>
                      <strong>{task.title}</strong>
                      <span>{statusText(task.status)} · {task.progress}%</span>
                    </div>
                    <span><CalendarClock size={14} /> {formatDate(task.deadline)}</span>
                  </div>
                ))}
                {!summary?.upcomingTasks?.length && (
                  <div className="empty-state compact">
                    <strong>Chưa có việc sắp đến hạn</strong>
                    <span>Khi nhóm giao việc mới, danh sách ưu tiên sẽ hiện ở đây.</span>
                  </div>
                )}
              </div>
            </div>

            <div className="panel">
              <div className="panel-title-row">
                <h2>Trò chuyện gần đây</h2>
                <Link className="secondary-button" to="/chat">Mở chat</Link>
              </div>
              <div className="table-list">
                {recentMessages.slice(0, 3).map((message) => (
                  <div className="dashboard-list-row" key={message.id}>
                    <div>
                      <strong>{message.sender?.name || "Thành viên"}</strong>
                      <span>{message.content}</span>
                    </div>
                    <span>{message.sentAt ? new Date(message.sentAt).toLocaleTimeString("vi-VN") : ""}</span>
                  </div>
                ))}
                {recentMessages.length === 0 && (
                  <div className="empty-state compact">
                    <strong>Chưa có tin nhắn gần đây</strong>
                    <span>Mở trò chuyện nhóm để thống nhất công việc và lưu lại trao đổi theo dự án.</span>
                    <Link className="secondary-button" to="/chat">
                      <MessageSquare size={16} />
                      Vào trò chuyện
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {!activeGroup && (
            <div className="info-box">Hãy chọn nhóm ở mục Nhóm của tôi hoặc Không gian dự án để mở công việc, trò chuyện và báo cáo.</div>
          )}
        </>
      )}

      {summary === null && (
        <div className="info-box">Đang tải dữ liệu tổng quan hoặc chưa có dữ liệu phù hợp.</div>
      )}
    </section>
  );
}
