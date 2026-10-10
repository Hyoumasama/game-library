export default function TrophyIcon({ className = "h-5 w-5" }: { className?: string }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true"><path d="M7 3h10v6a5 5 0 0 1-10 0V3Z"/><path d="M7 5H3v3a4 4 0 0 0 5 4m9-7h4v3a4 4 0 0 1-5 4M12 14v4m-4 3h8l-1-3H9l-1 3Z"/><path d="m12 5 .8 1.7 1.9.3-1.4 1.3.3 1.9-1.6-.9-1.6.9.3-1.9L9.3 7l1.9-.3L12 5Z"/></svg>;
}
