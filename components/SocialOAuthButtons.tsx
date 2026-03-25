"use client";

type Props = {
  onGoogle: () => void;
  onFacebook: () => void;
  disabled?: boolean;
};

export function OAuthEmailDivider() {
  return (
    <p className="mb-6 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
      — or continue with email —
    </p>
  );
}

export function SocialOAuthButtons({ onGoogle, onFacebook, disabled }: Props) {
  return (
    <div className="mb-6 space-y-3">
      <button
        type="button"
        disabled={disabled}
        onClick={onGoogle}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-500/30 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 shadow-[0_1px_0_rgba(255,255,255,0.06)] transition hover:bg-zinc-100 disabled:pointer-events-none disabled:opacity-50"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-lg font-bold"
          style={{ fontFamily: "Arial, sans-serif", color: "#4285F4" }}
          aria-hidden
        >
          G
        </span>
        Continue with Google
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onFacebook}
        className="flex w-full items-center justify-center gap-3 rounded-xl border border-[#1877F2]/60 bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white shadow transition hover:bg-[#166fe5] disabled:pointer-events-none disabled:opacity-50"
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xl font-bold leading-none"
          style={{ fontFamily: "Arial, sans-serif", color: "#1877F2" }}
          aria-hidden
        >
          f
        </span>
        Continue with Facebook
      </button>
    </div>
  );
}
