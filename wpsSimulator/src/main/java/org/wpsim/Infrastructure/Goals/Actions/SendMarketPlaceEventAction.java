package org.wpsim.Infrastructure.Goals.Actions;

import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.MarketPlace.Data.MarketPlaceMessage;
import org.wpsim.MarketPlace.Data.MarketPlaceMessageType;
import org.wpsim.MarketPlace.Guards.MarketPlaceGuard;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Data.Utils.ResourceNeededType;
import org.wpsim.ViewerLens.Util.wpsReport;
import org.wpsim.WellProdSim.wpsStart;

/**
 * Declarative primitive action that sends a fire-and-forget event to the
 * MarketPlace agent via BESA.
 *
 * <p>YAML args:
 * <pre>
 *   message_type: BUY_SEEDS | BUY_TOOLS | BUY_PESTICIDES |
 *                 BUY_SUPPLIES | BUY_WATER | ASK_FOR_PRICE_LIST
 *   quantity:     (optional) integer quantity to purchase; defaults to
 *                 the corresponding "needed" belief when not supplied
 *   reset_resource_needed: (optional, default true) set ResourceNeededType=NONE
 *                          after sending the event
 * </pre>
 */
public class SendMarketPlaceEventAction implements PrimitiveAction {

    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves believes = context.getBeliefs();
        String messageTypeStr = (String) context.getParameter("message_type");

        if (messageTypeStr == null) {
            wpsReport.warn("SendMarketPlaceEventAction: missing 'message_type' parameter",
                    believes.getAlias());
            return false;
        }

        MarketPlaceMessageType msgType;
        try {
            msgType = MarketPlaceMessageType.valueOf(messageTypeStr);
        } catch (IllegalArgumentException e) {
            wpsReport.error("SendMarketPlaceEventAction: unknown message_type '" + messageTypeStr + "'",
                    believes.getAlias());
            return false;
        }

        int quantity = resolveQuantity(context, msgType, believes);

        try {
            MarketPlaceMessage msg = buildMessage(msgType, believes, quantity);
            AdmBESA.getInstance()
                    .getHandlerByAlias(wpsStart.config.getMarketAgentName())
                    .sendEvent(new EventBESA(MarketPlaceGuard.class.getName(), msg));
        } catch (ExceptionBESA ex) {
            wpsReport.error("SendMarketPlaceEventAction: " + ex.getMessage(), believes.getAlias());
            return false;
        }

        // Reset resource-needed flag unless caller opts out
        Object resetFlag = context.getParameter("reset_resource_needed");
        boolean shouldReset = resetFlag == null || Boolean.parseBoolean(resetFlag.toString());
        if (shouldReset) {
            believes.setCurrentResourceNeededType(ResourceNeededType.NONE);
        }

        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────

    private int resolveQuantity(ActionContext context, MarketPlaceMessageType msgType,
                                PeasantFamilyBelieves believes) {
        Object qParam = context.getParameter("quantity");
        if (qParam != null) {
            try {
                return Integer.parseInt(qParam.toString());
            } catch (NumberFormatException ignored) { /* fall through */ }
        }
        // Default: derive from current belief when not specified in YAML
        return switch (msgType) {
            case BUY_SEEDS -> believes.getPeasantProfile().getSeedsNeeded();
            case BUY_TOOLS -> believes.getPeasantProfile().getToolsNeeded();
            case BUY_PESTICIDES -> 10;
            case BUY_SUPPLIES -> 1;
            case BUY_WATER -> 1;
            default -> 0; // e.g. ASK_FOR_PRICE_LIST ignores quantity
        };
    }

    private MarketPlaceMessage buildMessage(MarketPlaceMessageType msgType,
                                            PeasantFamilyBelieves believes,
                                            int quantity) {
        String alias = believes.getPeasantProfile().getPeasantFamilyAlias();
        String date  = believes.getInternalCurrentDate();

        // Two-arg ctor: (type, alias, date) — used for requests that carry no quantity
        if (msgType == MarketPlaceMessageType.ASK_FOR_PRICE_LIST) {
            return new MarketPlaceMessage(msgType, alias, date);
        }
        // Three-arg ctor: (type, alias, quantity, date)
        return new MarketPlaceMessage(msgType, alias, quantity, date);
    }
}
