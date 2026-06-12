export function canAccessNav(item, user, isLeader) {
  if (!user) return false;
  if (item.leaderOnly && isLeader) return true;
  if (item.leaderOnly && !item.roles) return false;
  if (!item.roles) return true;
  return item.roles.includes(user.role);
}

export function roleLabel(role) {
  const labels = {
    ADMIN: "Quản trị viên",
    LECTURER: "Giảng viên",
    STUDENT: "Sinh viên"
  };
  return labels[role] || role;
}
