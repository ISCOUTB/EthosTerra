package org.wpsim.Infrastructure.Goals.Actions;

import java.util.HashMap;
import java.util.Map;

/**
 * Registry for mapping action IDs to PrimitiveAction implementations.
 */
public class ActionRegistry {
    private static ActionRegistry instance;
    private final Map<String, PrimitiveAction> actions = new HashMap<>();

    private ActionRegistry() {
        System.out.println("EBDI: Initializing ActionRegistry...");
        // Register core actions
        register("emit_episode", new EmitEpisodeAction());
        register("update_belief", new UpdateBeliefAction());
        register("consume_resource", new ConsumeResourceAction());
        register("send_event", new SendEventAction());
        register("send_marketplace_event", new SendMarketPlaceEventAction());
        register("send_civic_land_request", new SendCivicAuthorityLandRequestAction());
        register("emit_emotion", new EmitEmotionAction());
        register("increase_health", new IncreaseHealthAction());
        register("sync_clock", new SyncClockAction());
        register("log_audit", new LogAuditAction());
        register("increment_belief", new IncrementBeliefAction());
        register("wait_for_event", new WaitForEventAction());
        register("conditional", new ConditionalAction());
        register("send_society_collaboration", new SendSocietyCollaborationAction());
        register("spend_friends_time", new SpendFriendsTimeAction());
        register("agro_ecosystem_operation", new AgroEcosystemAction());
    }

    public static synchronized ActionRegistry getInstance() {
        if (instance == null) {
            instance = new ActionRegistry();
        }
        return instance;
    }

    public void register(String id, PrimitiveAction action) {
        actions.put(id, action);
    }

    public PrimitiveAction getAction(String id) {
        return actions.get(id);
    }
}
