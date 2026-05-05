from __future__ import annotations

from enum import Enum, auto

from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from besa.kernel.agent import AgentBESA


class BankOfficeMessageType(Enum):
    ASK_FOR_FORMAL_LOAN = auto()
    ASK_FOR_INFORMAL_LOAN = auto()
    ASK_CURRENT_TERM = auto()
    PAY_LOAN_TERM = auto()


class FromBankOfficeMessageType(Enum):
    APPROBED_LOAN = auto()
    DENIED_FORMAL_LOAN = auto()
    APPROBED_INFORMAL_LOAN = auto()
    TERM_TO_PAY = auto()
    TERM_PAYED = auto()


class BankOfficeMessage:
    def __init__(
        self,
        message_type: BankOfficeMessageType,
        peasant_alias: str = "",
        amount: float = 0.0,
        current_date: str = "",
    ):
        self.message_type = message_type
        self.peasant_alias = peasant_alias
        self.amount = amount
        self.current_date = current_date


class FromBankOfficeMessage:
    def __init__(
        self,
        message_type: FromBankOfficeMessageType,
        amount: float = 0.0,
    ):
        self.message_type = message_type
        self.amount = amount


class LoanTable:
    def __init__(
        self,
        peasant_alias: str,
        amount: float,
        max_term: int = 12,
        paid_term: int = 0,
        loan_type: BankOfficeMessageType = BankOfficeMessageType.ASK_FOR_FORMAL_LOAN,
    ):
        self.peasant_alias = peasant_alias
        self.amount = amount
        self.max_term = max_term
        self.paid_term = paid_term
        self.loan_type = loan_type
        self.interest_rate = 0.02

    def money_to_pay(self) -> float:
        return (self.amount / self.max_term) * (1 + self.interest_rate)

    def increase_paid_term(self) -> None:
        self.paid_term += 1

    def __repr__(self) -> str:
        return f"LoanTable({self.peasant_alias}, {self.amount}, paid={self.paid_term}/{self.max_term})"


class BankOfficeState:
    def __init__(self, available_money: float = 100000000):
        self.available_money = available_money
        self.loans: dict[str, LoanTable] = {}

    def give_loan(
        self,
        loan_type: BankOfficeMessageType,
        peasant_alias: str,
        money: float,
    ) -> bool:
        if self.available_money > money and peasant_alias not in self.loans:
            self.loans[peasant_alias] = LoanTable(
                peasant_alias, money, 12, 0, loan_type
            )
            self.available_money -= money
            return True
        return False

    def current_money_to_pay(self, peasant_alias: str) -> float:
        loan = self.loans.get(peasant_alias)
        if loan:
            return loan.money_to_pay()
        return 0.0

    def pay_loan(self, peasant_alias: str, money: float) -> float:
        loan = self.loans.get(peasant_alias)
        if not loan:
            return 0.0
        if money >= loan.money_to_pay():
            paid = loan.money_to_pay()
            self.available_money += paid
            loan.increase_paid_term()
            if loan.paid_term >= loan.max_term:
                self.loans.pop(peasant_alias, None)
                return money - paid
            return loan.money_to_pay() * (loan.max_term - loan.paid_term)
        return -1.0


class BankOfficeGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, BankOfficeMessage):
            return
        state: BankOfficeState = self.get_state()
        response_type = None
        amount = 0.0

        if msg.message_type == BankOfficeMessageType.ASK_FOR_FORMAL_LOAN:
            if state.give_loan(msg.message_type, msg.peasant_alias, msg.amount):
                response_type = FromBankOfficeMessageType.APPROBED_LOAN
            else:
                response_type = FromBankOfficeMessageType.DENIED_FORMAL_LOAN

        elif msg.message_type == BankOfficeMessageType.ASK_FOR_INFORMAL_LOAN:
            if state.give_loan(msg.message_type, msg.peasant_alias, msg.amount):
                response_type = FromBankOfficeMessageType.APPROBED_INFORMAL_LOAN
            amount = msg.amount

        elif msg.message_type == BankOfficeMessageType.ASK_CURRENT_TERM:
            amount = state.current_money_to_pay(msg.peasant_alias)
            response_type = FromBankOfficeMessageType.TERM_TO_PAY

        elif msg.message_type == BankOfficeMessageType.PAY_LOAN_TERM:
            state.pay_loan(msg.peasant_alias, msg.amount)
            amount = state.current_money_to_pay(msg.peasant_alias)
            response_type = FromBankOfficeMessageType.TERM_PAYED

        if response_type:
            self._agent.send(
                msg.peasant_alias,
                EventBESA(
                    guard_type=FromBankOfficeGuard,
                    data=FromBankOfficeMessage(response_type, amount),
                ),
            )


class FromBankOfficeGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        pass


class BankOfficeAgent(AgentBESA):
    def __init__(self, alias: str, available_money: float = 100000000):
        super().__init__(alias, BankOfficeState(available_money))
        self.register_guard(BankOfficeGuard)
