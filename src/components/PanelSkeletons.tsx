import React from "react";
import { motion } from "motion/react";

// Common Shimmer Block component
export const SkeletonPulse: React.FC<{ className?: string }> = ({ className = "" }) => (
  <motion.div
    animate={{ opacity: [0.4, 0.85, 0.4] }}
    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    className={`bg-slate-200 dark:bg-zinc-800/80 rounded-xl ${className}`}
  />
);

// 1. Full Admin Panel Skeleton (used when loading AdminPanel)
export const AdminPanelSkeleton: React.FC = () => {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
      {/* Top Navbar / Header Bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SkeletonPulse className="w-12 h-12 rounded-xl shrink-0" />
          <div className="space-y-2">
            <SkeletonPulse className="h-5 w-48" />
            <SkeletonPulse className="h-3 w-64" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonPulse className="h-9 w-28 rounded-xl" />
          <SkeletonPulse className="h-9 w-28 rounded-xl" />
          <SkeletonPulse className="h-9 w-20 rounded-xl" />
        </div>
      </div>

      {/* KPI Stats Row (4 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={`admin-kpi-skel-${i}`}
            className="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-3"
          >
            <div className="flex items-center justify-between">
              <SkeletonPulse className="h-3 w-20" />
              <SkeletonPulse className="h-8 w-8 rounded-lg" />
            </div>
            <SkeletonPulse className="h-6 w-28" />
            <SkeletonPulse className="h-2.5 w-16" />
          </div>
        ))}
      </div>

      {/* Main Layout: Sidebar Tabs + Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar */}
        <div className="lg:col-span-3 space-y-2">
          {[...Array(6)].map((_, i) => (
            <SkeletonPulse key={`tab-skel-${i}`} className="h-11 w-full rounded-xl" />
          ))}
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 space-y-4">
          <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-4">
            <div className="flex justify-between items-center">
              <SkeletonPulse className="h-6 w-40" />
              <SkeletonPulse className="h-9 w-32 rounded-xl" />
            </div>
            {/* Table Mock */}
            <div className="space-y-3 pt-2">
              <SkeletonPulse className="h-10 w-full rounded-xl" />
              {[...Array(5)].map((_, i) => (
                <SkeletonPulse key={`row-skel-${i}`} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 2. Sales Charts Skeleton (used when loading SalesCharts)
export const SalesChartsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header and Filter Selector */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <SkeletonPulse className="h-5 w-56" />
          <SkeletonPulse className="h-3 w-72" />
        </div>
        <div className="flex items-center gap-1.5">
          <SkeletonPulse className="h-8 w-16 rounded-xl" />
          <SkeletonPulse className="h-8 w-20 rounded-xl" />
          <SkeletonPulse className="h-8 w-16 rounded-xl" />
          <SkeletonPulse className="h-8 w-16 rounded-xl" />
        </div>
      </div>

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={`chart-kpi-${i}`}
            className="bg-white dark:bg-zinc-900 p-4.5 rounded-2xl border border-slate-100 dark:border-zinc-800 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <SkeletonPulse className="h-3 w-24" />
              <SkeletonPulse className="h-7 w-7 rounded-lg" />
            </div>
            <SkeletonPulse className="h-7 w-32" />
            <SkeletonPulse className="h-2.5 w-20" />
          </div>
        ))}
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <SkeletonPulse className="h-5 w-44" />
            <SkeletonPulse className="h-4 w-12" />
          </div>
          <SkeletonPulse className="h-64 w-full rounded-xl" />
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
          <div className="flex justify-between items-center">
            <SkeletonPulse className="h-5 w-48" />
            <SkeletonPulse className="h-4 w-12" />
          </div>
          <SkeletonPulse className="h-64 w-full rounded-xl" />
        </div>
      </div>

      {/* Bar Chart Block Skeleton */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <SkeletonPulse className="h-5 w-60" />
          <SkeletonPulse className="h-8 w-36 rounded-xl" />
        </div>
        <SkeletonPulse className="h-56 w-full rounded-xl" />
      </div>
    </div>
  );
};

// 3. Table Skeleton (used for Auditoría, Movimientos, Ventas Historial)
export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 6 }) => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-5 sm:p-6 rounded-2xl space-y-4">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="space-y-1.5">
          <SkeletonPulse className="h-5 w-48" />
          <SkeletonPulse className="h-3 w-64" />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <SkeletonPulse className="h-9 w-full sm:w-48 rounded-xl" />
          <SkeletonPulse className="h-9 w-24 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Table Header */}
      <div className="border border-slate-100 dark:border-zinc-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-zinc-800">
        <div className="bg-slate-50 dark:bg-zinc-950/60 p-3 flex items-center justify-between gap-4">
          <SkeletonPulse className="h-3 w-24" />
          <SkeletonPulse className="h-3 w-32" />
          <SkeletonPulse className="h-3 w-20" />
          <SkeletonPulse className="h-3 w-16" />
        </div>

        {/* Rows */}
        {[...Array(rows)].map((_, i) => (
          <div key={`table-row-${i}`} className="p-3.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SkeletonPulse className="h-8 w-8 rounded-lg shrink-0" />
              <div className="space-y-1.5">
                <SkeletonPulse className="h-3.5 w-36" />
                <SkeletonPulse className="h-2.5 w-24" />
              </div>
            </div>
            <SkeletonPulse className="h-6 w-20 rounded-md" />
            <SkeletonPulse className="h-4 w-24" />
            <SkeletonPulse className="h-7 w-16 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
};

// 4. Settings Panel Skeleton (used for SettingsPanel)
export const SettingsPanelSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl space-y-6">
      <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 space-y-2">
        <SkeletonPulse className="h-6 w-52" />
        <SkeletonPulse className="h-3.5 w-80" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div
            key={`setting-block-${i}`}
            className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-3 bg-slate-50/50 dark:bg-zinc-950/40"
          >
            <div className="flex items-center justify-between">
              <SkeletonPulse className="h-4 w-32" />
              <SkeletonPulse className="h-6 w-11 rounded-full" />
            </div>
            <SkeletonPulse className="h-3 w-full" />
            <SkeletonPulse className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <SkeletonPulse className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
};

// 5. Cloud Stats View Skeleton
export const CloudStatsSkeleton: React.FC = () => {
  return (
    <div className="bg-white dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 p-6 rounded-2xl space-y-6">
      <div className="border-b border-slate-100 dark:border-zinc-800 pb-4 space-y-2">
        <SkeletonPulse className="h-6 w-56" />
        <SkeletonPulse className="h-3.5 w-72" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={`cloud-kpi-${i}`} className="p-4 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-2">
            <SkeletonPulse className="h-3 w-24" />
            <SkeletonPulse className="h-7 w-32" />
            <SkeletonPulse className="h-2.5 w-20" />
          </div>
        ))}
      </div>

      <div className="p-5 rounded-xl border border-slate-100 dark:border-zinc-800 space-y-3">
        <SkeletonPulse className="h-4 w-40" />
        <SkeletonPulse className="h-20 w-full rounded-xl" />
      </div>
    </div>
  );
};
