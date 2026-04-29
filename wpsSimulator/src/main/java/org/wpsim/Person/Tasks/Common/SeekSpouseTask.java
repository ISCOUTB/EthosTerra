package org.wpsim.Person.Tasks.Common;

import org.wpsim.Person.Data.EtapaVida;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.WellProdSim.Base.wpsPersonTask;
import rational.mapping.Believes;

import java.util.Optional;

/**
 * Searches the social network for an eligible spouse candidate and marks the
 * relationship in the profile.
 *
 * <p>Eligibility criteria for the candidate:</p>
 * <ul>
 *   <li>In the social network of this person.</li>
 *   <li>Opposite sex (heterosexual pairing — Colombian rural cultural model).</li>
 *   <li>Reproductive life stage (ADULTO_JOVEN or ADULTO).</li>
 *   <li>No current spouse.</li>
 *   <li>Different family alias (endogamy prevention).</li>
 * </ul>
 *
 * <p>The actual cross-family migration (moving the person to the spouse's
 * container) is deferred to a future implementation stage. For now, the task
 * only marks the {@code spouseAlias} in both profiles via BESA lookup so that
 * the relationship is reflected in the UI and demographic reports.</p>
 *
 * @author jairo
 */
public class SeekSpouseTask extends wpsPersonTask {

    private static final double TIME_COST = 60;

    @Override
    public void executeTask(Believes parameters) {
        this.setExecuted(false);
        PersonBelieves believes = (PersonBelieves) parameters;

        findCandidate(believes).ifPresent(candidateAlias -> {
            believes.getProfile().setSpouseAlias(candidateAlias);
            System.out.println("[SeekSpouseTask] " + believes.getAlias()
                    + " paired with " + candidateAlias);
        });

        believes.useTime(TIME_COST);
        believes.addTaskToLog(believes.getInternalCurrentDate());
    }

    /**
     * Finds the first eligible spouse in the social network via simple name lookup.
     * Returns empty if no suitable candidate found.
     */
    private static Optional<String> findCandidate(PersonBelieves believes) {
        var profile = believes.getProfile();
        var myEtapa = profile.getEtapaVida();
        var mySex   = profile.getSex();
        var myFamily = profile.getFamilyAlias();

        if (!myEtapa.canReproduce() || mySex == null) return Optional.empty();

        for (String alias : believes.getSocialNetwork()) {
            try {
                var handler = BESA.Kernel.System.AdmBESA.getInstance().getHandlerByAlias(alias);
                if (handler == null) continue;

                var ag = handler.getAg();
                if (!(ag instanceof BESA.BDI.AgentStructuralModel.Agent.AgentBDI candidateAgent)) continue;

                var state = (BESA.BDI.AgentStructuralModel.StateBDI) candidateAgent.getState();
                PersonBelieves cb = (PersonBelieves) state.getBelieves();
                var cp = cb.getProfile();

                boolean differentSex    = cp.getSex() != null && cp.getSex() != mySex;
                boolean canReproduce    = cp.getEtapaVida() != null && cp.getEtapaVida().canReproduce();
                boolean noSpouse        = !cp.hasSpouse();
                boolean differentFamily = !myFamily.equals(cp.getFamilyAlias());

                if (differentSex && canReproduce && noSpouse && differentFamily) {
                    cp.setSpouseAlias(believes.getAlias()); // mark reciprocal
                    return Optional.of(alias);
                }
            } catch (Exception ignored) {
                // Agent not available — skip
            }
        }
        return Optional.empty();
    }
}
