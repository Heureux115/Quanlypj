import {
  BarChart3,
  ClipboardList,
  FolderKanban,
  GraduationCap,
  Home,
  Inbox,
  MessageSquare,
  Shield,
  UserRound,
  Users
} from "lucide-react";

export const navigation = [
  {
    label: "Tổng quan",
    path: "/",
    icon: Home,
    section: "workspace"
  },
  {
    label: "Không gian dự án",
    path: "/projects",
    icon: FolderKanban,
    roles: ["STUDENT"],
    section: "workspace"
  },
  {
    label: "Việc của tôi",
    path: "/tasks",
    icon: ClipboardList,
    roles: ["STUDENT"],
    section: "work"
  },
  {
    label: "Nhóm của tôi",
    path: "/my-groups",
    icon: Users,
    roles: ["STUDENT", "LECTURER"],
    section: "workspace"
  },
  {
    label: "Bảng việc nhóm",
    path: "/team-tasks",
    icon: BarChart3,
    leaderOnly: true,
    section: "work"
  },
  {
    label: "Báo cáo nhóm",
    path: "/reports",
    icon: BarChart3,
    leaderOnly: true,
    roles: ["LECTURER"],
    section: "review"
  },
  {
    label: "Trò chuyện nhóm",
    path: "/chat",
    icon: MessageSquare,
    roles: ["STUDENT", "LECTURER"],
    section: "work"
  },
  {
    label: "Duyệt vào nhóm",
    path: "/join-requests",
    icon: Inbox,
    leaderOnly: true,
    roles: ["LECTURER"],
    section: "review"
  },
  {
    label: "Dự án phụ trách",
    path: "/lecturer/projects",
    icon: FolderKanban,
    roles: ["LECTURER"],
    section: "workspace"
  },
  {
    label: "Chấm điểm",
    path: "/grades",
    icon: GraduationCap,
    roles: ["LECTURER"],
    section: "review"
  },
  {
    label: "Người dùng",
    path: "/admin/users",
    icon: Shield,
    roles: ["ADMIN"],
    section: "admin"
  },
  {
    label: "Phê duyệt",
    path: "/admin/approvals",
    icon: Inbox,
    roles: ["ADMIN"],
    section: "admin"
  },
  {
    label: "Hồ sơ",
    path: "/profile",
    icon: UserRound,
    roles: ["STUDENT", "LECTURER", "ADMIN"],
    section: "account"
  }
];
