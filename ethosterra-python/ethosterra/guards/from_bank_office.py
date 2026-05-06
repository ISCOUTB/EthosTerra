from besa.kernel.event import EventBESA
from besa.kernel.guard import GuardBESA
from ethosterra.believes.peasant_family_believes import PeasantFamilyBelieves
from ethosterra.agents.bank_office import FromBankOfficeMessage, FromBankOfficeMessageType


class FromBankOfficeGuard(GuardBESA):
    def func_exec_guard(self, event: EventBESA) -> None:
        msg = event.data
        if not isinstance(msg, FromBankOfficeMessage):
            return
        believes: PeasantFamilyBelieves = self.get_state()

        if msg.message_type == FromBankOfficeMessageType.APPROBED_LOAN:
            believes.money += msg.amount
            believes.to_pay = msg.amount
            believes.have_loan = True
            believes.loan_denied = False

        elif msg.message_type == FromBankOfficeMessageType.APPROBED_INFORMAL_LOAN:
            believes.money += msg.amount

        elif msg.message_type == FromBankOfficeMessageType.DENIED_FORMAL_LOAN:
            believes.loan_denied = True

        elif msg.message_type == FromBankOfficeMessageType.DENIED_INFORMAL_LOAN:
            believes.loan_denied = True

        elif msg.message_type == FromBankOfficeMessageType.TERM_TO_PAY:
            if msg.amount == 0:
                believes.have_loan = False
                believes.loan_denied = False

        elif msg.message_type == FromBankOfficeMessageType.TERM_PAYED:
            believes.money -= msg.amount
