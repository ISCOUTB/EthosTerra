package org.wpsim.Infrastructure.Goals.Actions;

import BESA.Emotional.EmotionalEvent;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;
import org.wpsim.PeasantFamily.Data.Utils.TimeConsumedBy;
import org.wpsim.SimulationControl.Data.Coin;

/**
 * Specialized action for SpendFriendsTimeTask logic.
 * Handles the coin flip to decide time consumption and processes multiple emotional events.
 */
public class SpendFriendsTimeAction implements PrimitiveAction {
    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves believes = context.getBeliefs();
        
        if (Coin.flipCoin()) {
            believes.useTime(TimeConsumedBy.SpendFriendsTimeTask.getTime());
        } else {
            believes.useTime(believes.getTimeLeftOnDay());
        }

        believes.processEmotionalEvent(new EmotionalEvent("FAMILY", "LEISURE", "TIME"));
        believes.processEmotionalEvent(new EmotionalEvent("FRIEND", "LEISURE", "TIME"));
        
        return true;
    }
}
