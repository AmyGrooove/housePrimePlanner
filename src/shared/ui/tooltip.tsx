import { Info } from "lucide-react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  return (
    <div className="tooltip-wrapper" title={content}>
      {children}
    </div>
  );
}

interface HelpTooltipProps {
  content: string;
}

export function HelpTooltip({ content }: HelpTooltipProps) {
  return (
    <Tooltip content={content}>
      <Info className="help-icon" size={16} />
    </Tooltip>
  );
}
