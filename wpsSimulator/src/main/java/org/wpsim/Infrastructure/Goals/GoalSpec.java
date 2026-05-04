package org.wpsim.Infrastructure.Goals;

import java.util.List;
import java.util.Map;

/**
 * POJO for declarative goal specification (GoalSpec.schema.json).
 * Loaded from YAML files.
 */
public class GoalSpec {
    private String id;
    private String version;
    private String display_name;
    private String description;
    private String pyramid_level;
    private String sub_level;
    private String activation_when;
    private ContributionRules contribution_rules;
    private Requirements requires;
    private String plan_ref;
    private Effects effects;
    private List<String> normative_tags;
    private Integer priority;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public Integer getPriority() { return priority; }
    public void setPriority(Integer priority) { this.priority = priority; }
    public String getVersion() { return version; }
    public void setVersion(String version) { this.version = version; }
    public String getDisplay_name() { return display_name; }
    public void setDisplay_name(String display_name) { this.display_name = display_name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getPyramid_level() { return pyramid_level; }
    public void setPyramid_level(String pyramid_level) { this.pyramid_level = pyramid_level; }
    public String getSub_level() { return sub_level; }
    public void setSub_level(String sub_level) { this.sub_level = sub_level; }
    public String getActivation_when() { return activation_when; }
    public void setActivation_when(String activation_when) { this.activation_when = activation_when; }
    public ContributionRules getContribution_rules() { return contribution_rules; }
    public void setContribution_rules(ContributionRules contribution_rules) { this.contribution_rules = contribution_rules; }
    public Requirements getRequires() { return requires; }
    public void setRequires(Requirements requires) { this.requires = requires; }
    public String getPlan_ref() { return plan_ref; }
    public void setPlan_ref(String plan_ref) { this.plan_ref = plan_ref; }
    public Effects getEffects() { return effects; }
    public void setEffects(Effects effects) { this.effects = effects; }
    public List<String> getNormative_tags() { return normative_tags; }
    public void setNormative_tags(List<String> normative_tags) { this.normative_tags = normative_tags; }

    public static class ContributionRules {
        private Double fixed_value;
        private List<FuzzyInput> fuzzy_inputs;
        private List<FuzzyRule> rules;

        public Double getFixed_value() { return fixed_value; }
        public void setFixed_value(Double fixed_value) { this.fixed_value = fixed_value; }
        public List<FuzzyInput> getFuzzy_inputs() { return fuzzy_inputs; }
        public void setFuzzy_inputs(List<FuzzyInput> fuzzy_inputs) { this.fuzzy_inputs = fuzzy_inputs; }
        public List<FuzzyRule> getRules() { return rules; }
        public void setRules(List<FuzzyRule> rules) { this.rules = rules; }
    }

    public static class FuzzyInput {
        private String name;
        private String source;
        private List<Double> range;

        public String getName() { return name; }
        public void setName(String name) { this.name = name; }
        public String getSource() { return source; }
        public void setSource(String source) { this.source = source; }
        public List<Double> getRange() { return range; }
        public void setRange(List<Double> range) { this.range = range; }
    }

    public static class FuzzyRule {
        private String if_term; // 'if' is a reserved keyword in Java
        private String then;
        private boolean isDefault;

        // SnakeYAML property mapping
        public String getIf() { return if_term; }
        public void setIf(String if_term) { this.if_term = if_term; }
        public String getThen() { return then; }
        public void setThen(String then) { this.then = then; }
        public boolean isDefault() { return isDefault; }
        public void setDefault(boolean isDefault) { this.isDefault = isDefault; }
    }

    public static class Requirements {
        private Map<String, Double> resources;
        private List<String> skills;

        public Map<String, Double> getResources() { return resources; }
        public void setResources(Map<String, Double> resources) { this.resources = resources; }
        public List<String> getSkills() { return skills; }
        public void setSkills(List<String> skills) { this.skills = skills; }
    }

    public static class Effects {
        private EffectSet on_success;
        private EffectSet on_failure;

        public EffectSet getOn_success() { return on_success; }
        public void setOn_success(EffectSet on_success) { this.on_success = on_success; }
        public EffectSet getOn_failure() { return on_failure; }
        public void setOn_failure(EffectSet on_failure) { this.on_failure = on_failure; }
    }

    public static class EffectSet {
        private List<Map<String, Object>> beliefs;
        private List<Map<String, Double>> emotional;
        private List<EpisodeTemplate> episodes;

        public List<Map<String, Object>> getBeliefs() { return beliefs; }
        public void setBeliefs(List<Map<String, Object>> beliefs) { this.beliefs = beliefs; }
        public List<Map<String, Double>> getEmotional() { return emotional; }
        public void setEmotional(List<Map<String, Double>> emotional) { this.emotional = emotional; }
        public List<EpisodeTemplate> getEpisodes() { return episodes; }
        public void setEpisodes(List<EpisodeTemplate> episodes) { this.episodes = episodes; }
    }

    public static class EpisodeTemplate {
        private String text;
        private List<String> tags;

        public String getText() { return text; }
        public void setText(String text) { this.text = text; }
        public List<String> getTags() { return tags; }
        public void setTags(List<String> tags) { this.tags = tags; }
    }
}
