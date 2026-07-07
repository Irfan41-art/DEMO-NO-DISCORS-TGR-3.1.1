/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export const SiluetSilatStance: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    {/* Clean stylized stance silhouette */}
    <circle cx="50" cy="20" r="8" />
    <path d="M45 28 h10 v20 l12 25 h-10 l-8 -20 l-8 20 h-10 Z" />
    <path d="M42 28 l-15 15 l5 5 l10 -12 Z" />
    <path d="M58 28 l12 18 l-5 5 l-9 -16 Z" />
  </svg>
);

export const SiluetSilatKick: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    {/* Stylized kick silhouette */}
    <circle cx="45" cy="18" r="7" />
    <path d="M42 25 h8 l28 32 h-10 l-18 -15 l-8 30 h-8 Z" />
    <path d="M38 25 l-12 12 l4 4 l8 -10 Z" />
  </svg>
);

export const SiluetBackgroundCenter: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2,2" />
    <circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" strokeWidth="0.3" />
    <path d="M50 5 L50 95 M5 50 L95 50" stroke="currentColor" strokeWidth="0.2" />
  </svg>
);

interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

export const Binaan1Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <text x="12" y="15" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">B1</text>
  </svg>
);

export const Binaan2Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <text x="12" y="15" textAnchor="middle" fontSize="10" fontWeight="bold" fill="currentColor">B2</text>
  </svg>
);

export const Teguran1Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 22 22 2 22" />
    <text x="12" y="18" textAnchor="middle" fontSize="9" fontWeight="black" fill="currentColor">T1</text>
  </svg>
);

export const Teguran2Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="12 2 22 22 2 22" />
    <text x="12" y="18" textAnchor="middle" fontSize="9" fontWeight="black" fill="currentColor">T2</text>
  </svg>
);

export const Peringatan1Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="black" fill="currentColor">P1</text>
  </svg>
);

export const Peringatan2Icon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="black" fill="currentColor">P2</text>
  </svg>
);

export const WinnerBannerCircle: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="4" />
    <polygon points="50 15 61 38 85 42 68 59 72 84 50 72 28 84 32 59 15 42 39 38" />
  </svg>
);

export const NusaIconLogo: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg viewBox="0 0 100 100" fill="currentColor" {...props}>
    <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="3" />
    <path d="M35 30 L65 30 L50 70 Z" />
    <circle cx="50" cy="40" r="5" fill="white" />
  </svg>
);

export const DisqualificationIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
  </svg>
);

export const JatuhanIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

export const PunchIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M18 10h-2V8h2zm-4 0h-2V8h2zm-4 0H8V8h2zm-4 4h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2z" />
  </svg>
);

export const KickIcon: React.FC<IconProps> = ({ size = 24, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M4 14h6v6" />
    <path d="M20 4l-10 10" />
  </svg>
);

