package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Emotions.EmotionalEvaluator;
import BESA.Emotional.Semantics;

/**
 * Action that increases agent health, optionally considering emotional factor.
 */
public class IncreaseHealthAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves beliefs = context.getBeliefs();
        double factor = 1.0;

        if (beliefs.isHaveEmotions()) {
            EmotionalEvaluator evaluator = new EmotionalEvaluator("EmotionalRulesFull");
            factor = evaluator.emotionalFactor(beliefs.getEmotionsListCopy(), Semantics.Emotions.Happiness);
        }

        beliefs.getPeasantProfile().increaseHealth(factor);
        return true;
    }
}
