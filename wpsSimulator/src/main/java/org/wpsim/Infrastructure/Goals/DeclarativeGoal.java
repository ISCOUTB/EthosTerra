package org.wpsim.Infrastructure.Goals;

import BESA.BDI.AgentStructuralModel.GoalBDITypes;
import BESA.BDI.AgentStructuralModel.StateBDI;
import BESA.Kernel.Agent.Event.KernellAgentEventExceptionBESA;
import org.wpsim.WellProdSim.Base.wpsGoalBDI;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Agent.PeasantFamily;
import rational.RationalRole;
import rational.mapping.Believes;
import rational.mapping.Plan;
import org.mvel2.MVEL;
import org.wpsim.SimulationControl.Util.ControlCurrentDate;

import java.util.HashMap;
import java.util.Map;

import org.wpsim.Infrastructure.Goals.Actions.DeclarativeTask;

/**
 * A BDI Goal that delegates its logic to a declarative GoalSpec.
 * This allows migrating Java-based goals to YAML without changing the BDI engine.
 */
public class DeclarativeGoal extends wpsGoalBDI {
    private final GoalSpec spec;

    public DeclarativeGoal(long id, RationalRole role, String description, GoalBDITypes type, GoalSpec spec) {
        super(id, role, description, type);
        this.spec = spec;
    }

    public static DeclarativeGoal build(String goalId) {
        GoalSpec spec = GoalRegistry.getInstance().getGoal(goalId);
        if (spec == null) {
            throw new RuntimeException("Goal spec not found: " + goalId);
        }

        GoalBDITypes type = GoalBDITypes.valueOf(spec.getPyramid_level());
        Plan plan = new Plan();
        
        // Load plan from registry if specified
        if (spec.getPlan_ref() != null) {
            PlanSpec planSpec = PlanRegistry.getInstance().getPlan(spec.getPlan_ref());
            if (planSpec != null && planSpec.getSteps() != null) {
                System.out.println("EBDI: [Goal] Linking plan " + spec.getPlan_ref() + " with " + planSpec.getSteps().size() + " steps to goal " + spec.getId());
                for (PlanSpec.PlanStep step : planSpec.getSteps()) {
                    plan.addTask(new DeclarativeTask(step, spec.getId()));
                }
            } else {
                System.err.println("EBDI: [Goal] Plan spec not found or empty for ref: " + spec.getPlan_ref());
            }
        } else {
            System.out.println("EBDI: [Goal] No plan_ref for goal " + spec.getId());
        }

        RationalRole role = new RationalRole(spec.getId() + "_role", plan);
        return new DeclarativeGoal(System.nanoTime(), role, spec.getDisplay_name(), type, spec);
    }

    @Override
    public double detectGoal(Believes parameters) throws KernellAgentEventExceptionBESA {
        PeasantFamilyBelieves believes = (PeasantFamilyBelieves) parameters;
        if (this.isAlreadyExecutedToday(believes)) {
            return 0;
        }

        Map<String, Object> context = new HashMap<>();
        context.put("belief", believes.getBeliefRepository());
        context.put("state", believes);
        context.put("lands", believes.getLandsState());
        context.put("calendar", ControlCurrentDate.getInstance());

        try {
            Boolean activated = (Boolean) MVEL.eval(spec.getActivation_when(), context);
            if (activated != null && activated) {
                System.out.println("EBDI: [Goal] Detected " + spec.getId() + " for agent " + believes.getAlias());
                return 1.0;
            }
            return 0.0;
        } catch (Exception e) {
            System.err.println("EBDI: Error evaluating activation for " + spec.getId() + ": " + e.getMessage());
            e.printStackTrace();
            return 0.0;
        }
    }

    @Override
    public double evaluateContribution(StateBDI stateBDI) throws KernellAgentEventExceptionBESA {
        PeasantFamilyBelieves believes = (PeasantFamilyBelieves) stateBDI.getBelieves();
        double contribution = 0.0;
        if (believes.getGoalEngine() != null) {
            contribution = believes.getGoalEngine().evaluateContribution(spec, believes);
        } else {
            contribution = spec.getContribution_rules().getFixed_value() != null ? spec.getContribution_rules().getFixed_value() : 0.0;
        }
        System.out.println("EBDI: [Goal] Contribution for " + spec.getId() + " = " + contribution);
        return contribution;
    }

    @Override
    public double evaluatePlausibility(Believes parameters) throws KernellAgentEventExceptionBESA {
        // @TODO: Implement requirements check from spec.getRequires()
        return 1.0;
    }

    @Override
    public double evaluateViability(Believes parameters) throws KernellAgentEventExceptionBESA {
        return 1.0;
    }

    @Override
    public boolean goalSucceeded(Believes parameters) throws KernellAgentEventExceptionBESA {
        PeasantFamilyBelieves believes = (PeasantFamilyBelieves) parameters;
        return believes.isTaskExecutedOnDate(believes.getInternalCurrentDate(), spec.getId());
    }

    @Override
    public boolean isAlreadyExecutedToday(PeasantFamilyBelieves believes) {
        return believes.isTaskExecutedOnDate(believes.getInternalCurrentDate(), spec.getId());
    }
}
