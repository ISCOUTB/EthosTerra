import type React from "react";
import { Button } from "@/components/ui/button";
import { BarChart, PieChart, Download, HomeIcon, Bot } from "lucide-react";

interface AnalyticsNavigationProps {
  setActiveSection: (section: string) => void;
  activeSection: string;
}

const AnalyticsNavigation: React.FC<AnalyticsNavigationProps> = ({
  setActiveSection,
  activeSection,
}) => {
  const navigationItems = [
    { icon: <HomeIcon size={20} />, label: "Home", value: "home" },
    {
      icon: <PieChart size={20} />,
      label: "Parameter Analysis",
      value: "parameter",
    },
    {
      icon: <Download size={20} />,
      label: "Download Data",
      value: "download",
    },

    { icon: <Bot size={20} />, label: "Agents", value: "Agents" },
  ];

  return (
    <div className="flex flex-col space-y-2">
      {navigationItems.map((item) => (
        <Button
          key={item.value}
          variant={activeSection === item.value ? "default" : "ghost"}
          className="justify-start"
          onClick={() => setActiveSection(item.value)}
        >
          {item.icon}
          <span className="ml-2">{item.label}</span>
        </Button>
      ))}
    </div>
  );
};

export default AnalyticsNavigation;
