package org.wpsim.Person.Tasks.Common;

import BESA.Emotional.EmotionalEvent;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.FamilyContainer.Data.DeathData;
import org.wpsim.FamilyContainer.Guards.DeathGuard;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.WellProdSim.Base.wpsPersonTask;
import rational.mapping.Believes;

/**
 * Executes the individual's essential daily activities: eating, resting,
 * and paying daily living costs. Runs once per simulation day for every Person.
 *
 * <p>Side effects:</p>
 * <ul>
 *   <li>Clears the {@code newDay} flag.</li>
 *   <li>Subtracts daily cost from individual savings; if insufficient, tries
 *       the family shared pool ({@link org.wpsim.FamilyContainer.Data.FamilyBelieves}).</li>
 *   <li>Decreases health by 1 if neither personal nor family funds cover costs.</li>
 *   <li>Emits an emotional event based on financial state.</li>
 *   <li>Consumes 120 minutes of the daily time budget.</li>
 *   <li>When health reaches 0, notifies the FamilyCoordinator via
 *       {@link DeathGuard} so it can clean up the agent.</li>
 * </ul>
 *
 * @author jairo
 */
public class DoVitalsTask extends wpsPersonTask {

    private static final double TIME_COST = 120;

    @Override
    public void executeTask(Believes parameters) {
        this.setExecuted(false);
        PersonBelieves believes = (PersonBelieves) parameters;

        believes.setNewDay(false);
        believes.useTime(TIME_COST);

        // Try personal savings first, then family pool
        boolean paid = believes.getProfile().discountDailyMoney();
        if (!paid && believes.getFamilyBelieves() != null) {
            paid = believes.getFamilyBelieves().discountForMember(believes.getProfile().getDailyCost());
        }

        if (!paid) {
            believes.getProfile().decreaseHealth();
            believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "STARVING", "FOOD"));

            // If health reached 0, notify family coordinator
            if (believes.getProfile().getHealth() <= 0) {
                notifyDeath(believes, "HEALTH");
            }
        } else {
            believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "DOVITALS", "TIME"));
        }

        believes.addTaskToLog(believes.getInternalCurrentDate());
    }

    private static void notifyDeath(PersonBelieves believes, String cause) {
        String familyAlias = believes.getProfile().getFamilyAlias();
        if (familyAlias == null || familyAlias.isEmpty()) return;
        try {
            DeathData data = new DeathData(believes.getAlias(), cause);
            AdmBESA.getInstance()
                   .getHandlerByAlias(familyAlias)
                   .sendEvent(new EventBESA(DeathGuard.class.getName(), data));
        } catch (Exception ex) {
            // FamilyCoordinator may not exist in legacy mode — ignore
        }
    }
}
