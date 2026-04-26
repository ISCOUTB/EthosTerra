/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \  *    @since 2023                                  *
 * \_/\_/  | .__/ |___/   *                                                 *
 * | |                    *    @author Jairo Serrano                        *
 * |_|                    *    @author Enrique Gonzalez                     *
 * ==========================================================================
 */
package org.wpsim.Person.Data;

import java.io.Serializable;

/**
 * Individual profile for a Person agent — models one human being within a
 * family container. Tracks identity, demographics, vitals, skills, and
 * social affinities.
 *
 * <p>The {@link #advanceAge()} method is called once per simulation year by
 * {@link org.wpsim.Person.Tasks.Common.AgeTask}. When a life-stage boundary
 * is crossed the default role is automatically updated.</p>
 *
 * @author jairo
 */
public class PersonProfile implements Serializable {

    // ── Identity ─────────────────────────────────────────────────────────────
    private String alias;
    private String familyAlias;
    private SocialRole role;

    // ── Demographics ─────────────────────────────────────────────────────────
    private int age;
    private Sexo sex;
    private EtapaVida etapaVida;

    // ── Vitals ───────────────────────────────────────────────────────────────
    private int health;
    private int initialHealth;

    // ── Capabilities ─────────────────────────────────────────────────────────
    private double skills;
    private double reputation;
    private double money;
    private double personality;

    // ── Social affinities (0.0–1.0) ──────────────────────────────────────────
    private double familyAffinity;
    private double friendsAffinity;
    private double communityAffinity;
    private double leisureAffinity;

    // ── Economy ──────────────────────────────────────────────────────────────
    private double dailyCost;

    // ── Spouse (set by SeekSpouseGoal) ────────────────────────────────────────
    private String spouseAlias;

    // ─────────────────────────────────────────────────────────────────────────
    // Constructors
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Creates a PersonProfile with explicit role (legacy / external assignment).
     *
     * @param alias       unique BESA alias
     * @param familyAlias alias of the family container this person belongs to
     * @param role        social role (overrides demographic default)
     */
    public PersonProfile(String alias, String familyAlias, SocialRole role) {
        this(alias, familyAlias, 30, Sexo.MASCULINO);
        this.role = role; // explicit override
    }

    /**
     * Creates a PersonProfile deriving the role automatically from age and sex.
     * This is the preferred constructor when spawning agents via
     * {@link org.wpsim.WellProdSim.FamilyFactory}.
     *
     * @param alias       unique BESA alias
     * @param familyAlias alias of the family container
     * @param age         initial age in years
     * @param sex         biological sex
     */
    public PersonProfile(String alias, String familyAlias, int age, Sexo sex) {
        this.alias         = alias;
        this.familyAlias   = familyAlias;
        this.age           = age;
        this.sex           = sex;
        this.etapaVida     = EtapaVida.fromAge(age);
        this.role          = defaultRoleFor(age, sex);

        this.health        = 100;
        this.initialHealth = 100;
        this.skills        = skillsForAge(age);
        this.reputation    = 0.5;
        this.money         = 50_000;
        this.personality   = 0.5;
        this.familyAffinity    = 0.7;
        this.friendsAffinity   = 0.5;
        this.communityAffinity = 0.5;
        this.leisureAffinity   = 0.3;
        this.dailyCost     = 5_000;
        this.spouseAlias   = null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Demographic helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Assigns a default social role based on age and sex, following typical
     * Colombian rural community patterns.
     *
     * <ul>
     *   <li>INFANTE/NINO → no productive role (null represented as AGRICULTOR for system compat)</li>
     *   <li>ADOLESCENTE ♂ → JORNALERO (assists adults in the field)</li>
     *   <li>ADOLESCENTE ♀ → AMA_DE_CASA (assists in household)</li>
     *   <li>ADULTO_JOVEN/ADULTO ♂ → AGRICULTOR</li>
     *   <li>ADULTO_JOVEN/ADULTO ♀ → AMA_DE_CASA</li>
     *   <li>ADULTO_MAYOR ♂ → GANADERO (lighter work)</li>
     *   <li>ADULTO_MAYOR ♀ → CURANDERA (knowledge-based role)</li>
     *   <li>ANCIANO → GANADERO/CURANDERA with diminishing capacity</li>
     * </ul>
     */
    public static SocialRole defaultRoleFor(int age, Sexo sex) {
        EtapaVida etapa = EtapaVida.fromAge(age);
        return switch (etapa) {
            case INFANTE, NINO    -> SocialRole.AGRICULTOR; // placeholder — goals filter by etapa
            case ADOLESCENTE      -> sex == Sexo.MASCULINO ? SocialRole.JORNALERO   : SocialRole.AMA_DE_CASA;
            case ADULTO_JOVEN,
                 ADULTO           -> sex == Sexo.MASCULINO ? SocialRole.AGRICULTOR  : SocialRole.AMA_DE_CASA;
            case ADULTO_MAYOR,
                 ANCIANO          -> sex == Sexo.MASCULINO ? SocialRole.GANADERO    : SocialRole.CURANDERA;
            default               -> SocialRole.AGRICULTOR;
        };
    }

    /** Returns baseline skill level appropriate for the given age. */
    private static double skillsForAge(int age) {
        if (age <= 12) return 0.0;
        if (age <= 17) return 0.15;
        if (age <= 30) return 0.3;
        if (age <= 50) return 0.5;
        if (age <= 65) return 0.6; // peak experience
        return 0.4;                // physical decline
    }

    /**
     * Advances age by one year (called annually by AgeTask).
     * Updates {@code etapaVida} and reassigns the default role if a stage
     * boundary is crossed. Also applies age-related health decline for elders.
     */
    public void advanceAge() {
        this.age++;
        EtapaVida newEtapa = EtapaVida.fromAge(this.age);

        if (newEtapa != this.etapaVida) {
            this.etapaVida = newEtapa;
            this.role = defaultRoleFor(this.age, this.sex);
        }

        // Natural health decline for elders
        if (this.etapaVida == EtapaVida.ADULTO_MAYOR) {
            this.health = Math.max(0, this.health - 2);
        } else if (this.etapaVida == EtapaVida.ANCIANO) {
            this.health = Math.max(0, this.health - 5);
        }

        // Update skills with aging (peak ~55, then slight decline)
        this.skills = Math.min(1.0, skillsForAge(this.age));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Identity
    // ─────────────────────────────────────────────────────────────────────────

    public String getAlias() { return alias; }
    public void setAlias(String alias) { this.alias = alias; }

    public String getFamilyAlias() { return familyAlias; }
    public void setFamilyAlias(String familyAlias) { this.familyAlias = familyAlias; }

    public SocialRole getRole() { return role; }
    public void setRole(SocialRole role) { this.role = role; }

    // ── Demographics ──────────────────────────────────────────────────────────

    public int getAge() { return age; }
    public void setAge(int age) {
        this.age = age;
        this.etapaVida = EtapaVida.fromAge(age);
    }

    public Sexo getSex() { return sex; }
    public void setSex(Sexo sex) { this.sex = sex; }

    public EtapaVida getEtapaVida() { return etapaVida; }

    public String getSpouseAlias() { return spouseAlias; }
    public void setSpouseAlias(String spouseAlias) { this.spouseAlias = spouseAlias; }

    public boolean hasSpouse() { return spouseAlias != null && !spouseAlias.isEmpty(); }

    // ── Vitals ────────────────────────────────────────────────────────────────

    public int getHealth() { return health; }
    public void setHealth(int health) { this.health = Math.max(0, Math.min(100, health)); }

    public int getInitialHealth() { return initialHealth; }

    public void decreaseHealth() {
        this.health = Math.max(0, this.health - 1);
    }

    public void decreaseHealth(int amount) {
        this.health = Math.max(0, this.health - amount);
    }

    public void increaseHealth(int amount) {
        this.health = Math.min(100, this.health + amount);
    }

    // ── Capabilities ──────────────────────────────────────────────────────────

    public double getSkills() { return skills; }
    public void setSkills(double skills) { this.skills = Math.min(1.0, Math.max(0.0, skills)); }

    public void increaseSkills(double amount) {
        this.skills = Math.min(1.0, this.skills + amount);
    }

    // ── Social standing ───────────────────────────────────────────────────────

    public double getReputation() { return reputation; }
    public void setReputation(double reputation) {
        this.reputation = Math.min(1.0, Math.max(0.0, reputation));
    }

    public void increaseReputation(double amount) {
        this.reputation = Math.min(1.0, this.reputation + amount);
    }

    public void decreaseReputation(double amount) {
        this.reputation = Math.max(0.0, this.reputation - amount);
    }

    // ── Economy ───────────────────────────────────────────────────────────────

    public double getMoney() { return money; }
    public void setMoney(double money) { this.money = money; }

    public void addMoney(double amount) { this.money += amount; }

    public boolean discountDailyMoney() {
        if (this.money >= dailyCost) {
            this.money -= dailyCost;
            return true;
        }
        return false;
    }

    public double getDailyCost() { return dailyCost; }
    public void setDailyCost(double dailyCost) { this.dailyCost = dailyCost; }

    // ── Personality & affinities ──────────────────────────────────────────────

    public double getPersonality() { return personality; }
    public void setPersonality(double personality) { this.personality = personality; }

    public double getFamilyAffinity() { return familyAffinity; }
    public void setFamilyAffinity(double v) { this.familyAffinity = v; }

    public double getFriendsAffinity() { return friendsAffinity; }
    public void setFriendsAffinity(double v) { this.friendsAffinity = v; }

    public double getCommunityAffinity() { return communityAffinity; }
    public void setCommunityAffinity(double v) { this.communityAffinity = v; }

    public double getLeisureAffinity() { return leisureAffinity; }
    public void setLeisureAffinity(double v) { this.leisureAffinity = v; }
}
