package org.wpsim.WellProdSim;

import BESA.ExceptionBESA;
import BESA.Kernel.System.AdmBESA;
import org.wpsim.FamilyContainer.Agent.FamilyCoordinator;
import org.wpsim.FamilyContainer.Data.FamilyCoordinatorBelieves;
import org.wpsim.Person.Agent.Person;
import org.wpsim.Person.Data.PersonProfile;
import org.wpsim.Person.Data.Sexo;

/**
 * Factory that creates a complete family unit: one {@link FamilyCoordinator}
 * agent plus an initial set of demographically realistic {@link Person} agents.
 *
 * <h3>Default family template (8 members)</h3>
 * <pre>
 *  Role         Age  Sex
 *  ──────────── ───  ──────────
 *  Abuelo        68  MASCULINO
 *  Abuela        65  FEMENINO
 *  Padre         42  MASCULINO
 *  Madre         38  FEMENINO
 *  Hijo joven    20  MASCULINO
 *  Hija joven    17  FEMENINO
 *  Hijo menor    12  MASCULINO
 *  Niña           8  FEMENINO
 * </pre>
 *
 * <p>All persons share a direct Java reference to the coordinator's
 * {@link FamilyCoordinatorBelieves} (same JVM heap, no AMQP overhead for
 * intra-family resource access).</p>
 *
 * @author jairo
 */
public class FamilyFactory {

    /** Demographic template for the initial family composition. */
    private record MemberTemplate(String role, int age, Sexo sex) {}

    private static final MemberTemplate[] TEMPLATE = {
            new MemberTemplate("abuelo",    68, Sexo.MASCULINO),
            new MemberTemplate("abuela",    65, Sexo.FEMENINO),
            new MemberTemplate("padre",     42, Sexo.MASCULINO),
            new MemberTemplate("madre",     38, Sexo.FEMENINO),
            new MemberTemplate("hijo",      20, Sexo.MASCULINO),
            new MemberTemplate("hija",      17, Sexo.FEMENINO),
            new MemberTemplate("hijoMenor", 12, Sexo.MASCULINO),
            new MemberTemplate("nina",       8, Sexo.FEMENINO),
    };

    /**
     * Creates a complete family: coordinator + default 8-member household.
     *
     * @param familyIndex  1-based index used to generate unique aliases
     * @param mode         simulation mode prefix (e.g. {@code "single"})
     * @param initialMoney initial money in the shared family pool
     * @param tools        initial tool count
     * @param seeds        initial seed count
     * @param water        initial water units
     * @param personality  personality factor applied to all members (0.0–1.0)
     * @throws ExceptionBESA if any agent fails to register with BESA
     */
    public static void createFamily(int familyIndex, String mode,
                                    double initialMoney,
                                    int tools, int seeds, int water,
                                    double personality) throws ExceptionBESA {

        String coordinatorAlias = mode + "Family" + familyIndex + "Coordinator";
        String familyAlias      = coordinatorAlias; // persons use coordinator alias as family reference

        // Build shared believes (resource pool owned by the coordinator)
        FamilyCoordinatorBelieves believes =
                new FamilyCoordinatorBelieves(coordinatorAlias, initialMoney, tools, seeds, water);

        // Create and start coordinator first (so it's registered in BESA before persons)
        FamilyCoordinator coordinator = new FamilyCoordinator(coordinatorAlias, believes);
        coordinator.start();

        // Create each family member and register them
        for (int i = 0; i < TEMPLATE.length; i++) {
            MemberTemplate tmpl = TEMPLATE[i];
            String personAlias = coordinatorAlias + "_" + tmpl.role();

            PersonProfile profile = new PersonProfile(personAlias, familyAlias, tmpl.age(), tmpl.sex());
            profile.setPersonality(personality);

            Person person = new Person(personAlias, profile, believes);
            person.start();

            // Register in coordinator's member list
            believes.addMember(personAlias);

            // Bind to BESA service registry for family grouping
            try {
                String personId = AdmBESA.getInstance()
                        .getHandlerByAlias(personAlias)
                        .getAgId();
                AdmBESA.getInstance().bindService(personId, "family:" + familyAlias);
            } catch (ExceptionBESA ex) {
                System.err.println("[FamilyFactory] bindService failed for " + personAlias
                        + ": " + ex.getMessage());
            }
        }

        System.out.println("[FamilyFactory] Family created: " + coordinatorAlias
                + " | members=" + believes.getMemberCount());
    }

    /**
     * Convenience overload: creates {@code count} families numbered 1..count.
     */
    public static void createFamilies(int count, String mode,
                                      double initialMoney,
                                      int tools, int seeds, int water,
                                      double personality) {
        for (int i = 1; i <= count; i++) {
            try {
                createFamily(i, mode, initialMoney, tools, seeds, water, personality);
            } catch (ExceptionBESA ex) {
                System.err.println("[FamilyFactory] Failed to create family " + i
                        + ": " + ex.getMessage());
                ex.printStackTrace();
            }
        }
    }
}
