package org.wpsim.FamilyContainer.Data;

import java.io.Serializable;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Shared family state — the "RAM" of a family container.
 *
 * <p>This object is held by {@link FamilyCoordinatorBelieves} and passed by
 * direct Java reference to every {@link org.wpsim.Person.Agent.Person} agent
 * that belongs to the same family. Because all agents share the same JVM heap,
 * no serialization or BESA messaging is needed for reads.</p>
 *
 * <p>Write access convention:
 * <ul>
 *   <li><strong>Reads</strong> — direct field access from any Person agent
 *       (lock-free for read-only fields, synchronized for mutable resources).</li>
 *   <li><strong>Writes</strong> — Person agents that need to mutate family
 *       resources (spend money, consume seeds) call the synchronized helper
 *       methods on this object. The FamilyCoordinator is the authoritative
 *       owner but does NOT need to be involved for every small transaction.</li>
 * </ul>
 * </p>
 *
 * @author jairo
 */
public class FamilyBelieves implements Serializable {

    private final String familyAlias;

    // ── Shared resources ─────────────────────────────────────────────────────
    private double familyMoney;
    private int    tools;
    private int    seeds;
    private int    water;
    private int    livestock;
    private int    food;          // kg in stock

    // ── Land reference ───────────────────────────────────────────────────────
    private String landAlias;    // PeasantFamily land alias (bridges to AgroEcosystem)

    // ── Family composition ───────────────────────────────────────────────────
    private final List<String> memberAliases;

    // ── Birth counter for unique child naming ────────────────────────────────
    private final AtomicInteger birthCounter;

    // ─────────────────────────────────────────────────────────────────────────

    public FamilyBelieves(String familyAlias, double initialMoney, int tools, int seeds, int water) {
        this.familyAlias   = familyAlias;
        this.familyMoney   = initialMoney;
        this.tools         = tools;
        this.seeds         = seeds;
        this.water         = water;
        this.livestock     = 0;
        this.food          = 50;
        this.landAlias     = "";
        this.memberAliases = new CopyOnWriteArrayList<>();
        this.birthCounter  = new AtomicInteger(0);
    }

    // ── Identity ─────────────────────────────────────────────────────────────

    public String getFamilyAlias() { return familyAlias; }

    // ── Member management ─────────────────────────────────────────────────────

    public void addMember(String alias) {
        if (!memberAliases.contains(alias)) memberAliases.add(alias);
    }

    public void removeMember(String alias) {
        memberAliases.remove(alias);
    }

    public List<String> getMemberAliases() { return memberAliases; }

    public int getMemberCount() { return memberAliases.size(); }

    /** Generates a unique alias for a newborn: {@code {familyAlias}Child{N}}. */
    public String nextChildAlias() {
        return familyAlias + "Child" + birthCounter.incrementAndGet();
    }

    // ── Money ─────────────────────────────────────────────────────────────────

    public synchronized double getFamilyMoney() { return familyMoney; }

    public synchronized void addFamilyMoney(double amount) {
        this.familyMoney += amount;
    }

    /**
     * Tries to deduct {@code amount} from the family pool.
     *
     * @return true if funds were available and deducted, false otherwise
     */
    public synchronized boolean discountForMember(double amount) {
        if (this.familyMoney >= amount) {
            this.familyMoney -= amount;
            return true;
        }
        return false;
    }

    // ── Resources ─────────────────────────────────────────────────────────────

    public synchronized int getTools()  { return tools; }
    public synchronized int getSeeds()  { return seeds; }
    public synchronized int getWater()  { return water; }
    public synchronized int getLivestock() { return livestock; }
    public synchronized int getFood()   { return food; }

    public synchronized void setTools(int tools)        { this.tools = Math.max(0, tools); }
    public synchronized void setSeeds(int seeds)        { this.seeds = Math.max(0, seeds); }
    public synchronized void setWater(int water)        { this.water = Math.max(0, water); }
    public synchronized void setLivestock(int livestock) { this.livestock = Math.max(0, livestock); }
    public synchronized void setFood(int food)          { this.food = Math.max(0, food); }

    public synchronized boolean consumeSeeds(int amount) {
        if (seeds >= amount) { seeds -= amount; return true; }
        return false;
    }

    public synchronized boolean consumeWater(int amount) {
        if (water >= amount) { water -= amount; return true; }
        return false;
    }

    public synchronized void harvestFood(int amount) { food += amount; }

    // ── Land ──────────────────────────────────────────────────────────────────

    public String getLandAlias()             { return landAlias; }
    public void   setLandAlias(String alias) { this.landAlias = alias; }
}
