package rational.guards;

import BESA.Kernel.Agent.Event.EventBESA;
import BESA.Kernel.Agent.GuardBESA;
import BESA.Log.ReportBESA;
import java.util.Iterator;
import rational.RationalRole;
import rational.RationalState;
import rational.mapping.Plan;
import rational.mapping.Task;

/**
 * A class representing a guard that handles the change of a rational agent's
 * role. This class extends GuardBESA.
 */
public class ChangeRationalRoleGuard extends GuardBESA {

    @Override
    public void funcExecGuard(EventBESA ebesa) {
        RationalState state = (RationalState) this.getAgent().getState();
        RationalRole newrole = (RationalRole) ebesa.getData();

        /*if (state.getMainRole() != null) {
            ReportBESA.debug("🟢 MainRole " + state.getMainRole().getRoleName() + " 🟢 Trying to change to rol 🟩 " + newrole.getRoleName());
        }*/
        if (state.getMainRole() != null && !state.getMainRole().getRoleName().equals(((RationalRole) ebesa.getData()).getRoleName())) {
            if (state.getMainRole() != null) {
                Plan plan = state.getMainRole().getRolePlan();
                if (plan != null) {
                    Iterator<Task> it = plan.getTasksInExecution().iterator();
                    //ReportBESA.warn("🔸 " + plan.getTasks().size() + " plans " + plan.getTasks());
                    while (it.hasNext()) {
                        Task task = it.next();
                        if (task.isInExecution()) {
                            //ReportBESA.debug("Todavía en ejecución " + task.toString());
                            //task.cancelTask(state.getBelieves());
                            //it.remove();
                        } else if (task.isFinalized()) {
                            it.remove();
                        }
                        task.setTaskFinalized();
                    }
                }
            }
            newrole.resetPlan();
            state.setMainRole(newrole);
        } else if (state.getMainRole() == null) {
            newrole.resetPlan();
            state.setMainRole(newrole);
        } else if (!state.getMainRole().getRolePlan().inExecution()) {
            //ReportBESA.warn("NO HAY NADA EJECUTANDOSE");
            /*ReportBESA.warn("getTasksWaitingForExecution " + state.getMainRole().getRolePlan().getTasksWaitingForExecution());
            for (Task sTask : state.getMainRole().getRolePlan().getTasks()) {
                ReportBESA.debug("posible tarea " + sTask);
            }*/
            state.getMainRole().getRolePlan().reset();
        }
    }

}
