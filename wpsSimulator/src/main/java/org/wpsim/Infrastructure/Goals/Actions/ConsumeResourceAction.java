package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Data.Utils.TimeConsumedBy;
import org.wpsim.ViewerLens.Util.wpsReport;

/**
 * Action that consumes a resource (time, money, etc.).
 *
 * <p>Supported YAML args:
 * <ul>
 *   <li>{@code key}      — resource key: {@code time_left_on_day} | {@code time} | {@code money}</li>
 *   <li>{@code amount}   — fixed numeric amount to consume (minutes for time, COP for money)</li>
 *   <li>{@code time_key} — name of a {@link TimeConsumedBy} enum constant; resolved to minutes
 *       automatically. Takes precedence over {@code amount} when both are present.</li>
 * </ul>
 */
public class ConsumeResourceAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves beliefs = context.getBeliefs();
        String key = (String) context.getParameter("key");

        // Resolve amount: time_key takes precedence over amount
        double amount = resolveAmount(context, beliefs);
        if (key == null || amount < 0) return false;

        switch (key) {
            case "time_left_on_day":
            case "time":
                beliefs.useTime(amount);
                break;
            case "money":
                beliefs.getPeasantProfile().setMoney(beliefs.getPeasantProfile().getMoney() - amount);
                break;
            default:
                wpsReport.warn("Resource type not supported for consumption: " + key, beliefs.getAlias());
                return false;
        }

        return true;
    }

    private double resolveAmount(ActionContext context, PeasantFamilyBelieves beliefs) {
        // 1. Try time_key (TimeConsumedBy enum lookup)
        Object timeKeyObj = context.getParameter("time_key");
        if (timeKeyObj != null) {
            String timeKeyName = timeKeyObj.toString();
            try {
                TimeConsumedBy tcb = TimeConsumedBy.valueOf(timeKeyName);
                return tcb.getTime();
            } catch (IllegalArgumentException e) {
                wpsReport.warn("ConsumeResource: unknown time_key '" + timeKeyName + "'", beliefs.getAlias());
            }
        }

        // 2. Fallback to explicit amount
        Object amountObj = context.getParameter("amount");
        if (amountObj != null) {
            try {
                return Double.parseDouble(amountObj.toString());
            } catch (NumberFormatException e) {
                wpsReport.warn("ConsumeResource: invalid amount '" + amountObj + "'", beliefs.getAlias());
            }
        }

        return -1; // signals failure
    }
}
