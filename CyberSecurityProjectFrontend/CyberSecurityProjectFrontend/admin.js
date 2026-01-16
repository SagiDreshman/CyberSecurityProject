const API_URL = "http://127.0.0.1:8000";

function showSuccess(message) {
  alert(message);
  setMsg(message);
  setTimeout(() => setMsg(""), 3000);
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    "Authorization": "Bearer " + token
  };
}

function setMsg(t) {
  const el = document.getElementById("msg");
  if (el) el.innerText = t || "";
}

async function guardAdmin() {
  const token = localStorage.getItem("token");
  if (!token) {
    window.location.href = "web.html";
    return false;
  }

  const res = await fetch(API_URL + "/me", { headers: getAuthHeaders() });
  if (res.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "web.html";
    return false;
  }

  const me = await res.json();
  if (me.role !== "admin") {
    window.location.href = "web.html";
    return false;
  }

  return true;
}

function itemsToText(items) {
  if (!items || !items.length) return "-";
  return items.map(i => `${i.sku} x${i.qty}`).join(", ");
}

/* ---------- USERS ---------- */
async function loadUsers() {
  const res = await fetch(API_URL + "/admin/users", { headers: getAuthHeaders() });
  if (!res.ok) return setMsg("Load users failed: " + await res.text());

  const users = await res.json();
  const tbody = document.getElementById("usersTbody");
  tbody.innerHTML = "";

  users.forEach(u => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${u.id}</td>
      <td>${u.username}</td>
      <td>
        <select data-role="${u.id}">
          ${["admin","employee","viewer"].map(r =>
            `<option value="${r}" ${u.role===r?"selected":""}>${r}</option>`
          ).join("")}
        </select>
        <button class="small" data-saverole="${u.id}">Save</button>
      </td>
      <td class="right">
        <button class="small danger" data-id="${u.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

tbody.querySelectorAll("button[data-id]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = btn.getAttribute("data-id");
    if (!confirm("Delete user #" + id + "?")) return;

    const r = await fetch(API_URL + "/admin/users/" + id, {
      method: "DELETE",
      headers: getAuthHeaders()
    });

    if (!r.ok) return alert("Delete failed: " + await r.text());
    setMsg("User deleted");
    loadUsers();
  });
});

tbody.querySelectorAll("button[data-saverole]").forEach(btn => {
  btn.addEventListener("click", async () => {
    const id = btn.getAttribute("data-saverole");
    const sel = tbody.querySelector(`select[data-role="${id}"]`);
    const role = sel.value;

    const r = await fetch(API_URL + `/admin/users/${id}/role`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({ role })
    });

    if (!r.ok) return alert("Update role failed: " + await r.text());
    setMsg("Role updated");
    loadUsers();
  });
});
}
async function loadEquipmentAdmin() {
  const res = await fetch(API_URL + "/equipment", { headers: getAuthHeaders() });
  if (!res.ok) return setMsg("Load equipment failed: " + await res.text());

  const items = await res.json();
  const tbody = document.getElementById("equipTbody");
  tbody.innerHTML = "";

  items.forEach(it => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${it.id}</td>
      <td>${it.name}</td>
      <td>${it.sku}</td>

      <td>
        <input type="number" min="0" value="${it.quantity}" data-qty="${it.id}" style="width:90px;" />
      </td>

      <td>
        <input type="number" min="0" value="${it.price ?? 0}" data-price="${it.id}" style="width:90px;" />
      </td>

      <td class="right">
        <button class="small" data-saveeq="${it.id}">Save</button>
        <button class="small danger" data-deleteeq="${it.id}">Delete</button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-deleteeq]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const equipmentId = btn.getAttribute("data-deleteeq");
      await deleteEquipmentAdmin(equipmentId);
    });
  });

  tbody.querySelectorAll("button[data-saveeq]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const equipmentId = btn.getAttribute("data-saveeq");

      const qtyInput = tbody.querySelector(`input[data-qty="${equipmentId}"]`);
      const priceInput = tbody.querySelector(`input[data-price="${equipmentId}"]`);

      const newQty = parseInt(qtyInput.value, 10);
      const newPrice = parseInt(priceInput.value, 10);

      await updateEquipmentAdmin(equipmentId, newQty, newPrice);
    });
  });
}

async function createEquipmentAdmin() {
  const name = document.getElementById("newEquipName").value.trim();
  const quantity = parseInt(document.getElementById("newEquipQty").value, 10);
  const price = parseInt(document.getElementById("newEquipPrice").value, 10);

  if (!name || isNaN(quantity) || isNaN(price)) {return alert("Fill name, quantity and price");}
  if (isNaN(quantity) || quantity < 0) return alert("Quantity must be 0 or more");
  if (isNaN(price) || price < 0) return alert("Price must be 0 or more");

  const res = await fetch(API_URL + "/equipment", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ name, quantity, price })
  });

  if (!res.ok) return alert("Create equipment failed: " + await res.text());

  document.getElementById("newEquipName").value = "";
  document.getElementById("newEquipQty").value = "";
  document.getElementById("newEquipPrice").value = "";

  showSuccess("Product created successfully.");
  loadEquipmentAdmin();
}

async function deleteEquipmentAdmin(equipmentId) {
  if (!confirm("Delete equipment #" + equipmentId + "?")) return;

  const res = await fetch(API_URL + "/equipment/" + equipmentId, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  if (!res.ok) return alert("Delete failed: " + await res.text());

  setMsg("Equipment deleted");
  loadEquipmentAdmin();
}

async function updateEquipmentAdmin(equipmentId, newQty, newPrice) {
  if (isNaN(newQty) || newQty < 0) return alert("Quantity must be 0 or more");
  if (isNaN(newPrice) || newPrice < 0) return alert("Price must be 0 or more");

  const res = await fetch(API_URL + `/equipment/${equipmentId}`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify({ quantity: newQty, price: newPrice })
  });

  if (!res.ok) return alert("Update failed: " + await res.text());

  showSuccess("Changes saved successfully.");
  loadEquipmentAdmin();
}

async function createUser() {
  const username = document.getElementById("newUsername").value.trim();
  const password = document.getElementById("newPassword").value;
  const role = document.getElementById("newRole").value;

  if (!username || !password) return alert("צריך username + password");

  const res = await fetch(API_URL + "/admin/users", {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ username, password, role })
  });

  if (!res.ok) return alert("Create failed: " + await res.text());

  document.getElementById("newUsername").value = "";
  document.getElementById("newPassword").value = "";
  setMsg("User created");
  loadUsers();
}

async function loadOrders() {
  const res = await fetch(API_URL + "/admin/orders", { headers: getAuthHeaders() });
  if (!res.ok) return setMsg("Load orders failed: " + await res.text());

  const orders = await res.json();
  const tbody = document.getElementById("ordersTbody");
  tbody.innerHTML = "";

  orders.forEach(o => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>#${o.id}</td>
      <td>${o.user_id}</td>
      <td>${itemsToText(o.items)}</td>
      <td><span class="pill">${o.status}</span></td>
      <td class="right">
        <select data-order="${o.id}">
          ${["created","paid","shipped","delivered","cancelled"].map(s =>
            `<option value="${s}" ${o.status===s?"selected":""}>${s}</option>`
          ).join("")}
        </select>
        <button class="small" data-save="${o.id}">Save</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button[data-save]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-save");
      const sel = tbody.querySelector(`select[data-order="${id}"]`);
      const status = sel.value;

      const r = await fetch(API_URL + `/admin/orders/${id}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status })
      });

      if (!r.ok) return alert("Update failed: " + await r.text());
      setMsg("Order updated");
      loadOrders();
    });
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  const ok = await guardAdmin();
  if (!ok) return;

  document.getElementById("BackBtn").addEventListener("click", () => {
    window.location.href = "web.html";
  });

  document.getElementById("LogoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    window.location.href = "web.html";
  });

  document.getElementById("CreateUserBtn").addEventListener("click", createUser);
  document.getElementById("RefreshUsers").addEventListener("click", loadUsers);
  document.getElementById("RefreshOrders").addEventListener("click", loadOrders);
  document.getElementById("equipCreateBtn").addEventListener("click", createEquipmentAdmin);
  document.getElementById("equipRefreshBtn").addEventListener("click", loadEquipmentAdmin);
  loadEquipmentAdmin();
  loadUsers();
  loadOrders();
});
