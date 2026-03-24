package org.wpsim.AgroEcosystem.layer.crop.cell.maiz;

import org.wpsim.AgroEcosystem.Helper.Soil;
import org.wpsim.AgroEcosystem.layer.crop.cell.CropCell;
import org.wpsim.AgroEcosystem.layer.disease.DiseaseCell;

/**
 * Maiz (corn) crop cell — annual, Kc FAO-56 tropical Colombia.
 * Kc_ini=0.30, Kc_mid=1.20, Kc_end=0.60
 * GDD_mid=800, GDD_end=1800, Soil=LOAM, root=1.0m, p=0.55
 */
public class MaizCell extends CropCell<MaizCellState> {

    private String id;

    public MaizCell(
            double cropFactor_ini,
            double cropFactor_mid,
            double cropFactor_end,
            double degreeDays_mid,
            double degreeDays_end,
            int cropArea,
            double maximumRootDepth,
            double depletionFraction,
            Soil soilType,
            boolean isActive,
            DiseaseCell diseaseCell,
            String id,
            String agentPeasantId) {
        super(cropFactor_ini, cropFactor_mid, cropFactor_end, degreeDays_mid, degreeDays_end,
                cropArea, maximumRootDepth, depletionFraction, soilType, isActive, diseaseCell, agentPeasantId);
        this.id = id;
    }

    @Override
    public String getId() {
        return this.id;
    }
}
