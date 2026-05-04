package org.wpsim.Infrastructure.Goals.Actions;

import org.wpsim.Infrastructure.Episodes.Episode;
import org.wpsim.Infrastructure.Episodes.EpisodeFilter;
import org.wpsim.Infrastructure.Episodes.EpisodeStore;
import org.wpsim.Infrastructure.Episodes.PostgresEpisodeStore;
import org.wpsim.PeasantFamily.Data.PeasantFamilyBelieves;

/**
 * Action that generates and records an episode in memory.
 */
public class EmitEpisodeAction implements PrimitiveAction {

    private static final EpisodeStore store = new PostgresEpisodeStore();

    @Override
    public boolean execute(ActionContext context) {
        PeasantFamilyBelieves beliefs = context.getBeliefs();
        String content = (String) context.getParameter("content");
        if (content == null) {
            content = (String) context.getParameter("text");
        }
        if (content == null) return false;

        double importance = (double) context.getParameters().getOrDefault("importance", 0.5);
        String source = (String) context.getParameters().getOrDefault("source", "self");
        Object tagsObj = context.getParameters().get( "tags" );
        String[] tags = new String[0];
        if (tagsObj instanceof java.util.List) {
            tags = ((java.util.List<?>) tagsObj).stream().map(Object::toString).toArray(String[]::new);
        } else if (tagsObj instanceof String[]) {
            tags = (String[]) tagsObj;
        }

        Episode episode = new Episode(beliefs.getAlias(), beliefs.getCurrentDay(), content, importance);
        episode.setSource(source);
        episode.setTags(tags);
        
        // Inherit relevant beliefs as metadata
        episode.addMetadata("money", beliefs.getPeasantProfile().getMoney());
        episode.addMetadata("health", beliefs.getPeasantProfile().getHealth());

        if (EpisodeFilter.shouldRecord(episode)) {
            store.record(episode);
        }

        return true;
    }
    
    /**
     * Static helper for direct recording from Tasks.
     */
    public static void emit(PeasantFamilyBelieves beliefs, String content, String... tags) {
        ActionContext ctx = new ActionContext(beliefs);
        ctx.setParameter("content", content);
        ctx.setParameter("tags", tags);
        new EmitEpisodeAction().execute(ctx);
    }
}
