import React from 'react';
import { OperatingMode } from '../types/telemetry';
import { 
  Activity, 
  Cpu, 
  Droplets, 
  Gauge, 
  LineChart, 
  Settings as SettingsIcon,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';

export type NavTab = 
  | 'overview' 
  | 'live-monitoring' 
  | 'trends' 
  | 'irrigation' 
  | 'diagnostics' 
  | 'settings';

interface NavigationProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  mode: OperatingMode;
  onToggleMode: (newMode: OperatingMode) => void;
  isConnected: boolean;
  statusText: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  mode,
  onToggleMode,
  isConnected,
  statusText,
}) => {
  const tabs: { id: NavTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: 'Overview', icon: Gauge },
    { id: 'live-monitoring', label: 'Live Monitoring', icon: Activity },
    { id: 'trends', label: 'Trends & History', icon: LineChart },
    { id: 'irrigation', label: 'Irrigation Activity', icon: Droplets },
    { id: 'diagnostics', label: 'System Diagnostics', icon: Cpu },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#172B3A] text-white border-b border-[#243E53] shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-6 h-16">
          {/* Zone 1: Single text element wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-md bg-[#167D83] flex items-center justify-center text-white font-bold text-sm tracking-wider">
              SC
            </div>
            <a 
              href="#overview" 
              onClick={(e) => { e.preventDefault(); onSelectTab('overview'); }}
              className="text-base sm:text-lg font-semibold tracking-tight text-white whitespace-nowrap"
            >
              Smart Concrete Curing Monitor
            </a>
          </div>

          {/* Zone 2: Navigation Links (Single-line, unboxed, text with active highlight) */}
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap rounded-md ${
                    isActive
                      ? 'bg-[#167D83] text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-[#203748]'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Mode Toggle & Status Indicator */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Mode Selector */}
            <div className="flex items-center bg-[#101F2B] p-0.5 rounded-lg border border-[#2B455A]">
              <button
                type="button"
                onClick={() => onToggleMode('DEMO')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                  mode === 'DEMO'
                    ? 'bg-[#D99A36] text-[#172B3A]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Run deterministic simulated concrete hydration physics"
              >
                DEMO MODE
              </button>
              <button
                type="button"
                onClick={() => onToggleMode('LIVE')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1 ${
                  mode === 'LIVE'
                    ? 'bg-[#167D83] text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Connect to physical ESP32 embedded controller (Gated M4)"
              >
                LIVE HARDWARE
              </button>
            </div>

            {/* Connection Status Indicator */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-slate-300 bg-[#12222E] px-3 py-1.5 rounded-md border border-[#2B455A]">
              {isConnected ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">ONLINE</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300">DISCONNECTED</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile / Tablet Horizontal Navigation Scroll */}
        <div className="lg:hidden flex items-center gap-1 overflow-x-auto py-2 border-t border-[#243E53] -mx-4 px-4 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap rounded-md ${
                  isActive
                    ? 'bg-[#167D83] text-white'
                    : 'text-slate-300 hover:bg-[#203748]'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
