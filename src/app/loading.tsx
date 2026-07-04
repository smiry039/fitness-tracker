// Shared route skeleton — shows instantly on navigation while the server
// render (and its DB round trips) completes, so tab taps feel immediate.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skel" style={{ width: 120, height: 14 }} />
      <div className="skel" style={{ width: 240, height: 34, marginTop: 12 }} />
      <div className="skel" style={{ width: 180, height: 14, marginTop: 10 }} />
      <div className="skel skel-card" style={{ marginTop: 22 }} />
      <div className="skel skel-card" />
      <div className="skel skel-card" />
    </div>
  );
}
