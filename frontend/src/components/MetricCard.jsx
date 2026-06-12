export default function MetricCard({ label, value, tone = "default", helper, icon: Icon }) {
  return (
    <div className={`metric-card ${tone}`}>
      <div className="metric-card-top">
        <span>{label}</span>
        {Icon && (
          <div className="metric-icon">
            <Icon size={19} />
          </div>
        )}
      </div>
      <strong>{value}</strong>
      {helper && <small>{helper}</small>}
    </div>
  );
}
