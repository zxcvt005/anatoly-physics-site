export function SmokeBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden="true"
    >
      <div className="smoke-blob smoke-blob-1 absolute -left-[12%] top-[6%] h-[min(780px,92vw)] w-[min(780px,92vw)] rounded-full bg-[#3166F0] opacity-[0.08] blur-[100px] will-change-transform" />
      <div className="smoke-blob smoke-blob-2 absolute right-[-10%] bottom-[8%] h-[min(680px,88vw)] w-[min(680px,88vw)] rounded-full bg-[#3166F0] opacity-[0.06] blur-[100px] will-change-transform" />
      <div className="smoke-blob smoke-blob-3 absolute top-[42%] left-[28%] h-[min(560px,80vw)] w-[min(560px,80vw)] rounded-full bg-[#3166F0] opacity-[0.05] blur-[90px] will-change-transform" />
    </div>
  );
}
