// Shared route skeleton — shows instantly on navigation while the server
// render (and its DB round trips) completes, so tab taps feel immediate.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skel" style={{ width: 110, height: 14 }} />
      <div className="skel" style={{ width: 200, height: 32, margin: "10px 0 20px" }} />
      <div className="skel skel-card" style={{ height: 320 }} />
      <div className="tiles">
        <div className="skel skel-card" style={{ marginBottom: 0 }} />
        <div className="skel skel-card" style={{ marginBottom: 0 }} />
      </div>
      <div className="skel skel-card" />
    </div>
  );
}
