package org.wpsim.Infrastructure.Beliefs;

import java.util.HashSet;
import java.util.Set;

/**
 * Controls which belief namespaces are included in BeliefRepository.render() / toStructured().
 */
public class BeliefScope {

    private boolean includeState = true;
    private boolean includePersonality = false;
    private boolean includeEmotional = false;
    private final Set<String> onlyKeys = new HashSet<>();

    private BeliefScope() {}

    public static BeliefScope all() {
        BeliefScope s = new BeliefScope();
        s.includeState = true;
        s.includePersonality = true;
        s.includeEmotional = true;
        return s;
    }

    public static BeliefScope stateOnly() {
        return new BeliefScope();
    }

    public BeliefScope withPersonality() {
        this.includePersonality = true;
        return this;
    }

    public BeliefScope withEmotional() {
        this.includeEmotional = true;
        return this;
    }

    public BeliefScope onlyKeys(String... keys) {
        for (String k : keys) onlyKeys.add(k);
        return this;
    }

    public boolean isIncludeState() { return includeState; }
    public boolean isIncludePersonality() { return includePersonality; }
    public boolean isIncludeEmotional() { return includeEmotional; }
    public Set<String> getOnlyKeys() { return onlyKeys; }
    public boolean hasKeyFilter() { return !onlyKeys.isEmpty(); }
}
