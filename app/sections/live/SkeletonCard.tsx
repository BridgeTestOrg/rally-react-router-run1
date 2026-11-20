/** Decorative loading card with the same geometry as LiveCard. */
export function SkeletonCard() {
  return (
    <div className="live-card" aria-hidden="true">
      <div className="shimmer live-skel" style={{ width: "60%", height: 22 }} />
      <div className="shimmer live-skel mt-2" style={{ width: "40%", height: 14 }} />
      <div className="shimmer live-skel mt-3" style={{ width: 80, height: 24 }} />
      <hr className="live-divider" />
      <div className="live-stats">
        {[0, 1, 2].map((i) => (
          <div key={i} className="shimmer live-skel" style={{ width: "70%", height: 36 }} />
        ))}
      </div>
      <div className="shimmer live-skel" style={{ width: "80%", height: 14 }} />
    </div>
  );
}
