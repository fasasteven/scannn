import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDeviceId } from "../services/device";
import api from "../services/Api";
import { containsEmoji, isValidEmail, isValidPassword } from "../services/validation";

export default function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    matricNumber: "",
    staffId: "",
    lecturerAccessCode: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [issuedAccessCode, setIssuedAccessCode] = useState("");
  const [accessCodeDelivered, setAccessCodeDelivered] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);

  function handleChange(event) {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (Object.values(formData).some((value) => containsEmoji(value))) {
      setMessage("Emojis and stickers are not allowed in any field.");
      return;
    }
    if (!isValidEmail(formData.email)) {
      setMessage("Enter a valid email address.");
      return;
    }
    if (!isValidPassword(formData.password)) {
      setMessage("Password must be longer than 8 characters, include one uppercase letter and one special character.");
      return;
    }

    try {
      setLoading(true);
      // console.log("Signup: sending request", { name: formData.name, email: formData.email, role });

      const response = await api.post("/auth/signup", {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        email: formData.email,
        password: formData.password,
        deviceId: getDeviceId(),
        role,
        matricNumber: role === "student" ? formData.matricNumber : undefined,
        staffId: role === "lecturer" ? formData.staffId : undefined,
      });

      // console.log("Signup: response", response.data);

      setEmailVerificationSent(true);

      if (role === "lecturer") {
        setIssuedAccessCode(response.data.lecturerAccessCode);
        setAccessCodeDelivered(Boolean(response.data.accessCodeDelivered));
        if (response.data.message) setMessage(response.data.message);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to create account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      <div className="content signup-content">
        <div className="text">Create Account</div>

        {emailVerificationSent ? (
          <div className="signup-success">
            <p>Your lecturer account has been created.</p>
            <p>Check your email and click the verification link before logging in.</p>
            {role === "lecturer" && (
              accessCodeDelivered ? (
                <p>Your lecturer access code was sent to your email address.</p>
              ) : (
                <>
                  <p>Save this access code now. You will need it each time you log in.</p>
                  <p className="issued-access-code">
                    <strong>{issuedAccessCode}</strong>
                  </p>
                </>
              )
            )}
            <button type="button" onClick={() => navigate("/login")}>
              Continue to login
            </button>
          </div>
        ) : (
          <>
            {message && <p className="signup-message">{message}</p>}

            <form onSubmit={handleSubmit} className="signup-form">
              <div className="field">
                <span aria-hidden="true">👤</span>
                <input
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
                <label>Full Name</label>
              </div>

              <div className="field">
                <span aria-hidden="true">📞</span>
                <input
                  name="phoneNumber"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  autoComplete="tel"
                  required
                />
                <label>Phone Number</label>
              </div>

              <div className="field">
                <span aria-hidden="true">✉</span>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                />
                <label>Email Address</label>
              </div>

              <div className="field">
                <span aria-hidden="true">🧭</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                >
                  <option value="student">Student</option>
                  <option value="lecturer">Lecturer</option>
                </select>
                <label>Register as</label>
              </div>

              {role === "student" && (
                <div className="field">
                  <span aria-hidden="true">🎓</span>
                  <input
                    name="matricNumber"
                    type="text"
                    value={formData.matricNumber}
                    onChange={handleChange}
                    required
                  />
                  <label>Matric Number</label>
                </div>
              )}

              {role === "lecturer" && (
                <div className="field">
                  <span aria-hidden="true">🪪</span>
                  <input
                    name="staffId"
                    type="text"
                    value={formData.staffId}
                    onChange={handleChange}
                    required
                  />
                  <label>Staff ID</label>
                </div>
              )}

              <div className="field">
                <span aria-hidden="true">🔒</span>
                <input
                  name="password"
                  type="password"
                  minLength="8"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <label>Password</label>
              </div>

              <div className="field">
                <span aria-hidden="true">🔐</span>
                <input
                  name="confirmPassword"
                  type="password"
                  minLength="8"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <label>Confirm Password</label>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Creating account..." : "Sign Up"}
              </button>
            </form>

            <p className="sign-up">
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
