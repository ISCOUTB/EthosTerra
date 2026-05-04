package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;

import java.util.HashMap;
import java.util.Map;

/**
 * Non-blocking event snapshot action for the BESA async model.
 *
 * BESA responses arrive via guards (e.g. FromBankOfficeGuard) that update
 * beliefs directly. This action snapshots the relevant beliefs into a named
 * binding in planBindings so that a following ConditionalAction can branch on
 * the result. If no response has arrived yet the snapshot reflects the current
 * (pre-response) state — callers should treat this as "response not received".
 *
 * Reads the binding name from the special "_binds" parameter injected by
 * DeclarativeTask from the step's `binds:` field.
 */
public class WaitForEventAction implements PrimitiveAction {

    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves believes = context.getBeliefs();
        String eventType = (String) context.getParameter("type");
        String bindName  = (String) context.getParameter("_binds");

        if (eventType == null) {
            wpsReport.warn("WaitForEvent: missing 'type' parameter", believes.getAlias());
            return false;
        }

        Map<String, Object> snapshot = buildSnapshot(eventType, believes);

        if (bindName != null) {
            believes.getPlanBindings().put(bindName, snapshot);
        }

        wpsReport.debug("WaitForEvent snapshot [" + eventType + "] → " + snapshot, believes.getAlias());
        return true;
    }

    private Map<String, Object> buildSnapshot(String eventType, PeasantFamilyBelieves believes) {
        Map<String, Object> snap = new HashMap<>();
        switch (eventType) {
            case "LOAN_RESPONSE":
                boolean haveLoan   = believes.isHaveLoan();
                boolean loanDenied = believes.isLoanDenied();
                snap.put("approved", haveLoan && !loanDenied);
                snap.put("amount",         believes.getToPay());
                snap.put("amount_to_pay",  believes.getToPay());
                break;
            default:
                wpsReport.warn("WaitForEvent: no snapshot handler for event type '" + eventType + "'", believes.getAlias());
                break;
        }
        return snap;
    }
}
