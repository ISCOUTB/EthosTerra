package org.wpsim.FamilyContainer.Agent;

import BESA.BDI.AgentStructuralModel.Agent.AgentBDI;
import BESA.BDI.AgentStructuralModel.GoalBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.PeriodicGuardBESA;
import BESA.Kernel.Agent.StructBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Util.PeriodicDataBESA;
import org.wpsim.FamilyContainer.Data.FamilyCoordinatorBelieves;
import org.wpsim.FamilyContainer.Goals.ManageFamilyResourcesGoal;
import org.wpsim.FamilyContainer.Guards.BirthGuard;
import org.wpsim.FamilyContainer.Guards.DeathGuard;
import org.wpsim.FamilyContainer.PeriodicGuards.FamilyCoordinatorHeartBeatGuard;
import org.wpsim.ViewerLens.Util.wpsReport;
import org.wpsim.WellProdSim.wpsStart;

import java.util.ArrayList;
import java.util.List;

/**
 * BDI agent acting as the logical head of a family container.
 *
 * <p>One {@code FamilyCoordinator} is created per family. It owns the shared
 * {@link FamilyCoordinatorBelieves} (money pool, tools, seeds, water, livestock,
 * food, member list) and is responsible for:</p>
 *
 * <ul>
 *   <li>Weekly resource oversight ({@link ManageFamilyResourcesGoal})</li>
 *   <li>Spawning newborns when a {@link BirthGuard} event arrives</li>
 *   <li>Cleaning up dead agents when a {@link DeathGuard} event arrives</li>
 * </ul>
 *
 * <p>Person agents belonging to this family hold a direct Java reference to the
 * coordinator's {@link FamilyCoordinatorBelieves} object (shared heap — same JVM).
 * Inter-agent reads are O(1); writes are synchronized at the believes level.</p>
 *
 * @author jairo
 */
@SuppressWarnings("unchecked")
public class FamilyCoordinator extends AgentBDI {

    private static final double BDI_THRESHOLD = 0;

    // ── Factory helpers ────────────────────────────────────────────────────

    private static List<GoalBDI> createGoals() {
        List<GoalBDI> goals = new ArrayList<>();
        goals.add(ManageFamilyResourcesGoal.buildGoal());
        return goals;
    }

    private static StructBESA createStruct(StructBESA struct) throws ExceptionBESA {
        struct.addBehavior("FamilyCoordinatorBehavior");
        struct.bindGuard("FamilyCoordinatorBehavior", FamilyCoordinatorHeartBeatGuard.class);
        struct.bindGuard("FamilyCoordinatorBehavior", BirthGuard.class);
        struct.bindGuard("FamilyCoordinatorBehavior", DeathGuard.class);
        return struct;
    }

    // ── Constructor ────────────────────────────────────────────────────────

    /**
     * Creates a FamilyCoordinator agent.
     *
     * @param alias    unique BESA alias (e.g. {@code "singleFamily1Coordinator"})
     * @param believes pre-built believes containing the family resource pool
     * @throws ExceptionBESA if BESA container rejects the registration
     */
    public FamilyCoordinator(String alias, FamilyCoordinatorBelieves believes)
            throws ExceptionBESA {
        super(alias,
              believes,
              createGoals(),
              BDI_THRESHOLD,
              createStruct(new StructBESA()));
    }

    // ── AgentBDI lifecycle ─────────────────────────────────────────────────

    @Override
    public void setupAgentBDI() {
        FamilyCoordinatorBelieves believes =
                (FamilyCoordinatorBelieves) ((StateBDI) this.getState()).getBelieves();

        // Report initial family state to WebSocket
        wpsReport.ws(believes.toJson(), believes.getFamilyAlias());

        // Start the periodic BDI heartbeat
        try {
            AdmBESA.getInstance()
                   .getHandlerByAlias(getAlias())
                   .sendEvent(new EventBESA(
                           FamilyCoordinatorHeartBeatGuard.class.getName(),
                           new PeriodicDataBESA(
                                   wpsStart.params.steptime,
                                   PeriodicGuardBESA.START_PERIODIC_CALL
                           )
                   ));
        } catch (ExceptionBESA ex) {
            System.err.println("FamilyCoordinator.setupAgentBDI heartbeat error: " + ex.getMessage());
        }

        System.out.println("[FamilyCoordinator] Started: " + this.getAlias()
                + " | members=" + believes.getMemberCount()
                + " | money=" + String.format("%.0f", believes.getFamilyMoney()));
    }

    @Override
    public synchronized void shutdownAgentBDI() {
        FamilyCoordinatorBelieves believes =
                (FamilyCoordinatorBelieves) ((StateBDI) this.getState()).getBelieves();
        wpsReport.ws(believes.toJson(), believes.getFamilyAlias());
        System.out.println("FamilyCoordinator shutdown: " + this.getAlias());

        try {
            AdmBESA.getInstance().killAgent(
                    AdmBESA.getInstance().getHandlerByAlias(this.getAlias()).getAgId(),
                    wpsStart.config.getDoubleProperty("control.passwd")
            );
        } catch (Exception ex) {
            System.err.println("FamilyCoordinator.shutdownAgentBDI: " + ex.getMessage());
        }
    }
}
