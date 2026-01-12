const API_URL = "http://127.0.0.1:8000";

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
      <td><span class="pill">${u.role}</span></td>
      <td class="right">
        <button class="small danger" data-id="${u.id}">Delete</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll("button").forEach(btn => {
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

/* ---------- ORDERS ---------- */
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

/* ---------- INIT ---------- */
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

  loadUsers();
  loadOrders();
});
