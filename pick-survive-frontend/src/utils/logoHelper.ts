// Función para obtener el emoji según el código del logo
export function getLogoEmoji(code: string): string {
  const emojiMap: Record<string, string> = {
    'LOGO_DEFAULT': '⚪',
    'LOGO_CLASSIC': '🔵',
    'LOGO_MODERN': '🟢',
    'LOGO_ELITE': '🟡',
    'LOGO_LEGENDARY': '🟣',
    'LOGO_CUSTOM': '🔴',
  };
  return emojiMap[code] || '🎨';
}

// Función para obtener el logo del usuario (emoji o imagen)
export function getUserLogo(user: any): { type: 'emoji' | 'image'; value: string } {
  if (user?.selectedLogo) {
    if (user.selectedLogo.imageUrl) {
      return { type: 'image', value: user.selectedLogo.imageUrl };
    }
    if (user.selectedLogo.code) {
      return { type: 'emoji', value: getLogoEmoji(user.selectedLogo.code) };
    }
  }
  // Fallback: primera letra del alias o email
  const initial = user?.alias?.charAt(0) || user?.email?.charAt(0) || 'U';
  return { type: 'emoji', value: initial };
}

