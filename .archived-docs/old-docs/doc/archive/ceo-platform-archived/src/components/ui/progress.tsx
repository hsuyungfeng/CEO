import * as React from "react";
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  max?: number; // default 100
  showValue?: boolean;
  valueSuffix?: string;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
  size?: "sm" | "md" | "lg";
}

const colorClasses = {
  blue: "bg-gradient-to-r from-blue-600 to-blue-700",
  green: "bg-gradient-to-r from-green-600 to-green-700",
  red: "bg-gradient-to-r from-red-500 to-red-600",
  yellow: "bg-gradient-to-r from-yellow-500 to-yellow-600",
  purple: "bg-gradient-to-r from-purple-500 to-purple-600",
};

const sizeClasses = {
  sm: "h-2",
  md: "h-4",
  lg: "h-6",
};

const Progress = React.forwardRef<HTMLDivElement, ProgressProps>(
  ({ 
    className, 
    value, 
    max = 100, 
    showValue = false,
    valueSuffix = "%",
    color = "blue",
    size = "md",
    ...props 
  }, ref) => {
    // Calculate percentage
    const percentage = Math.max(0, Math.min(100, (value / max) * 100));
    
    return (
      <div className={cn("space-y-2", className)} {...props} ref={ref}>
        {showValue && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>集購進度</span>
            <span className="font-medium">
              {value}/{max} {valueSuffix}
            </span>
          </div>
        )}
        <div className={cn(
           "relative w-full overflow-hidden rounded-none bg-gray-200",
          sizeClasses[size]
        )}>
          <div
            className={cn(
               "h-full rounded-none transition-all duration-300",
              colorClasses[color]
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);
Progress.displayName = "Progress";

export { Progress };