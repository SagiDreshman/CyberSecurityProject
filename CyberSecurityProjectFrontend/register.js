const API_URL = "https://127.0.0.1:8000"; // או https://localhost:8000 לפי מה שאתה מריץ

document.getElementById("registerBtn").addEventListener("click", async () => {
  const msg = document.getElementById("registerMsg");
  msg.style.color = "crimson";
  msg.innerText = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  if (!username || !password) {
    msg.innerText = "Please enter username and password.";
    return;
  }

  try {
    const res = await fetch(API_URL + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role })
    });

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      const detail = (payload && payload.detail) ? payload.detail : payload;
      msg.innerText = "Register failed: " + detail;
      return;
    }

    if (!payload.certificate_pem) {
      msg.innerText = "Register succeeded but certificate_pem missing from response.";
      return;
    }

    // ✅ שומרים תעודה (raw PEM) בלוקאל סטורג'
    localStorage.setItem("client_cert_pem", payload.certificate_pem);
    localStorage.setItem("last_username", username);

    msg.style.color = "green";
    msg.innerText = "Registered! Certificate saved. Redirecting to login...";

    setTimeout(() => {
      window.location.href = "web.html";
    }, 700);

  } catch (err) {
    msg.innerText = "Network error: " + err.message;
  }
});
