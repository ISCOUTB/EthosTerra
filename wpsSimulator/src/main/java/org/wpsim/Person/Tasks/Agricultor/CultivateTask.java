/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \  *    @since 2023                                  *
 * \_/\_/  | .__/ |___/   *                                                 *
 * | |                    *    @author Jairo Serrano                        *
 * |_|                    *    @author Enrique Gonzalez                     *
 * ==========================================================================
 */
package org.wpsim.Person.Tasks.Agricultor;

import BESA.Emotional.EmotionalEvent;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.WellProdSim.Base.wpsPersonTask;
import rational.mapping.Believes;

/**
 * Represents a block of farming work performed by an AGRICULTOR.
 *
 * In Etapa 1+2 this task models the effort without direct AgroEcosystem
 * interaction. The person consumes time and energy, improves skills slowly,
 * and generates a PLANTING/WORK emotional event.
 *
 * The AgroEcosystem coupling (sending actual planting / irrigation commands
 * to the family's land) will be wired in Etapa 3.
 *
 * Side effects:
 * <ul>
 *   <li>Consumes 480 minutes of daily time budget.</li>
 *   <li>Increments skills by a tiny fraction over time.</li>
 *   <li>Emits PLANTING emotional event.</li>
 * </ul>
 *
 * @author jairo
 */
public class CultivateTask extends wpsPersonTask {

    private static final double TIME_COST = 480;
    private static final double SKILL_GAIN_PER_DAY = 0.001;

    @Override
    public void executeTask(Believes parameters) {
        this.setExecuted(false);
        PersonBelieves believes = (PersonBelieves) parameters;

        believes.useTime(TIME_COST);
        believes.setCurrentActivity("CULTIVATING");

        // Gradual skill improvement through daily practice
        believes.getProfile().increaseSkills(SKILL_GAIN_PER_DAY);

        believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "PLANTING", "LAND"));

        believes.addTaskToLog(believes.getInternalCurrentDate());
    }
}
