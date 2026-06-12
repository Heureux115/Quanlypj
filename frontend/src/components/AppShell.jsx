import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  ChevronDown,
  FolderKanban,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Sparkles,
  X
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { navigation } from "../data/navigation.js";
import { canAccessNav, roleLabel } from "../lib/permissions.js";

const sectionLabels = {
  workspace: "Không gian",
  work: "Cộng tác",
  review: "Theo dõi",
  admin: "Quản trị",
  account: "Tài khoản"
};

export default function AppShell() {
  const { user, isLeader, activeGroup, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationData, setNotificationData] = useState({ unreadCount: 0, notifications: [] });

  const visibleNav = navigation.filter((item) => canAccessNav(item, user, isLeader));
  const displayRole = isLeader ? "Nhóm trưởng" : roleLabel(user?.role);
  const currentPage = visibleNav.find((item) => item.path === location.pathname)?.label || "PTMS";
  const workspaceName = activeGroup && user?.role !== "ADMIN" ? activeGroup.name : "Không gian làm việc";
  const initials =
    user?.name
      ?.split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "U";

  const groupedNav = useMemo(() => {
    return visibleNav.reduce((groups, item) => {
      const section = item.section || "workspace";
      return {
        ...groups,
        [section]: [...(groups[section] || []), item]
      };
    }, {});
  }, [visibleNav]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    async function loadNotifications() {
      try {
        const result = await api.notifications();
        if (!cancelled) setNotificationData(result);
      } catch {
        if (!cancelled) setNotificationData({ unreadCount: 0, notifications: [] });
      }
    }

    loadNotifications();
    const timer = window.setInterval(loadNotifications, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [user?.id]);

  useEffect(() => {
    setMobileNavOpen(false);
    setNotificationsOpen(false);
  }, [location.pathname]);

  function openNotification(notification) {
    setNotificationsOpen(false);
    navigate(notification.href || "/");
  }

  function renderAvatar(size = "") {
    return (
      <div className={`avatar ${size}`}>
        {user?.avatarUrl ? <img src={user.avatarUrl} alt={user?.name || "Ảnh đại diện"} /> : initials}
      </div>
    );
  }

  function renderNavSection(section, items) {
    if (!items?.length) return null;

    return (
      <div className="nav-section" key={section}>
        <span className="nav-section-label">{sectionLabels[section] || section}</span>
        <div className="nav-section-items">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={`${item.path}-${item.label}`}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
                title={item.label}
              >
                <Icon size={18} aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className={`app-shell ${sidebarOpen ? "" : "sidebar-collapsed"} ${mobileNavOpen ? "mobile-nav-open" : ""}`}>
      {mobileNavOpen && (
        <button
          className="mobile-nav-scrim"
          type="button"
          aria-label="Đóng điều hướng"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <aside className="sidebar" aria-label="Điều hướng PTMS">
        <div className="sidebar-head">
          <NavLink to="/" className="brand" aria-label="Về tổng quan PTMS">
            <div className="brand-mark">
              <FolderKanban size={22} aria-hidden="true" />
            </div>
            <div className="brand-copy">
              <strong>PTMS</strong>
              <span>Quản lý dự án nhóm</span>
            </div>
          </NavLink>
          <button className="icon-button mobile-close" type="button" onClick={() => setMobileNavOpen(false)} aria-label="Đóng menu">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-workspace-card">
          <div className="workspace-orb">
            <Sparkles size={17} aria-hidden="true" />
          </div>
          <div>
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
          </div>
        </div>

        <nav className="nav-list" aria-label="Điều hướng chính">
          {["workspace", "work", "review", "admin", "account"].map((section) =>
            renderNavSection(section, groupedNav[section])
          )}
        </nav>

        <div className="sidebar-footer">
          {activeGroup && user?.role !== "ADMIN" && (
            <div className="active-group">
              <span>Nhóm đang chọn</span>
              <strong>{activeGroup.name}</strong>
              {activeGroup.project?.title && <small>{activeGroup.project.title}</small>}
            </div>
          )}
          <div className="user-card">
            {renderAvatar()}
            <div>
              <strong>{user?.name}</strong>
              <span>{displayRole}</span>
            </div>
          </div>
          <button className="ghost-button full" type="button" onClick={logout}>
            <LogOut size={16} aria-hidden="true" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Mở menu"
          >
            <Menu size={19} />
          </button>
          <button
            className="icon-button desktop-collapse"
            type="button"
            onClick={() => setSidebarOpen((value) => !value)}
            aria-label={sidebarOpen ? "Thu gọn menu" : "Mở rộng menu"}
          >
            {sidebarOpen ? <PanelLeftClose size={19} /> : <PanelLeftOpen size={19} />}
          </button>

          <div className="topbar-title">
            <span>{currentPage}</span>
            <strong>{workspaceName}</strong>
          </div>

          <div className="topbar-search" role="search">
            <Search size={17} aria-hidden="true" />
            <input aria-label="Tìm kiếm nhanh" placeholder="Tìm dự án, công việc, nhóm..." />
          </div>

          <div className="topbar-actions">
            <div className="notification-wrap">
              <button
                className="icon-button"
                type="button"
                aria-label="Thông báo"
                aria-expanded={notificationsOpen}
                onClick={() => setNotificationsOpen((value) => !value)}
              >
                <Bell size={18} />
                {notificationData.unreadCount > 0 && (
                  <span className="notification-count">{Math.min(notificationData.unreadCount, 9)}</span>
                )}
              </button>
              {notificationsOpen && (
                <div className="notification-menu">
                  <div className="notification-menu-header">
                    <div>
                      <strong>Thông báo</strong>
                      <span>{notificationData.unreadCount} mục mới</span>
                    </div>
                  </div>
                  <div className="notification-list">
                    {notificationData.notifications.map((notification) => (
                      <button
                        key={notification.id}
                        className="notification-item"
                        type="button"
                        onClick={() => openNotification(notification)}
                      >
                        <strong>{notification.title}</strong>
                        <span>{notification.message}</span>
                        <small>{new Date(notification.createdAt).toLocaleString("vi-VN")}</small>
                      </button>
                    ))}
                    {notificationData.notifications.length === 0 && (
                      <div className="empty-state compact">
                        <strong>Chưa có thông báo</strong>
                        <span>Các cập nhật mới sẽ xuất hiện tại đây.</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            <NavLink className="profile-chip" to="/profile">
              {renderAvatar("small")}
              <div>
                <strong>{user?.name}</strong>
                <span>{displayRole}</span>
              </div>
              <ChevronDown size={16} aria-hidden="true" />
            </NavLink>
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
