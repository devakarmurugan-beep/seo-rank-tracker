import React from 'react';

export const LogoIcon = ({ className = "w-9 h-9", color = "#0F172A", arrowColor = "#2563EB" }) => (
    <svg className={className} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="2" width="36" height="36" rx="8" stroke={color} strokeWidth="3" />
        <path d="M10 28L18 20L23 25L30 14" stroke={arrowColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M23 14H30V21" stroke={arrowColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

export const LogoFull = ({ className = "", theme = "light" }) => {
    const isDark = theme === "dark";
    const textColor = isDark ? "text-white" : "text-[#0F172A]";
    const iconColor = isDark ? "white" : "#0F172A";
    const subColor = isDark ? "text-[#94A3B8]" : "text-[#0F172A]";

    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <LogoIcon className="w-10 h-10" color={iconColor} />
            <div className={`w-[1.5px] h-10 ${isDark ? 'bg-white/20' : 'bg-[#0F172A]/20'}`}></div>
            <div className="flex flex-col leading-none">
                <div className="flex items-center text-[20px] font-bold tracking-tight">
                    <span className={textColor}>Rank</span>
                    <span className="text-[#2563EB] ml-1">Tracking</span>
                </div>
                <div className={`${subColor} text-[11px] font-bold tracking-[0.2em] mt-1.5 uppercase opacity-80`}>
                    SEO TOOL
                </div>
            </div>
        </div>
    );
};
