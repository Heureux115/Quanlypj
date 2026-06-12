import { useEffect, useState } from "react";
import { Check, RefreshCw, UserPlus, X } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";

export default function JoinRequests() {
  const { activeGroup, isLeader, user, setActiveGroup } = useAuth();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const canReview = Boolean(activeGroup && (isLeader || ["LECTURER", "ADMIN"].includes(user?.role)));

  useEffect(() => {
    if (!canReview) return;
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id, canReview]);

  async function loadRequests() {
    setError("");
    setLoading(true);
    try {
      const result = await api.groupJoinRequests(activeGroup.id, "PENDING");
      setRequests(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function reviewRequest(requestId, status) {
    setError("");
    setNotice("");
    try {
      const result = await api.reviewJoinRequest(requestId, { status });
      setRequests((current) => current.filter((item) => item.id !== requestId));
      if (status === "APPROVED" && result.member) {
        const freshGroup = await api.group(activeGroup.id);
        setActiveGroup(freshGroup);
      }
      setNotice(status === "APPROVED" ? "Đã duyệt sinh viên vào nhóm." : "Đã từ chối yêu cầu.");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <section className="page join-review-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Yêu cầu tham gia</p>
          <h1>Duyệt sinh viên vào nhóm</h1>
          <p className="muted">
            Nhóm trưởng hoặc giảng viên duyệt yêu cầu cho nhóm đang chọn. Sau khi duyệt, danh sách thành viên sẽ được cập nhật.
          </p>
        </div>
        {canReview && (
          <button className="secondary-button" onClick={loadRequests}>
            <RefreshCw size={16} />
            Tải lại
          </button>
        )}
      </div>

      {!activeGroup && <div className="info-box">Hãy chọn một nhóm ở màn hình Không gian dự án hoặc Nhóm của tôi trước.</div>}
      {activeGroup && !canReview && (
        <div className="error-box">Bạn không có quyền duyệt yêu cầu của nhóm này.</div>
      )}
      {error && <div className="error-box">{error}</div>}
      {notice && <div className="success-box">{notice}</div>}

      {canReview && (
        <div className="panel">
          <div className="panel-title-row">
            <div>
              <h2>{activeGroup.name}</h2>
              <p className="muted">Các yêu cầu đang chờ được xử lý cho nhóm hiện tại.</p>
            </div>
            <span className={`status-pill ${requests.length ? "warning" : "success"}`}>{requests.length} chờ duyệt</span>
          </div>
          {loading && <div className="loading-state request-loading">Đang tải yêu cầu...</div>}
          {!loading && requests.length === 0 && (
            <div className="empty-state">
              <UserPlus size={28} />
              <strong>Không có yêu cầu đang chờ</strong>
              <span>Khi sinh viên xin vào nhóm, yêu cầu sẽ xuất hiện tại đây.</span>
            </div>
          )}
          <div className="table-list">
            {requests.map((request) => (
              <div className="table-row request-row" key={request.id}>
                <div>
                  <strong>{request.user?.name}</strong>
                  <span>{request.user?.email}</span>
                  {request.message && <span>{request.message}</span>}
                </div>
                <span>{new Date(request.createdAt).toLocaleString("vi-VN")}</span>
                <div className="button-row">
                  <button
                    className="secondary-button"
                    onClick={() => reviewRequest(request.id, "APPROVED")}
                  >
                    <Check size={16} />
                    Duyệt
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => reviewRequest(request.id, "REJECTED")}
                  >
                    <X size={16} />
                    Từ chối
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
