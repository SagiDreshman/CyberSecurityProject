const API_URL = "http://127.0.0.1:8000";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}
async function addOne(sku) {
  const res = await fetch(API_URL + "/orders", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ items: [{ sku, qty: 1 }] })
  });

  if (!res.ok) {
    const text = await res.text();
    alert("Add failed: " + text);
    return;
  }
  await loadCart();
}

async function removeOne(sku) {
  const res = await fetch(API_URL + "/orders/cart/remove_one", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ sku })
  });

  if (!res.ok) {
    const text = await res.text();
    alert("Remove failed: " + text);
    return;
  }
  await loadCart();
}

function setMsg(text) {
  const el = document.getElementById("msg");
  if (el) el.innerText = text || "";
}

function moneyILS(x) {
  const n = Number(x || 0);
  return "₪" + n.toFixed(2);
}

function logoutAndGoHome() {
  localStorage.removeItem("token");
  window.location.href = "web.html";
}

async function fetchWithAuth(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...(options.headers || {}), ...getAuthHeaders() }
  });

  if (res.status === 401) {
    logoutAndGoHome();
    throw new Error("Unauthorized (token expired).");
  }

  return res;
}

async function fetchJson(url) {
  const res = await fetchWithAuth(url, { method: "GET" });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} - ${text}`);
  return JSON.parse(text);
}

function buildProductsMap(list) {
  const map = {};
  (list || []).forEach(p => {
    const sku = p.sku ?? p.id ?? p.serialNumber ?? p.serial ?? p.product_id;
    if (sku == null) return;

    const name = p.name ?? p.title ?? p.product_name ?? p.productName;
    const price = p.price ?? p.unit_price ?? p.cost ?? p.unitPrice;

    map[String(sku)] = {
      sku: String(sku),
      name: name ?? "Unknown product",
      price: Number(price ?? 0)
    };
  });
  return map;
}

async function fetchCatalogMap() {
  const endpoints = ["/equipment", "/products"];
  for (const ep of endpoints) {
    try {
      const data = await fetchJson(API_URL + ep);
      const list = Array.isArray(data) ? data : (data.items || data.products || data.equipment || []);
      const map = buildProductsMap(list);
      if (Object.keys(map).length > 0) return map;
    } catch (_) {
      // try next endpoint
    }
  }
  return {};
}

function renderCart(orders, catalogMap) {
  const tbody = document.getElementById("cartTbody");
  const totalEl = document.getElementById("cartTotal");
  tbody.innerHTML = "";

  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Cart is empty</td></tr>`;
    totalEl.innerText = moneyILS(0);
    return;
  }

  const merged = {}; 
  orders.forEach(order => {
    (order.items || []).forEach(it => {
      const sku = String(it.sku);
      const qty = Number(it.qty || 0);
      merged[sku] = (merged[sku] || 0) + qty;
    });
  });

  let cartTotal = 0;

  Object.entries(merged).forEach(([sku, qty]) => {
    const prod = catalogMap[sku];
    const name = prod ? prod.name : "Unknown product";
    const price = prod ? Number(prod.price || 0) : 0;

    const subtotal = qty * price;
    cartTotal += subtotal;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${sku}</td>
      <td>${name}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="qty-btn" data-minus="${sku}">-</button>
          <strong>${qty}</strong>
          <button class="qty-btn" data-plus="${sku}">+</button>
        </div>
      </td>
      <td>${moneyILS(price)}</td>
      <td><strong>${moneyILS(subtotal)}</strong></td>
    `;
    tbody.appendChild(tr);
  });

  totalEl.innerText = moneyILS(cartTotal);
  tbody.querySelectorAll("[data-plus]").forEach(btn => {
  btn.addEventListener("click", () =>
    addOne(btn.getAttribute("data-plus"))
    );
  });

  tbody.querySelectorAll("[data-minus]").forEach(btn => {
    btn.addEventListener("click", () =>
      removeOne(btn.getAttribute("data-minus"))
    );
  });
}

async function loadCart() {
  const token = localStorage.getItem("token");
  if (!token) {
    logoutAndGoHome();
    return;
  }

  setMsg("");

  let orders;
  try {
    orders = await fetchJson(API_URL + "/orders/my");
  } catch (e) {
    setMsg("Failed to load cart orders: " + e.message);
    return;
  }

  const catalogMap = await fetchCatalogMap();
  if (Object.keys(catalogMap).length === 0) {
    setMsg("Warning: Could not load product catalog, name/price may be missing.");
  }

  renderCart(orders, catalogMap);
}

async function payAndMoveToHistory() {
  const res = await fetchWithAuth(API_URL + "/orders/checkout", { method: "POST" });
  const text = await res.text();

  if (!res.ok) {
    alert(`Payment failed: ${res.status} - ${text}`);
    return;
  }

  const data = JSON.parse(text);
  alert("Payment successful. history_id=" + data.history_id);
  window.location.href = "history.html";
}

document.addEventListener("DOMContentLoaded", () => {
  const payBtn = document.getElementById("paymentBtn");
  if (payBtn) payBtn.addEventListener("click", payAndMoveToHistory);

  loadCart();
});