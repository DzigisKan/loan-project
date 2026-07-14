// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LoanContract {

    // Status pozajmice
    enum LoanStatus { Pending, Approved, Rejected, Returned, Cancelled }

    // Struktura pozajmice
    struct Loan {                                                        // cuva sve inf o jednoj pozajmici ko je sta je itd...
        address borrower;        // zajmoprimac
        address lender;          // zajmodavac
        uint256 amount;          // iznos u "dinarima" (ceo broj)
        uint256 interestRate;    // kamatna stopa u %
        uint256 penaltyRate;     // penalizacija u % mesecno
        uint256 durationDays;    // rok vracanja u danima
        uint256 approvedAt;      // kada je odobreno (timestamp)
        LoanStatus status;       // status pozajmice
    }

    // Brojac pozajmica
    uint256 public loanCount = 0;

    // Sve pozajmice
    mapping(uint256 => Loan) public loans;                        // Cuva sve pozajmice po ID

    // Pozajmice po zajmoprimcu                                    // Cuva listu idjeva po adr zajmoprimca
    mapping(address => uint256[]) public borrowerLoans;

    // Pozajmice po zajmodavcu                                        // Cuva listu idjeva po zajmodavcu
    mapping(address => uint256[]) public lenderLoans;

    // ------------------------ CREATE ------------------------

    // Zajmoprimac kreira zahtev za pozajmicu
    function createLoan(
        address _lender,
        uint256 _amount,
        uint256 _interestRate,
        uint256 _penaltyRate,
        uint256 _durationDays
    ) public {
        require(_amount > 0, "Iznos mora biti veci od 0.");
        require(_durationDays > 0, "Rok mora biti veci od 0 dana.");            // svak funkcija ima require provere samo zajmodavac moze da odobri itd
        require(_lender != msg.sender, "Ne mozete pozajmiti sami sebi.");

        loans[loanCount] = Loan({
            borrower: msg.sender,
            lender: _lender,
            amount: _amount,
            interestRate: _interestRate,
            penaltyRate: _penaltyRate,
            durationDays: _durationDays,
            approvedAt: 0,
            status: LoanStatus.Pending
        });

        borrowerLoans[msg.sender].push(loanCount);
        lenderLoans[_lender].push(loanCount);

        loanCount++;
    }

    // ------------------------ READ ------------------------

    // Vrati jednu pozajmicu
    function getLoan(uint256 _loanId) public view returns (Loan memory) {
        return loans[_loanId];
    }

    // Vrati sve pozajmice zajmoprimca
    function getBorrowerLoans(address _borrower) public view returns (uint256[] memory) {
        return borrowerLoans[_borrower];
    }

    // Vrati sve pozajmice zajmodavca
    function getLenderLoans(address _lender) public view returns (uint256[] memory) {
        return lenderLoans[_lender];
    }

    // Izracunaj ukupan iznos za vracanje
    function calculateTotalAmount(uint256 _loanId) public view returns (uint256) {
        Loan memory loan = loans[_loanId];
        require(loan.status == LoanStatus.Approved, "Pozajmica nije odobrena.");

        uint256 base = loan.amount;
        uint256 interest = (base * loan.interestRate) / 100;
        uint256 total = base + interest;

        // Penalizacija ako je rok prosao
        if (block.timestamp > loan.approvedAt + (loan.durationDays * 1 days)) {
            uint256 daysLate = (block.timestamp - (loan.approvedAt + (loan.durationDays * 1 days))) / 1 days;
            uint256 monthsLate = (daysLate / 30) + 1;
            uint256 penalty = (base * loan.penaltyRate * monthsLate) / 100;
            total += penalty;
        }

        return total;
    }

    // Provera da li je rok prosao
    function isOverdue(uint256 _loanId) public view returns (bool) {
        Loan memory loan = loans[_loanId];
        if (loan.status != LoanStatus.Approved) return false;
        return block.timestamp > loan.approvedAt + (loan.durationDays * 1 days);
    }

    // ------------------------ UPDATE ------------------------

    // Zajmodavac odobrava zahtev
    function approveLoan(uint256 _loanId) public {
        Loan storage loan = loans[_loanId];
        require(loan.lender == msg.sender, "Samo zajmodavac moze odobriti.");
        require(loan.status == LoanStatus.Pending, "Zahtev nije na cekanju.");

        loan.status = LoanStatus.Approved;
        loan.approvedAt = block.timestamp;
    }

    // Zajmodavac odbija zahtev
    function rejectLoan(uint256 _loanId) public {
        Loan storage loan = loans[_loanId];
        require(loan.lender == msg.sender, "Samo zajmodavac moze odbiti.");
        require(loan.status == LoanStatus.Pending, "Zahtev nije na cekanju.");

        loan.status = LoanStatus.Rejected;
    }

    // Zajmoprimac vraca pozajmicu
    function returnLoan(uint256 _loanId) public {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Samo zajmoprimac moze vratiti.");
        require(loan.status == LoanStatus.Approved, "Pozajmica nije odobrena.");

        loan.status = LoanStatus.Returned;
    }

    // ------------------------ DELETE ------------------------

    // Zajmoprimac otkazuje zahtev (samo ako je Pending)
    function cancelLoan(uint256 _loanId) public {
        Loan storage loan = loans[_loanId];
        require(loan.borrower == msg.sender, "Samo zajmoprimac moze otkazati.");
        require(loan.status == LoanStatus.Pending, "Moze se otkazati samo zahtev na cekanju.");

        loan.status = LoanStatus.Cancelled;
    }
}
