// Predefined colors for common issue types
const PREDEFINED_COLORS: Record<string, string> = {
  'Epic': '#7C3AED',      // Purple
  'Story': '#2563EB',     // Blue
  'Bug': '#DC2626',       // Red
  'Feature': '#0284C7',   // Cyan
  'Task': '#059669',      // Green
  'Spike': '#9333EA',     // Violet
  'Subtask': '#7C3AED',   // Purple (lighter shade of Epic)
  'Improvement': '#14B8A6', // Teal
  'Test': '#06B6D4',      // Cyan
};

// Predefined icons (using Unicode symbols, not emojis)
const PREDEFINED_ICONS: Record<string, string> = {
  'Epic': '⚡',
  'Story': '📖',
  'Bug': '🐛',
  'Feature': '✨',
  'Task': '☐',
  'Spike': '🔍',
  'Subtask': '↳',
  'Improvement': '→',
  'Test': '✓',
};

// Color palette for generating deterministic colors for unknown types
const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#06B6D4', // Cyan
  '#6366F1', // Indigo
];

// Generate deterministic color based on string hash
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// Get color for issue type
export function getColorForType(typeName: string): string {
  // Check predefined colors first (case-insensitive)
  const normalizedName = typeName.toLowerCase();
  for (const [key, color] of Object.entries(PREDEFINED_COLORS)) {
    if (key.toLowerCase() === normalizedName) {
      return color;
    }
  }

  // Generate deterministic color for unknown types
  const hash = hashString(typeName);
  return COLOR_PALETTE[hash % COLOR_PALETTE.length];
}

// Get icon for issue type
export function getIconForType(typeName: string): string {
  // Check predefined icons first (case-insensitive)
  const normalizedName = typeName.toLowerCase();
  for (const [key, icon] of Object.entries(PREDEFINED_ICONS)) {
    if (key.toLowerCase() === normalizedName) {
      return icon;
    }
  }

  // Default icon for unknown types
  return '◆';
}

// Create type config from name
export function createTypeConfig(typeName: string) {
  return {
    color: getColorForType(typeName),
    icon: getIconForType(typeName),
  };
}
