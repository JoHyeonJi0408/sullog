/** 술 종류별 작은 일러스트 아이콘 (선 그림) */
const PATHS: Record<string, string[]> = {
  wine: ['M8 3h8l-.4 5.2a3.6 3.6 0 0 1-7.2 0z', 'M8.3 6.5h7.4', 'M12 11.8V20', 'M8.5 20.5h7'],
  whisky: ['M5.5 6h13l-1.4 12.3a2 2 0 0 1-2 1.7H8.9a2 2 0 0 1-2-1.7z', 'M6.3 11.5h11.4', 'M10 13.6l2.6-.6.6 2.6-2.6.6z'],
  sake: ['M9.5 3h3v2.4c2.2 1.3 3.2 3.4 3.2 6.2 0 4.3-1.9 7.9-4.7 7.9S6.3 15.9 6.3 11.6c0-2.8 1-4.9 3.2-6.2z', 'M7 11h8.6', 'M17.5 15h3.5l-.6 4.2a1 1 0 0 1-1 .8h-.3a1 1 0 0 1-1-.8z'],
  makgeolli: ['M3.5 10.5h17a8.5 8.5 0 0 1-17 0z', 'M9 19.6h6', 'M7 7.5c1.5-.9 3-.9 4.5 0s3 .9 4.5 0'],
  beer: ['M5 8h10v10.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z', 'M15 10.5h2.2a1.8 1.8 0 0 1 1.8 1.8v2.4a1.8 1.8 0 0 1-1.8 1.8H15', 'M5 8c-.8-2.6 1.8-4.6 3.8-3.2C9.8 3.3 12.6 3.3 13.6 5c1.7-.6 3 .9 1.4 3', 'M8.5 11.5v5.5M11.5 11.5v5.5'],
  soju: ['M10 2.5h4v2.8l1.2 2.2V19.5a2 2 0 0 1-2 2h-2.4a2 2 0 0 1-2-2V7.5L10 5.3z', 'M8.8 11h6.4v5H8.8z'],
  traditional: ['M8.5 4h7v2.2c2.6 1.2 4.3 3.6 4.3 6.6 0 4.4-3.5 7.7-7.8 7.7s-7.8-3.3-7.8-7.7c0-3 1.7-5.4 4.3-6.6z', 'M8.5 6.2h7', 'M6.5 12.5c3.5 1.4 7.5 1.4 11 0'],
  tequila: ['M6.5 7h10l-1.6 12a1.6 1.6 0 0 1-1.6 1.4H9.7A1.6 1.6 0 0 1 8.1 19z', 'M7.1 11.5h8.8', 'M17.5 3.5a3 3 0 0 1 3 3h-6a3 3 0 0 1 3-3z'],
  other: ['M4 5h16l-8 8.5z', 'M12 13.5V20', 'M8.5 20.5h7', 'M15.5 8.5l4-5.5'],
};

export function CategoryIcon({ id, size = 22, strokeWidth = 1.7 }: { id: string; size?: number; strokeWidth?: number }) {
  const paths = PATHS[id] ?? PATHS.other;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

/** 노트 섹션 머리 아이콘 */
const SECTION: Record<string, string[]> = {
  nose: ['M12 21c0-5 0-9 0-11', 'M12 10c-3.5 0-5-2.5-5-6 3.5 0 5 2.5 5 6z', 'M12 13c3 0 4.5-2 4.5-5-3 0-4.5 2-4.5 5z'],
  palate: ['M12 3.5c3.2 4 5 6.8 5 9.3a5 5 0 0 1-10 0c0-2.5 1.8-5.3 5-9.3z', 'M9.8 14a2.3 2.3 0 0 0 2.2 1.9'],
  finish: ['M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0', 'M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0', 'M3 19c2-2 4-2 6 0s4 2 6 0'],
  pairing: ['M7 3v7a2 2 0 0 0 2 2v9', 'M5 3v6M9 3v6', 'M16.5 21V3c2 1 3 3.5 3 6.5s-1 4-3 4.5'],
  again: ['M20 12a8 8 0 1 1-2.3-5.6', 'M20 4v4h-4'],
};

export function SectionIcon({ id, size = 18 }: { id: keyof typeof SECTION; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {SECTION[id].map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}
