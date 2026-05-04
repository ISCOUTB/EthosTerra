package org.wpsim.Infrastructure.Goals.Actions;

/**
 * Functional interface for a primitive action that can be executed by an agent.
 */
@FunctionalInterface
public interface PrimitiveAction {
    /**
     * Executes the action within a given context.
     * @return true if successful, false otherwise.
     */
    boolean execute(ActionContext context);
}
