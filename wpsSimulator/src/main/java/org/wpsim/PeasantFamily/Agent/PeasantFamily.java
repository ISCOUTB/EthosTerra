/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \ *    @since 2023                                  *
 * \_/\_/  | .__/ |___/ *                                                 *
 * | |          *    @author Jairo Serrano                        *
 * |_|          *    @author Enrique Gonzalez                     *
 * ==========================================================================
 * Social Simulator used to estimate productivity and well-being of peasant *
 * families. It is event oriented, high concurrency, heterogeneous time     *
 * management and emotional reasoning BDI.                                  *
 * ==========================================================================
 */
package org.wpsim.PeasantFamily.Agent;

import BESA.BDI.AgentStructuralModel.Agent.AgentBDI;
import BESA.BDI.AgentStructuralModel.GoalBDI;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.ExceptionBESA;
import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.PeriodicGuardBESA;
import BESA.Kernel.Agent.StructBESA;
import BESA.Kernel.System.AdmBESA;
import BESA.Kernel.System.Directory.AdmHandlerBESA;
import BESA.Kernel.System.Directory.AgHandlerBESA;
import BESA.Remote.AdmRemoteImpBESA;
import BESA.Remote.Directory.AgRemoteHandlerBESA;
import BESA.Remote.Directory.RemoteAdmHandlerBESA;
import BESA.Remote.RemoteAdmBESA;
import BESA.Util.PeriodicDataBESA;
import org.wpsim.PeasantFamily.Guards.FromCivicAuthority.FromCivicAuthorityTrainingGuard;
import org.wpsim.PeasantFamily.Guards.FromCommunityDynamics.SocietyWorkerDateSyncGuard;
import org.wpsim.SimulationControl.Guards.AliveAgentGuard;
import org.wpsim.SimulationControl.Guards.DeadAgentGuard;
import org.wpsim.CivicAuthority.Data.LandInfo;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Data.PeasantFamilyProfile;
import org.wpsim.PeasantFamily.Guards.FromSimulationControl.ToControlMessage;
import org.wpsim.PeasantFamily.Guards.FromBankOffice.FromBankOfficeGuard;
import org.wpsim.PeasantFamily.Guards.FromSimulationControl.FromSimulationControlGuard;
import org.wpsim.PeasantFamily.Guards.FromCivicAuthority.FromCivicAuthorityGuard;
import org.wpsim.PeasantFamily.Guards.FromMarketPlace.FromMarketPlaceGuard;
import org.wpsim.PeasantFamily.Guards.FromCommunityDynamics.PeasantWorkerContractFinishedGuard;
import org.wpsim.PeasantFamily.Guards.FromCommunityDynamics.SocietyWorkerContractGuard;
import org.wpsim.PeasantFamily.Guards.FromCommunityDynamics.SocietyWorkerContractorGuard;
import org.wpsim.PeasantFamily.Guards.FromAgroEcosystem.FromAgroEcosystemGuard;
import org.wpsim.PeasantFamily.PeriodicGuards.HeartBeatGuard;
import org.wpsim.PeasantFamily.Guards.Status.StatusGuard;
import org.wpsim.WellProdSim.wpsStart;
import org.wpsim.ViewerLens.Util.wpsReport;

import java.rmi.RemoteException;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Enumeration;
import java.util.List;

import static org.wpsim.WellProdSim.wpsStart.config;
import static org.wpsim.WellProdSim.wpsStart.params;

/**
 * @TODO: Patrones de comunicación
 */

import org.wpsim.Infrastructure.Goals.DeclarativeGoal;
import org.wpsim.Infrastructure.Goals.GoalEngine;
import org.wpsim.Infrastructure.Goals.GoalRegistry;

/**
 * @author jairo
 */
@SuppressWarnings("unchecked")
public class PeasantFamily extends AgentBDI {

    private static final double BDITHRESHOLD = 0;
    private GoalEngine goalEngine;

    private static StructBESA createStruct(StructBESA structBESA) throws ExceptionBESA {
        // Cada comportamiento es un hilo.
        //structBESA.addBehavior("HeartBeatBehavior");
        //structBESA.bindGuard("HeartBeatBehavior", HeartBeatGuard.class);

        structBESA.addBehavior("PeasantBehavior");

        structBESA.bindGuard("PeasantBehavior", HeartBeatGuard.class);

        //structBESA.addBehavior("FromWorldBehavior");
        structBESA.bindGuard("PeasantBehavior", FromAgroEcosystemGuard.class);

        //structBESA.addBehavior("SocietyBehavior");
        structBESA.bindGuard("PeasantBehavior", SocietyWorkerContractGuard.class);
        structBESA.bindGuard("PeasantBehavior", SocietyWorkerContractorGuard.class);
        structBESA.bindGuard("PeasantBehavior", PeasantWorkerContractFinishedGuard.class);
        structBESA.bindGuard("PeasantBehavior", SocietyWorkerDateSyncGuard.class);

        //structBESA.addBehavior("FromControlBehavior");
        structBESA.bindGuard("PeasantBehavior", FromSimulationControlGuard.class);

        //structBESA.addBehavior("FromBankBehavior");
        structBESA.bindGuard("PeasantBehavior", FromBankOfficeGuard.class);

        //structBESA.addBehavior("FromMarketBehavior");
        structBESA.bindGuard("PeasantBehavior", FromMarketPlaceGuard.class);

        //structBESA.addBehavior("FromCivicAuthorityBehavior");
        structBESA.bindGuard("PeasantBehavior", FromCivicAuthorityGuard.class);
        structBESA.bindGuard("PeasantBehavior", FromCivicAuthorityTrainingGuard.class);

        //structBESA.addBehavior("StatusBehavior");
        structBESA.bindGuard("PeasantBehavior", StatusGuard.class);

        return structBESA;
    }

    private static PeasantFamilyBelieves createBelieves(String alias, PeasantFamilyProfile profile) {
        return new PeasantFamilyBelieves(alias, profile);
    }

    private static List<GoalBDI> createGoals() {

        List<GoalBDI> goals = new ArrayList<>();

        //Level 1 Goals: Survival        
        goals.add(DeclarativeGoal.build("do_void"));
        goals.add(DeclarativeGoal.build("do_vitals"));
        goals.add(DeclarativeGoal.build("seek_purpose"));
        goals.add(DeclarativeGoal.build("do_healthcare"));
        goals.add(DeclarativeGoal.build("self_evaluation"));

        //Level 2 Goals: Obligations
        goals.add(DeclarativeGoal.build("look_for_loan"));
        goals.add(DeclarativeGoal.build("pay_debts"));

        //Level 3 Goals: Development
        goals.add(DeclarativeGoal.build("attend_religious_events"));
        goals.add(DeclarativeGoal.build("check_crops"));
        goals.add(DeclarativeGoal.build("harvest_crops"));
        goals.add(DeclarativeGoal.build("manage_pests"));
        goals.add(DeclarativeGoal.build("plant_crop"));
        goals.add(DeclarativeGoal.build("prepare_land"));
        goals.add(DeclarativeGoal.build("deforest_land"));
        goals.add(DeclarativeGoal.build("sell_crop"));
        goals.add(DeclarativeGoal.build("search_for_help"));
        goals.add(DeclarativeGoal.build("work_for_other"));

        //goals.add(ProcessProductsGoal.buildGoal());
        //goals.add(SellProductsGoal.buildGoal());
        //goals.add(MaintainHouseGoal.buildGoal());

        //Level 4 Goals: Skills And Resources
        goals.add(DeclarativeGoal.build("get_price_list"));
        goals.add(DeclarativeGoal.build("obtain_a_land"));
        goals.add(DeclarativeGoal.build("obtain_seeds"));
        goals.add(DeclarativeGoal.build("obtain_tools"));
        goals.add(DeclarativeGoal.build("alternative_work"));
        goals.add(DeclarativeGoal.build("obtain_pesticides"));
        goals.add(DeclarativeGoal.build("obtain_supplies"));
        goals.add(DeclarativeGoal.build("obtain_livestock"));

        if (config.getBooleanProperty("pfagent.trainingEnabled")) {
            goals.add(DeclarativeGoal.build("get_training"));
        }

        if (params.irrigation == 1) {
            goals.add(DeclarativeGoal.build("irrigate_crops"));
            goals.add(DeclarativeGoal.build("obtain_water"));
        }

        //Level 5 Goals: Social
        goals.add(DeclarativeGoal.build("communicate"));
        goals.add(DeclarativeGoal.build("look_for_collaboration"));
        goals.add(DeclarativeGoal.build("provide_collaboration"));

        //Level 6 Goals: Leisure
        goals.add(DeclarativeGoal.build("spend_family_time"));
        goals.add(DeclarativeGoal.build("spend_friends_time"));
        goals.add(DeclarativeGoal.build("leisure_activities"));
        goals.add(DeclarativeGoal.build("waste_time_and_resources"));
        goals.add(DeclarativeGoal.build("find_news"));

        return goals;
    }

    /**
     * @param alias
     * @param peasantProfile
     * @throws ExceptionBESA
     */
    public PeasantFamily(String alias, PeasantFamilyProfile peasantProfile) throws ExceptionBESA {
        super(alias, createBelieves(alias, peasantProfile), createGoals(), BDITHRESHOLD, createStruct(new StructBESA()));
        PeasantFamilyBelieves believes = (PeasantFamilyBelieves) ((StateBDI) this.getState()).getBelieves();
        if (believes.getBeliefRepository() != null) {
            this.goalEngine = new GoalEngine(alias, believes.getBeliefRepository());
            believes.setGoalEngine(this.goalEngine);
        }
    }

    /**
     *
     */
    @Override
    public void setupAgentBDI() {
        //wpsReport.debug("Setup " + this.getAlias(), this.getAlias());
        // Internal HeartBeat ping
        PeasantFamilyBelieves believes = (PeasantFamilyBelieves) ((StateBDI) this.getState()).getBelieves();
        
        // Reportar estado inicial al WebSocket para descubrimiento inmediato en la UI
        wpsReport.ws(believes.toJson(), believes.getAlias());
        
        try {
            AdmBESA.getInstance().getHandlerByAlias(
                    getAlias()
            ).sendEvent(
                    new EventBESA(
                            HeartBeatGuard.class.getName(),
                            new PeriodicDataBESA(
                                    wpsStart.params.steptime,
                                    PeriodicGuardBESA.START_PERIODIC_CALL
                            )
                    )
            );
        } catch (ExceptionBESA ex) {
            System.out.println(ex.getMessage());
        }
        // External Alive Ping
        try {
            AdmBESA.getInstance().getHandlerByAlias(
                    config.getControlAgentName()
            ).sendEvent(
                    new EventBESA(
                            AliveAgentGuard.class.getName(),
                            new ToControlMessage(
                                    believes.getPeasantProfile().getPeasantFamilyAlias(),
                                    believes.getCurrentDay()
                            )
                    )
            );
        } catch (ExceptionBESA ex) {
            System.out.println(ex.getMessage());
        }

    }

    /**
     *
     */
    @Override
    public synchronized void shutdownAgentBDI() {
        System.out.println("Shutdown " + this.getAlias());
        // Anuncio de que el agente está muerto
        PeasantFamilyBelieves believes = (PeasantFamilyBelieves) ((StateBDI) this.getState()).getBelieves();
        wpsReport.mental(Instant.now() + "," + believes.toCSV(), this.getAlias());
        wpsReport.ws(believes.toJson(), believes.getAlias());
        //Eliminar el agente
        try {
            AdmBESA.getInstance().getHandlerByAlias(
                    config.getControlAgentName()
            ).sendEvent(
                    new EventBESA(
                            DeadAgentGuard.class.getName(),
                            new ToControlMessage(
                                    believes.getPeasantProfile().getPeasantFamilyAlias(),
                                    believes.getCurrentDay()
                            )
                    )
            );
            AdmBESA.getInstance().killAgent(
                    AdmBESA.getInstance().getHandlerByAlias(
                            this.getAlias()
                    ).getAgId(),
                    config.getDoubleProperty("control.passwd")
            );
        } catch (ExceptionBESA e) {
            e.printStackTrace();
        }
    }

    public GoalEngine getGoalEngine() {
        return goalEngine;
    }

}
