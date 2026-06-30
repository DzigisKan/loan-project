import {
    createWalletClient,
    custom,
    getContract,
    createPublicClient,
} from "https://esm.sh/viem";
import { sepolia } from "https://esm.sh/viem/chains";

const walletClient = createWalletClient({
    chain: sepolia,
    transport: custom(window.ethereum),
});

const publicClient = createPublicClient({
    chain: sepolia,
    transport: custom(window.ethereum),
});

// ==================== KORISNICI (svi mogu i da daju i da uzimaju) ====================

const korisnici = [
    { address: "0x4C3Da3857Bf55F27693DA0283F856625B4F808a9", userName: "Петар Петровић" },
    { address: "0x3e6A234AB1348990b98900275B1f010f472665ee", userName: "Јована Јовановић" },
    { address: "0x0392Df9053d68329867E9367Abe528FDEf8a1158", userName: "Марко Марковић" },
    { address: "0x97F762C5F3a4f285d2DCAd2b3A26dFD04188291E", userName: "Ана Анић" },
    { address: "0x676164c8A4681e6c8A3203ad65EBEcE1d7be96c7", userName: "Никола Николић" },
];

// Svi korisnici mogu biti i zajmodavci i zajmoprimci
const zajmodavci = korisnici;
const zajmoprimci = korisnici;

// ==================== ABI I ADRESA UGOVORA ====================

const CONTRACT_ADDRESS = "0x00e68330dE10EB91e4c7a0B41D1F9786e2b5E225";

const CONTRACT_ABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "_lender", "type": "address" },
            { "internalType": "uint256", "name": "_amount", "type": "uint256" },
            { "internalType": "uint256", "name": "_interestRate", "type": "uint256" },
            { "internalType": "uint256", "name": "_penaltyRate", "type": "uint256" },
            { "internalType": "uint256", "name": "_durationDays", "type": "uint256" }
        ],
        "name": "createLoan",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_loanId", "type": "uint256" }],
        "name": "approveLoan",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_loanId", "type": "uint256" }],
        "name": "rejectLoan",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_loanId", "type": "uint256" }],
        "name": "returnLoan",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_loanId", "type": "uint256" }],
        "name": "cancelLoan",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_loanId", "type": "uint256" }],
        "name": "getLoan",
        "outputs": [
            {
                "components": [
                    { "internalType": "address", "name": "borrower", "type": "address" },
                    { "internalType": "address", "name": "lender", "type": "address" },
                    { "internalType": "uint256", "name": "amount", "type": "uint256" },
                    { "internalType": "uint256", "name": "interestRate", "type": "uint256" },
                    { "internalType": "uint256", "name": "penaltyRate", "type": "uint256" },
                    { "internalType": "uint256", "name": "durationDays", "type": "uint256" },
                    { "internalType": "uint256", "name": "approvedAt", "type": "uint256" },
                    { "internalType": "uint8", "name": "status", "type": "uint8" }
                ],
                "internalType": "struct LoanContract.Loan",
                "name": "",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_borrower", "type": "address" }],
        "name": "getBorrowerLoans",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "address", "name": "_lender", "type": "address" }],
        "name": "getLenderLoans",
        "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_loanId", "type": "uint256" }],
        "name": "calculateTotalAmount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{ "internalType": "uint256", "name": "_loanId", "type": "uint256" }],
        "name": "isOverdue",
        "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "loanCount",
        "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
        "stateMutability": "view",
        "type": "function"
    }
];

// ==================== POMOCNE FUNKCIJE ====================

const statusLabels = ["На чекању", "Одобрено", "Одбијено", "Враћено", "Отказано"];
const statusClasses = ["status-pending", "status-approved", "status-rejected", "status-returned", "status-cancelled"];

async function getAccounts() {
    try {
        const accounts = await walletClient.requestAddresses();
        return accounts;
    } catch (error) {
        console.error("Грешка при добијању налога:", error);
        return [];
    }
}

function getUserName(address) {
    const svi = [...zajmodavci, ...zajmoprimci];
    const korisnik = svi.find(k => k.address.toLowerCase() === address.toLowerCase());
    return korisnik ? korisnik.userName : "Непознат корисник";
}

function formatDate(timestamp) {
    if (!timestamp || timestamp === 0n) return "—";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleDateString("sr-RS");
}

function getDueDate(approvedAt, durationDays) {
    if (!approvedAt || approvedAt === 0n) return "—";
    const due = new Date((Number(approvedAt) + Number(durationDays) * 86400) * 1000);
    return due.toLocaleDateString("sr-RS");
}

// ==================== KONTRAKT INSTANCE ====================

let contractInstance;

function getContractInstance(address) {
    return getContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        client: { public: publicClient, wallet: walletClient },
    });
}

// ==================== BLOCKCHAIN FUNKCIJE ====================

async function createLoan(lenderAddress, amount, interestRate, penaltyRate, durationDays, account) {
    try {
        await contractInstance.write.createLoan(
            [lenderAddress, BigInt(amount), BigInt(interestRate), BigInt(penaltyRate), BigInt(durationDays)],
            { account }
        );
        return true;
    } catch (error) {
        console.error("Грешка при креирању позајмице:", error);
        return false;
    }
}

async function approveLoan(loanId, account) {
    try {
        await contractInstance.write.approveLoan([BigInt(loanId)], { account });
        return true;
    } catch (error) {
        console.error("Грешка при одобравању:", error);
        return false;
    }
}

async function rejectLoan(loanId, account) {
    try {
        await contractInstance.write.rejectLoan([BigInt(loanId)], { account });
        return true;
    } catch (error) {
        console.error("Грешка при одбијању:", error);
        return false;
    }
}

async function returnLoan(loanId, account) {
    try {
        await contractInstance.write.returnLoan([BigInt(loanId)], { account });
        return true;
    } catch (error) {
        console.error("Грешка при враћању:", error);
        return false;
    }
}

async function cancelLoan(loanId, account) {
    try {
        await contractInstance.write.cancelLoan([BigInt(loanId)], { account });
        return true;
    } catch (error) {
        console.error("Грешка при отказивању:", error);
        return false;
    }
}

async function getLoan(loanId) {
    try {
        return await contractInstance.read.getLoan([BigInt(loanId)]);
    } catch (error) {
        console.error("Грешка при читању позајмице:", error);
        return null;
    }
}

async function getBorrowerLoans(borrowerAddress) {
    try {
        return await contractInstance.read.getBorrowerLoans([borrowerAddress]);
    } catch (error) {
        console.error("Грешка:", error);
        return [];
    }
}

async function getLenderLoans(lenderAddress) {
    try {
        return await contractInstance.read.getLenderLoans([lenderAddress]);
    } catch (error) {
        console.error("Грешка:", error);
        return [];
    }
}

async function calculateTotalAmount(loanId) {
    try {
        return await contractInstance.read.calculateTotalAmount([BigInt(loanId)]);
    } catch (error) {
        return null;
    }
}

async function isOverdue(loanId) {
    try {
        return await contractInstance.read.isOverdue([BigInt(loanId)]);
    } catch (error) {
        return false;
    }
}

// ==================== PRIKAZ ZAJMODAVCA ====================

async function displayLenderLoans(address) {
    const container = document.getElementById("lenderLoanList");
    container.innerHTML = "<p>Учитавање...</p>";

    const loanIds = await getLenderLoans(address);

    if (loanIds.length === 0) {
        container.innerHTML = "<div class='empty-state'>Нема захтева за позајмицу.</div>";
        return;
    }

    container.innerHTML = "";

    for (const loanId of loanIds) {
        const loan = await getLoan(loanId);
        if (!loan) continue;

        const overdue = loan.status === 1 ? await isOverdue(loanId) : false;
        const borrowerName = getUserName(loan.borrower);
        const statusIndex = Number(loan.status);

        const card = document.createElement("div");
        card.className = "loan-card";

        card.innerHTML = `
            <div class="loan-card-header">
                <span class="loan-id"># ${loanId}</span>
                <span class="loan-status ${statusClasses[statusIndex]}">${statusLabels[statusIndex]}${overdue ? " ⚠️ Касни" : ""}</span>
            </div>
            <div class="loan-card-body">
                <p><strong>Зајмопримац:</strong> ${borrowerName}</p>
                <p><strong>Адреса:</strong> ${loan.borrower}</p>
                <p><strong>Износ:</strong> ${loan.amount.toString()} RSD</p>
                <p><strong>Камата:</strong> ${loan.interestRate.toString()}%</p>
                <p><strong>Пенализација:</strong> ${loan.penaltyRate.toString()}% месечно</p>
                <p><strong>Рок:</strong> ${loan.durationDays.toString()} дана</p>
                <p><strong>Датум одобравања:</strong> ${formatDate(loan.approvedAt)}</p>
                <p><strong>Рок враћања:</strong> ${getDueDate(loan.approvedAt, loan.durationDays)}</p>
            </div>
            <div class="loan-card-actions" id="lender-actions-${loanId}">
            </div>
        `;

        container.appendChild(card);

        const actionsDiv = document.getElementById(`lender-actions-${loanId}`);

        // Dugmici za zajmodavca
        if (loan.status === 0n) { // Pending
            const approveBtn = document.createElement("button");
            approveBtn.className = "btn-approve";
            approveBtn.textContent = "✅ Одобри";
            approveBtn.onclick = async () => {
                approveBtn.disabled = true;
                approveBtn.textContent = "Обрада...";
                const ok = await approveLoan(Number(loanId), address);
                if (ok) {
                    await delay(1000);
                    await displayLenderLoans(address);
                } else {
                    approveBtn.disabled = false;
                    approveBtn.textContent = "✅ Одобри";
                }
            };

            const rejectBtn = document.createElement("button");
            rejectBtn.className = "btn-reject";
            rejectBtn.textContent = "❌ Одбиј";
            rejectBtn.onclick = async () => {
                rejectBtn.disabled = true;
                rejectBtn.textContent = "Обрада...";
                const ok = await rejectLoan(Number(loanId), address);
                if (ok) {
                    await delay(1000);
                    await displayLenderLoans(address);
                } else {
                    rejectBtn.disabled = false;
                    rejectBtn.textContent = "❌ Одбиј";
                }
            };

            actionsDiv.appendChild(approveBtn);
            actionsDiv.appendChild(rejectBtn);
        }
    }
}

// ==================== PRIKAZ ZAJMOPRIMCA ====================

async function displayBorrowerLoans(address) {
    const container = document.getElementById("borrowerLoanList");
    container.innerHTML = "<p>Учитавање...</p>";

    const loanIds = await getBorrowerLoans(address);

    if (loanIds.length === 0) {
        container.innerHTML = "<div class='empty-state'>Немате активних позајмица. Креирајте нови захтев изнад.</div>";
        return;
    }

    container.innerHTML = "";

    for (const loanId of loanIds) {
        const loan = await getLoan(loanId);
        if (!loan) continue;

        const overdue = loan.status === 1n ? await isOverdue(loanId) : false;
        const lenderName = getUserName(loan.lender);
        const statusIndex = Number(loan.status);

        let totalAmount = null;
        if (loan.status === 1n) {
            totalAmount = await calculateTotalAmount(loanId);
        }

        const card = document.createElement("div");
        card.className = "loan-card";

        card.innerHTML = `
            <div class="loan-card-header">
                <span class="loan-id"># ${loanId}</span>
                <span class="loan-status ${statusClasses[statusIndex]}">${statusLabels[statusIndex]}${overdue ? " ⚠️ Касни" : ""}</span>
            </div>
            <div class="loan-card-body">
                <p><strong>Зајmodавац:</strong> ${lenderName}</p>
                <p><strong>Износ:</strong> ${loan.amount.toString()} RSD</p>
                <p><strong>Камата:</strong> ${loan.interestRate.toString()}%</p>
                <p><strong>Пенализација:</strong> ${loan.penaltyRate.toString()}% месечно</p>
                <p><strong>Рок:</strong> ${loan.durationDays.toString()} дана</p>
                <p><strong>Датум одобравања:</strong> ${formatDate(loan.approvedAt)}</p>
                <p><strong>Рок враћања:</strong> ${getDueDate(loan.approvedAt, loan.durationDays)}</p>
                ${totalAmount !== null ? `<p class="${overdue ? 'overdue-amount' : 'total-amount'}"><strong>Укупно за враћање:</strong> ${totalAmount.toString()} RSD${overdue ? " (са пенализацијом)" : ""}</p>` : ""}
            </div>
            <div class="loan-card-actions" id="borrower-actions-${loanId}">
            </div>
        `;

        container.appendChild(card);

        const actionsDiv = document.getElementById(`borrower-actions-${loanId}`);

        if (loan.status === 0n) { // Pending - moze otkazati
            const cancelBtn = document.createElement("button");
            cancelBtn.className = "btn-cancel";
            cancelBtn.textContent = "🚫 Откажи захтев";
            cancelBtn.onclick = async () => {
                cancelBtn.disabled = true;
                cancelBtn.textContent = "Обрада...";
                const ok = await cancelLoan(Number(loanId), address);
                if (ok) {
                    await delay(1000);
                    await displayBorrowerLoans(address);
                } else {
                    cancelBtn.disabled = false;
                    cancelBtn.textContent = "🚫 Откажи захтев";
                }
            };
            actionsDiv.appendChild(cancelBtn);
        }

        if (loan.status === 1n) { // Approved - moze vratiti
            const returnBtn = document.createElement("button");
            returnBtn.className = "btn-return";
            returnBtn.textContent = "💸 Врати позајмицу";
            returnBtn.onclick = async () => {
                returnBtn.disabled = true;
                returnBtn.textContent = "Обрада...";
                const ok = await returnLoan(Number(loanId), address);
                if (ok) {
                    await delay(1000);
                    await displayBorrowerLoans(address);
                } else {
                    returnBtn.disabled = false;
                    returnBtn.textContent = "💸 Врати позајмицу";
                }
            };
            actionsDiv.appendChild(returnBtn);
        }
    }
}

// ==================== POMOCNA FUNKCIJA ====================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== POPUNI DROPDOWN ZA ZAJMODAVCE ====================

function populateLenderSelect(currentAddress) {
    const select = document.getElementById("lenderSelect");
    select.innerHTML = "";
    // Iskljuci sebe iz liste zajmodavaca
    korisnici
        .filter(k => k.address.toLowerCase() !== currentAddress.toLowerCase())
        .forEach(k => {
            const option = document.createElement("option");
            option.value = k.address;
            option.textContent = `${k.userName} (${k.address.slice(0, 6)}...${k.address.slice(-4)})`;
            select.appendChild(option);
        });
}

// ==================== GLAVNI PRIKAZ ====================

function updateView(address) {
    document.getElementById("account").innerHTML = address;
    document.getElementById("userName").innerHTML = getUserName(address);

    // Sakrij sve
    document.querySelectorAll(".profile-section").forEach(s => s.style.display = "none");
    document.querySelectorAll(".nav-link").forEach(l => l.style.display = "none");
    document.querySelectorAll(".lender-only").forEach(el => el.style.display = "none");
    document.querySelectorAll(".borrower-only").forEach(el => el.style.display = "none");

    const isKnown = korisnici.some(k => k.address.toLowerCase() === address.toLowerCase());

    if (isKnown) {
        document.querySelectorAll(".lender-only").forEach(el => el.style.display = "block");
        document.querySelectorAll(".borrower-only").forEach(el => el.style.display = "block");
        document.getElementById("divLender").style.display = "block";
        document.getElementById("divBorrower").style.display = "block";
        populateLenderSelect(address);
        displayLenderLoans(address);
        displayBorrowerLoans(address);
    } else {
        document.getElementById("divUnknown").style.display = "block";
        document.getElementById("unknownAddress").innerHTML = address;
    }
}

// ==================== POKRETANJE ====================

document.addEventListener("DOMContentLoaded", async () => {
    const accounts = await getAccounts();
    if (accounts.length === 0) {
        console.error("Нема налога.");
        return;
    }

    const [address] = accounts;
    console.log("Povezan nalog:", address);

    contractInstance = getContractInstance(address);

    updateView(address);

    // Kreiranje pozajmice
    document.getElementById("createLoanBtn").addEventListener("click", async () => {
        const lenderAddress = document.getElementById("lenderSelect").value;
        const amount = document.getElementById("loanAmount").value;
        const interest = document.getElementById("loanInterest").value;
        const penalty = document.getElementById("loanPenalty").value;
        const duration = document.getElementById("loanDuration").value;
        const msgEl = document.getElementById("createMessage");

        if (!amount || !interest || !penalty || !duration) {
            msgEl.textContent = "Попуните сва поља.";
            msgEl.className = "message error";
            msgEl.style.display = "block";
            return;
        }

        msgEl.textContent = "Слање захтева...";
        msgEl.className = "message";
        msgEl.style.display = "block";

        const ok = await createLoan(lenderAddress, amount, interest, penalty, duration, address);

        if (ok) {
            msgEl.textContent = "✅ Захтев је успешно послат!";
            msgEl.className = "message success";
            await delay(1500);
            await displayBorrowerLoans(address);
        } else {
            msgEl.textContent = "❌ Грешка при слању захтева.";
            msgEl.className = "message error";
        }
    });

    // Promena MetaMask naloga
    window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) return;
        updateView(accounts[0]);
    });

    // Zatvaranje modala
    document.querySelector(".close-button").addEventListener("click", () => {
        document.getElementById("loanModal").style.display = "none";
    });
});
