const API_URL = "http://127.0.0.1:8000";


function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}


function loadEquipment() {
  const productsDiv = document.getElementById("products");
  const template = document.getElementById("product-template");

  productsDiv.innerHTML = "";

  fetch(API_URL + "/equipment", {
    method: "GET",
    headers: getAuthHeaders()
  })
  .then(res => res.json())
  .then(items => {
    items.forEach(item => {
      const clone = template.content.cloneNode(true);

      clone.querySelector(".p-title").innerText = item.name ?? item.id;
      clone.querySelector(".p-meta").innerText = item.category ?? "";
      clone.querySelector(".price").innerText =
        item.price ? "₪ " + item.price : "";
      // ⬇️ זה החלק החשוב
      const button = clone.querySelector(".small");

      button.addEventListener("click", () => {
        createOrder(item);
      });
      productsDiv.appendChild(clone);
    });
  });
}

  function createOrder(item) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("אתה חייב להתחבר קודם כדי להוסיף לעגלה.");
    return;
  }

  fetch(API_URL + "/orders", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + token
    },
    body: JSON.stringify({
      items: [{ sku: item.sku, qty: 1 }]
    })
  })
  .then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      alert("שגיאה: " + res.status + " - " + text);
      return;
    }
    alert("נוסף לעגלה ✅");
  })
  .catch(err => alert("שגיאת רשת: " + err.message));
}

    
document.getElementById("CartBtn").addEventListener("click", () => {
  window.location.href = "MyCart.html";
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
document.addEventListener("DOMContentLoaded", () => {
  loadEquipment();
});

