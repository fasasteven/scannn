import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../services/Api";

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [message, setMessage] = useState("Verifying your email...");
  useEffect(() => {
    api.get(`/auth/verify-email?token=${encodeURIComponent(params.get("token") || "")}`)
      .then((response) => setMessage(response.data.message))
      .catch((error) => setMessage(error.response?.data?.message || "Unable to verify this email."));
  }, [params]);
  return <main className="page"><section className="panel"><h1>Email verification</h1><p>{message}</p><Link to="/login">Continue to login</Link></section></main>;
}