export function Particles() {
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      <div
        className="absolute -top-40 -left-40 h-80 w-80 rounded-full opacity-[0.08]"
        style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 70%)' }}
      />
      <div
        className="absolute -bottom-40 -right-20 h-96 w-96 rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(circle, #A855F7 0%, transparent 70%)' }}
      />
      <div
        className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #7C3AED 0%, transparent 60%)' }}
      />
    </div>
  );
}
