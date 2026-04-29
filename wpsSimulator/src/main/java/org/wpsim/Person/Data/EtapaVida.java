package org.wpsim.Person.Data;

/**
 * Life stage of an individual Person agent.
 *
 * Each stage defines a range of ages and has different productive capacity,
 * dependency needs, and role eligibility in the simulation.
 *
 * Stage transitions happen automatically every 365 simulation days via
 * {@link org.wpsim.Person.Tasks.Common.AgeTask}.
 *
 * @author jairo
 */
public enum EtapaVida {

    /** 0–4 years: fully dependent, no productive role. */
    INFANTE(0, 4),

    /** 5–12 years: school-age, minor household help, no economic role. */
    NINO(5, 12),

    /** 13–17 years: can assist adults with reduced capacity. */
    ADOLESCENTE(13, 17),

    /** 18–35 years: full productive adult, can reproduce, may seek spouse. */
    ADULTO_JOVEN(18, 35),

    /** 36–60 years: peak productive adult, often head of household. */
    ADULTO(36, 60),

    /** 61–70 years: senior adult with reduced capacity, carries wisdom/reputation. */
    ADULTO_MAYOR(61, 70),

    /** 71+ years: dependent elder, requires care, suffers annual health loss. */
    ANCIANO(71, 110),

    /** Terminal state — agent will be removed from the simulation. */
    FALLECIDO(-1, -1);

    private final int minAge;
    private final int maxAge;

    EtapaVida(int minAge, int maxAge) {
        this.minAge = minAge;
        this.maxAge = maxAge;
    }

    /**
     * Derives the life stage from an integer age.
     */
    public static EtapaVida fromAge(int age) {
        if (age <= 4)  return INFANTE;
        if (age <= 12) return NINO;
        if (age <= 17) return ADOLESCENTE;
        if (age <= 35) return ADULTO_JOVEN;
        if (age <= 60) return ADULTO;
        if (age <= 70) return ADULTO_MAYOR;
        return ANCIANO;
    }

    /** True for stages that produce no income and require care (INFANTE, NINO). */
    public boolean isDependent() {
        return this == INFANTE || this == NINO;
    }

    /** True for stages with full economic capacity (ADULTO_JOVEN, ADULTO). */
    public boolean isProductiveAdult() {
        return this == ADULTO_JOVEN || this == ADULTO;
    }

    /** True for stages with reduced capacity that may need assistance. */
    public boolean isElder() {
        return this == ADULTO_MAYOR || this == ANCIANO;
    }

    /** True for stages eligible for marriage / reproduction. */
    public boolean canReproduce() {
        return this == ADULTO_JOVEN || this == ADULTO;
    }

    public int getMinAge() { return minAge; }
    public int getMaxAge() { return maxAge; }
}
