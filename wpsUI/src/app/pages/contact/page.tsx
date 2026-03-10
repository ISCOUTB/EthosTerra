import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import DeveloperGrid from "@/components/contact/developergrid";

const TeamSection = ({
  backHref = "/pages/simulador",
}: {
  backHref?: string;
}) => {
  return (
    <>
      <section className="w-full bg-[#0F1417] py-12 sm:py-16 px-4 sm:px-6 lg:px-8 relative">
        {/* Back Button */}
        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 z-10">
          <Link href={backHref}>
            <button
              className="flex items-center justify-center p-2 rounded-full bg-[#171C1F] hover:bg-[#232A2F] transition-colors duration-200"
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5 text-[#DFE3E7]" />
            </button>
          </Link>
        </div>

        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-[#DFE3E7] font-clash font-semibold text-2xl sm:text-3xl md:text-4xl mb-3 sm:mb-4">
              Simulation is not prediction; it is creating possibilities for
              everyone
            </h2>
            <p className="text-gray-400 font-archivo text-sm sm:text-base max-w-2xl mx-auto">
              We are the team behind WellProdSimulator, committed to developing
              tools that model social welfare. We believe in the power of shared
              knowledge and in simulation as a means to understand and improve
              our environment. If you have questions, ideas or proposals, do not
              hesitate to contact us. Together we can build fairer and more
              sustainable scenarios for the future.
            </p>
          </div>

          <DeveloperGrid />
        </div>
      </section>
    </>
  );
};

export default TeamSection;
