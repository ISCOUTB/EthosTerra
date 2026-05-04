package org.wpsim.Infrastructure.Goals.Actions;

import BESA.BDI.AgentStructuralModel.StateBDI;
import org.wpsim.Infrastructure.Goals.PlanSpec;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.ViewerLens.Util.wpsReport;
import rational.mapping.Believes;
import rational.mapping.Task;

/**
 * A BESA Task that executes a declarative PlanStep using the ActionRegistry.
 */
public class DeclarativeTask extends Task {
    private final PlanSpec.PlanStep step;
    private final String goalId;

    public DeclarativeTask(PlanSpec.PlanStep step, String goalId) {
        this.step = step;
        this.goalId = goalId;
    }

    @Override
    public void executeTask(Believes parameters) {
        PeasantFamilyBelieves believes = (PeasantFamilyBelieves) parameters;
        ActionRegistry registry = ActionRegistry.getInstance();
        PrimitiveAction action = registry.getAction(step.getAction());

        if (action == null) {
            wpsReport.error("Action not found in registry: " + step.getAction(), believes.getAlias());
            setTaskFinalized();
            return;
        }

        ActionContext context = new ActionContext(believes);
        if (step.getArgs() != null) {
            step.getArgs().forEach(context::setParameter);
        }
        // Expose the step's binds field so WaitForEventAction knows where to store its result
        if (step.getBinds() != null) {
            context.setParameter("_binds", step.getBinds());
        }

        wpsReport.debug("Executing declarative task: " + step.getId() + " (Action: " + step.getAction() + ")", believes.getAlias());
        System.out.println("EBDI: [Task] Executing " + step.getId() + " for agent " + believes.getAlias());
        
        boolean success = action.execute(context);
        
        if (!success) {
            wpsReport.error("Action execution failed: " + step.getAction(), believes.getAlias());
        }

        // Handle time consumption if specified in args
        if (step.getArgs() != null && step.getArgs().containsKey("time_minutes")) {
            double minutes = Double.parseDouble(step.getArgs().get("time_minutes").toString());
            believes.useTime(minutes);
        }
        setTaskFinalized();
        believes.addNamedTaskToLog(believes.getInternalCurrentDate(), goalId);
        System.out.println("EBDI: [Task] Finalized " + step.getId() + " for goal " + goalId);
    }

    @Override
    public boolean checkFinish(Believes believes) {
        return isFinalized();
    }

    @Override
    public void interruptTask(Believes believes) {
        // Handle interruption if needed
    }

    @Override
    public void cancelTask(Believes believes) {
        // Handle cancellation if needed
    }

    @Override
    public String toString() {
        return "DeclarativeTask{" + "id=" + step.getId() + ", action=" + step.getAction() + '}';
    }
}
