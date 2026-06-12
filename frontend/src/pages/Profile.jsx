import { useRef, useState } from "react";
import { Camera, KeyRound, UserRound } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

function resizeAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Vui lòng chọn file ảnh."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const size = 320;
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        const sourceSize = Math.min(image.width, image.height);
        const sourceX = (image.width - sourceSize) / 2;
        const sourceY = (image.height - sourceSize) / 2;

        canvas.width = size;
        canvas.height = size;
        context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, size, size);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.onerror = () => reject(new Error("Không đọc được ảnh đã chọn."));
      image.src = reader.result;
    };
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.readAsDataURL(file);
  });
}

export default function Profile() {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [gitUsername, setGitUsername] = useState(user?.gitUsername || "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const isAdmin = user?.role === "ADMIN";

  async function chooseAvatar(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");

    try {
      const resized = await resizeAvatar(file);
      setAvatarUrl(resized);
      setNotice("Đã chọn ảnh đại diện. Bấm Lưu hồ sơ để cập nhật.");
    } catch (err) {
      setError(err.message);
    } finally {
      event.target.value = "";
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);

    try {
      const updated = await api.updateMe({ gitUsername, avatarUrl });
      updateUser(updated);
      setGitUsername(updated.gitUsername || "");
      setAvatarUrl(updated.avatarUrl || "");
      setNotice("Đã cập nhật hồ sơ.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function submitPassword(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("Mật khẩu mới và xác nhận mật khẩu không trùng nhau.");
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice("Đã đổi mật khẩu.");
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <section className="page profile-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Hồ sơ cá nhân</p>
          <h1>{isAdmin ? "Bảo mật tài khoản" : "Thông tin học tập"}</h1>
          <p className="muted">
            {isAdmin
              ? "Tài khoản quản trị chỉ cần đổi mật khẩu khi cần bảo mật."
              : "Cập nhật ảnh đại diện, GitHub username và mật khẩu để dữ liệu đóng góp được ghi nhận chính xác."}
          </p>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      <div className={isAdmin ? "profile-single-column" : "split-layout profile-layout"}>
        {!isAdmin && (
          <form className="panel form-panel profile-panel" onSubmit={saveProfile}>
            <div className="panel-title-row">
              <h2><UserRound size={18} /> Hồ sơ học tập</h2>
            </div>
            <div className="profile-identity profile-hero-card">
              <div className="profile-avatar-preview">
                {avatarUrl ? <img src={avatarUrl} alt="Ảnh đại diện" /> : <span>{user?.name?.[0]?.toUpperCase() || "U"}</span>}
              </div>
              <div>
                <strong>{user?.name}</strong>
                <span>{user?.email}</span>
                <div className="avatar-actions">
                  <button type="button" className="secondary-button compact-button" onClick={() => fileInputRef.current?.click()}>
                    <Camera size={15} />
                    Chọn ảnh
                  </button>
                  {avatarUrl && (
                    <button type="button" className="ghost-button compact-button" onClick={() => setAvatarUrl("")}>
                      Xóa ảnh
                    </button>
                  )}
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              className="hidden-file-input"
              type="file"
              accept="image/*"
              onChange={chooseAvatar}
            />
            <label>
              Họ tên
              <input value={user?.name || ""} disabled />
            </label>
            <label>
              Email
              <input value={user?.email || ""} disabled />
            </label>
            <label>
              Tên đăng nhập GitHub
              <input
                value={gitUsername}
                onChange={(event) => setGitUsername(event.target.value)}
                placeholder="Ví dụ: nguyenvana"
              />
            </label>
            <button className="primary-button" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu hồ sơ"}
            </button>
          </form>
        )}

        <form className="panel form-panel profile-panel compact-profile-form" onSubmit={submitPassword}>
          <div className="panel-title-row">
            <h2><KeyRound size={18} /> Đổi mật khẩu</h2>
          </div>
          <label>
            Mật khẩu hiện tại
            <input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })}
              required
            />
          </label>
          <label>
            Mật khẩu mới
            <input
              type="password"
              minLength={6}
              value={passwordForm.newPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })}
              required
            />
          </label>
          <label>
            Xác nhận mật khẩu mới
            <input
              type="password"
              minLength={6}
              value={passwordForm.confirmPassword}
              onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })}
              required
            />
          </label>
          <button className="primary-button" disabled={changingPassword}>
            {changingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
          </button>
        </form>
      </div>
    </section>
  );
}
