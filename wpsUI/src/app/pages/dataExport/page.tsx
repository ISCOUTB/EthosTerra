import { DownloadSection } from "@/components/analytics/downloadSection/section";

export default function DownloadPage() {
  return (
    <div className="analytics-container p-6 md:p-8">
      <h1 className="text-3xl font-bold mb-6 font-clash">Data Export</h1>
      <p className="text-muted-foreground mb-8 max-w-3xl">
        Download simulation results from WellProdSim for detailed analysis and
        reporting. detailed analysis and report generation. You can preview the
        data before before downloading.
      </p>

      <div className="slide-in">
        <DownloadSection />
      </div>

      <div className="mt-8 p-6 bg-secondary/30 rounded-md border border-border slide-in">
        <h2 className="text-xl font-semibold mb-4 font-clash">
          Types of data available
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          <div className="bg-secondary/50 p-4 rounded-md border border-border">
            <h3 className="font-medium mb-3 font-clash text-primary-foreground">
              Integer Data
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">health</span> - Health of the
                agent
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">robberyAccount</span> - Theft
                counter
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">currentDay</span> - Current day of
                simulation
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">toPay</span> - Amount payable
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">tools</span> - Available tools
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">seeds</span> - Seeds available
                disponibles
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">HarvestedWeight</span> - Weight of
                the harvest
              </li>
            </ul>
          </div>

          <div className="bg-secondary/50 p-4 rounded-md border border-border">
            <h3 className="font-medium mb-3 font-clash text-primary-foreground">
              Floating Point Data
            </h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">HappinessSadness</span> - Level of
                happiness/sadness
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">HopefulUncertainty</span> - Level
                of hope/uncertainty
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">SecureInsecure</span> - Level of
                security/insecurity
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">money</span> - Money available
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">peasantFamilyAffinity</span> -
                Family affinity
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">waterAvailable</span> - Water
                available
              </li>
              <li className="flex items-center">
                <span className="w-3 h-3 rounded-full bg-primary/30 mr-2"></span>
                <span className="font-medium">Emotion</span> - General emotional
                state
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
