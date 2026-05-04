package org.wpsim.Infrastructure.Goals;

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
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Stream;

/**
 * Registry for GoalSpec objects. Loads YAML files from the goals/ directory.
 */
public class GoalRegistry {
    private static final String DEFAULT_GOALS_DIR = "specs/goals";
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
        String goalsDirPath = System.getenv(ENV_GOALS_DIR);
        if (goalsDirPath == null || goalsDirPath.isBlank()) {
            goalsDirPath = DEFAULT_GOALS_DIR;
        }

        File goalsDir = new File(goalsDirPath);
        if (!goalsDir.exists() || !goalsDir.isDirectory()) {
            wpsReport.warn("Goals directory not found: " + goalsDirPath, "EBDI");
            return;
        }

        try (Stream<Path> paths = Files.walk(Paths.get(goalsDirPath))) {
            paths.filter(Files::isRegularFile)
                 .filter(p -> p.toString().endsWith(".yaml") || p.toString().endsWith(".yml"))
                 .forEach(this::loadGoalFile);
        } catch (Exception e) {
            wpsReport.error("Error walking goals directory: " + e.getMessage(), "EBDI");
        }
    }

    private void loadGoalFile(Path path) {
        Yaml yaml = new Yaml(new Constructor(GoalSpec.class, new LoaderOptions()));
        try (InputStream inputStream = new FileInputStream(path.toFile())) {
            GoalSpec spec = yaml.load(inputStream);
            if (spec != null && spec.getId() != null) {
                goals.put(spec.getId(), spec);
                System.out.println("EBDI: Loaded goal: " + spec.getId() + " from " + path.getFileName());
                wpsReport.info("Loaded goal: " + spec.getId() + " from " + path.getFileName(), "EBDI");
            } else {
                System.err.println("EBDI: Failed to load goal from " + path.getFileName() + " (spec or id is null)");
            }
        } catch (Exception e) {
            System.err.println("EBDI: Error loading goal from " + path.getFileName() + ": " + e.getMessage());
            e.printStackTrace();
            wpsReport.error("Failed to load goal from " + path + ": " + e.getMessage(), "EBDI");
        }
    }

    public GoalSpec getGoal(String id) {
        return goals.get(id);
    }

    public Map<String, GoalSpec> getAllGoals() {
        return goals;
    }
}
