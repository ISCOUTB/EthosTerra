package org.wpsim.Infrastructure.Goals;

import org.wpsim.ViewerLens.Util.wpsReport;
import org.mvel2.MVEL;
import org.wpsim.Infrastructure.Beliefs.BeliefRepository;
import org.wpsim.Infrastructure.Goals.Actions.ActionContext;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import com.fuzzylite.Engine;
import com.fuzzylite.variable.InputVariable;
import com.fuzzylite.variable.OutputVariable;
import com.fuzzylite.rule.Rule;
import com.fuzzylite.rule.RuleBlock;
import com.fuzzylite.term.Triangle;
import com.fuzzylite.activation.General;
import com.fuzzylite.defuzzifier.Centroid;
import com.fuzzylite.norm.t.Minimum;
import com.fuzzylite.norm.s.Maximum;

import org.wpsim.Infrastructure.Beliefs.BeliefChangeListener;

import java.util.Optional;
import java.util.*;

/**
 * Declarative BDI Goal Engine.
 * Evaluates GoalSpecs against agent beliefs using MVEL (activation) and FuzzyLite (contribution).
 */
public class GoalEngine implements BeliefChangeListener {
    private final String agentId;
    private final BeliefRepository beliefRepository;
    private final GoalRegistry goalRegistry;
    private final List<String> shadowLog = new ArrayList<>();

    public GoalEngine(String agentId, BeliefRepository beliefRepository) {
        this.agentId = agentId;
        this.beliefRepository = beliefRepository;
        this.goalRegistry = GoalRegistry.getInstance();
        this.normativeFilter = (goal, believes) -> {
            if (goal.getNormative_tags() == null || goal.getNormative_tags().isEmpty()) {
                return true;
            }

            // Check if agent has forbidden tags belief
            Optional<String> forbidden = believes.getBeliefRepository().get("forbidden_normative_tags", String.class);
            if (forbidden.isPresent()) {
                List<String> forbiddenList = Arrays.asList(forbidden.get().split(","));
                for (String tag : goal.getNormative_tags()) {
                    if (forbiddenList.contains(tag)) {
                        wpsReport.debug("Goal " + goal.getId() + " filtered by normative tag: " + tag, agentId);
                        return false;
                    }
                }
            }

            return true;
        };
        subscribeToRelevantBeliefs();
    }

    private void subscribeToRelevantBeliefs() {
        // Subscribe to all beliefs that might trigger goal activation or affect contribution
        Set<String> keys = new HashSet<>();
        for (GoalSpec spec : goalRegistry.getAllGoals().values()) {
            // This is a bit simplified; ideally we'd parse the MVEL expression to find keys.
            // For now, let's assume we can subscribe to common keys or those in fuzzy_inputs.
            if (spec.getContribution_rules() != null && spec.getContribution_rules().getFuzzy_inputs() != null) {
                for (GoalSpec.FuzzyInput input : spec.getContribution_rules().getFuzzy_inputs()) {
                    keys.add(input.getSource());
                }
            }
        }
        for (String key : keys) {
            beliefRepository.subscribe(key, this);
        }
    }

    @Override
    public void onChanged(String key, Object oldValue, Object newValue) {
        // In shadow mode, we just log that a belief change might trigger a re-evaluation
        // Actual re-evaluation happens in the periodic tick to avoid excessive logging.
    }

    /**
     * Normative filter to prune or prioritize goals based on social/legal norms.
     */
    public interface NormativeFilter {
        boolean isPermitted(GoalSpec goal, PeasantFamilyBelieves believes);
    }

    private NormativeFilter normativeFilter;

    public void setNormativeFilter(NormativeFilter filter) {
        this.normativeFilter = filter;
    }

    /**
     * Periodic tick to evaluate goals and log potential intentions (Shadow Mode).
     */
    public void tick(PeasantFamilyBelieves believes) {
        List<GoalSpec> activeGoals = new ArrayList<>();
        Map<String, Object> context = new HashMap<>();
        context.put("belief", beliefRepository);
        context.put("calendar", org.wpsim.SimulationControl.Util.ControlCurrentDate.getInstance());
        context.put("state", believes);
        context.put("lands", believes.getLandsState());

        for (GoalSpec spec : goalRegistry.getAllGoals().values()) {
            try {
                Boolean activated = (Boolean) MVEL.eval(spec.getActivation_when(), context);
                if (activated != null && activated) {
                    activeGoals.add(spec);
                    System.out.println("EBDI: [Goal] Detected " + spec.getId() + " for agent " + agentId);
                }
            } catch (Exception e) {
                wpsReport.error("Error evaluating activation for goal " + spec.getId() + ": " + e.getMessage(), agentId);
            }
        }

        if (activeGoals.isEmpty()) return;

        GoalSpec bestGoal = selectIntention(activeGoals, believes);

        if (bestGoal != null) {
            String logEntry = String.format("[EBDI] Agent %s: Selected goal %s (level %s)",
                    agentId, bestGoal.getId(), bestGoal.getPyramid_level());
            shadowLog.add(logEntry);
            // In full BDI mode, this would trigger an intention shift.
            // For now, we still log it as a shadow/validation step.
            System.out.println(logEntry);
            wpsReport.info(logEntry, agentId);
        }
    }

    /**
     * Selects the best goal from active goals based on contribution and normative filters.
     */
    public GoalSpec selectIntention(List<GoalSpec> activeGoals, PeasantFamilyBelieves believes) {
        GoalSpec bestGoal = null;
        double maxContribution = -1.0;

        for (GoalSpec spec : activeGoals) {
            // 1. Check normative filter
            if (!normativeFilter.isPermitted(spec, believes)) {
                continue;
            }

            // 2. Evaluate contribution
            double contribution = evaluateContribution(spec, believes);
            
            // 3. Selection (highest contribution)
            if (contribution > maxContribution) {
                maxContribution = contribution;
                bestGoal = spec;
            }
        }
        return bestGoal;
    }

    public double evaluateContribution(GoalSpec spec, PeasantFamilyBelieves believes) {
        GoalSpec.ContributionRules rules = spec.getContribution_rules();
        if (rules == null) return 0.0;

        if (rules.getFixed_value() != null) {
            return rules.getFixed_value();
        }

        if (rules.getRules() == null || rules.getRules().isEmpty()) {
            return 0.0;
        }

        // Fuzzy Logic evaluation using jfuzzylite
        try {
            Engine engine = new Engine();
            engine.setName(spec.getId() + "_contribution");

            // Setup input variables
            if (rules.getFuzzy_inputs() != null) {
                for (GoalSpec.FuzzyInput inputSpec : rules.getFuzzy_inputs()) {
                    InputVariable iv = new InputVariable();
                    iv.setName(inputSpec.getName());
                    iv.setRange(inputSpec.getRange().get(0), inputSpec.getRange().get(1));
                    
                    // Simple terms for fuzzy inputs (LOW, MEDIUM, HIGH)
                    double min = inputSpec.getRange().get(0);
                    double max = inputSpec.getRange().get(1);
                    double mid = (min + max) / 2;
                    
                    iv.addTerm(new Triangle("LOW", min, min, mid));
                    iv.addTerm(new Triangle("MEDIUM", min, mid, max));
                    iv.addTerm(new Triangle("HIGH", mid, max, max));
                    
                    engine.addInputVariable(iv);
                    
                    // Set value from belief repository
                    Optional<Object> valOpt = beliefRepository.get(inputSpec.getSource(), Object.class);
                    if (valOpt.isPresent()) {
                        Object val = valOpt.get();
                        if (val instanceof Number) {
                            iv.setValue(((Number) val).doubleValue());
                        } else if (val instanceof Boolean) {
                            iv.setValue(((Boolean) val) ? 1.0 : 0.0);
                        }
                    } else {
                        iv.setValue(0.0);
                    }
                }
            }

            // Setup output variable (contribution)
            OutputVariable ov = new OutputVariable();
            ov.setName("contribution");
            ov.setRange(0.0, 1.0);
            ov.addTerm(new Triangle("LOW", 0.0, 0.0, 0.5));
            ov.addTerm(new Triangle("MEDIUM", 0.0, 0.5, 1.0));
            ov.addTerm(new Triangle("HIGH", 0.5, 1.0, 1.0));
            ov.setDefuzzifier(new Centroid(100));
            ov.setDefaultValue(Double.NaN);
            engine.addOutputVariable(ov);

            // Setup rules
            RuleBlock rb = new RuleBlock();
            rb.setConjunction(new Minimum());
            rb.setDisjunction(new Maximum());
            rb.setActivation(new General());
            rb.setImplication(new Minimum());
            
            for (GoalSpec.FuzzyRule ruleSpec : rules.getRules()) {
                StringBuilder fclRule = new StringBuilder("if ");
                if (ruleSpec.isDefault()) {
                    // Logic for default rule - usually just setting a value
                    // In fcl: if any then contribution is 0.5
                    fclRule.append("any then ").append(ruleSpec.getThen());
                } else {
                    fclRule.append(ruleSpec.getIf()).append(" then ").append(ruleSpec.getThen());
                }
                rb.addRule(Rule.parse(fclRule.toString(), engine));
            }
            engine.addRuleBlock(rb);

            engine.process();
            return ov.getValue();

        } catch (Exception e) {
            wpsReport.warn("Fuzzy evaluation failed for goal " + spec.getId() + ": " + e.getMessage(), agentId);
            return 0.5; // Fallback
        }
    }

    public List<String> getShadowLog() {
        return shadowLog;
    }
}
