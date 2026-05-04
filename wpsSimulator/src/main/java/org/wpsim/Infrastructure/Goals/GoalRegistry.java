package org.wpsim.Infrastructure.Goals;

import org.wpsim.Infrastructure.Beliefs.BeliefSchemaValidator;
import org.wpsim.Infrastructure.Goals.Actions.ActionRegistry;
import org.wpsim.ViewerLens.Util.wpsReport;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.Constructor;
import org.yaml.snakeyaml.LoaderOptions;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.*;
import java.util.stream.Stream;

/**
 * Registry for GoalSpec objects. Loads YAML files from the goals/ directory.
 */
public class GoalRegistry {
    private static final String DEFAULT_GOALS_DIR = "data/ebdi/goals";
    private static final String EXPERIMENTAL_GOALS_DIR = "goals_experimental";
    private static final String ENV_GOALS_DIR = "WPS_GOALS_DIR";
    private static GoalRegistry instance;
    private final Map<String, GoalSpec> goals = new HashMap<>();

    private GoalRegistry() {
        loadGoals();
    }

    public static synchronized GoalRegistry getInstance() {
        if (instance == null) {
            instance = new GoalRegistry();
        }
        return instance;
    }

    private void loadGoals() {
        List<String> scanDirs = new ArrayList<>();
        
        String envGoalsDir = System.getenv(ENV_GOALS_DIR);
        if (envGoalsDir != null && !envGoalsDir.isBlank()) {
            scanDirs.add(envGoalsDir);
        } else {
            scanDirs.add(DEFAULT_GOALS_DIR);
        }
        
        // Always try to load experimental goals if directory exists
        File experimentalDir = new File(EXPERIMENTAL_GOALS_DIR);
        if (experimentalDir.exists() && experimentalDir.isDirectory()) {
            scanDirs.add(EXPERIMENTAL_GOALS_DIR);
        }

        for (String dirPath : scanDirs) {
            File dir = new File(dirPath);
            if (!dir.exists() || !dir.isDirectory()) {
                wpsReport.warn("Goals directory not found: " + dirPath, "EBDI");
                continue;
            }

            try (Stream<Path> paths = Files.walk(Paths.get(dirPath))) {
                paths.filter(Files::isRegularFile)
                     .filter(p -> p.toString().endsWith(".yaml") || p.toString().endsWith(".yml"))
                     .forEach(this::loadGoalFile);
            } catch (Exception e) {
                wpsReport.error("Error walking goals directory " + dirPath + ": " + e.getMessage(), "EBDI");
            }
        }
    }

    private void loadGoalFile(Path path) {
        Yaml yaml = new Yaml(new Constructor(GoalSpec.class, new LoaderOptions()));
        try (InputStream inputStream = new FileInputStream(path.toFile())) {
            GoalSpec spec = yaml.load(inputStream);
            if (spec != null && spec.getId() != null) {
                if (validateSpec(spec, path.getFileName().toString())) {
                    goals.put(spec.getId(), spec);
                    System.out.println("EBDI: Loaded goal: " + spec.getId() + " from " + path.getFileName());
                    wpsReport.info("Loaded goal: " + spec.getId() + " from " + path.getFileName(), "EBDI");
                }
            } else {
                System.err.println("EBDI: Failed to load goal from " + path.getFileName() + " (spec or id is null)");
            }
        } catch (Exception e) {
            wpsReport.error("Error loading goal from " + path.getFileName() + ": " + e.getMessage(), "EBDI");
        }
    }

    private boolean validateSpec(GoalSpec spec, String fileName) {
        boolean valid = true;
        
        // 1. Validate plan_ref
        if (spec.getPlan_ref() != null) {
            PlanSpec plan = PlanRegistry.getInstance().getPlan(spec.getPlan_ref());
            if (plan == null) {
                wpsReport.warn("Goal " + spec.getId() + " references missing plan: " + spec.getPlan_ref(), "EBDI");
                // We keep it as valid but warn, as plans might be loaded later (though Registry order usually handles it)
            } else {
                // Validate all actions in the plan
                for (PlanSpec.PlanStep step : plan.getSteps()) {
                    if (ActionRegistry.getInstance().getAction(step.getAction()) == null) {
                        wpsReport.error("Goal " + spec.getId() + " uses plan " + plan.getId() + " with unregistered action: " + step.getAction(), "EBDI");
                        valid = false;
                    }
                }
            }
        }

        // 2. Validate fuzzy_inputs sources against BeliefSchema
        if (spec.getContribution_rules() != null && spec.getContribution_rules().getFuzzy_inputs() != null) {
            Set<String> knownBeliefs = BeliefSchemaValidator.knownKeys();
            for (GoalSpec.FuzzyInput input : spec.getContribution_rules().getFuzzy_inputs()) {
                if (!knownBeliefs.contains(input.getSource())) {
                    wpsReport.warn("Goal " + spec.getId() + " references unknown belief key: " + input.getSource(), "EBDI");
                }
            }
        }

        return valid;
    }

    public GoalSpec getGoal(String id) {
        return goals.get(id);
    }

    public Map<String, GoalSpec> getAllGoals() {
        return goals;
    }
}
