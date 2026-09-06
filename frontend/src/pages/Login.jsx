import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

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

      const response = await axios.post(
        "http://localhost:5000/api/auth/login",
        {
          email,
          password,
          lecturerAccessCode,
        },
      );

      localStorage.setItem("token", response.data.token);
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
    <div>
      <h1>Login</h1>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>

        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        <div>
          <label>Lecturer Access Code (lecturers only)</label>
          <input
            type="password"
            value={lecturerAccessCode}
            onChange={(event) => setLecturerAccessCode(event.target.value)}
            autoComplete="off"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Logging in..." : " Login"}
        </button>
      </form>

      <p>
        Do not have an account? <Link to="/signup">Sign up</Link>
      </p>
    </div>
  );
}
