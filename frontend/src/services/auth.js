import api from "./Api";

export async function logout() {
  try {
    await api.post("/auth/logout");
    return { serverSignedOut: true };
  } catch (error) {
    return {
      serverSignedOut: false,
      message: error.response?.data?.message || error.message || "The server could not confirm sign-out.",
    };
  } finally {
    localStorage.removeItem("user");
  }
}