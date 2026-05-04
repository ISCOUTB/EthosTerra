package org.wpsim.Infrastructure.Goals;

import org.wpsim.ViewerLens.Util.wpsReport;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.Constructor;

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
 * Registry for PlanSpec objects. Loads YAML files from the specs/plans/ directory.
 */
public class PlanRegistry {
    private static final String DEFAULT_PLANS_DIR = "specs/plans";
    private static final String ENV_PLANS_DIR = "WPS_PLANS_DIR";
    private static PlanRegistry instance;
    private final Map<String, PlanSpec> plans = new HashMap<>();

    private PlanRegistry() {
        loadPlans();
    }

    public static synchronized PlanRegistry getInstance() {
        if (instance == null) {
            instance = new PlanRegistry();
        }
        return instance;
    }

    private void loadPlans() {
        String plansDirPath = System.getenv(ENV_PLANS_DIR);
        if (plansDirPath == null || plansDirPath.isBlank()) {
            plansDirPath = DEFAULT_PLANS_DIR;
        }

        File plansDir = new File(plansDirPath);
        if (!plansDir.exists() || !plansDir.isDirectory()) {
            wpsReport.warn("Plans directory not found: " + plansDirPath, "EBDI");
            return;
        }

        try (Stream<Path> paths = Files.walk(Paths.get(plansDirPath))) {
            paths.filter(Files::isRegularFile)
                 .filter(p -> p.toString().endsWith(".yaml") || p.toString().endsWith(".yml"))
                 .forEach(this::loadPlanFile);
        } catch (Exception e) {
            wpsReport.error("Error walking plans directory: " + e.getMessage(), "EBDI");
        }
    }

    private void loadPlanFile(Path path) {
        Yaml yaml = new Yaml(new Constructor(PlanSpec.class, new LoaderOptions()));
        try (InputStream inputStream = new FileInputStream(path.toFile())) {
            PlanSpec spec = yaml.load(inputStream);
            if (spec != null && spec.getId() != null) {
                plans.put(spec.getId(), spec);
                System.out.println("EBDI: Loaded plan: " + spec.getId() + " from " + path.getFileName());
                wpsReport.info("Loaded plan: " + spec.getId() + " from " + path.getFileName(), "EBDI");
            } else {
                System.err.println("EBDI: Failed to load plan from " + path.getFileName() + " (spec or id is null)");
            }
        } catch (Exception e) {
            System.err.println("EBDI: Error loading plan from " + path.getFileName() + ": " + e.getMessage());
            e.printStackTrace();
            wpsReport.error("Failed to load plan from " + path + ": " + e.getMessage(), "EBDI");
        }
    }

    public PlanSpec getPlan(String id) {
        return plans.get(id);
    }

    public Map<String, PlanSpec> getAllPlans() {
        return plans;
    }
}
