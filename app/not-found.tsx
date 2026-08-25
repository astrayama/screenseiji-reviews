import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap col" style={{ maxWidth: 480, paddingTop: 70, gap: 14, textAlign: "center" }}>
      <h1 className="ttl" style={{ fontSize: 34 }}>Lost between screens.</h1>
      <p className="mono-note">this page doesn&apos;t exist — or hasn&apos;t been reviewed yet</p>
      <div className="row" style={{ justifyContent: "center", gap: 8 }}>
        <Link className="chip chip--solid" href="/">home</Link>
        <Link className="chip" href="/archive">the archive</Link>
      </div>
    </div>
  );
}
