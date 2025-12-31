const API_URL = "http://127.0.0.1:8000";


function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}


document.getElementById("GetList").addEventListener("click", () => {
  fetch(API_URL + "/equipment", {
    method: "GET",
    headers: getAuthHeaders()
  }).then(response => response.text())
  .then(text =>{document.getElementById("GetList").innerText =text})
})

document.getElementById("SignUp").addEventListener("click", () => {
  window.location.href = "register.html";
})



document.getElementById("LoginBtn").addEventListener("click", () => {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  if (!username || !password) {
    document.getElementById("Login").innerText = "Error Login";
  } else {
    fetch(API_URL + "/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        password: password
      })
    })
      .then(response => response.json())
      .then(data => {
        localStorage.setItem("token", data.access_token);
        document.getElementById("Login").innerText = "Login success";
      });
  }
}); // ⬅️ סגירה של LoginBtn
