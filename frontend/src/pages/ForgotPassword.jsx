import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../services/Api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [requested, setRequested] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const response = await api.post("/auth/password-reset/request", { email });
      setMessage(response.data.message);
      setRequested(true);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to request a password reset. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="content signup-content">
        <div className="text">Reset password</div>
        {requested ? (
          <div className="signup-success">
            <p>{message}</p>
            <p>If the email is registered, check your inbox for a reset link. The link expires in one hour.</p>
            <Link to="/login">Return to login</Link>
          </div>
        ) : (
          <>
            <p className="signup-message">Enter the email address on your account. We’ll send reset instructions if it is registered.</p>
            {message && <p className="signup-message">{message}</p>}
            <form onSubmit={handleSubmit} className="signup-form">
              <div className="field">
                <span aria-hidden="true">✉</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
                <label>Email Address</label>
              </div>
              <button type="submit" disabled={loading}>
                {loading ? "Sending..." : "Send reset link"}
              </button>
            </form>
            <p className="sign-up"><Link to="/login">Return to login</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
