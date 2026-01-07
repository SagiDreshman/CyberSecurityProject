const API_URL = "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}
function loadMyOrders() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("אתה חייב להתחבר כדי לראות את העגלה");
    return;
  }

  fetch(API_URL + "/orders/my", {
    method: "GET",
    headers: getAuthHeaders()
  })
  .then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      alert("שגיאה: " + res.status + " - " + text);
      return;
    }

    const orders = JSON.parse(text);

    const cartList = document.getElementById("cartList");
    cartList.innerHTML = "";

    if (!orders || orders.length === 0) {
      const li = document.createElement("li");
      li.innerText = "העגלה ריקה";
      cartList.appendChild(li);
      return;
    }

    // מציג את הפריטים ששמורים ב-DB (sku/qty)
    orders.forEach(order => {
      (order.items || []).forEach(it => {
        const li = document.createElement("li");
        li.innerText = `Order #${order.id} | SKU: ${it.sku} | Qty: ${it.qty}`;
        cartList.appendChild(li);
      });
    });
  })
  .catch(err => alert("שגיאת רשת: " + err.message));
}

document.addEventListener("DOMContentLoaded", loadMyOrders);


function payAndMoveToHistory() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("אתה חייב להתחבר כדי לשלם");
    return;
  }

  fetch(API_URL + "/orders/checkout", {
    method: "POST",
    headers: getAuthHeaders()
  })
  .then(async (res) => {
    const text = await res.text();
    if (!res.ok) {
      alert("שגיאה בתשלום: " + res.status + " - " + text);
      return;
    }

    const data = JSON.parse(text);
    alert("Payment הצליח! עבר ל-History. history_id=" + data.history_id);

    // מרענן עגלה (תהיה ריקה כי עבר ל-history)
    window.location.href = "history.html";
    

    
  })
  .catch(err => alert("שגיאת רשת: " + err.message));
}

document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("paymentBtn");
  if (btn) btn.addEventListener("click", payAndMoveToHistory);
});

