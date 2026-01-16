const API_URL = "https://127.0.0.1:8000";



function getAuthHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...extra
  };

  if (token) {
    headers["Authorization"] = "Bearer " + token;
  }

  return headers;
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

      clone.querySelector(".p-title").innerText = item.name ?? string(item.id);
      clone.querySelector(".p-meta").innerText = item.category ?? "";
      clone.querySelector(".price").innerText = (item.price != null) ? ("₪ " + item.price) : "";
      const button = clone.querySelector(".small");

      const qty = Number(item.quantity ?? 0);

        if (qty <= 0) {
          button.disabled = true;
          button.innerText = "Out of stock";
          button.style.opacity = "0.55";
          button.style.cursor = "not-allowed";
        } else {
          button.disabled = false;
          button.innerText = "Add to my Cart";
          button.addEventListener("click", () => createOrder(item));
        }

        productsDiv.appendChild(clone);
      });
    })
    .catch(err => alert("Network error: " + err.message));
}

function createOrder(item) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("You must login first to add items to your cart.");
    return;
  }

  const qty = Number(item.quantity ?? 0);
  if (qty <= 0) {
    alert("This product is out of stock.");
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
        alert("Error: " + res.status + " - " + text);
        return;
      }
      alert("Added to cart!");
      loadEquipment();
    })
    .catch(err => alert("Network error: " + err.message));
}

document.getElementById("LogOut").addEventListener("click", () => {
  localStorage.removeItem("token");
  initAuthUI();
})


document.getElementById("LoginBtn").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    alert("Please enter username and password");
    return;
  }

  const certPem = localStorage.getItem("client_cert_pem");
  if (!certPem) {
    alert("No certificate found. Please register first to receive a certificate.");
    return;
  }

  // ✅ קריטי: לקודד לפני שליחה ב-Header כדי למנוע Invalid value
  const certHeaderValue = encodeURIComponent(certPem);

  try {
    const res = await fetch(API_URL + "/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Cert": certHeaderValue
      },
      body: JSON.stringify({ username, password })
    });

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await res.json()
      : await res.text();

    if (!res.ok) {
      const detail = (payload && payload.detail) ? payload.detail : payload;
      alert("Login failed: " + detail);
      return;
    }

    localStorage.setItem("token", payload.access_token);
    initAuthUI();
    alert("Login successful!");
  } catch (err) {
    alert("Network error: " + err.message);
  }
});




document.addEventListener("DOMContentLoaded", () => {

    document.getElementById("SignUp").addEventListener("click", () => {
      window.location.href = "register.html";
    });
    
   initAuthUI();
  const cartBtn = document.getElementById("CartBtn");
  if (cartBtn) {
    cartBtn.addEventListener("click", () => {
      window.location.href = "MyCart.html";
    });
  }

  const historyBtn = document.getElementById("HistoryBtn");
  if (historyBtn) {
    historyBtn.addEventListener("click", () => {
      window.location.href = "history.html";
    });
  }

  const signUpBtn = document.getElementById("SignUp");
  if (signUpBtn) {
    signUpBtn.addEventListener("click", () => {
      window.location.href = "register.html";
    });
  }
  const adminBtn = document.getElementById("AdminBtn");
  if (adminBtn) {
    adminBtn.addEventListener("click", () => {
      window.location.href = "admin.html";
    });
  }


  loadEquipment();
});

async function getMeIfValid() {
  const token = localStorage.getItem("token");
  if (!token) return null;

  try {
    const res = await fetch(API_URL + "/me", {
      method: "GET",
      headers: getAuthHeaders()
    });

    if (res.status === 401) return null;
    if (!res.ok) return null;

    return await res.json(); 
  } catch (e) {
    return null;
  }
}



function setLoggedInUI(isLoggedIn, me = null) {
  const loginSection = document.getElementById("loginSection");
  const signUpSection = document.getElementById("SignUpSection");
  const container = document.querySelector(".container");

  const LogOutSection = document.getElementById("LogOutSection");
  const signUpBtn = document.getElementById("SignUp");      
  const AdminBtn = document.getElementById("AdminBtn");    

  if (isLoggedIn) {
    if (LogOutSection) LogOutSection.style.display = "inline-block";
    if (loginSection) loginSection.style.display = "none";
    if (signUpSection) signUpSection.style.display = "none";
    if (signUpBtn) signUpBtn.style.display = "none";         
    if (container) container.style.gridTemplateColumns = "1fr";


    if (AdminBtn) AdminBtn.style.display = (me && me.role === "admin") ? "inline-block" : "none";

  } else {
    if (LogOutSection) LogOutSection.style.display = "none";
    if (loginSection) loginSection.style.display = "block";
    if (signUpSection) signUpSection.style.display = "block";
    if (signUpBtn) signUpBtn.style.display = "inline-block";
    if (container) container.style.gridTemplateColumns = "1.35fr .65fr";

    if (AdminBtn) AdminBtn.style.display = "none";
  }
}

async function initAuthUI() {
  const me = await getMeIfValid();

  if (!me) {
    localStorage.removeItem("token");
    setLoggedInUI(false);
  } else {
    setLoggedInUI(true, me);
  }
}


