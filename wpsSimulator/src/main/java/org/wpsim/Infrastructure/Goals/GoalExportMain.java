package org.wpsim.Infrastructure.Goals;

/**
 * Main entry point for the Goal Export tool.
 * Can be used to validate YAMLs by loading and re-exporting them.
 */
public class GoalExportMain {
    public static void main(String[] args) {
        if (args.length < 1) {
            System.out.println("Usage: GoalExportMain <goal_id> [output_path]");
            return;
        }

        String goalId = args[0];
        GoalSpec spec = GoalRegistry.getInstance().getGoal(goalId);
        if (spec == null) {
            System.err.println("Goal not found: " + goalId);
            return;
        }

        String outputPath = args.length > 1 ? args[1] : goalId + "_exported.yaml";
        GoalSpecExporter.export(spec, outputPath);
    }
}
