export function PosterImg({
  src,
  alt,
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
}) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className={`poster ${className}`} src={src} alt={alt} loading="lazy" />;
  }
  return (
    <div className={`poster poster--empty ${className}`} aria-label={alt}>
      {alt}
    </div>
  );
}
