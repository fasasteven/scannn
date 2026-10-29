export default function PasswordVisibilityToggle({ isVisible, onToggle }) {
  return (
    <button
      type="button"
      className="password-toggle"
      aria-label={isVisible ? "Hide password" : "Show password"}
      aria-pressed={isVisible}
      onClick={onToggle}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isVisible ? (
          <>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </>
        ) : (
          <>
            <path d="m3 3 18 18" />
            <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a15.7 15.7 0 0 1-3.1 3.8" />
            <path d="M6.2 6.2C3.5 8 2 12 2 12s3.6 7 10 7a10.5 10.5 0 0 0 4.1-.8" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
          </>
        )}
      </svg>
    </button>
  );
}
