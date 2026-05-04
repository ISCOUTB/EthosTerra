package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;

import java.util.Optional;
import java.util.Random;

/**
 * Increments a numeric belief by a delta value.
 *
 * <p>Supported YAML args:
 * <ul>
 *   <li>{@code key}    — belief key to increment (e.g. {@code money}, {@code health},
 *       {@code training_level})</li>
 *   <li>{@code delta}  — fixed numeric increment (may be negative to decrement)</li>
 *   <li>{@code amount} — alias for {@code delta}; used when the caller prefers "amount" semantics</li>
 *   <li>{@code min} + {@code max} — when both are present, the increment is a uniformly random
 *       integer in [{@code min}, {@code max}]. Takes precedence over {@code delta}/{@code amount}.</li>
 * </ul>
 */
public class IncrementBeliefAction implements PrimitiveAction {

    private static final Random RNG = new Random();

    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves believes = context.getBeliefs();
        String key = (String) context.getParameter("key");
        if (key == null) return false;

        double delta = resolveDelta(context, believes);
        if (Double.isNaN(delta)) return false;

        switch (key) {
            case "money":
                believes.getPeasantProfile().setMoney(believes.getPeasantProfile().getMoney() + delta);
                break;
            case "health":
                believes.getPeasantProfile().setHealth(
                        (int) (believes.getPeasantProfile().getHealth() + delta));
                break;
            case "training_level":
                believes.getPeasantProfile().increaseTrainingLevel();
                break;
            default:
                if (believes.getBeliefRepository() != null) {
                    Optional<Object> current = believes.getBeliefRepository().get(key, Object.class);
                    double currentVal = current.map(o -> {
                        try { return Double.parseDouble(o.toString()); }
                        catch (Exception ex) { return 0.0; }
                    }).orElse(0.0);
                    believes.getBeliefRepository().set(key, currentVal + delta);
                } else {
                    wpsReport.warn("IncrementBelief: no belief repository for key " + key, believes.getAlias());
                    return false;
                }
        }
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────

    private double resolveDelta(ActionContext context, PeasantFamilyBelieves believes) {
        // 1. min + max → random integer in [min, max]
        Object minObj = context.getParameter("min");
        Object maxObj = context.getParameter("max");
        if (minObj != null && maxObj != null) {
            try {
                int min = Integer.parseInt(minObj.toString());
                int max = Integer.parseInt(maxObj.toString());
                return RNG.nextInt(max - min + 1) + min;
            } catch (NumberFormatException e) {
                wpsReport.warn("IncrementBelief: invalid min/max values", believes.getAlias());
            }
        }

        // 2. delta (primary name)
        Object deltaObj = context.getParameter("delta");
        if (deltaObj != null) {
            try { return Double.parseDouble(deltaObj.toString()); }
            catch (NumberFormatException e) {
                wpsReport.warn("IncrementBelief: invalid delta '" + deltaObj + "'", believes.getAlias());
            }
        }

        // 3. amount (alias)
        Object amountObj = context.getParameter("amount");
        if (amountObj != null) {
            try { return Double.parseDouble(amountObj.toString()); }
            catch (NumberFormatException e) {
                wpsReport.warn("IncrementBelief: invalid amount '" + amountObj + "'", believes.getAlias());
            }
        }

        wpsReport.warn("IncrementBelief: no delta/amount/min+max provided for key " + context.getParameter("key"),
                believes.getAlias());
        return Double.NaN;
    }
}
