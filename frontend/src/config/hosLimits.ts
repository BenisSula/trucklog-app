/**
 * HOS (Hours of Service) Limits Configuration
 * These should ideally come from backend configuration
 */

export interface HOSLimits {
  maxDrivingHours: number;
  maxOnDutyHours: number;
  maxCycleHours: number;
  minOffDutyHours: number;
  requiredBreakHours: number;
  maxConsecutiveDrivingHours: number;
}

// Default HOS limits based on FMCSA regulations
export const DEFAULT_HOS_LIMITS: HOSLimits = {
  maxDrivingHours: 11,        // Maximum driving hours per day
  maxOnDutyHours: 14,         // Maximum on-duty hours per day
  maxCycleHours: 70,          // Maximum hours in 8-day cycle (70/8 rule)
  minOffDutyHours: 10,        // Minimum off-duty hours for reset
  requiredBreakHours: 0.5,    // Required 30-minute break (0.5 hours)
  maxConsecutiveDrivingHours: 8, // Maximum consecutive driving without break
};

// Cycle types
export enum CycleType {
  SEVENTY_EIGHT = '70_8',     // 70 hours in 8 days
  SIXTY_SEVEN = '60_7',       // 60 hours in 7 days
}

// Get HOS limits based on cycle type
export const getHOSLimits = (cycleType: CycleType = CycleType.SEVENTY_EIGHT): HOSLimits => {
  const limits = { ...DEFAULT_HOS_LIMITS };
  
  if (cycleType === CycleType.SIXTY_SEVEN) {
    limits.maxCycleHours = 60;
  }
  
  return limits;
};

// Status color mapping
export const getStatusColor = (percentage: number): string => {
  if (percentage >= 90) return 'red';
  if (percentage >= 80) return 'yellow';
  if (percentage >= 60) return 'orange';
  return 'green';
};

// Progress bar color classes
export const getProgressBarClass = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 80) return 'bg-yellow-500';
  if (percentage >= 60) return 'bg-orange-500';
  return 'bg-green-500';
};