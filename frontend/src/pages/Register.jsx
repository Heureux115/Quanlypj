import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function Register() {
  const navigate = useNavigate();
  const { token } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "STUDENT" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const result = await api.register(form);
      if (result.status === "PENDING") {
        setNotice("Tài khoản giảng viên đã được gửi và đang chờ admin duyệt trước khi đăng nhập.");
        setForm({ name: "", email: "", password: "", role: "LECTURER" });
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={handleSubmit}>
        <div>
          <p className="eyebrow">Tài khoản người dùng</p>
          <h1>Đăng ký</h1>
          <p className="muted">Sinh viên có thể dùng ngay. Giảng viên cần admin duyệt trước khi đăng nhập.</p>
        </div>

        <label>
          Họ tên
          <input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            required
          />
        </label>

        <label>
          Email
          <input
            type="email"
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
            required
          />
        </label>

        <label>
          Mật khẩu
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
            required
          />
        </label>

        <label>
          Vai trò
          <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
            <option value="STUDENT">Sinh viên</option>
            <option value="LECTURER">Giảng viên</option>
          </select>
        </label>

        {error && <div className="error-box">{error}</div>}
        {notice && <div className="success-box">{notice}</div>}

        <button className="primary-button" disabled={loading}>
          {loading ? "Đang tạo..." : "Tạo tài khoản"}
        </button>

        <p className="muted center">
          Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
        </p>
      </form>
    </div>
  );
}
