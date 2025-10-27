import { 
  Home, 
  MapPin, 
  FileText, 
  Navigation,
  User,
  Settings,
  Bell
} from 'lucide-react';

// Route configuration shared between App.tsx and Sidebar.tsx
export const navigationRoutes = [
  { 
    name: 'Dashboard', 
    path: '/', 
    icon: Home,
    component: 'Dashboard'
  },
  { 
    name: 'Live Tracking', 
    path: '/tracking', 
    icon: Navigation,
    component: 'Tracking'
  },
  { 
    name: 'Trip Planner', 
    path: '/trips', 
    icon: MapPin,
    component: 'TripPlanner'
  },
  { 
    name: 'Log Sheets', 
    path: '/logs', 
    icon: FileText,
    component: 'LogSheets'
  },
  { 
    name: 'Notifications', 
    path: '/notifications', 
    icon: Bell,
    component: 'Notifications'
  },
  { 
    name: 'Profile', 
    path: '/profile', 
    icon: User,
    component: 'Profile'
  },
  { 
    name: 'Settings', 
    path: '/settings', 
    icon: Settings,
    component: 'Settings'
  },
];

export const authRoutes = [
  { path: '/login', component: 'Login' },
  { path: '/register', component: 'Register' },
];