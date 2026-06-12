import { useEffect, useRef, useState } from "react";
import { GitBranch, MessageSquare, RefreshCw, Send, Users } from "lucide-react";
import { io } from "socket.io-client";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export default function GroupChat() {
  const { activeGroup, user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!activeGroup?.id) return;
    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id]);

  useEffect(() => {
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"]
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (err) => setError(err.message));
    socket.on("message_error", (payload) => setError(payload?.error || "Lỗi tải tin nhắn thời gian thực"));
    socket.on("new_message", (message) => {
      setMessages((current) => {
        if (current.some((item) => item.id === message.id)) return current;
        return [...current, message];
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [token]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeGroup?.id) return;

    socket.emit("join_group", { groupId: activeGroup.id }, (response) => {
      if (response?.error) setError(response.error);
    });

    return () => {
      socket.emit("leave_group", { groupId: activeGroup.id });
    };
  }, [activeGroup?.id, connected]);

  async function loadMessages() {
    setError("");
    try {
      const result = await api.groupMessages(activeGroup.id);
      setMessages(result);
    } catch (err) {
      setError(err.message);
    }
  }

  async function sendMessage(event) {
    event.preventDefault();
    const cleanContent = content.trim();
    if (!cleanContent || !activeGroup?.id) return;
    setError("");

    const socket = socketRef.current;
    if (socket?.connected) {
      socket.emit("send_message", { groupId: activeGroup.id, content: cleanContent }, (response) => {
        if (response?.error) setError(response.error);
      });
      setContent("");
      return;
    }

    try {
      const message = await api.createGroupMessage(activeGroup.id, { content: cleanContent });
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
      setContent("");
    } catch (err) {
      setError(err.message);
    }
  }

  const members = activeGroup?.members || [];

  return (
    <section className="page chat-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Trò chuyện nhóm</p>
          <h1>Trao đổi trong workspace dự án</h1>
          <p className="muted">Tin nhắn được lưu theo nhóm để mọi thảo luận bám sát dự án, công việc và minh chứng.</p>
        </div>
        {activeGroup && (
          <button className="secondary-button" onClick={loadMessages}>
            <RefreshCw size={16} />
            Tải lại
          </button>
        )}
      </div>

      {!activeGroup && <div className="info-box">Hãy chọn nhóm trước khi mở trò chuyện.</div>}
      {error && <div className="error-box">{error}</div>}

      {activeGroup && (
        <div className="chat-workspace">
          <aside className="chat-sidebar chat-context-panel">
            <div className="chat-group-avatar">
              <Users size={24} />
            </div>
            <div>
              <p className="eyebrow">Nhóm đang chat</p>
              <h2>{activeGroup.name}</h2>
              <p className="muted">{activeGroup.project?.title || "Nhóm đang được chọn"}</p>
            </div>

            <div className="chat-current-group">
              <div>
                <span>Trưởng nhóm</span>
                <strong>{activeGroup.leader?.name || "Chưa chọn"}</strong>
              </div>
              <div>
                <span>Thành viên</span>
                <strong>{members.length || 0}</strong>
              </div>
              {activeGroup.gitRepoUrl ? (
                <a href={activeGroup.gitRepoUrl} target="_blank" rel="noreferrer">
                  <GitBranch size={15} />
                  Kho mã nguồn GitHub
                </a>
              ) : (
                <span className="muted">Chưa cấu hình repository</span>
              )}
            </div>

            <div className="chat-member-list">
              <strong>Thành viên trong nhóm</strong>
              {members.slice(0, 8).map((member) => {
                const memberUser = member.user || member;
                return (
                  <div className="chat-member-pill" key={member.id || memberUser.id}>
                    <span>{memberUser.name}</span>
                    <small>{memberUser.email || memberUser.gitUsername || "Thành viên"}</small>
                  </div>
                );
              })}
              {members.length === 0 && (
                <div className="empty-state compact">
                  <strong>Chưa có thành viên</strong>
                  <span>Thông tin thành viên sẽ xuất hiện khi nhóm có dữ liệu.</span>
                </div>
              )}
            </div>
          </aside>

          <div className="panel chat-panel project-chat-panel">
            <div className="chat-header">
              <div>
                <h2>{activeGroup.name}</h2>
                <span className={`status-pill ${connected ? "success" : "warning"}`}>
                  {connected ? "Đang kết nối trực tuyến" : "Chưa kết nối máy chủ"}
                </span>
              </div>
              <MessageSquare size={22} />
            </div>

            <div className="message-list">
              {messages.map((message) => {
                const mine = message.senderId === user?.id;
                return (
                  <div className={`message-row ${mine ? "mine" : ""}`} key={message.id}>
                    <div className="message-bubble">
                      <strong>{message.sender?.name || `Người dùng #${message.senderId}`}</strong>
                      <p>{message.content}</p>
                      <span>{new Date(message.sentAt).toLocaleString("vi-VN")}</span>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <div className="empty-state">
                  <strong>Chưa có tin nhắn</strong>
                  <span>Gửi tin nhắn đầu tiên để bắt đầu trao đổi với nhóm.</span>
                </div>
              )}
            </div>

            <form className="chat-form" onSubmit={sendMessage}>
              <input
                placeholder="Nhập tin nhắn cho nhóm"
                value={content}
                onChange={(event) => setContent(event.target.value)}
              />
              <button className="primary-button">
                <Send size={16} />
                Gửi
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
