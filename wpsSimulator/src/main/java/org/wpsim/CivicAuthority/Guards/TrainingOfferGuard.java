package org.wpsim.CivicAuthority.Guards;

import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.PeriodicGuardBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.CivicAuthority.Data.CivicAuthorityState;
import org.wpsim.PeasantFamily.Guards.FromCivicAuthority.FromCivicAuthorityTrainingGuard;
import org.wpsim.PeasantFamily.Guards.FromCivicAuthority.FromCivicAuthorityTrainingMessage;
import org.wpsim.SimulationControl.Util.ControlCurrentDate;
import org.wpsim.WellProdSim.wpsStart;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class TrainingOfferGuard extends PeriodicGuardBESA {

    List<String> peasantFamilyAgentAliases = generatePeasantFamilyAgentAliases(wpsStart.peasantFamiliesAgents);
    private int currentIndex = 0;
    private String lastYearProcessed = "";

    public TrainingOfferGuard(){
        super();
        Collections.shuffle(peasantFamilyAgentAliases);
    }

    /**
     * The method that will be executed when the guard is triggered.
     *
     * @param event The BESA event triggering the execution of the method.
     */
    @Override
    public synchronized void funcPeriodicExecGuard(EventBESA event) {
        String selectedAgent = "";
        if (wpsStart.started && wpsStart.params.training == 1) {
            CivicAuthorityState state = (CivicAuthorityState) this.getAgent().getState();
            String currentYear = ControlCurrentDate.getInstance().getCurrentYear();

            // Handle annual reset
            if (!currentYear.equals(lastYearProcessed)) {
                state.resetTrainingSlots();
                lastYearProcessed = currentYear;
            }

            // Check for available slots
            if (state.useTrainingSlot()) {
                selectedAgent = peasantFamilyAgentAliases.get(currentIndex);
                try {
                    AdmBESA.getInstance().getHandlerByAlias(
                            selectedAgent
                    ).sendEvent(
                            new EventBESA(
                                    FromCivicAuthorityTrainingGuard.class.getName(),
                                    new FromCivicAuthorityTrainingMessage(true)
                            )
                    );
                } catch (ExceptionBESA e) {
                    System.out.println("Agente no encontrado o no activado " + selectedAgent);
                } finally {
                    currentIndex = (currentIndex + 1) % peasantFamilyAgentAliases.size();
                }
            }
        }

    }

    private List<String> generatePeasantFamilyAgentAliases(int familiesPerNode) {
        List<String> aliases = new ArrayList<>();
        // Only generate aliases for the local container's agents
        String prefix = wpsStart.params.mode + "PeasantFamily";
        for (int i = 1; i <= familiesPerNode; i++) {
            aliases.add(prefix + i);
        }
        return aliases;
    }

}
