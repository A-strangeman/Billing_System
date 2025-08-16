document.addEventListener("DOMContentLoaded", () => {
  const deletedBillList = document.getElementById("deletedBillList");

  // Fetch deleted bills
  async function loadDeletedBills() {
    deletedBillList.innerHTML = "<li>Loading...</li>";
    try {
      const res = await fetch("/api/get-deleted-bills", {
        credentials: "include"
      });
      if (!res.ok) throw new Error("Failed to load deleted bills");
      const bills = await res.json();
      if (!bills.length) {
        deletedBillList.innerHTML = "<li>No deleted bills found.</li>";
        return;
      }
      deletedBillList.innerHTML = "";
      bills.forEach(bill => {
        const li = document.createElement("li");
        li.classList.add("bill-item");
        li.innerHTML = `
          <strong>Bill No:</strong> ${bill.estimate_no} -
          <strong>Customer:</strong> ${bill.customer_name} -
          <strong>Date:</strong> ${new Date(bill.bill_date).toLocaleDateString()}<br>
          <button class="restore-btn" data-id="${bill.id}">Restore</button>
          <button class="download-btn" data-bill='${JSON.stringify(bill)}'>Download PDF</button>
          <button class="delete-btn" data-id="${bill.id}">Permanent Delete</button>
        `;
        deletedBillList.appendChild(li);
      });
    } catch (err) {
      console.error(err);
      deletedBillList.innerHTML = "<li>Error loading deleted bills. Please try again.</li>";
    }
  }

  // Handle button clicks
  deletedBillList.addEventListener("click", async e => {
    if (e.target.classList.contains("restore-btn")) {
      const id = e.target.dataset.id;
      if (confirm("Restore this bill?")) {
        await fetch("/api/restore-bill", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: Number(id) })
        });
        loadDeletedBills();
      }
    }

    if (e.target.classList.contains("delete-btn")) {
      const id = e.target.dataset.id;
      if (confirm("Permanently delete this bill? This cannot be undone.")) {
        await fetch("/api/permanent-delete-bill", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ id: Number(id) })
        });
        loadDeletedBills();
      }
    }

    if (e.target.classList.contains("download-btn")) {
      const bill = JSON.parse(e.target.dataset.bill);
      downloadBillPDF(bill);
    }
  });

  // PDF download function
  function downloadBillPDF(bill) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Bill No: ${bill.estimate_no}`, 10, 10);
    doc.text(`Customer: ${bill.customer_name}`, 10, 20);
    doc.text(`Phone: ${bill.customer_phone || "-"}`, 10, 30);
    doc.text(`Date: ${new Date(bill.bill_date).toLocaleDateString()}`, 10, 40);

    doc.setFontSize(14);
    doc.text("Items:", 10, 60);

    let y = 70;
    const items = typeof bill.items === "string" ? JSON.parse(bill.items) : bill.items;
    items.forEach((item, index) => {
      doc.text(
        `${index + 1}. ${item.product} - Qty: ${item.qty} ${item.unit} @ ${item.price} = ${item.rowTotal}`,
        10,
        y
      );
      y += 10;
    });

    y += 10;
    doc.text(`Sub Total: ${bill.sub_total}`, 10, y);
    y += 10;
    doc.text(`Discount: ${bill.discount}`, 10, y);
    y += 10;
    doc.text(`Grand Total: ${bill.grand_total}`, 10, y);
    y += 10;
    doc.text(`Received: ${bill.received}`, 10, y);
    y += 10;
    doc.text(`Balance: ${bill.balance}`, 10, y);

    doc.save(`Deleted_Bill_${bill.estimate_no}.pdf`);
  }

  // Load bills initially
  loadDeletedBills();
});
