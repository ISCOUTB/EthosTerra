/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \  *    @since 2023                                  *
 * \_/\_/  | .__/ |___/   *                                                 *
 * | |                    *    @author Jairo Serrano                        *
 * |_|                    *    @author Enrique Gonzalez                     *
 * ==========================================================================
 * Social Simulator used to estimate productivity and well-being of peasant *
 * families. It is event oriented, high concurrency, heterogeneous time     *
 * management and emotional reasoning BDI.                                  *
 * ==========================================================================
 */
package org.wpsim.Person.Agent;

import BESA.BDI.AgentStructuralModel.Agent.AgentBDI;
import BESA.BDI.AgentStructuralModel.GoalBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.PeriodicGuardBESA;
import BESA.Kernel.Agent.StructBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Util.PeriodicDataBESA;
import org.wpsim.Person.Data.PersonBelieves;
import org.wpsim.Person.Data.PersonProfile;
import org.wpsim.Person.Data.SocialRole;
import org.wpsim.FamilyContainer.Data.FamilyBelieves;
import org.wpsim.Person.Goals.Agricultor.CultivateGoal;
import org.wpsim.Person.Goals.Common.AgeGoal;
import org.wpsim.Person.Goals.Common.BuildSocialTiesGoal;
import org.wpsim.Person.Goals.Common.DoVitalsGoal;
import org.wpsim.Person.Goals.Common.SeekSpouseGoal;
import org.wpsim.Person.Goals.Jornalero.SeekWorkGoal;
import org.wpsim.Person.Goals.LiderComunitario.OrganizeMingaGoal;
import org.wpsim.Person.Guards.FromPerson.FromPersonGuard;
import org.wpsim.Person.PeriodicGuards.PersonHeartBeatGuard;
import org.wpsim.ViewerLens.Util.wpsReport;
import org.wpsim.WellProdSim.wpsStart;

import java.util.ArrayList;
import java.util.List;

/**
 * Individual Person agent — a BDI agent representing a single human being
 * within a rural community.
 *
 * <p>Unlike {@code PeasantFamily} (which models an entire household),
 * {@code Person} models one individual with their own health, emotions,
 * skills, reputation, and social network. Multiple persons can belong to
 * the same family (sharing its {@code familyAlias}) and interact freely
 * across family boundaries.</p>
 *
 * <h3>Goal hierarchy</h3>
 * <ol>
 *   <li><strong>L1 Survival</strong> — {@link DoVitalsGoal} (all roles)</li>
 *   <li><strong>L3 Development</strong> — {@link CultivateGoal} (AGRICULTOR),
 *       {@link SeekWorkGoal} (JORNALERO)</li>
 *   <li><strong>L5 Social</strong> — {@link BuildSocialTiesGoal} (all roles),
 *       {@link OrganizeMingaGoal} (LIDER_COMUNITARIO)</li>
 * </ol>
 *
 * <h3>Bootstrapping social network</h3>
 * On startup, the agent seeds its social network with adjacent persons
 * ({@code alias-1} and {@code alias+1}) based on the naming convention
 * {@code {mode}Person{N}}. Etapa 4 will replace this with a dedicated
 * {@code SocialNetwork} service agent.
 *
 * @author jairo
 */
@SuppressWarnings("unchecked")
public class Person extends AgentBDI {

    private static final double BDI_THRESHOLD = 0;

    // ── Factory helpers ────────────────────────────────────────────────────

    private static PersonBelieves createBelieves(String alias, PersonProfile profile,
                                                  FamilyBelieves familyBelieves) {
        return new PersonBelieves(alias, profile, familyBelieves);
    }

    /**
     * Builds the goal list for this individual based on their social role and
     * life stage. Children and infants only have survival goals; adults get the
     * full social and reproductive hierarchy.
     */
    private static List<GoalBDI> createGoals(PersonProfile profile) {
        List<GoalBDI> goals = new ArrayList<>();
        SocialRole role = profile.getRole();

        // L1 — Survival (universal for all life stages)
        goals.add(DoVitalsGoal.buildGoal());

        // L0 — Annual aging (universal)
        goals.add(AgeGoal.buildGoal());

        // Dependent stages (INFANTE, NINO) only have survival + aging
        if (profile.getEtapaVida() == null || profile.getEtapaVida().isDependent()) {
            return goals;
        }

        // L3 — Development (role-specific for productive adults)
        switch (role) {
            case AGRICULTOR -> goals.add(CultivateGoal.buildGoal());
            case JORNALERO  -> goals.add(SeekWorkGoal.buildGoal());
            default -> { /* additional roles added in future etapas */ }
        }

        // L4 — Reproduction (adults without a spouse)
        if (profile.getEtapaVida().canReproduce()) {
            goals.add(SeekSpouseGoal.buildGoal());
        }

        // L5 — Social (universal for non-dependents + role-specific)
        goals.add(BuildSocialTiesGoal.buildGoal());
        if (role == SocialRole.LIDER_COMUNITARIO) {
            goals.add(OrganizeMingaGoal.buildGoal());
        }

        return goals;
    }

    private static StructBESA createStruct(StructBESA struct) throws ExceptionBESA {
        struct.addBehavior("PersonBehavior");
        struct.bindGuard("PersonBehavior", PersonHeartBeatGuard.class);
        struct.bindGuard("PersonBehavior", FromPersonGuard.class);
        return struct;
    }

    // ── Constructor ────────────────────────────────────────────────────────

    /**
     * Creates a new Person agent.
     *
     * @param alias   unique BESA alias (e.g. {@code "singlePerson1"})
     * @param profile individual profile containing role and attributes
     * @throws ExceptionBESA if the BESA container rejects the registration
     */
    /** Legacy constructor — no shared family state. */
    public Person(String alias, PersonProfile profile) throws ExceptionBESA {
        this(alias, profile, null);
    }

    /**
     * Full constructor used by {@link org.wpsim.WellProdSim.FamilyFactory}.
     *
     * @param familyBelieves shared family resource pool (direct Java reference,
     *                       same JVM — may be null in legacy mode)
     */
    public Person(String alias, PersonProfile profile, FamilyBelieves familyBelieves)
            throws ExceptionBESA {
        super(alias,
              createBelieves(alias, profile, familyBelieves),
              createGoals(profile),
              BDI_THRESHOLD,
              createStruct(new StructBESA()));
    }

    // ── AgentBDI lifecycle ─────────────────────────────────────────────────

    @Override
    public void setupAgentBDI() {
        PersonBelieves believes = (PersonBelieves) ((StateBDI) this.getState()).getBelieves();

        // Bootstrap social network with nearest neighbours by name convention
        bootstrapSocialNetwork(believes);

        // Report initial state to WebSocket for UI discovery
        wpsReport.ws(believes.toJson(), believes.getAlias());

        // Start the periodic BDI heartbeat
        try {
            AdmBESA.getInstance()
                   .getHandlerByAlias(getAlias())
                   .sendEvent(new EventBESA(
                           PersonHeartBeatGuard.class.getName(),
                           new PeriodicDataBESA(
                                   wpsStart.params.steptime,
                                   PeriodicGuardBESA.START_PERIODIC_CALL
                           )
                   ));
        } catch (ExceptionBESA ex) {
            System.err.println("Person.setupAgentBDI heartbeat error: " + ex.getMessage());
        }
    }

    @Override
    public synchronized void shutdownAgentBDI() {
        PersonBelieves believes = (PersonBelieves) ((StateBDI) this.getState()).getBelieves();
        wpsReport.ws(believes.toJson(), believes.getAlias());
        System.out.println("Person shutdown: " + this.getAlias());

        try {
            AdmBESA.getInstance().killAgent(
                    AdmBESA.getInstance().getHandlerByAlias(this.getAlias()).getAgId(),
                    wpsStart.config.getDoubleProperty("control.passwd")
            );
        } catch (Exception ex) {
            System.err.println("Person.shutdownAgentBDI: " + ex.getMessage());
        }
    }

    // ── Private helpers ────────────────────────────────────────────────────

    /**
     * Seeds the person's social network by probing adjacent persons in the
     * naming sequence. For alias "singlePerson3", tries to register
     * "singlePerson2" and "singlePerson4".
     *
     * <p>This is a bootstrap mechanism for Etapa 1+2. Etapa 4 will introduce
     * a dedicated SocialNetwork service agent for proper peer discovery.</p>
     */
    private void bootstrapSocialNetwork(PersonBelieves believes) {
        String alias = believes.getAlias();
        // Extract numeric suffix: e.g. "singlePerson3" → 3
        String prefix = alias.replaceAll("\\d+$", "");
        String suffix = alias.replace(prefix, "");
        try {
            int n = Integer.parseInt(suffix);
            registerNeighbour(believes, prefix + (n - 1));
            registerNeighbour(believes, prefix + (n + 1));
        } catch (NumberFormatException ignored) {
            // Alias has no numeric suffix; skip auto-discovery
        }
    }

    private static void registerNeighbour(PersonBelieves believes, String candidateAlias) {
        try {
            AdmBESA.getInstance().getHandlerByAlias(candidateAlias);
            believes.addToSocialNetwork(candidateAlias);
        } catch (ExceptionBESA ignored) {
            // Neighbour not yet registered — will be discovered later
        }
    }
}
