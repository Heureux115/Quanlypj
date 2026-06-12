import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/AuthContext.jsx";
import AppShell from "./components/AppShell.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Projects from "./pages/Projects.jsx";
import Tasks from "./pages/Tasks.jsx";
import TeamTasks from "./pages/TeamTasks.jsx";
import JoinRequests from "./pages/JoinRequests.jsx";
import GroupChat from "./pages/GroupChat.jsx";
import GroupReport from "./pages/GroupReport.jsx";
import FinalGrades from "./pages/FinalGrades.jsx";
import LecturerProjects from "./pages/LecturerProjects.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";
import AdminApprovals from "./pages/AdminApprovals.jsx";
import Profile from "./pages/Profile.jsx";
import MyGroups from "./pages/MyGroups.jsx";

function ProtectedRoute({ children }) {
  const { token, booting } = useAuth();

  if (booting) {
    return <div className="screen-center">Đang tải phiên làm việc...</div>;
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function AccessRoute({ roles, leaderOnly = false, allowLeader = false, children }) {
  const { user, isLeader } = useAuth();

  if (leaderOnly && !isLeader) {
    return <Navigate to="/" replace />;
  }

  if (allowLeader && isLeader) {
    return children;
  }

  if (roles && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route
          path="projects"
          element={
            <AccessRoute roles={["STUDENT", "LECTURER"]}>
              <Projects />
            </AccessRoute>
          }
        />
        <Route
          path="tasks"
          element={
            <AccessRoute roles={["STUDENT"]}>
              <Tasks />
            </AccessRoute>
          }
        />
        <Route
          path="team-tasks"
          element={
            <AccessRoute leaderOnly>
              <TeamTasks />
            </AccessRoute>
          }
        />
        <Route
          path="join-requests"
          element={
            <AccessRoute allowLeader roles={["LECTURER", "ADMIN"]}>
              <JoinRequests />
            </AccessRoute>
          }
        />
        <Route
          path="chat"
          element={
            <AccessRoute roles={["STUDENT", "LECTURER", "ADMIN"]}>
              <GroupChat />
            </AccessRoute>
          }
        />
        <Route
          path="reports"
          element={
            <AccessRoute allowLeader roles={["LECTURER", "ADMIN"]}>
              <GroupReport />
            </AccessRoute>
          }
        />
        <Route
          path="my-groups"
          element={
            <AccessRoute roles={["STUDENT", "LECTURER", "ADMIN"]}>
              <MyGroups />
            </AccessRoute>
          }
        />
        <Route path="profile" element={<Profile />} />
        <Route
          path="lecturer/projects"
          element={
            <AccessRoute roles={["LECTURER"]}>
              <LecturerProjects />
            </AccessRoute>
          }
        />
        <Route
          path="grades"
          element={
            <AccessRoute roles={["LECTURER"]}>
              <FinalGrades />
            </AccessRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <AccessRoute roles={["ADMIN"]}>
              <AdminUsers />
            </AccessRoute>
          }
        />
        <Route
          path="admin/approvals"
          element={
            <AccessRoute roles={["ADMIN"]}>
              <AdminApprovals />
            </AccessRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
