import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

export default function Signup() {
  const navigate = useNavigate();

  const [role, setRole] = useState("student");
  const [formData, setFormData] = useState({
    name: "",
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

    try {
      setLoading(true);
      // console.log("Signup: sending request", { name: formData.name, email: formData.email, role });

      const response = await axios.post(
        "http://localhost:5000/api/auth/signup",
        {
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role,
          matricNumber:
            role === "student" ? formData.matricNumber : undefined,
          staffId: role === "lecturer" ? formData.staffId : undefined,
        },
      );

      // console.log("Signup: response", response.data);

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (role === "lecturer") {
        setIssuedAccessCode(response.data.lecturerAccessCode);
      } else {
        // console.log("Signup: navigating to /student");
        navigate("/student");
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
    <div>
      <h1>Create Account</h1>

      {issuedAccessCode ? (
        <>
          <p>Your lecturer account has been created.</p>
          <p>Save this access code now. You will need it each time you log in.</p>
          <p><strong>{issuedAccessCode}</strong></p>
          <button type="button" onClick={() => navigate("/login")}>Continue to login</button>
        </>
      ) : (
        <>

      {message && <p>{message}</p>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Full Name</label>
          <input
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Email Address</label>
          <input
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Register as</label>
          <select
            value={role}
            onChange={(event) => setRole(event.target.value)}
          >
            <option value="student">Student</option>
            <option value="lecturer">Lecturer</option>
          </select>
        </div>

        {role === "student" && (
          <div>
            <label>Matric Number</label>
            <input
              name="matricNumber"
              type="text"
              value={formData.matricNumber}
              onChange={handleChange}
              required
            />
          </div>
        )}

        {role === "lecturer" && (
          <>
            <div>
              <label>Staff ID</label>
              <input
                name="staffId"
                type="text"
                value={formData.staffId}
                onChange={handleChange}
                required
              />
            </div>

          </>
        )}

        <div>
          <label>Password</label>
          <input
            name="password"
            type="password"
            minLength="8"
            value={formData.password}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Confirm Password</label>
          <input
            name="confirmPassword"
            type="password"
            minLength="8"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
        </>
      )}
    </div>
  );
}
