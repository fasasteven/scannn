import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/Api";
import { isValidPassword } from "../services/validation";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [reset, setReset] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!isValidPassword(password)) {
      setMessage("Password must be longer than 8 characters, include one uppercase letter and one special character.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/password-reset/confirm", { token, password });
      setMessage(response.data.message);
      setReset(true);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to reset your password. Request a new link and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="content signup-content">
        <div className="text">Choose a new password</div>
        {reset ? (
          <div className="signup-success">
            <p>{message}</p>
            <Link to="/login">Continue to login</Link>
          </div>
        ) : !token ? (
          <div className="signup-success">
            <p>This password reset link is missing or invalid.</p>
            <Link to="/forgot-password">Request a new reset link</Link>
          </div>
        ) : (
          <>
            <p className="signup-message">Use a password longer than 8 characters with an uppercase letter and a special character.</p>
            {message && <p className="signup-message">{message}</p>}
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="field">
                <span aria-hidden="true">🔒</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <label>New Password</label>
              </div>
              <div className="field">
                <span aria-hidden="true">🔐</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
                <label>Confirm New Password</label>
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Resetting..." : "Reset password"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
