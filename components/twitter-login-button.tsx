export function TwitterLoginButton() {
  return (
    <a
      className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-stone-200"
      href="/auth/login"
    >
      <svg
        aria-hidden="true"
        fill="currentColor"
        height="18"
        viewBox="0 0 24 24"
        width="18"
      >
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.847h-7.406l-5.8-7.584-6.639 7.584H.474l8.6-9.83L0 1.153h7.594l5.243 6.932zm-1.29 19.494h2.039L6.486 3.24H4.298z" />
      </svg>
      Continue with X
    </a>
  );
}
