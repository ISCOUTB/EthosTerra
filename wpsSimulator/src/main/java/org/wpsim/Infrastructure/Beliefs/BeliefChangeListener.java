package org.wpsim.Infrastructure.Beliefs;

@FunctionalInterface
public interface BeliefChangeListener {
    void onChanged(String key, Object oldValue, Object newValue);
}
