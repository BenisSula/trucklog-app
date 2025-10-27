import React from 'react';
import { LucideIcon } from 'lucide-react';
import { getProgressBarClass } from '../config/hosLimits';

interface HOSStatusCardProps {
  title: string;
  current: number;
  maximum: number;
  icon: LucideIcon;
  iconColor: string;
  iconBgColor: string;
  unit?: string;
  subtitle?: string;
  showProgressBar?: boolean;
  warningIcon?: React.ReactNode;
  warningTitle?: string;
}

const HOSStatusCard: React.FC<HOSStatusCardProps> = ({
  title,
  current,
  maximum,
  icon: Icon,
  iconColor,
  iconBgColor,
  unit = 'hours',
  subtitle,
  showProgressBar = true,
  warningIcon,
  warningTitle
}) => {
  const percentage = maximum > 0 ? (current / maximum) * 100 : 0;
  const progressBarClass = getProgressBarClass(percentage);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-neutral-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className={`p-2 ${iconBgColor} rounded-lg`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            <p className="text-2xl font-bold text-neutral-900">
              {current.toFixed(1)} / {maximum.toFixed(1)}
            </p>
            {showProgressBar && (
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${progressBarClass}`}
                  style={{ width: `${Math.min(percentage, 100)}%` }}
                ></div>
              </div>
            )}
            {subtitle && (
              <p className="text-xs text-neutral-500 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
        {warningIcon && (
          <div className="text-red-500" title={warningTitle}>
            {warningIcon}
          </div>
        )}
      </div>
    </div>
  );
};

export default HOSStatusCard;