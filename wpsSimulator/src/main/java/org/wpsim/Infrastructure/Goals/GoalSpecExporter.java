package org.wpsim.Infrastructure.Goals;

import BESA.Log.ReportBESA;
import org.yaml.snakeyaml.DumperOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.nodes.Tag;
import org.yaml.snakeyaml.representer.Representer;

import java.io.FileWriter;
import java.io.IOException;

/**
 * Utility to export GoalSpec objects to YAML files.
 */
public class GoalSpecExporter {

    public static void export(GoalSpec spec, String filePath) {
        DumperOptions options = new DumperOptions();
        options.setDefaultFlowStyle(DumperOptions.FlowStyle.BLOCK);
        options.setPrettyFlow(true);

        Representer representer = new Representer(options);
        // Prevent adding !!org.wpsim.Infrastructure.Goals.GoalSpec tags
        representer.addClassTag(GoalSpec.class, Tag.MAP);

        Yaml yaml = new Yaml(representer, options);
        try (FileWriter writer = new FileWriter(filePath)) {
            yaml.dump(spec, writer);
            ReportBESA.info("Exported goal " + spec.getId() + " to " + filePath);
        } catch (IOException e) {
            ReportBESA.error("Failed to export goal: " + e.getMessage());
        }
    }
}
