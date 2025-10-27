import React from 'react';
import { LucideIcon } from 'lucide-react';
import { CARD_STYLES, ICON_STYLES } from '../../config/theme';

interface SettingsCardProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

const SettingsCard: React.FC<SettingsCardProps> = ({
  title,
  description,
  icon: Icon,
  children,
  className = '',
}) => {
  return (
    <div className={`${CARD_STYLES.base} ${CARD_STYLES.padding} ${className}`}>
      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-2">
          {Icon && (
            <div className={ICON_STYLES.sectionHeader}>
              <Icon className={ICON_STYLES.sectionHeaderIcon} />
            </div>
          )}
          <h3 className={CARD_STYLES.title}>{title}</h3>
        </div>
        {description && (
          <p className="text-sm text-neutral-600">{description}</p>
        )}
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

export default SettingsCard;