// Logotipo IEADMS (chama + sigla), mesmo desenho do site atual.
export function Chama({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 97" className={className} aria-hidden="true" fill="currentColor" fillRule="evenodd">
      <path d="M34.48,92.71C59.5,58.28,74.51,43.85,46,0,42.14,30.9-8.49,49.45,34.48,92.71Z" />
      <path d="M10.79,45.18C-10.6,67.89,2.6,89.87,26.09,93,13.51,81.26,7.29,66,10.79,45.18Z" />
      <path d="M67.6,32.37C88.16,66.54,82,88.67,44.05,96.54c1.49-10.73,7.53-14.34,11.87-20.83C63.09,65,69.67,53.65,67.6,32.37Z" />
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Chama className="h-8 w-auto text-ouro" />
      <span className="font-display text-xl font-bold tracking-wide">IEADMS</span>
    </span>
  );
}
