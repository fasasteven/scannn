import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDeviceId } from "../services/device";
import api from "../services/Api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [lecturerAccessCode, setLecturerAccessCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email,
        password,
        lecturerAccessCode,
        deviceId: getDeviceId(),
      });

      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (response.data.user.role === "student") {
        navigate("/student");
      } else {
        navigate("/lecturer");
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to log in. Check your details and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="content">
        <div className="text">Login</div>

        {message && <p className="login-message">{message}</p>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <span aria-hidden="true">✉</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
            <label>Email Address</label>
          </div>

          <div className="field">
            <span aria-hidden="true">🔒</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            <label>Password</label>
          </div>

          <div className="field">
            <span aria-hidden="true">🔑</span>
            <input
              type="password"
              value={lecturerAccessCode}
              onChange={(event) => setLecturerAccessCode(event.target.value)}
              autoComplete="off"
            />
            <label>Lecturer Access Code</label>
          </div>

          <div className="forgot-pass">
            <a href="#">Forgot Password?</a>
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="sign-up">
          Do not have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
