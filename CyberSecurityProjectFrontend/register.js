const API_URL = "http://127.0.0.1:8000";
document.getElementById("registerBtn").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const role = document.getElementById("role").value;

  if (!username || !password) {
    document.getElementById("Register").innerText = "Error Register";
  } else {
    fetch(API_URL + "/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        password: password,
        role: role
      })
    })
      .then(response => response.text())
      .then(text => {
        document.getElementById("Register").innerText = text;
      });
  }
}); // ⬅️ סגירה של registerBtn