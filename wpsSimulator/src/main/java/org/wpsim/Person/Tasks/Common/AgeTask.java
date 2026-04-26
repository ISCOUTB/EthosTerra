package org.wpsim.Person.Tasks.Common;

import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.FamilyContainer.Data.DeathData;
import org.wpsim.FamilyContainer.Guards.DeathGuard;
import org.wpsim.Person.Data.EtapaVida;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.WellProdSim.Base.wpsPersonTask;
import rational.mapping.Believes;

/**
 * Advances the person's age by one year and updates their life stage and role.
 *
 * <p>Fires once every 365 simulation days via {@link AgeGoal}. Side effects:</p>
 * <ul>
 *   <li>Increments age in {@link org.wpsim.Person.Data.PersonProfile}.</li>
 *   <li>Updates {@link EtapaVida} and reassigns the default social role when
 *       a stage boundary is crossed.</li>
 *   <li>Applies age-related health decline for ADULTO_MAYOR (-2/year) and
 *       ANCIANO (-5/year) stages.</li>
 *   <li>When health reaches 0, sends a {@link DeathData} event to the
 *       FamilyCoordinator so it can clean up the agent.</li>
 * </ul>
 *
 * @author jairo
 */
public class AgeTask extends wpsPersonTask {

    @Override
    public void executeTask(Believes parameters) {
        this.setExecuted(false);
        PersonBelieves believes = (PersonBelieves) parameters;

        EtapaVida previousStage = believes.getProfile().getEtapaVida();

        // Advance age — also applies elder health decline internally
        believes.getProfile().advanceAge();

        int newAge = believes.getProfile().getAge();
        EtapaVida newStage = believes.getProfile().getEtapaVida();

        if (newStage != previousStage) {
            System.out.println("[AgeTask] " + believes.getAlias()
                    + " transitioned from " + previousStage + " to " + newStage
                    + " at age " + newAge);
        }

        // Check natural death (health reached 0 due to aging)
        if (believes.getProfile().getHealth() <= 0) {
            notifyDeath(believes, "AGE");
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
