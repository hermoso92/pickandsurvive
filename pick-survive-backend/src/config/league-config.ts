// Configuraciones por defecto para ligas y ediciones

// Tipos TypeScript para las configuraciones
export interface LeagueConfig {
  entry_fee_cents: number;
  timezone: string;
  payout_schema: {
    type: 'winner_takes_all' | 'table';
    splits?: number[];
  };
  rules: {
    picks_hidden: boolean;
    no_repeat_team: boolean;
    lifeline_enabled: boolean;
    sudden_death: boolean;
    pick_deadline: 'FIRST_KICKOFF';
  };
  modes_enabled: ('ELIMINATORIO' | 'LIGA')[];
}

export interface EditionConfig {
  season: number;
  matchday_range: {
    from: number;
    to: number | null;
  };
  payout_schema: {
    type: 'winner_takes_all' | 'table';
    splits?: number[];
  };
  rules: {
    picks_hidden: boolean;
    no_repeat_team: boolean;
    lifeline_enabled: boolean;
    sudden_death: boolean;
  };
  max_players?: number;
}

export const DEFAULT_LEAGUE_CONFIG = {
  entry_fee_cents: 500, // 5€ por defecto
  timezone: "Europe/Madrid",
  payout_schema: {
    type: "winner_takes_all" as const,
  },
  rules: {
    picks_hidden: true,
    no_repeat_team: true,
    lifeline_enabled: true,
    sudden_death: false,
    pick_deadline: "FIRST_KICKOFF" as const,
  },
  modes_enabled: ["ELIMINATORIO", "LIGA"] as const,
};

export const DEFAULT_EDITION_CONFIG = {
  season: new Date().getFullYear(),
  matchday_range: {
    from: 1,
    to: null, // null = hasta que haya ganador
  },
  payout_schema: {
    type: "winner_takes_all" as const,
  },
  rules: {
    picks_hidden: true,
    no_repeat_team: false,
    lifeline_enabled: true,
    sudden_death: true,
  },
  max_players: 15,
};

// Esquemas de pago predefinidos
export const PAYOUT_SCHEMAS = {
  winner_takes_all: {
    type: "winner_takes_all" as const,
  },
  top_three: {
    type: "table" as const,
    splits: [0.6, 0.3, 0.1], // 60%, 30%, 10%
  },
  top_two: {
    type: "table" as const,
    splits: [0.7, 0.3], // 70%, 30%
  },
  equal_split: {
    type: "table" as const,
    splits: [], // Se calculará dinámicamente
  },
};

// Configuraciones de reglas por modo
export const MODE_RULES = {
  ELIMINATORIO: {
    picks_hidden: true,
    no_repeat_team: true,
    lifeline_enabled: true,
    sudden_death: false,
    pick_deadline: "FIRST_KICKOFF" as const,
  },
  LIGA: {
    picks_hidden: false,
    no_repeat_team: false,
    lifeline_enabled: false, // No aplica en liga
    sudden_death: false, // No aplica en liga
    pick_deadline: "FIRST_KICKOFF" as const,
  },
};

// Validaciones de configuración
export function validateLeagueConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  const requiredFields = ['entry_fee_cents', 'timezone', 'payout_schema', 'rules', 'modes_enabled'];
  
  for (const field of requiredFields) {
    if (config[field] === undefined || config[field] === null) {
      return false;
    }
  }

  // Validar entry_fee_cents (puede ser 0)
  if (typeof config.entry_fee_cents !== 'number' || config.entry_fee_cents < 0) {
    return false;
  }

  // Validar timezone (debe ser string no vacío)
  if (typeof config.timezone !== 'string' || config.timezone.trim().length === 0) {
    return false;
  }

  // Validar payout_schema
  if (!config.payout_schema || typeof config.payout_schema !== 'object') {
    return false;
  }
  if (!config.payout_schema.type || !['winner_takes_all', 'table'].includes(config.payout_schema.type)) {
    return false;
  }

  // Validar rules
  if (!config.rules || typeof config.rules !== 'object') {
    return false;
  }

  // Validar modes_enabled
  if (!Array.isArray(config.modes_enabled) || config.modes_enabled.length === 0) {
    return false;
  }

  return true;
}

export function validateEditionConfig(config: any): boolean {
  const requiredFields = ['season', 'matchday_range', 'payout_schema', 'rules'];
  
  for (const field of requiredFields) {
    if (!config[field]) {
      return false;
    }
  }

  // Validar season
  if (typeof config.season !== 'number' || config.season < 2020 || config.season > 2030) {
    return false;
  }

  // Validar matchday_range
  if (!config.matchday_range.from || config.matchday_range.from < 1) {
    return false;
  }

  return true;
}

// Función para fusionar configuraciones
export function mergeConfigs(defaultConfig: any, overrideConfig: any): any {
  return {
    ...defaultConfig,
    ...overrideConfig,
    payout_schema: {
      ...defaultConfig.payout_schema,
      ...overrideConfig.payout_schema,
    },
    rules: {
      ...defaultConfig.rules,
      ...overrideConfig.rules,
    },
  };
}
