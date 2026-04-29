/**
 * ==========================================================================
 * __      __ _ __   ___  *    WellProdSim                                  *
 * \ \ /\ / /| '_ \ / __| *    @version 1.0                                 *
 * \ V  V / | |_) |\__ \ *    @since 2023                                  *
 * \_/\_/  | .__/ |___/ *                                                 *
 * | |          *    @author Jairo Serrano                        *
 * |_|          *    @author Enrique Gonzalez                     *
 * ==========================================================================
 * Social Simulator used to estimate productivity and well-being of peasant *
 * families. It is event oriented, high concurrency, heterogeneous time     *
 * management and emotional reasoning BDI.                                  *
 * ==========================================================================
 */
package org.wpsim.CivicAuthority.Data;

import BESA.Kernel.Agent.StateBESA;
import org.json.JSONArray;
import org.json.JSONObject;
import org.wpsim.WellProdSim.Config.wpsConfig;
import org.wpsim.WellProdSim.wpsStart;

import java.awt.*;
import java.io.Serializable;
import java.util.*;
import java.util.List;
import java.util.stream.Collectors;

import static org.wpsim.WellProdSim.wpsStart.params;

/**
 * @author jairo
 */
public class CivicAuthorityState extends StateBESA implements Serializable {

    private int gridSize;
    /**
     * Map that contains the land ownership information.
     */
    private Map<String, LandInfo> landOwnership;
    /**
     * Map that contains the farm information.
     */
    private Map<String, List<String>> farms;

    /**
     * Training slots available.
     */
    private int trainingSlots;
    private int initialTrainingSlots;

    /**
     * Constructor.
     */
    public CivicAuthorityState() {
        super();
        this.landOwnership = new HashMap<>();
        this.initialTrainingSlots = (params.trainingSlots != -1) 
                ? params.trainingSlots 
                : wpsConfig.getInstance().getIntProperty("civicauthority.trainingSlots");
        this.trainingSlots = this.initialTrainingSlots;

        initializeLands();
    }

    /**
     * Initializes the land ownership map with lands.
     */
    private void initializeLands() {
        try {
            // Parsear el contenido del archivo JSON
            JSONArray landsArray = new JSONArray(
                    Objects.requireNonNull(
                            wpsConfig.getInstance().loadWorldFile(params.world)
                    )
            );
            // Iterar sobre el contenido parseado y asignar los datos al hashmap
            for (int i = 0; i < landsArray.length(); i++) {
                JSONObject landObject = landsArray.getJSONObject(i);
                String landName = landObject.getString("name");
                String kind = landObject.getString("kind");
                // Usar la estructura LandInfo para almacenar el tipo de tierra y la finca
                LandInfo landInfo = new LandInfo(landName, kind);
                landOwnership.put(landName, landInfo);
            }
            // Derive gridSize (grid width = number of columns) from the actual world data.
            // For square grids sqrt(N) gives the side length. For the 40x20 "800" world
            // the width is 40, so we keep that explicit case.
            int totalCells = landsArray.length();
            if (params.world != null && params.world.equals("800")) {
                this.gridSize = 40;
            } else {
                this.gridSize = (int) Math.round(Math.sqrt(totalCells));
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        this.farms = new HashMap<>();

        createFarms();

        System.out.println("UPDATE: Farms created");
        //System.out.println(farms);

        // Contar fincas por tamaño
        long largeFarmsCount = farms.keySet().stream().filter(farmName -> farmName.contains("_large")).count();
        long mediumFarmsCount = farms.keySet().stream().filter(farmName -> farmName.contains("_medium")).count();
        long smallFarmsCount = farms.keySet().stream().filter(farmName -> farmName.contains("_small")).count();

        // Calcular el número total de tierras asignadas
        int totalLandsAssigned = farms.values().stream()
                .mapToInt(List::size)
                .sum();

        // Imprimir la información
        System.out.println("UPDATE: Total farms created: " + farms.size());
        System.out.println("UPDATE: Large farms: " + largeFarmsCount);
        System.out.println("UPDATE: Medium farms: " + mediumFarmsCount);
        System.out.println("UPDATE: Small farms: " + smallFarmsCount);
        System.out.println("UPDATE: Total lands assigned: " + totalLandsAssigned);
    }

    private Point landNameToPoint(String landName) {
        int number = Integer.parseInt(landName.replace("land_", ""));
        int x = (number - 1) % this.gridSize;
        int y = (number - 1) / this.gridSize;
        return new Point(x, y);
    }

    private List<String> selectBlock(List<String> availableLands, int rows, int cols) {
        // Recorrer cada punto posible como punto de inicio del bloque
        for (int y = 0; y <= this.gridSize - rows; y++) {
            for (int x = 0; x <= this.gridSize - cols; x++) {
                Point startPoint = new Point(x, y);
                if (isBlockAvailable(startPoint, rows, cols, availableLands)) {
                    return extractBlock(startPoint, rows, cols, availableLands);
                }
            }
        }
        return new ArrayList<>();
    }

    private boolean isBlockAvailable(Point startPoint, int rows, int cols, List<String> availableLands) {
        for (int y = startPoint.y; y < startPoint.y + rows; y++) {
            for (int x = startPoint.x; x < startPoint.x + cols; x++) {
                String landName = "land_" + (y * this.gridSize + x + 1);
                if (!availableLands.contains(landName)) {
                    return false;
                }
            }
        }
        return true;
    }

    private List<String> extractBlock(Point startPoint, int rows, int cols, List<String> availableLands) {
        List<String> block = new ArrayList<>();
        for (int y = startPoint.y; y < startPoint.y + rows; y++) {
            for (int x = startPoint.x; x < startPoint.x + cols; x++) {
                String landName = "land_" + (y * this.gridSize + x + 1);
                block.add(landName);
                availableLands.remove(landName);
            }
        }
        return block;
    }

    public synchronized Map.Entry<String, Map<String, String>> assignLandToFamily(String familyName) {
        List<String> availableFarms = farms.entrySet().stream()
                .filter(e -> e.getValue().stream().allMatch(land -> landOwnership.get(land).getFarmName() == null))
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        if (availableFarms.isEmpty()) {
            return null;
        }

        Random rand = new Random();
        String selectedFarm = availableFarms.get(rand.nextInt(availableFarms.size()));

        List<String> landsOfSelectedFarm = farms.get(selectedFarm);
        Map<String, String> landsWithKind = new HashMap<>();
        for (String land : landsOfSelectedFarm) {
            landOwnership.get(land).setFarmName(familyName);
            landsWithKind.put(land, landOwnership.get(land).getKind());
        }
        return new AbstractMap.SimpleEntry<>(selectedFarm, landsWithKind);
    }

    public void createFarms() {
        List<String> availableLands = null;
        if (wpsStart.config.getBooleanProperty("pfagent.deforestation")) {
            availableLands = landOwnership.entrySet().stream()
                    .filter(e -> !e.getValue().getKind().equals("road") && e.getValue().getFarmName() == null)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());
        } else {
            availableLands = landOwnership.entrySet().stream()
                    .filter(e -> !e.getValue().getKind().equals("road")
                            && e.getValue().getFarmName() == null
                            && !e.getValue().getKind().equals("forest")
                            && !e.getValue().getKind().equals("water"))
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());
        }

        //System.out.println("Available lands: " + this);

        int farmId = 1;
        boolean large = false, medium = false, small = false;

        if (params.land == 12) {
            large = true;
        }
        if (params.land == 6) {
            medium = true;
        }
        if (params.land == 2) {
            small = true;
        }
        //wpsStart.config.getBooleanProperty("pfagent.largefarms")

        // Asignar fincas grandes
        if (large) {
            while (true) {
                List<String> farmLands = selectBlock(availableLands, 3, 4);
                if (farmLands.isEmpty()) {
                    break;
                }
                farms.put("farm_" + farmId + "_large", farmLands);
                farmId++;
            }
        }

        // Asignar fincas medianas wpsStart.config.getBooleanProperty("pfagent.mediumfarms")
        if (medium) {
            while (true) {
                List<String> farmLands = selectBlock(availableLands, 2, 2);
                if (farmLands.isEmpty()) {
                    break;
                }
                farms.put("farm_" + farmId + "_medium", farmLands);
                farmId++;
            }
        }

        // Asignar fincas pequeñas (1x2)
        if (small) {
            while (true) {
                List<String> farmLands = selectBlock(availableLands, 1, 2);
                if (farmLands.isEmpty()) {
                    break;
                }
                farms.put("farm_" + farmId + "_small", farmLands);
                farmId++;
            }
            // Mop up: Asignar cualquier tierra restante como finca de 1 unidad (1x1)
            // para asegurar que nunca se asigne algo no contiguo en un mismo bloque
            while (!availableLands.isEmpty()) {
                List<String> farmLands = selectBlock(availableLands, 1, 1);
                if (farmLands.isEmpty()) break;
                farms.put("farm_" + farmId + "_tiny", farmLands);
                farmId++;
            }
        }
    }

    /**
     * Removes the assignment of a specified land.
     */
    public boolean removeLandAssignment(String landName) {
        if (landOwnership.containsKey(landName) && landOwnership.get(landName) != null) {
            landOwnership.put(landName, null);
            return true;
        }
        return false;
    }

    /**
     * Returns the land ownership map.
     *
     * @return Map of String to LandInfo
     */
    public synchronized Map<String, LandInfo> getLandOwnership() {
        return landOwnership;
    }

    /**
     * Return the land ownership map.
     *
     * @return
     */
    @Override
    public String toString() {
        return "GovernmentAgentState{" +
                "landOwnership=" + landOwnership +
                ", trainingSlots=" + trainingSlots +
                '}';
    }

    public synchronized boolean useTrainingSlot() {
        if (this.trainingSlots > 0) {
            this.trainingSlots--;
            return true;
        }
        return false;
    }

    public synchronized void resetTrainingSlots() {
        this.trainingSlots = this.initialTrainingSlots;
        System.out.println("UPDATE: Training slots renewed: " + this.trainingSlots);
    }

    public int getTrainingSlots() {
        return trainingSlots;
    }
}
