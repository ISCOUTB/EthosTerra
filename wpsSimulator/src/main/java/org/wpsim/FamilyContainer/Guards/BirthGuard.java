package org.wpsim.FamilyContainer.Guards;

import BESA.BDI.AgentStructuralModel.Agent.AgentBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.GuardBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.FamilyContainer.Data.BirthData;
import org.wpsim.FamilyContainer.Data.FamilyCoordinatorBelieves;
import org.wpsim.Person.Agent.Person;
import org.wpsim.Person.Data.EtapaVida;
import org.wpsim.Person.Data.PersonProfile;
import org.wpsim.Person.Data.Sexo;
import org.wpsim.ViewerLens.Util.wpsReport;

import java.util.Random;

/**
 * Guard executed on the FamilyCoordinator when a child is born.
 *
 * <p>Responsibilities:</p>
 * <ol>
 *   <li>Generate a unique alias for the newborn via
 *       {@link FamilyCoordinatorBelieves#nextChildAlias()}.</li>
 *   <li>Create a new {@link Person} agent with INFANTE demographics (age 0)
 *       and a random sex.</li>
 *   <li>Register the newborn in the family member list.</li>
 *   <li>Bind the newborn to the family service in the BESA directory.</li>
 *   <li>Report the updated family state to the WebSocket UI.</li>
 * </ol>
 *
 * <p>The birth event is sent by
 * {@link org.wpsim.Person.Tasks.Common.SeekSpouseTask} (future) or by
 * reproduction logic in the FamilyCoordinator goals.</p>
 *
 * @author jairo
 */
public class BirthGuard extends GuardBESA {

    private static final Random RANDOM = new Random();

    @Override
    public void funcExecGuard(EventBESA event) {
        BirthData data = (BirthData) event.getData();
        if (data == null) return;

        AgentBDI coordinator = (AgentBDI) this.agent;
        FamilyCoordinatorBelieves believes =
                (FamilyCoordinatorBelieves) ((StateBDI) coordinator.getState()).getBelieves();

        String familyAlias = believes.getFamilyAlias();
        String childAlias  = believes.nextChildAlias();
        Sexo   childSex    = RANDOM.nextBoolean() ? Sexo.MASCULINO : Sexo.FEMENINO;

        System.out.println("[BirthGuard] New child born in family " + familyAlias
                + " → " + childAlias + " (" + childSex + ")");

        try {
            // Build infant profile
            PersonProfile profile = new PersonProfile(childAlias, familyAlias, 0, childSex);
            profile.setPersonality(0.5);

            // Create and start the new agent (same AdmBESA, same JVM)
            Person child = new Person(childAlias, profile, believes);
            child.start();

            // Register in family composition
            believes.addMember(childAlias);

            // Bind to family service registry
            String childId = AdmBESA.getInstance()
                    .getHandlerByAlias(childAlias)
                    .getAgId();
            AdmBESA.getInstance().bindService(childId, "family:" + familyAlias);

            System.out.println("[BirthGuard] " + childAlias + " registered in family " + familyAlias);

        } catch (Exception ex) {
            System.err.println("[BirthGuard] Failed to create child " + childAlias + ": " + ex.getMessage());
        }

        // Report updated family state
        wpsReport.ws(believes.toJson(), familyAlias);
    }
}
