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

document.getElementById("LogOut").addEventListener("click", () => {
  localStorage.removeItem("token");
  initAuthUI();
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
        initAuthUI();
        document.getElementById("Login").innerText = "Login success";
        
        
      });
  }
}); // ⬅️ סגירה של LoginBtn


document.addEventListener("DOMContentLoaded", () => {

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


  loadEquipment(); // תטען מוצרים אחרי שהדף נטען
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

    return await res.json(); // { username, role }
  } catch (e) {
    return null;
  }
}



function setLoggedInUI(isLoggedIn, me = null) {
  const loginSection = document.getElementById("loginSection");
  const signUpSection = document.getElementById("SignUpSection");
  const container = document.querySelector(".container");

  const LogOutSection = document.getElementById("LogOutSection");
  const signUpBtn = document.getElementById("SignUp");      // ✅ הכפתור של Sign up בטופ
  const AdminBtn = document.getElementById("AdminBtn");      // ✅ הכפתור של Admin Panel

  if (isLoggedIn) {
    if (LogOutSection) LogOutSection.style.display = "inline-block";
    if (loginSection) loginSection.style.display = "none";
    if (signUpSection) signUpSection.style.display = "none";
    if (signUpBtn) signUpBtn.style.display = "none";         // ✅ חשוב! מסתיר Sign up למי שמחובר
    if (container) container.style.gridTemplateColumns = "1fr";

    // ✅ Admin רק לאדמין
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


