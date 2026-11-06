import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap col" style={{ maxWidth: 520, paddingTop: 70, gap: 16, textAlign: "center" }}>
      <h1 className="ttl" style={{ fontSize: 44 }}>Lost between screens.</h1>
      <p className="mono-note">this page doesn&apos;t exist — or hasn&apos;t been reviewed yet</p>
      <div className="row" style={{ justifyContent: "center", gap: 8 }}>
        <Link className="btn btn--amber" href="/">home</Link>
        <Link className="btn" href="/archive">the archive</Link>
      </div>
    </div>
  );
}
