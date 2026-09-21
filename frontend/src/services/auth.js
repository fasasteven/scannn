import api from "./Api";

export async function logout() {
  await api.post("/auth/logout");
  localStorage.removeItem("user");
}