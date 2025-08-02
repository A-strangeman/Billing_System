document.addEventListener("DOMContentLoaded", () => {
    // -------------------------
    // LOGIN PAGE HOOK
    // -------------------------
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();

            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value.trim();

            try {
                const res = await fetch("/api/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        email,
                        password
                    }),
                });

                const data = await res.json();

                if (res.ok && data.success) {
                    window.location.href = "welcome.html";
                } else {
                    alert(data.message || "Login failed");
                }
            } catch (err) {
                console.error(err);
                alert("Server error. Try again later.");
            }
        });

        return; // Stop further billing code if we're on login page
    }
    // ---------- ELEMENTS ----------
    const billTable = document.getElementById("billTable");
    if (!billTable) return;

    const tbody = billTable.querySelector("tbody");
    const billDateEl = document.getElementById("billDate");
    const addRowBtn = document.getElementById("addRowBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const discountEl = document.getElementById("discount");
    const receivedEl = document.getElementById("received");
    const subTotalEl = document.getElementById("subTotal");
    const grandTotalEl = document.getElementById("grandTotal");
    const balanceEl = document.getElementById("balance");
    const amountWordsEl = document.getElementById("amountWords");

    const estimateNoEl = document.getElementById("estimateNo");
    const customerNameEl = document.getElementById("customerName");
    const customerPhoneEl = document.getElementById("customerPhone");

    const catRow = document.getElementById("catRow");
    const materialBlockplumbing = document.getElementById("materialBlockplumbing");
    const materialBlockwiring = document.getElementById("materialBlockwiring");
    const materialBlockCEMENT = document.getElementById("materialBlockCEMENT");
    const materialBlockTMT = document.getElementById("materialBlockTMT");
    const materialBlockPAINT = document.getElementById("materialBlockPAINT");
    const materialBlockTIN = document.getElementById("materialBlockTIN");
    const materialBlockPLY = document.getElementById("materialBlockPLY");
    const materialRowplumbing = document.getElementById("materialRowplumbing");
    const materialRowwiring = document.getElementById("materialRowwiring");
    const materialRowTMT = document.getElementById("materialRowTMT");
    const materialRowCEMENT = document.getElementById("materialRowCEMENT");
    const materialRowPAINT = document.getElementById("materialRowPAINT");
    const materialRowTIN = document.getElementById("materialRowTIN");
    const materialRowPLY = document.getElementById("materialRowPLY");

    // Size & fitting blocks (ids from your HTML)
    // Map raw HTML data-mat to canonical KEY we use in JS
    const MATERIAL_CANON = {
        "wire": "WIRE",
        "switch board": "SWITCHBOARD",
        "single": "SINGLE",
        "modular": "MODULAR",
        "box": "BOX",
        "mcb": "MCB",
        "mcb-box": "MCB_BOX",
        "pipe": "PIPE",
        "screw": "SCREW",
        "fiber-plate": "FIBER_PLATE",
        "wire beet": "WIRE_BEET",
        "gi-wire": "GI_WIRE"
    };

    const sizeBlocks = {
        // Plumbing
        CPVC: document.getElementById("sizeBlockCPVC"),
        PVC: document.getElementById("sizeBlockPVC"),
        GI: document.getElementById("sizeBlockGI"),
        Passion: document.getElementById("sizeBlockPassion"),
        Tank: document.getElementById("sizeBlockTank"),

        // Wiring (canonical keys)
        WIRE: document.getElementById("sizeBlockWIRE"),
        SWITCHBOARD: document.getElementById("sizeBlockSWITCHBOARD"),
        MODULAR: document.getElementById("sizeBlockMODULAR"),
        BOX: document.getElementById("sizeBlockBOX"),
        MCB: document.getElementById("sizeBlockMCB"),
        "MCB-BOX": document.getElementById("sizeBlockMCB-BOX"),
        PIPE: document.getElementById("sizeBlockPIPE"),
        "WIRE-BEET": document.getElementById("sizeBlockWIRE-BEET"),
        SCREW: document.getElementById("sizeBlockSCREW"),
        SINGLE: document.getElementById("sizeBlockSINGLE"),
        "FIBER-PLATE": document.getElementById("sizeBlockFIBER-PLATE"),

        // PAINT
        "Jenosolin": document.getElementById("sizeBlockJenosolin"),
        "BP Exterior": document.getElementById("sizeBlockBP Exterior"),
        "BP Interior": document.getElementById("sizeBlockBP Interior"),
        "Exterior A-Guard Primer": document.getElementById("sizeBlockExterior A-Guard Primer"),
        "All Guard": document.getElementById("sizeBlockAll Guard"),
        "Walmasta": document.getElementById("sizeBlockWalmasta"),
        "Silk": document.getElementById("sizeBlockSilk"),
        "Easy Clean": document.getElementById("sizeBlockEasy Clean"),
        "Bison": document.getElementById("sizeBlockBison"),
        "Berger Gold": document.getElementById("sizeBlockBerger Gold"),
        "Brolac": document.getElementById("sizeBlockBrolac"),
        "Umbrella": document.getElementById("sizeBlockUmbrella"),
        "Enamel": document.getElementById("sizeBlockEnamel"),
        "Metal Primer": document.getElementById("sizeBlockMetal Primer"),
        "Wood Primer": document.getElementById("sizeBlockWood Primer"),
        "Brush": document.getElementById("sizeBlockBrush"),
        "Roller": document.getElementById("sizeBlockRoller"),
        "Putty": document.getElementById("sizeBlockPutty"),


        //Tin
        "Aarti Color": document.getElementById("sizeBlockAarti Color"),
        "Aarti White": document.getElementById("sizeBlockAarti White"),
        "Hilti Screw": document.getElementById("sizeBlockHilti Screw"),
        "Maigra": document.getElementById("sizeBlockMaigra"),
        "Nails": document.getElementById("sizeBlockNails"),
        "Tin Killa": document.getElementById("sizeBlockTin Killa"),

        //PLY
        "18mm": document.getElementById("sizeBlock18mm"),
        "12mm": document.getElementById("sizeBlock12mm"),
        "10mm": document.getElementById("sizeBlock10mm"),
        "6mm": document.getElementById("sizeBlock6mm"),
        "Fevicol": document.getElementById("sizeBlockFevicol"),
        "Heatex": document.getElementById("sizeBlockHeatex"),
        "Beet": document.getElementById("sizeBlockBeet")
    };


    const fittingBlocks = {
        // Plumbing
        CPVC: document.getElementById("fittingBlockCPVC"),
        PVC: document.getElementById("fittingBlockPVC"),
        GI: document.getElementById("fittingBlockGI"),

        // Wiring
        WIRE: document.getElementById("fittingBlockWIRE"),
        SWITCHBOARD: document.getElementById("fittingBlockSWITCHBOARD"),
        MODULAR: document.getElementById("fittingBlockMODULAR"),
        MCB: document.getElementById("fittingBlockMCB"),
        "Aarti Color": document.getElementById("fittingBlockAarti Color"),
        "White Color": document.getElementById("fittingBlockWhite Color"),
        "18mm": document.getElementById("fittingBlock18mm"),
        "12mm": document.getElementById("fittingBlock12mm"),
        "10mm": document.getElementById("fittingBlock10mm"),
        "6mm": document.getElementById("fittingBlock6mm"),
        "Beet": document.getElementById("fittingBlockBeet") || null
    };

    // ---------- STATE ----------
    let sn = 1;
    let activeRow = null;
    let selectedCategory = null;
    let selectedMaterial = null;
    let selectedSize = null;
    let selectedFitting = null;

    let plyLength = null;
    let plyWidth = null;
    let plyCount = null;

    // ---------- INIT ----------
    billDateEl.value = new Date().toISOString().split("T")[0];

    addRowBtn.addEventListener("click", () => addRow());
    discountEl.addEventListener("input", computeTotals);
    receivedEl.addEventListener("input", computeTotals);
    downloadBtn.addEventListener("click", downloadPDF);

    addRow();
    computeTotals();

    // ---------- TABLE ----------
    function addRow(product = "") {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td class="sn"></td>
      <td><input type="text" class="product" value="${product}"></td>
      <td><input type="number" class="qty" min="1" value=""></td>
      <td>
        <select class="unit">
          <option value="Pcs" selected>Pcs</option>
          <option value="Kg">Kg</option>
          <option value="Sq-Ft">Sq-Ft</option>
          <option value="Pkts">Pkts</option>
          <option value="Mtr">Mtr</option>
          <option value="Bundle">Bundle</option>
          <option value="ft">ft</option>
        </select>
      </td>
      <td><input type="number" class="price" min="0" value=""></td>
      <td class="row-total">0.00</td>
      <td><button class="del">❌</button></td>
    `;
        tbody.appendChild(tr);
        renumber();

        const productInput = tr.querySelector(".product");
        const qtyInput = tr.querySelector(".qty");
        const priceInput = tr.querySelector(".price");

        // Move focus on Enter
        productInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                qtyInput.focus();
            }
        });

        qtyInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                priceInput.focus();
            }
        });

        priceInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                addRow();
                setTimeout(() => {
                    const rows = tbody.querySelectorAll("tr");
                    const lastRow = rows[rows.length - 1];
                    if (lastRow) {
                        const productField = lastRow.querySelector(".product");
                        if (productField) productField.focus();
                    }
                }, 0);
            }
        });

        qtyInput.addEventListener("input", computeTotals);
        priceInput.addEventListener("input", computeTotals);
        tr.querySelector(".del").addEventListener("click", () => {
            tr.remove();
            renumber();
            computeTotals();
            if (activeRow === tr) activeRow = null;
        });

        tr.addEventListener("click", () => setActiveRow(tr));
        setActiveRow(tr);
        computeTotals();
    }


    function renumber() {
        sn = 1;
        [...tbody.querySelectorAll("tr")].forEach(tr => {
            tr.querySelector(".sn").textContent = sn++;
        });
    }

    function setActiveRow(tr) {
        if (activeRow) activeRow.classList.remove("active");
        activeRow = tr;
        if (activeRow) activeRow.classList.add("active");
    }
    // Auto-increment Estimate No
    function getNextEstimateNo() {
        let lastEstimate = parseInt(localStorage.getItem("lastEstimateNo") || "0", 10);
        lastEstimate++;
        localStorage.setItem("lastEstimateNo", lastEstimate);
        return lastEstimate;
    }

    // Set initial Estimate No if field is empty
    if (estimateNoEl && !estimateNoEl.value) {
        estimateNoEl.value = getNextEstimateNo();
    }

    function calculatePlyUnits() {
        if (!activeRow || selectedCategory !== "Ply") {
            return;
        }

        const qtyInput = activeRow.querySelector(".qty");
        const unitSelect = activeRow.querySelector(".unit");

        if (plyLength && plyWidth && plyCount) {
            const totalUnits = plyLength * plyWidth * plyCount;
            qtyInput.value = totalUnits;
            unitSelect.value = "Sq-Ft";
        } else {
            qtyInput.value = 1;
        }

        computeTotals();
    }


    function computeTotals() {
        let subTotal = 0;
        tbody.querySelectorAll("tr").forEach(tr => {
            const qty = parseFloat(tr.querySelector(".qty").value) || 0;
            const price = parseFloat(tr.querySelector(".price").value) || 0;
            const rowTotal = qty * price;
            tr.querySelector(".row-total").textContent = rowTotal.toFixed(2);
            subTotal += rowTotal;
        });

        const discount = parseFloat(discountEl.value) || 0;
        const received = parseFloat(receivedEl.value) || 0;
        const grandTotal = Math.max(subTotal - discount, 0);
        const balance = Math.max(grandTotal - received, 0);

        subTotalEl.value = subTotal.toFixed(2);
        grandTotalEl.value = grandTotal.toFixed(2);
        balanceEl.value = balance.toFixed(2);

        if (amountWordsEl) {
            amountWordsEl.value = numberToWordsIndian(Math.round(grandTotal)) + " only";
        }
    }

    // ---------- CATEGORY PICKER ----------
// ... (rest of your code)

// ---------- CATEGORY PICKER ----------
if (catRow) {
  catRow.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;

    activateSingle(chip, "#catRow .chip");
    selectedCategory = chip.dataset.cat;

    // Reset plumbing & wiring fields
    selectedMaterial = selectedSize = selectedFitting = null;

    // A much cleaner way to handle showing/hiding blocks:
    // First, hide all material blocks
    materialBlockplumbing.style.display = "none";
    materialBlockwiring.style.display = "none";
    materialBlockCEMENT.style.display = "none";
    materialBlockTMT.style.display = "none";
    materialBlockPAINT.style.display = "none";
    materialBlockTIN.style.display = "none";
    materialBlockPLY.style.display = "none";
    
    // Then, hide all size and fitting blocks
    hideAllSizeBlocks();
    hideAllFittingBlocks();

    // Now, show the correct material block based on the selected category
    switch (selectedCategory) {
      case "Plumbing":
        materialBlockplumbing.style.display = "block";
        break;
      case "Wiring":
        materialBlockwiring.style.display = "block";
        break;
      case "TMT":
        materialBlockTMT.style.display = "block";
        break;
      case "Cement":
        materialBlockCEMENT.style.display = "block";
        break;
      case "Paint":
        materialBlockPAINT.style.display = "block";
        break;
      case "Tin":
        materialBlockTIN.style.display = "block";
        break;
      case "Ply":
        materialBlockPLY.style.display = "block";
        break;
      default:
        pushToActiveRow(selectedCategory); // put only the category name
        break;
    }
  });
}

// ... (rest of your code)


    // ---------- MATERIAL PICKER (Plumbing) ----------
    if (materialRowplumbing) {
        materialRowplumbing.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;

            activateSingle(chip, "#materialRowplumbing .chip");

            selectedMaterial = (chip.dataset.mat || "").trim();

            selectedSize = selectedFitting = null;
            hideAllSizeBlocks();
            hideAllFittingBlocks();

            if (selectedMaterial === "CPVC") {
                show(sizeBlocks.CPVC, fittingBlocks.CPVC);
            } else if (selectedMaterial === "PVC") {
                show(sizeBlocks.PVC, fittingBlocks.PVC);
            } else if (selectedMaterial === "GI") {
                show(sizeBlocks.GI, fittingBlocks.GI);
            } else if (selectedMaterial === "Passion") {
                show(sizeBlocks.Passion, null);
            } else if (selectedMaterial === "Tank") {
                show(sizeBlocks.Tank, null);
            } else {
                updateProductName();
            }
        });
    }

    // ---------- MATERIAL PICKER (Wiring) ----------
    if (materialRowwiring) {
        materialRowwiring.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;

            activateSingle(chip, "#materialRowwiring .chip");

            const raw = (chip.dataset.mat || "").trim().toLowerCase();
            const canon = MATERIAL_CANON[raw];
            selectedMaterial = canon || raw;

            selectedSize = selectedFitting = null;
            hideAllSizeBlocks();
            hideAllFittingBlocks();

            const sizeBlock = sizeBlocks[selectedMaterial];
            const fittingBlock = fittingBlocks[selectedMaterial];

            if (sizeBlock || fittingBlock) {
                show(sizeBlock, fittingBlock);
            } else {
                updateProductName();
            }
        });
    }


    // --- MATERIAL PICKER (PLY) ---
    if (materialRowPLY) {
        materialRowPLY.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;

            activateSingle(chip, "#materialRowPLY .chip");
            selectedMaterial = (chip.dataset.mat || "").trim();

            selectedSize = null;
            selectedFitting = null;
            plyLength = null;
            plyWidth = null;
            plyCount = null;

            hideAllSizeBlocks();
            hideAllFittingBlocks();

            const sizeBlockToShow = sizeBlocks[selectedMaterial];
            const fittingBlockToShow = fittingBlocks[selectedMaterial];

            if (sizeBlockToShow) sizeBlockToShow.style.display = "block";
            if (fittingBlockToShow) fittingBlockToShow.style.display = "block";

            if (!sizeBlockToShow && !fittingBlockToShow) {
                updateProductName();
            }
        });
    }



    // ---------- MATERIAL PICKER (TIN) ----------
    if (materialRowTIN) {
        materialRowTIN.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;

            activateSingle(chip, "#materialRowTIN .chip");

            const raw = (chip.dataset.mat || "").trim();
            selectedMaterial = raw;

            selectedSize = selectedFitting = null;
            hideAllSizeBlocks();
            hideAllFittingBlocks();

            const sizeBlock = sizeBlocks[selectedMaterial];
            const fittingBlock = fittingBlocks[selectedMaterial];

            if (sizeBlock) {
                show(sizeBlock);
            }
            if (fittingBlock) {
                show(fittingBlock);
            }

            if (!sizeBlock && !fittingBlock) {
                updateProductName();
            }
        });
    }
    // material PIcker for PAINT
    if (materialRowPAINT) {
        materialRowPAINT.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;

            activateSingle(chip, "#materialRowPAINT .chip");

            selectedMaterial = (chip.dataset.mat || "").trim();

            hideAllSizeBlocks();
            hideAllFittingBlocks();

            const sizeBlockToShow = sizeBlocks[selectedMaterial];
            if (sizeBlockToShow) {
                sizeBlockToShow.style.display = "block";
            }

            selectedSize = selectedFitting = null;
            updateProductName();
        });
    }

    // material PIcker for CEMENT
    if (materialRowCEMENT) {
        materialRowCEMENT.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;

            activateSingle(chip, "#materialRowCEMENT .chip");

            selectedMaterial = (chip.dataset.mat || "").trim();

            selectedSize = selectedFitting = null;
            hideAllSizeBlocks();
            hideAllFittingBlocks();
            updateProductName();
        });
    }



    function show(sizeBlock, fittingBlock) {
        if (sizeBlock) sizeBlock.style.display = "block";
        if (fittingBlock) fittingBlock.style.display = "block";
    }

    // ---------- SIZE PICKERS ----------
    Object.values(sizeBlocks).forEach(block => {
        if (!block) return;
        block.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;

            block.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            selectedSize = chip.dataset.size;

            if (selectedCategory === "Ply") {
                const dimensions = selectedSize.match(/\d+/g);
                if (dimensions && dimensions.length === 2) {
                    plyLength = parseInt(dimensions[0]);
                    plyWidth = parseInt(dimensions[1]);
                } else {
                    plyLength = null;
                    plyWidth = null;
                }
                calculatePlyUnits();
            }
            updateProductName();
        });
    });

    // ---------- FITTING PICKERS ----------
    Object.values(fittingBlocks).forEach(block => {
        if (!block) return;
        block.addEventListener("click", (e) => {
            const chip = e.target.closest(".chip");
            if (!chip) return;

            block.querySelectorAll(".chip").forEach(c => c.classList.remove("active"));
            chip.classList.add("active");
            selectedFitting = chip.dataset.fit;

            if (selectedCategory === "Ply") {
                if (chip.closest('[id^="fittingBlock"][id$="mm"]')) {
                    plyCount = parseInt(selectedFitting);
                }
                calculatePlyUnits();
            }
            updateProductName();
        });
    });


    function hideAllSizeBlocks() {
        Object.values(sizeBlocks).forEach(block => block && (block.style.display = "none"));
    }

    function hideAllFittingBlocks() {
        Object.values(fittingBlocks).forEach(block => block && (block.style.display = "none"));
    }

    function activateSingle(chip, selector) {
        document.querySelectorAll(selector).forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
    }

   function updateProductName() {
    if (!activeRow) return;
    const parts = [];
    if (selectedMaterial) parts.push(selectedMaterial);
    if (selectedSize) parts.push(selectedSize);
    if (selectedFitting) parts.push(selectedFitting);

    if (parts.length === 0 && selectedCategory) parts.push(selectedCategory);

    const productInput = activeRow.querySelector(".product");
    productInput.value = parts.join(" ");

    // Corrected logic: Call the calculation function here
    if (selectedCategory === "Ply") {
        calculatePlyUnits();
    } else {
        const qtyInput = activeRow.querySelector(".qty");
        qtyInput.focus();
    }
}

    function pushToActiveRow(text) {
        if (!activeRow) return;

        const productInput = activeRow.querySelector(".product");
        productInput.value = text || "";
    }


    // ---------- PDF ----------
    async function downloadPDF() {
        const {
            jsPDF
        } = window.jspdf;
        const doc = new jsPDF("p", "pt", "a4");

        const companyName = "ABC Company";
        const companyPhone = "Phone: 9825333385";
        const estimateNo = estimateNoEl.value || "-";
        const date = billDateEl.value || "-";
        const cust = customerNameEl.value || "-";
        const phone = customerPhoneEl.value || "-";
        const subTotal = subTotalEl.value || "0";
        const discount = discountEl.value || "0";
        const grandTotal = grandTotalEl.value || "0";
        const received = receivedEl.value || "0";
        const balance = balanceEl.value || "0";
        const amountWords = amountWordsEl ? (amountWordsEl.value || "") : "";

        doc.setFontSize(16);
        doc.text("Estimated Bill", 297.5, 30, {
            align: "center"
        });

        doc.setFontSize(18).setFont(undefined, "bold");
        doc.text(companyName, 40, 60);
        doc.setFontSize(10).setFont(undefined, "normal");
        doc.text(companyPhone, 40, 75);

        const leftX = 40,
            rightX = 340,
            boxY = 95,
            boxH = 60,
            boxW = 515;
        doc.rect(leftX, boxY, boxW, boxH);
        doc.line(rightX, boxY, rightX, boxY + boxH);

        doc.setFontSize(11);
        doc.text("Bill To:", leftX + 8, boxY + 18);
        doc.setFontSize(10);
        doc.text(cust, leftX + 8, boxY + 34);
        if (phone) doc.text(phone, leftX + 8, boxY + 50);

        doc.setFontSize(11);
        doc.text("Estimate Details:", rightX + 8, boxY + 18);
        doc.setFontSize(10);
        doc.text(`No: ${estimateNo}`, rightX + 8, boxY + 34);
        doc.text(`Date: ${date}`, rightX + 8, boxY + 50);

        const tableData = [];
        tbody.querySelectorAll("tr").forEach(tr => {
            const sn = tr.querySelector(".sn").textContent;
            const product = tr.querySelector(".product").value || "";
            const unit = tr.querySelector(".unit").value || "";
            const qty = tr.querySelector(".qty").value || "0";
            const price = parseFloat(tr.querySelector(".price").value || "0").toFixed(2);
            const amt = tr.querySelector(".row-total").textContent || "0.00";
            tableData.push([sn, product, qty, unit, `Rs. ${price}`, `Rs. ${amt}`]);
        });

        doc.autoTable({
            head: [
                ["#", "Item name", "Quantity", "Unit", "Price/ Unit(Rs)", "Amount(Rs)"]
            ],
            body: tableData,
            startY: boxY + boxH + 20,
            theme: "grid",
            styles: {
                fontSize: 9,
                cellPadding: 4
            },
            headStyles: {
                fillColor: [60, 60, 60],
                textColor: 255
            },
            columnStyles: {
                0: {
                    cellWidth: 25
                },
                1: {
                    cellWidth: 220
                },
                2: {
                    cellWidth: 65,
                    halign: "right"
                },
                3: {
                    cellWidth: 50
                },
                4: {
                    cellWidth: 95,
                    halign: "right"
                },
                5: {
                    cellWidth: 95,
                    halign: "right"
                }
            }
        });

        let y = doc.lastAutoTable.finalY + 8;
        doc.setFont(undefined, "bold");
        doc.text(`Total`, 40, y + 15);
        doc.text(`Rs. ${grandTotal}`, 500, y + 15, {
            align: "right"
        });

        y += 40;
        doc.setFont(undefined, "normal");
        doc.text(`Sub Total :`, 400, y);
        doc.text(`Rs. ${subTotal}`, 575, y, {
            align: "right"
        });

        y += 15;
        doc.text(`Discount :`, 400, y);
        doc.text(`Rs. ${discount}`, 575, y, {
            align: "right"
        });

        y += 15;
        doc.setFont(undefined, "bold");
        doc.text(`Total :`, 400, y);
        doc.text(`Rs. ${grandTotal}`, 575, y, {
            align: "right"
        });

        // Amount in words
        if (amountWords) {
            y += 30;
            doc.setFont(undefined, "normal");
            doc.text("Invoice Amount in Words:", 40, y);
            const splitWords = doc.splitTextToSize(amountWords, 515);
            doc.text(splitWords, 40, y + 15);
            y += 40 + (splitWords.length * 12);
        } else {
            y += 30;
        }

        doc.text("Received :", 400, y);
        doc.text(`Rs. ${received}`, 575, y, {
            align: "right"
        });

        y += 15;
        doc.text("Balance  :", 400, y);
        doc.text(`Rs. ${balance}`, 575, y, {
            align: "right"
        });

        const fileName = `${estimateNo.value && customerNameEl.value || "Bill"}.pdf`;
        doc.save(fileName);
    }

    // ---------- NUMBER TO WORDS (Indian System) ----------
    function numberToWordsIndian(num) {
        if (num === 0) return "Zero Rupees";
        const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
            "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
        ];
        const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

        function inWords(n) {
            if (n < 20) return a[n];
            if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? " " + a[n % 10] : "");
            if (n < 1000) return a[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " and " + inWords(n % 100) : "");
            return "";
        }

        let s = "";
        const crore = Math.floor(num / 10000000);
        num %= 10000000;
        const lakh = Math.floor(num / 100000);
        num %= 100000;
        const thousand = Math.floor(num / 1000);
        num %= 1000;
        const hundred = Math.floor(num / 100);
        const rest = num % 100;

        if (crore) s += inWords(crore) + " Crore ";
        if (lakh) s += inWords(lakh) + " Lakh ";
        if (thousand) s += inWords(thousand) + " Thousand ";
        if (hundred) s += a[hundred] + " Hundred ";
        if (rest) s += (s !== "" ? "and " : "") + inWords(rest) + " ";
        return s.trim() + " Rupees";
    }
});