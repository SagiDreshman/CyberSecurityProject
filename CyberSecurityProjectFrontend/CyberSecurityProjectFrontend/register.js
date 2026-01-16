const API_URL = "http://127.0.0.1:8000";
document.getElementById("registerBtn").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;
  const msg = document.getElementById("registerMsg");

if (!username || !password) {
    msg.style.color = "#dc2626";
    msg.innerText = "Please fill all fields.";
    return;
  }

  fetch(API_URL + "/auth/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username, password, role })
})
.then(async (res) => {
  if (res.status === 409) {
    msg.style.color = "#dc2626";
    msg.innerText = "This username is already registered.";
    return;
  }

  if (!res.ok) {
    msg.style.color = "#dc2626";
    msg.innerText = "Registration failed. Please try again.";
    return;
  }

  msg.style.color = "#16a34a";
  msg.innerText = "Registration successful! Redirecting...";

  setTimeout(() => {
    window.location.href = "web.html";
  }, 1500);
})
.catch(() => {
  msg.style.color = "#dc2626";
  msg.innerText = "Network error. Please try again.";
});
});